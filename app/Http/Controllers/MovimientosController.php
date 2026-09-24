<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\MovimientoDetalle;
use App\Models\MovimientoSeguimiento;
use App\Models\Producto;
use App\Models\User;
use App\Notifications\MovimientoStockNotification;
use App\Notifications\ProrrateoRequeridoNotification;
use App\Services\CodigoStockService;
use App\Services\LoteConsumoService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MovimientosController extends Controller
{
    /**
     * Envía notificaciones a usuarios relevantes para movimientos
     */
    private function notificarMovimiento($movimiento, $mensajePersonalizado = null)
    {
        try {
            $notificationService = new NotificationService;
            $datosNotificacion = $notificationService->prepararDatosMovimiento($movimiento);
            $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

            Notification::send($usuariosParaNotificar, new MovimientoStockNotification($movimiento, $mensajePersonalizado));
        } catch (\Exception $e) {
            \Log::error('Error notificación movimiento: '.$e->getMessage());
        }
    }

    /**
     * Avisa a admin/moderador que un movimiento en tránsito quedó marcado como
     * "requiere_prorrateo" — el prorrateo en sí es una acción libre (no bloquea recibir()),
     * esto es solo la alerta para que no se les pierda de vista.
     */
    private function notificarProrrateoRequerido($movimiento)
    {
        try {
            $usuarios = User::whereIn('role', ['admin', 'moderador'])->get();
            Notification::send($usuarios, new ProrrateoRequeridoNotification($movimiento));
        } catch (\Exception $e) {
            \Log::error('Error notificación de prorrateo requerido: '.$e->getMessage());
        }
    }

    /**
     * Obtiene almacenes según rol del usuario
     */
    private function getPermittedAlmacenes()
    {
        $user = Auth::user();

        return in_array($user->role, ['admin', 'moderador'])
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
        $userAlmacenesIds = in_array($user->role, ['admin', 'moderador']) ? [] : $user->almacenes()->pluck('id')->toArray();

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
                'cancelado' => 'Cancelado',
            ],
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
        if (! in_array($user->role, ['admin', 'moderador'])) {
            $userAlmacenesIds = $user->almacenes->pluck('id');
            if (! $userAlmacenesIds->contains($almacen->id)) {
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
            })
            // Con 0 disponible no hay nada que trasladar — ocultarlos evita un listado
            // interminable de productos que existen en el almacén pero no se pueden mover
            // ahora mismo (agotados, o su stock ya está reservado en otro movimiento).
            ->filter(fn ($producto) => $producto['stock_disponible'] >= 1)
            ->values();

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

        if (! in_array($user->role, ['admin', 'moderador'])) {
            if (! $almacenesPermitidosIds->contains($request->almacen_origen_id)) {
                throw ValidationException::withMessages([
                    'almacen_origen_id' => 'No tienes permisos sobre este almacén de origen',
                ]);
            }
        }

        DB::beginTransaction();

        try {
            foreach ($request->productos as $producto) {
                $stock = AlmacenProducto::where([
                    'almacen_id' => $request->almacen_origen_id,
                    'producto_id' => $producto['id'],
                ])->first();

                $disponible = ($stock ? $stock->cantidad - $stock->cantidad_en_transito : 0);

                if (! $stock || $disponible < $producto['cantidad']) {
                    throw new \Exception(
                        "Stock insuficiente para el producto ID: {$producto['id']}. ".
                            "Disponible: {$disponible}, Solicitado: {$producto['cantidad']}"
                    );
                }
            }

            // Vendedor: condicional — no tiene sentido prorratear un traslado dentro de sus
            // propios almacenes, solo cuando el destino no es suyo (evita llenar la cola de
            // pendientes con movimientos que nunca lo necesitarían).
            // Admin/moderador: siempre true, sin condición — no depende de si "casualmente"
            // tienen algún almacén asignado en user_almacens (hoy no lo tienen, pero apoyarse en
            // esa coincidencia sería frágil). Un admin que despacha un contenedor completo hacia
            // otro punto de venta también debe poder decidir el prorrateo, siempre.
            $requiereProrrateo = $user->role === 'vendedor'
                ? ! $user->almacenes()->where('almacens.id', $request->almacen_destino_id)->exists()
                : true;

            $movimiento = Movimiento::create([
                'almacen_origen_id' => $request->almacen_origen_id,
                'almacen_destino_id' => $request->almacen_destino_id,
                'user_id' => $user->id,
                'tipo_movimiento' => 'traslado',
                'estado' => 'pendiente_confirmacion',
                'observaciones' => $request->observaciones,
                'requiere_prorrateo' => $requiereProrrateo,
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

            return back()->withErrors(['general' => 'Error: '.$e->getMessage()])->withInput();
        }
    }

    /**
     * Edita los productos/cantidades de un movimiento — solo permitido mientras esté
     * pendiente_confirmacion (antes de enviar()). Pedido del cliente: por error humano
     * puede faltar o sobrar algún producto antes de despachar. No permite cambiar
     * almacén origen/destino — si hace falta otro almacén, se rechaza el movimiento y
     * se crea uno nuevo (decisión explícita del cliente, no un límite técnico).
     */
    public function actualizar(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (! $almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para editar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            if ($movimiento->estado !== 'pendiente_confirmacion') {
                throw new \Exception('Solo se pueden editar movimientos pendientes de confirmación (antes de enviar).');
            }

            // Nada se reservó todavía en este estado (cantidad_en_transito solo se toca en
            // enviar()), así que el chequeo de stock es el mismo que en store(): disponible
            // real del almacén, sin descontar nada de este movimiento.
            foreach ($request->productos as $producto) {
                $stock = AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $producto['id'],
                ])->first();

                $disponible = ($stock ? $stock->cantidad - $stock->cantidad_en_transito : 0);

                if (! $stock || $disponible < $producto['cantidad']) {
                    throw new \Exception(
                        "Stock insuficiente para el producto ID: {$producto['id']}. ".
                            "Disponible: {$disponible}, Solicitado: {$producto['cantidad']}"
                    );
                }
            }

            $productosEnviados = collect($request->productos)->keyBy('id');
            $detallesActuales = $movimiento->detalles()->get()->keyBy('producto_id');

            // Actualiza o crea una línea por cada producto que llegó en el request.
            foreach ($productosEnviados as $productoId => $producto) {
                $detalle = $detallesActuales->get($productoId);
                if ($detalle) {
                    $detalle->update(['cantidad_solicitada' => $producto['cantidad']]);
                } else {
                    MovimientoDetalle::create([
                        'movimiento_id' => $movimiento->id,
                        'producto_id' => $productoId,
                        'cantidad_solicitada' => $producto['cantidad'],
                    ]);
                }
            }

            // Borra las líneas que existían pero ya no vinieron en el request (el usuario
            // quitó ese producto del movimiento).
            $idsAEliminar = $detallesActuales->keys()->diff($productosEnviados->keys());
            if ($idsAEliminar->isNotEmpty()) {
                MovimientoDetalle::where('movimiento_id', $movimiento->id)
                    ->whereIn('producto_id', $idsAEliminar)
                    ->delete();
            }

            MovimientoSeguimiento::create([
                'movimiento_id' => $movimiento->id,
                'estado' => 'pendiente_confirmacion',
                'observaciones' => 'Productos/cantidades editados antes de despachar.',
                'user_id' => $user->id,
            ]);

            DB::commit();

            $this->notificarMovimiento($movimiento, "Movimiento #{$movimiento->id} editado");

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento actualizado correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al editar movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: '.$e->getMessage()]);
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

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (! $almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
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
                    'producto_id' => $detalle->producto_id,
                ])->first();

                $disponible = ($stock ? $stock->cantidad - $stock->cantidad_en_transito : 0);

                if (! $stock || $disponible < $detalle->cantidad_solicitada) {
                    throw new \Exception(
                        "Stock insuficiente para el producto ID: {$detalle->producto_id}. ".
                            "Disponible: {$disponible}, Solicitado: {$detalle->cantidad_solicitada}"
                    );
                }

                AlmacenProducto::where([
                    'almacen_id' => $movimiento->almacen_origen_id,
                    'producto_id' => $detalle->producto_id,
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
                'observaciones' => 'Movimiento despachado'.
                    ($request->guia_transporte ? ". Guía: {$request->guia_transporte}" : ''),
                'user_id' => $user->id,
            ]);

            DB::commit();

            // Notificar a usuarios relevantes
            $this->notificarMovimiento($movimiento, "Movimiento #{$movimiento->id} enviado");

            if ($movimiento->requiere_prorrateo) {
                $this->notificarProrrateoRequerido($movimiento);
            }

            return redirect()->route('movimientos.index')
                ->with('success', 'Movimiento despachado y en tránsito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error al enviar movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: '.$e->getMessage()]);
        }
    }

    /**
     * Recibe un movimiento (parcial o completo)
     * Puede afectar cuando es menor o mayor la cantidad de productos
     *
     * NOTA: no hay ningún chequeo de "requiere_prorrateo"/"prorrateo_decision" aquí a propósito
     * — el cliente confirmó explícitamente que el prorrateo es una acción libre para
     * admin/moderador (desde Distribución de Costos), no un requisito para recibir. No
     * reintroducir un bloqueo aquí sin que el cliente lo pida de nuevo.
     */
    public function recibir(Movimiento $movimiento, Request $request)
    {
        $user = Auth::user();

        $request->validate([
            'productos' => 'required|array',
            'productos.*.id' => 'required|exists:productos,id',
            'productos.*.cantidad_recibida' => 'required|integer|min:0',
        ]);

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (! $almacenesPermitidosIds->contains($movimiento->almacen_destino_id)) {
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
            $totalDiferencias = 0;
            $numeroLinea = 0;

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
                                'producto_id' => $producto['id'],
                            ],
                            ['cantidad' => 0]
                        );

                        $nuevaCantidad = $almacenProductoDestino->cantidad + $cantidadRecibida;
                        $almacenProductoDestino->update(['cantidad' => $nuevaCantidad]);

                        // Consume del/los lote(s) reales del almacén origen (FIFO — más viejo
                        // primero) en vez de asumir el costo global del producto: si el origen
                        // tenía 2+ lotes a precio distinto, el traslado puede cruzar más de uno.
                        // Nace en destino UN lote por cada origen consumido, preservando su
                        // costo real y trazando `lote_origen_id` — necesario para que
                        // Distribución de Costos ubique la cadena completa cuando prorratea por
                        // compra (ver LoteStock::idsConDescendientes()). Sin lotes registrados
                        // en origen (producto viejo, o dato de antes de 2026-09-07) cae al costo
                        // global de la ficha, igual que siempre.
                        $consumido = app(LoteConsumoService::class)->consumir(
                            $producto['id'],
                            $movimiento->almacen_origen_id,
                            $cantidadRecibida
                        );

                        foreach ($consumido as $parte) {
                            $numeroLinea++;
                            LoteStock::create([
                                'codigo' => LoteStock::generarCodigoMovimiento($movimiento->id, $numeroLinea),
                                'movimiento_id' => $movimiento->id,
                                'lote_origen_id' => $parte['lote']?->id,
                                'producto_id' => $producto['id'],
                                'almacen_id' => $movimiento->almacen_destino_id,
                                'cantidad' => $parte['cantidad'],
                                'cantidad_disponible' => $parte['cantidad'],
                                'precio_costo' => $parte['costo_unitario'],
                            ]);
                        }

                        // Reparto de códigos de barras por almacén: salen del origen (primero el
                        // código que más tiene ahí) y llegan al destino con el mismo código.
                        app(CodigoStockService::class)->mover(
                            (int) $producto['id'],
                            (int) $movimiento->almacen_origen_id,
                            (int) $movimiento->almacen_destino_id,
                            (int) $cantidadRecibida
                        );
                    }

                    // Al enviar, se incrementó cantidad_en_transito pero se mantuvo cantidad
                    // Ahora, para completar el movimiento, debemos reducir la cantidad original en el origen
                    AlmacenProducto::where([
                        'almacen_id' => $movimiento->almacen_origen_id,
                        'producto_id' => $detalle->producto_id,
                    ])->decrement('cantidad', $detalle->cantidad_despachada);

                    AlmacenProducto::where([
                        'almacen_id' => $movimiento->almacen_origen_id,
                        'producto_id' => $detalle->producto_id,
                    ])->decrement('cantidad_en_transito', $detalle->cantidad_despachada);

                    if ($diferencia > 0) {
                        // Si se reciben menos unidades de las despachadas, las diferencias se mantienen en el almacén de origen
                        // Incrementamos el stock del emisor con las unidades no recibidas
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id,
                        ])->increment('cantidad', $diferencia);
                        $totalDiferencias += $diferencia;
                    } elseif ($diferencia < 0) {
                        // Si se reciben más unidades de las despachadas, se ajusta el stock del emisor
                        $diferenciaNegativa = abs($diferencia);
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id,
                        ])->decrement('cantidad', $diferenciaNegativa);
                        $totalDiferencias -= $diferenciaNegativa;
                    }

                    $totalRecibido += $cantidadRecibida;
                    $totalSolicitado += $detalle->cantidad_solicitada;
                }
            }

            // Determinar el nuevo estado: "completo" exige que CADA línea haya recibido
            // exactamente lo despachado, ni de menos ni de más — comparar solo la suma total
            // (como antes) podía marcar "completo" un movimiento donde a un producto le faltó
            // 1 y a otro le sobró 1, porque en el total se cancelaban entre sí.
            $esCompleto = true;
            foreach ($movimiento->detalles as $detalle) {
                if ((int) $detalle->cantidad_recibida !== (int) $detalle->cantidad_despachada) {
                    $esCompleto = false;
                    break;
                }
            }
            $nuevoEstado = $esCompleto ? 'recibido_completo' : 'recibido_parcial';

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

            return back()->withErrors(['general' => 'Error: '.$e->getMessage()]);
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

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $almacenesPermitidosIds = $user->almacenes->pluck('id');
            if (! $almacenesPermitidosIds->contains($movimiento->almacen_origen_id)) {
                abort(403, 'No tienes permisos para rechazar movimientos de este almacén');
            }
        }

        DB::beginTransaction();

        try {
            if (! in_array($movimiento->estado, ['pendiente_confirmacion', 'en_transito'])) {
                throw new \Exception('Solo se pueden rechazar movimientos pendientes o en tránsito.');
            }

            if ($movimiento->estado === 'en_transito') {
                foreach ($movimiento->detalles as $detalle) {
                    if ($detalle->cantidad_despachada > 0) {
                        // enviar() solo reserva cantidad_en_transito; cantidad nunca se
                        // decrementó en el origen (eso solo pasa en recibir()). Rechazar un
                        // envío en tránsito debe liberar la reserva, no sumar stock que
                        // nunca salió.
                        AlmacenProducto::where([
                            'almacen_id' => $movimiento->almacen_origen_id,
                            'producto_id' => $detalle->producto_id,
                        ])->decrement('cantidad_en_transito', $detalle->cantidad_despachada);
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

            return back()->withErrors(['general' => 'Error: '.$e->getMessage()]);
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
        $movimiento->load([
            'almacenOrigen',
            'almacenDestino',
            'usuario',
            'detalles.producto.categoria',
            'detalles.producto.almacenes',
            'seguimientos.usuario',
        ]);

        return Inertia::render('Movimientos/Show', [
            'movimiento' => $movimiento,
            'estados' => [
                'pendiente_confirmacion' => 'Pendiente Confirmación',
                'en_transito' => 'En Tránsito',
                'recibido_parcial' => 'Recibido Parcial',
                'recibido_completo' => 'Recibido Completo',
                'rechazado' => 'Rechazado',
                'cancelado' => 'Cancelado',
            ],
        ]);
    }
}
