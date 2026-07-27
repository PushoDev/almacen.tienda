<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Movimiento;
use App\Models\MovimientoDetalle;
use App\Models\MovimientoSeguimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Notification;
use App\Notifications\MovimientoStockNotification;
use App\Services\NotificationService;
use App\Models\User;

class MovimientosController extends Controller
{
    /**
     * Envía notificaciones a usuarios relevantes para movimientos
     */
    private function notificarMovimiento($movimiento, $mensajePersonalizado = null)
    {
        try {
            $notificationService = new NotificationService();
            $datosNotificacion = $notificationService->prepararDatosMovimiento($movimiento);
            $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

            Notification::send($usuariosParaNotificar, new MovimientoStockNotification($movimiento, $mensajePersonalizado));
        } catch (\Exception $e) {
            \Log::error('Error notificación movimiento: ' . $e->getMessage());
        }
    }

    /**
     * Obtiene almacenes según rol del usuario
     */
    private function getPermittedAlmacenes()
    {
        $user = Auth::user();

        return $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen', 'tipo_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen', 'tipo_almacen')->get();
    }

    /**
     * Muestra la interfaz principal de movimientos
     */
    public function index()
    {
        $movimientos = Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto.categoria', 'detalles.producto.almacenes'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $user = Auth::user();
        $userAlmacenesIds = $user->role === 'admin' ? [] : $user->almacenes()->pluck('id')->toArray();

        return Inertia::render('Movimientos/Index', [
            'almacenes' => Almacen::select('id', 'nombre_almacen', 'tipo_almacen')->get(),
            'userAlmacenesIds' => $userAlmacenesIds,
            'movimientos' => $movimientos,
            'estados' => [
                'pendiente_confirmacion' => 'Pendiente Confirmación',
                'en_transito' => 'En Tránsito',
                'recibido_parcial' => 'Recibido Parcial',
                'recibido_completo' => 'Recibido Completo',
                'rechazado' => 'Rechazado',
                'cancelado' => 'Cancelado'
            ]
        ]);
    }

    /**
     * Obtiene productos de un almacén con verificación de permisos
     */
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();
        $almacen = Almacen::findOrFail($id);

        // Verificar permisos para vendedores
        if ($user->role !== 'admin') {
            $userAlmacenesIds = $user->almacenes->pluck('id');
            if (!$userAlmacenesIds->contains($almacen->id)) {
                abort(403, 'Acceso denegado a este almacén');
            }
        }

        $productos = $almacen->productos()
            ->with(['categoria', 'codigos']) // Carga la relación con la categoría y códigos
            ->select(
                'productos.id',
                'productos.nombre_producto',
                'productos.marca_producto',
                'productos.modelo_producto',
                'productos.capacidad_producto',
                'productos.color_producto',
                'productos.codigo_producto',
                'productos.imagen_producto', // Necesario para el accessor
                'productos.categoria_id', // Necesario para la relación
                'almacen_producto.cantidad',
                'almacen_producto.cantidad_en_transito'
            )
            ->get()
            ->map(function ($producto) {
                $disponible = $producto->pivot->cantidad - $producto->pivot->cantidad_en_transito;
                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre_producto,
                    'marca' => $producto->marca_producto,
                    'modelo' => $producto->modelo_producto,
                    'capacidad' => $producto->capacidad_producto,
                    'color' => $producto->color_producto,
                    'codigo' => $producto->codigo_producto,
                    'codigos_adicionales' => $producto->codigos->pluck('codigo_barras')->toArray(),
                    'categoria' => $producto->categoria ? $producto->categoria->nombre_categoria : 'N/A',
                    'imagen_url' => $producto->imagen_url, // Accessor del modelo
                    'stock_total' => $producto->pivot->cantidad,
                    'stock_en_transito' => $producto->pivot->cantidad_en_transito,
                    'stock_disponible' => max(0, $disponible),
                ];
            });

        return response()->json($productos);
    }

    /**
     * Obtiene todos los almacenes permitidos
     */
    public function getAlmacenes()
    {
        return response()->json($this->getPermittedAlmacenes());
    }

    /**
     * Registra un nuevo movimiento entre almacenes
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $almacenesPermitidosIds = $this->getPermittedAlmacenes()->pluck('id');

        $request->validate([
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        if ($user->role !== 'admin') {
            if (!$almacenesPermitidosIds->contains($request->almacen_origen_id)) {
                throw ValidationException::withMessages([
                    'almacen_origen_id' => 'No tienes permisos sobre este almacén de origen'
                ]);
            }
        }

        DB::beginTransaction();

        try {
            foreach ($request->productos as $producto) {
                $stock = AlmacenProducto::where([
                    'almacen_id' => $request->almacen_origen_id,
                    'producto_id' => $producto['id']
                ])->first();

                $disponible = ($stock ? $stock->cantidad - $stock->cantidad_en_transito : 0);

                if (!$stock || $disponible < $producto['cantidad']) {
                    throw new \Exception(
                        "Stock insuficiente para el producto ID: {$producto['id']}. " .
                            "Disponible: {$disponible}, Solicitado: {$producto['cantidad']}"
                    );
                }
            }

            $movimiento = Movimiento::create([
                'almacen_origen_id' => $request->almacen_origen_id,
                'almacen_destino_id' => $request->almacen_destino_id,
                'user_id' => $user->id,
                'tipo_movimiento' => 'traslado',
                'estado' => 'pendiente_confirmacion',
                'observaciones' => $request->observaciones,
            ]);

            foreach ($request->productos as $producto) {
                MovimientoDetalle::create([
                    'movimiento_id' => $movimiento->id,
                    'producto_id' => $producto['id'],
                    'cantidad_solicitada' => $producto['cantidad'],
                    'observaciones' => $producto['observaciones'] ?? null,
                ]);
            }

            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'pendiente_confirmacion',
                'observaciones' => 'Movimiento creado. Pendiente de confirmación de envío.',
                'user_id' => $user->id,
            ]);

            DB::commit();

            // Notificar a usuarios relevantes
            $this->notificarMovimiento($movimiento, "Nuevo movimiento creado #{$movimiento->id}");

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento creado exitosamente. Haz clic en enviar cuando esté listo para despachar.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al crear movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()])->withInput();
        }
    }



    /**
     * Marca un movimiento como enviado/en tránsito - Aquí se reserva el stock
     */
    public function enviar(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'guia_transporte' => 'nullable|string|max:255',
            'transportista' => 'nullable|string|max:255',
        ]);

        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para enviar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            if ($movimiento->estado !== 'pendiente_confirmacion') {
                throw new \Exception('Solo se pueden enviar movimientos en estado pendiente de confirmación.');
            }

            foreach ($movimiento->detalles as $detalle) {
                $stock = AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $detalle->producto_id
                ])->first();

                $disponible = ($stock ? $stock->cantidad - $stock->cantidad_en_transito : 0);

                if (!$stock || $disponible < $detalle->cantidad_solicitada) {
                    throw new \Exception(
                        "Stock insuficiente para el producto ID: {$detalle->producto_id}. " .
                            "Disponible: {$disponible}, Solicitado: {$detalle->cantidad_solicitada}"
                    );
                }

                AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $detalle->producto_id
                ])->increment('cantidad_en_transito', $detalle->cantidad_solicitada);

                $detalle->update(['cantidad_despachada' => $detalle->cantidad_solicitada]);
            }

            $movimiento->update([
                'estado' => 'en_transito',
                'guia_transporte' => $request->guia_transporte,
                'transportista' => $request->transportista,
                'fecha_envio' => now(),
            ]);

            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'en_transito',
                'observaciones' => 'Movimiento despachado' .
                    ($request->guia_transporte ? ". Guía: {$request->guia_transporte}" : ""),
                'user_id' => $user->id,
            ]);

            DB::commit();

            // Notificar a usuarios relevantes
            $this->notificarMovimiento($movimiento, "Movimiento #{$movimiento->id} enviado");

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento despachado y en tránsito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al enviar movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * Recibe un movimiento (parcial o completo)
     */
    public function recibir(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'productos' => 'required|array',
            'productos.*.id' => 'required|exists:productos,id',
            'productos.*.cantidad_recibida' => 'required|integer|min:0',
        ]);

        // Permitir recepción a todos los usuarios sin restricción de almacén
        // La lógica de negocio se encarga del control de stock
        // if ($user->role !== 'admin') {
        //     $almacenesPermitidosIds = $user->almacenes->pluck('id');
        //     if (!$almacenesPermitidosIds->contains($movimiento->almacen_destino_id)) {
        //         abort(403, 'No tienes permisos para recibir movimientos en este almacén');
        //     }
        // }

        DB::beginTransaction();

        try {
            // Verificar que el movimiento esté en tránsito
            if ($movimiento->estado !== 'en_transito') {
                throw new \Exception('Solo se pueden recibir movimientos en estado en tránsito.');
            }

            $totalRecibido = 0;
            $totalSolicitado = 0;
            $totalDiferencias = 0;

            foreach ($request->productos as $producto) {
                $detalle = $movimiento->detalles->where('producto_id', $producto['id'])->first();
                if ($detalle) {
                    $cantidadRecibida = $producto['cantidad_recibida'];

                    $detalle->update(['cantidad_recibida' => $cantidadRecibida]);

                    $diferencia = $detalle->cantidad_despachada - $cantidadRecibida;

                    if ($cantidadRecibida > 0) {
                        // Obtener el valor actual de cantidad para evitar problemas con expresiones
                        $almacenProductoDestino = AlmacenProducto::firstOrCreate(
                            [
                                'almacen_id' => $movimiento->almacen_destino_id,
                                'producto_id' => $producto['id']
                            ],
                            ['cantidad' => 0]
                        );

                        $nuevaCantidad = $almacenProductoDestino->cantidad + $cantidadRecibida;
                        $almacenProductoDestino->update(['cantidad' => $nuevaCantidad]);
                    }

                    // Al enviar, se incrementó cantidad_en_transito pero se mantuvo cantidad
                    // Ahora, para completar el movimiento, debemos reducir la cantidad original en el origen
                    AlmacenProducto::where([
                        'almacen_id' => $movimiento->almacen_origen_id,
                        'producto_id' => $detalle->producto_id
                    ])->decrement('cantidad', $detalle->cantidad_despachada);

                    AlmacenProducto::where([
                        'almacen_id' => $movimiento->almacen_origen_id,
                        'producto_id' => $detalle->producto_id
                    ])->decrement('cantidad_en_transito', $detalle->cantidad_despachada);

                    if ($diferencia > 0) {
                        // Si se reciben menos unidades de las despachadas, las diferencias se mantienen en el almacén de origen
                        // Incrementamos el stock del emisor con las unidades no recibidas
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id
                        ])->increment('cantidad', $diferencia);
                        $totalDiferencias += $diferencia;
                    } elseif ($diferencia < 0) {
                        // Si se reciben más unidades de las despachadas, se ajusta el stock del emisor
                        $diferenciaNegativa = abs($diferencia);
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id
                        ])->decrement('cantidad', $diferenciaNegativa);
                        $totalDiferencias -= $diferenciaNegativa;
                    }

                    $totalRecibido += $cantidadRecibida;
                    $totalSolicitado += $detalle->cantidad_solicitada;
                }
            }

            // Determinar el nuevo estado
            $nuevoEstado = ($totalRecibido == $totalSolicitado) ? 'recibido_completo' : 'recibido_parcial';

            // Actualizar movimiento
            $movimiento->update([
                'estado' => $nuevoEstado,
                'fecha_recepcion' => now(),
            ]);

            $observacion = "Movimiento recibido. Cantidad: $totalRecibido/$totalSolicitado";
            if ($totalDiferencias > 0) {
                $observacion .= " (Diferencia: $totalDiferencias unidades no recibidas)";
            }

            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => $nuevoEstado,
                'observaciones' => $observacion,
                'user_id' => $user->id,
            ]);

            DB::commit();

            // Notificar a usuarios relevantes
            $this->notificarMovimiento($movimiento, "Movimiento #{$movimiento->id} recibido ({$nuevoEstado})");

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento recibido exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al recibir movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * Rechaza un movimiento
     */
    public function rechazar(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'observaciones' => 'required|string|max:500',
        ]);

        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para rechazar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            if (!in_array($movimiento->estado, ['pendiente_confirmacion', 'en_transito'])) {
                throw new \Exception('Solo se pueden rechazar movimientos pendientes o en tránsito.');
            }

            if ($movimiento->estado === 'en_transito') {
                foreach ($movimiento->detalles as $detalle) {
                    if ($detalle->cantidad_despachada > 0) {
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id
                        ])->decrement('cantidad_en_transito', $detalle->cantidad_despachada);

                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id
                        ])->increment('cantidad', $detalle->cantidad_despachada);
                    }
                }
            }

            $movimiento->update(['estado' => 'rechazado']);

            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'rechazado',
                'observaciones' => $request->observaciones,
                'user_id' => $user->id,
            ]);

            DB::commit();

            // Notificar a usuarios relevantes
            $this->notificarMovimiento($movimiento, "Movimiento #{$movimiento->id} RECHAZADO");

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento rechazado. Stock liberado.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al rechazar movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * Obtiene el seguimiento de un movimiento
     */
    public function seguimiento(Movimiento $movimiento)
    {
        $seguimientos = $movimiento->seguimientos()
            ->with('usuario')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($seguimientos);
    }

    /**
     * Reporte de discrepancias - Accesible para todos los roles
     */
    public function reporteDiscrepancias()
    {
        $discrepancias = Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto'])
            ->whereIn('estado', ['recibido_parcial', 'rechazado'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        $detallesDiscrepancia = [];

        foreach ($discrepancias->items() as $movimiento) {
            foreach ($movimiento->detalles as $detalle) {
                $diferencia = $detalle->cantidad_despachada - ($detalle->cantidad_recibida ?? 0);
                if ($diferencia != 0) {
                    $detallesDiscrepancia[] = [
                        'movimiento_id' => $movimiento->id,
                        'movimiento_estado' => $movimiento->estado,
                        'fecha_movimiento' => $movimiento->created_at,
                        'almacen_origen' => $movimiento->almacenOrigen->nombre_almacen,
                        'almacen_destino' => $movimiento->almacenDestino->nombre_almacen,
                        'usuario' => $movimiento->usuario->name,
                        'producto' => $detalle->producto->nombre_producto,
                        'cantidad_despachada' => $detalle->cantidad_despachada,
                        'cantidad_recibida' => $detalle->cantidad_recibida ?? 0,
                        'diferencia' => $diferencia,
                    ];
                }
            }
        }

        return Inertia::render('Movimientos/Discrepancias', [
            'discrepancias' => $detallesDiscrepancia,
            'total' => count($detallesDiscrepancia),
            'movimientosPage' => $discrepancias,
        ]);
    }

    /**
     * Muestra el detalle de un movimiento
     */
    public function show(Movimiento $movimiento)
    {
        $estadosPermitidos = ['recibido_completo', 'recibido_parcial', 'rechazado'];
        
        if (!in_array($movimiento->estado, $estadosPermitidos)) {
            return back()->withErrors([
                'general' => 'El movimiento aún está en proceso. Solo puedes ver detalles de movimientos recibidos o rechazados.'
            ]);
        }

        $movimiento->load([
            'almacenOrigen',
            'almacenDestino',
            'usuario',
            'detalles.producto.categoria',
            'detalles.producto.almacenes',
            'seguimientos.usuario'
        ]);

        return Inertia::render('Movimientos/Show', [
            'movimiento' => $movimiento,
            'estados' => [
                'pendiente_confirmacion' => 'Pendiente Confirmación',
                'en_transito' => 'En Tránsito',
                'recibido_parcial' => 'Recibido Parcial',
                'recibido_completo' => 'Recibido Completo',
                'rechazado' => 'Rechazado',
                'cancelado' => 'Cancelado'
            ]
        ]);
    }
}
