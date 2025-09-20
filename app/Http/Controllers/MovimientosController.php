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

class MovimientosController extends Controller
{
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
        $movimientos = Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('Movimientos/Index', [
            'almacenes' => $this->getPermittedAlmacenes(),
            'movimientos' => $movimientos,
            'estados' => [
                'pendiente' => 'Pendiente',
                'aprobado' => 'Aprobado',
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

        // Obtener productos con cantidad disponible
        $productos = $almacen->productos()
            ->select('productos.id', 'productos.nombre_producto', 'almacen_producto.cantidad')
            ->get()
            ->map(function ($producto) {
                return [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre_producto,
                    'stock_actual' => $producto->pivot->cantidad,
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

        // Validación básica
        $request->validate([
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
            'observaciones' => ['nullable', 'string', 'max:500'],
        ]);

        // Validación adicional de permisos
        if ($user->role !== 'admin') {
            if (!$almacenesPermitidosIds->contains($request->almacen_origen_id)) {
                throw ValidationException::withMessages([
                    'almacen_origen_id' => 'No tienes permisos sobre este almacén de origen'
                ]);
            }

            if (!$almacenesPermitidosIds->contains($request->almacen_destino_id)) {
                throw ValidationException::withMessages([
                    'almacen_destino_id' => 'No tienes permisos sobre este almacén de destino'
                ]);
            }
        }

        DB::beginTransaction();

        try {
            // Crear el movimiento
            $movimiento = Movimiento::create([
                'almacen_origen_id' => $request->almacen_origen_id,
                'almacen_destino_id' => $request->almacen_destino_id,
                'user_id' => $user->id,
                'tipo_movimiento' => 'traslado',
                'estado' => 'pendiente',
                'observaciones' => $request->observaciones,
            ]);

            // Agregar detalles del movimiento
            foreach ($request->productos as $producto) {
                MovimientoDetalle::create([
                    'movimiento_id' => $movimiento->id,
                    'producto_id' => $producto['id'],
                    'cantidad_solicitada' => $producto['cantidad'],
                    'observaciones' => $producto['observaciones'] ?? null,
                ]);
            }

            // Registrar seguimiento inicial
            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'pendiente',
                'observaciones' => 'Solicitud de movimiento creada',
                'user_id' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('movimientos.index')
                ->with('success', 'Solicitud de movimiento creada exitosamente. Esperando aprobación.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al crear movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Aprueba un movimiento
     */
    public function aprobar(Movimiento $movimiento)
    {
        $user = Auth::user();

        // Verificar permisos
        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para aprobar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            // Verificar que el movimiento esté pendiente
            if ($movimiento->estado !== 'pendiente') {
                throw new \Exception('Solo se pueden aprobar movimientos en estado pendiente.');
            }

            // Verificar stock para cada producto
            foreach ($movimiento->detalles as $detalle) {
                $stock = AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $detalle->producto_id
                ])->first();

                if (!$stock || $stock->cantidad < $detalle->cantidad_solicitada) {
                    throw new \Exception(
                        "Stock insuficiente para el producto: {$detalle->producto->nombre_producto}. " .
                            "Disponible: " . ($stock->cantidad ?? 0) . ", Solicitado: {$detalle->cantidad_solicitada}"
                    );
                }
            }

            // Reservar stock (restar del almacén origen)
            foreach ($movimiento->detalles as $detalle) {
                AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $detalle->producto_id
                ])->decrement('cantidad', $detalle->cantidad_solicitada);

                // Marcar como despachado
                $detalle->update(['cantidad_despachada' => $detalle->cantidad_solicitada]);
            }

            // Actualizar movimiento
            $movimiento->update([
                'estado' => 'aprobado',
                'usuario_aprobacion_id' => $user->id,
                'fecha_aprobacion' => now(),
            ]);

            // Registrar seguimiento
            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'aprobado',
                'observaciones' => 'Movimiento aprobado. Stock reservado.',
                'user_id' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento aprobado exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al aprobar movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()]);
        }
    }

    /**
     * Marca un movimiento como enviado/en tránsito
     */
    public function enviar(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'guia_transporte' => 'nullable|string|max:255',
            'transportista' => 'nullable|string|max:255',
        ]);

        // Verificar permisos
        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para enviar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            // Verificar que el movimiento esté aprobado
            if ($movimiento->estado !== 'aprobado') {
                throw new \Exception('Solo se pueden enviar movimientos en estado aprobado.');
            }

            // Actualizar movimiento
            $movimiento->update([
                'estado' => 'en_transito',
                'guia_transporte' => $request->guia_transporte,
                'transportista' => $request->transportista,
                'fecha_envio' => now(),
            ]);

            // Registrar seguimiento
            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'en_transito',
                'observaciones' => 'Movimiento en tránsito' .
                    ($request->guia_transporte ? ". Guía: {$request->guia_transporte}" : ""),
                'user_id' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento marcado como en tránsito.');
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

        // Verificar permisos
        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_destino_id)) {
                abort(403, 'No tienes permisos para recibir movimientos en este almacén');
            }
        }

        DB::beginTransaction();

        try {
            // Verificar que el movimiento esté en tránsito
            if ($movimiento->estado !== 'en_transito') {
                throw new \Exception('Solo se pueden recibir movimientos en estado en tránsito.');
            }

            $totalRecibido = 0;
            $totalSolicitado = 0;

            // Actualizar cantidades recibidas
            foreach ($request->productos as $producto) {
                $detalle = $movimiento->detalles->where('producto_id', $producto['id'])->first();
                if ($detalle) {
                    $cantidadRecibida = $producto['cantidad_recibida'];

                    // Validar que no se reciba más de lo despachado
                    if ($cantidadRecibida > $detalle->cantidad_despachada) {
                        throw new \Exception("La cantidad recibida no puede ser mayor a la cantidad despachada para el producto ID: {$producto['id']}");
                    }

                    $detalle->update(['cantidad_recibida' => $cantidadRecibida]);

                    // Sumar al almacén destino
                    if ($cantidadRecibida > 0) {
                        AlmacenProducto::updateOrCreate(
                            [
                                'almacen_id' => $movimiento->almacen_destino_id,
                                'producto_id' => $producto['id']
                            ],
                            ['cantidad' => DB::raw("cantidad + $cantidadRecibida")]
                        );
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

            // Registrar seguimiento
            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => $nuevoEstado,
                'observaciones' => "Movimiento recibido. Cantidad: $totalRecibido/$totalSolicitado",
                'user_id' => $user->id,
            ]);

            DB::commit();

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

        // Verificar permisos
        if ($user->role !== 'admin') {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (!$almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para rechazar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            // Verificar que el movimiento esté pendiente
            if ($movimiento->estado !== 'pendiente') {
                throw new \Exception('Solo se pueden rechazar movimientos en estado pendiente.');
            }

            // Si estaba aprobado, devolver el stock al almacén origen
            if ($movimiento->estado === 'aprobado') {
                foreach ($movimiento->detalles as $detalle) {
                    AlmacenProducto::where([
                        'almacen_id' => $movimiento->almacen_origen_id,
                        'producto_id' => $detalle->producto_id
                    ])->increment('cantidad', $detalle->cantidad_despachada);
                }
            }

            // Actualizar movimiento
            $movimiento->update(['estado' => 'rechazado']);

            // Registrar seguimiento
            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'rechazado',
                'observaciones' => $request->observaciones,
                'user_id' => $user->id,
            ]);

            DB::commit();

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento rechazado.');
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
}
