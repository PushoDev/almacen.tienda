<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\DestinatarioVenta;
use App\Models\HistorialStock;
use App\Models\Moneda;
use App\Models\PagoVenta;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Notifications\VentaCreadaNotification;
use App\Notifications\VentaDevueltaNotification;
use App\Notifications\VentaEspecialDecisionNotification;
use App\Notifications\VentaEspecialSolicitudNotification;
use App\Services\CatalogoTarjetasService;
use App\Services\DashboardStatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Milon\Barcode\Facades\DNS2DFacade as DNS2D;

class VentaController extends Controller
{
    // ========================================================================
    // MÉTODOS DE CARGA DE DATOS (API / JSON)
    // ========================================================================

    /**
     * Store a newly created cliente for use during venta process.
     *
     * @return JsonResponse
     */
    public function storeClienteForVenta(Request $request)
    {
        // Primero, verificar si el cliente ya existe (por nombre O teléfono)
        $clienteExistente = Cliente::where('nombre_cliente', $request->nombre_cliente)
            ->orWhere('telefono_cliente', $request->telefono_cliente)
            ->first();

        // Si el cliente ya existe, retornarlo inmediatamente
        if ($clienteExistente) {
            return response()->json([
                'message' => 'Cliente ya existe en el sistema. Usando cliente existente.',
                'cliente' => $clienteExistente,
                'existe' => true,
            ], 200);
        }

        // Validación de datos
        $validator = Validator::make($request->all(), [
            'nombre_cliente' => ['required', 'string'],
            'tipo_cliente' => ['required', 'in:fisico,asociado'],
            'telefono_cliente' => ['required', 'string'],
            'direccion_cliente' => ['nullable', 'string'],
            'ciudad_cliente' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Crear el cliente con deuda_pago_cliente en 0
        $cliente = Cliente::create([
            'nombre_cliente' => $request->nombre_cliente,
            'tipo_cliente' => $request->tipo_cliente ?? 'fisico',
            'deuda_pago_cliente' => 0,
            'telefono_cliente' => $request->telefono_cliente,
            'direccion_cliente' => $request->direccion_cliente ?? null,
            'ciudad_cliente' => $request->ciudad_cliente ?? null,
        ]);

        return response()->json([
            'message' => 'Cliente creado exitosamente para la venta.',
            'cliente' => $cliente,
            'existe' => false,
        ], 201);
    }

    public function getClientesFisicosParaPago()
    {
        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente', 'deuda_pago_cliente')
            ->get();

        return response()->json($clientes);
    }

    /**
     * Busca destinatarios ya usados en ventas anteriores, para autocompletar el
     * formulario cuando la misma persona recibe varias ventas. `destinatarios_venta`
     * guarda una fila por venta (no hay tabla de personas), así que un mismo carnet
     * puede repetirse muchas veces — nos quedamos con el registro más reciente de cada
     * carnet (por si cambió de dirección/teléfono) y descartamos el resto.
     */
    public function buscarDestinatarios(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $destinatarios = DestinatarioVenta::query()
            ->where(function ($query) use ($q) {
                $query->where('nombre', 'like', "%{$q}%")
                    ->orWhere('apellidos', 'like', "%{$q}%")
                    ->orWhere('carnet_identidad', 'like', "%{$q}%");
            })
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get(['id', 'nombre', 'apellidos', 'carnet_identidad', 'direccion_residencia', 'telefono_contacto', 'parentesco_cliente'])
            // El nombre no es identificador único (puede haber dos personas distintas con
            // el mismo nombre) — el carnet sí. Los que no tienen carnet (columna nullable,
            // dato histórico) se muestran todos por separado, sin agrupar.
            ->unique(fn ($d) => $d->carnet_identidad ?: 'sin-carnet-'.$d->id)
            ->values();

        return response()->json($destinatarios);
    }

    /**
     * Cargar Almacenes accesibles para el usuario autenticado.
     */
    public function getAlmacenes()
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $almacenes = in_array($user->role, ['admin', 'moderador'])
            ? Almacen::with('mensajeroCuenta')->select('id', 'nombre_almacen', 'mensajero_cuenta_id')->get()
            : ($user ? $user->almacenes()->with('mensajeroCuenta')->select('id', 'nombre_almacen', 'mensajero_cuenta_id')->get() : collect());

        return response()->json($almacenes->map(fn ($a) => [
            'id' => $a->id,
            'nombre_almacen' => $a->nombre_almacen,
            'mensajero_cuenta_id' => $a->mensajero_cuenta_id,
            'mensajero_cuenta' => $a->mensajeroCuenta ? [
                'id' => $a->mensajeroCuenta->id,
                'nombre' => $a->mensajeroCuenta->nombre_cuenta,
            ] : null,
        ]));
    }

    /**
     * Cargar Productos por Almacén, aplicando precios de venta del vendedor si existen.
     */
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Usuario no autenticado'], 403);
        }

        // Validación de acceso al almacén (solo para no-admins)
        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains('id', $id)) {
            return response()->json(['error' => 'Acceso denegado al almacén'], 403);
        }

        // Precargar precios del almacén — una fila única por producto
        $preciosAlmacen = DB::table('producto_vendedors')
            ->where('almacen_id', $id)
            ->get()
            ->keyBy('producto_id');

        $productos = Producto::whereHas('almacenes', function ($q) use ($id) {
            $q->where('almacens.id', $id);
        })
            ->with([
                'categoria',
                'codigos',
                'almacenes' => function ($q) use ($id) {
                    $q->where('almacens.id', $id)
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad');
                },
            ])
            ->get()
            ->map(function ($producto) use ($preciosAlmacen) {
                $precioRow = $preciosAlmacen->get($producto->id);
                $almacen = $producto->almacenes->first();

                $user = Auth::user();

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'color_producto' => $producto->color_producto,
                    'categoria_nombre' => $producto->categoria?->nombre_categoria ?? 'Sin categoría',
                    'precio_compra_producto' => in_array($user->role, ['admin', 'moderador']) ? $producto->precio_compra_producto : null,
                    'stock_disponible' => $almacen?->pivot->cantidad ?? 0,
                    'precio_venta' => $precioRow ? (float) $precioRow->precio_venta : null,
                    'tiene_precio' => ($precioRow?->precio_venta ?? 0) > 0,
                    'imagen_url' => $producto->imagen_url,
                    'codigo_barras' => $producto->codigo_producto,
                    'codigos' => $producto->codigos->map(fn ($c) => [
                        'id' => $c->id,
                        'codigo_barras' => $c->codigo_barras,
                        'cantidad' => $c->cantidad,
                        'es_default' => (bool) $c->es_default,
                    ]),
                    'barcode_image_url' => $producto->barcode_image_url,
                    'precio_base' => $precioRow ? (float) $precioRow->precio_venta : null,
                    'comision' => $precioRow ? (float) ($precioRow->comision ?? 0) : 0,
                    'es_precio_vendedor' => false,
                ];
            });

        return response()->json($productos->filter(fn ($p) => $p['tiene_precio'])->values());
    }

    /**
     * Cargar todos los Clientes.
     */
    public function getClientes()
    {
        $clientes = Cliente::select('id', 'nombre_cliente')->get();

        return response()->json($clientes);
    }

    /**
     * Cargar Cuentas accesibles para el usuario autenticado.
     */
    public function getCuentas()
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        // Filtrar cuentas: admins ven todas, vendedores solo las suyas
        $query = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta');

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $cuentas = $query->get()
            ->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre_cuenta' => $cuenta->nombre_cuenta,
                    'saldo_actual' => $cuenta->saldo_cuenta,
                    'moneda' => $cuenta->moneda ? [
                        'id' => $cuenta->moneda->id,
                        'codigo' => $cuenta->moneda->codigo_moneda,
                        'nombre' => $cuenta->moneda->nombre_moneda,
                        'simbolo' => $cuenta->moneda->simbolo_moneda,
                        'tasa_cambio' => $cuenta->moneda->tasa_cambio,
                    ] : [
                        'codigo' => $cuenta->tipo_moneda,
                        'nombre' => $cuenta->tipo_moneda,
                        'simbolo' => $cuenta->tipo_moneda,
                    ],
                ];
            });

        return response()->json($cuentas);
    }

    /**
     * Cargar cuentas filtradas por moneda y método de pago - MEJORADO
     * Filtra cuentas según el método de pago:
     * - efectivo → tipo = 'efectivo'
     * - transferencia → tipo = 'tarjeta'
     */
    public function getCuentasFiltradas(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $request->validate([
            'moneda_id' => 'required|exists:monedas,id',
            'metodo_pago' => 'nullable|in:efectivo,transferencia',
        ]);

        $moneda = Moneda::find($request->moneda_id);
        if (! $moneda) {
            return response()->json([]);
        }

        // MEJORADO: Buscar cuentas que coincidan EXACTAMENTE con la moneda seleccionada
        // y filtrar por usuario si no es admin
        $query = Cuenta::with('moneda')
            ->where(function ($baseQuery) use ($moneda) {
                // Cuentas con moneda_id que coincide exactamente
                $baseQuery->where(function ($query) use ($moneda) {
                    $query->where('moneda_id', $moneda->id);
                })
                    ->orWhere(function ($query) use ($moneda) {
                        // Cuentas legacy con tipo_moneda que coincide exactamente con el código
                        $query->whereNull('moneda_id')
                            ->where('tipo_moneda', $moneda->codigo_moneda);
                    });
            })
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta', 'tipo');

        // ✅ NUEVO: Filtrar por tipo de cuenta según método de pago
        if ($request->has('metodo_pago') && $request->metodo_pago) {
            if ($request->metodo_pago === 'efectivo') {
                $query->where('tipo', 'efectivo');
            } elseif ($request->metodo_pago === 'transferencia') {
                $query->where('tipo', 'tarjeta');
            }
        }

        // Filtrar por usuario si no es admin
        if (! in_array($user->role, ['admin', 'moderador'])) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $cuentas = $query->get()
            ->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre_cuenta' => $cuenta->nombre_cuenta,
                    'saldo_actual' => $cuenta->saldo_cuenta,
                    'moneda' => $cuenta->moneda ? [
                        'id' => $cuenta->moneda->id,
                        'codigo' => $cuenta->moneda->codigo_moneda,
                        'nombre' => $cuenta->moneda->nombre_moneda,
                        'simbolo' => $cuenta->moneda->simbolo_moneda,
                    ] : [
                        'codigo' => $cuenta->tipo_moneda,
                        'nombre' => $cuenta->tipo_moneda,
                        'simbolo' => $cuenta->tipo_moneda,
                    ],
                ];
            });

        return response()->json($cuentas);
    }

    /**
     * Cargar Cuentas accesibles para gestores en ventas.
     */
    public function getCuentasParaGestor(Request $request)
    {
        $user = Auth::user();

        $query = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta', 'tipo');

        // No-admin: solo sus cuentas
        if (! in_array($user->role, ['admin', 'moderador'])) {
            $query->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $cuentas = $query->get()->map(function ($cuenta) {
            return [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'saldo_actual' => $cuenta->saldo_cuenta,
                'moneda' => [
                    'codigo' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                    'simbolo' => $cuenta->moneda?->simbolo_moneda ?? $cuenta->tipo_moneda,
                    'tasa_cambio' => (float) ($cuenta->moneda?->tasa_cambio ?? 1),
                ],
                'tipo' => $cuenta->tipo,
            ];
        });

        return response()->json($cuentas);
    }

    /**
     * Cargar todas las monedas activas - MEJORADO
     */
    public function getMonedas()
    {
        $monedas = Moneda::where('estado', true)->get();

        // MEJORADO: Asegurar que los IDs sean consistentes
        $monedasFormateadas = $monedas->map(function ($moneda) {
            return [
                'id' => (string) $moneda->id, // Convertir a string para consistencia con frontend
                'codigo_moneda' => $moneda->codigo_moneda,
                'nombre_moneda' => $moneda->nombre_moneda,
                'simbolo_moneda' => $moneda->simbolo_moneda,
                'tasa_cambio' => (float) $moneda->tasa_cambio,
                'principal' => (bool) $moneda->principal,
                'estado' => (bool) $moneda->estado,
            ];
        });

        return response()->json($monedasFormateadas);
    }

    /**
     * Devuelve un reporte de ventas agregado por período (diario, semanal, mensual).
     *
     * @return JsonResponse
     */
    public function getVentasReporte(Request $request, DashboardStatsService $dashboardStatsService)
    {
        $request->validate([
            'periodo' => 'required|in:diario,semanal,mensual',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'Usuario no autenticado'], 401);
        }

        $periodo = $request->input('periodo');
        $kpis = $dashboardStatsService->getPeriodKpis($user, $periodo);

        return response()->json($kpis['legacy_ventas']);
    }

    // ========================================================================
    // MÉTODOS DE VISTA (INERTIA)
    // ========================================================================

    /**
     * Muestra la vista principal para realizar ventas - MEJORADO
     */
    public function index()
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $monedas = Moneda::where('estado', true)->get()
            ->map(function ($moneda) {
                return [
                    'id' => (string) $moneda->id, // Convertir a string para consistencia
                    'codigo_moneda' => $moneda->codigo_moneda,
                    'nombre_moneda' => $moneda->nombre_moneda,
                    'simbolo_moneda' => $moneda->simbolo_moneda,
                    'tasa_cambio' => (float) $moneda->tasa_cambio,
                    'principal' => (bool) $moneda->principal,
                    'estado' => (bool) $moneda->estado,
                ];
            });

        // Obtener cuentas accesibles del usuario
        $cuentasQuery = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta');

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $cuentasQuery->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $cuentas = $cuentasQuery->get()->map(function ($cuenta) {
            return [
                'id' => (string) $cuenta->id,
                'nombre' => $cuenta->nombre_cuenta,
                'saldo' => (float) $cuenta->saldo_cuenta,
                'moneda' => $cuenta->moneda ? [
                    'id' => (string) $cuenta->moneda->id,
                    'codigo' => $cuenta->moneda->codigo_moneda,
                ] : null,
            ];
        });

        return Inertia::render('Vendor/Index', [
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => in_array($user->role, ['admin', 'moderador'])
                    ? Almacen::select('id', 'nombre_almacen')->get()->map(fn ($a) => ['id' => (string) $a->id, 'nombre' => $a->nombre_almacen])
                    : $user->almacenes->map(fn ($a) => ['id' => (string) $a->id, 'nombre' => $a->nombre_almacen]),
                'cuentas_usuario' => $cuentas,
                'monedas' => $monedas,
            ],
        ]);
    }

    /**
     * Muestra la vista de reporte diario de ventas.
     */
    public function showReporteDiarioView()
    {
        return Inertia::render('Vendor/ReporteDiario');
    }

    /**
     * Muestra los detalles de una venta específica.
     */
    public function show($id)
    {
        $venta = Venta::with([
            'destinatario',
            'detalles.producto.categoria',
            'detalles.productoCodigo',
            'pagos.cuenta.moneda',
            'pagos.cliente',
            'pagos.moneda',
            'cliente',
            'almacen.mensajeroCuenta',
            'usuario',
            'turnoVendedor',
            'moneda',
            'monedaCobro',
            'gestorCuenta.moneda',
            'mensajeroCuenta.moneda',
            'mensajeroMoneda',
            'mensajeroOrigenCuenta',
            'comisionCuenta.moneda',
        ])->findOrFail($id);

        if (! $this->puedeGestionarVenta($venta)) {
            abort(403, 'No tienes permiso para ver esta venta.');
        }

        $ventaData = [
            'id' => $venta->id,
            'almacen' => [
                'id' => $venta->almacen->id,
                'nombre' => $venta->almacen->nombre_almacen,
                'mensajero_cuenta_id' => $venta->almacen->mensajero_cuenta_id,
                'mensajero_cuenta' => $venta->almacen->mensajeroCuenta ? [
                    'id' => $venta->almacen->mensajeroCuenta->id,
                    'nombre' => $venta->almacen->mensajeroCuenta->nombre_cuenta,
                ] : null,
            ],
            'cliente' => $venta->cliente ? [
                'id' => $venta->cliente->id,
                'nombre' => $venta->cliente->nombre_cliente,
            ] : null,
            'destinatario' => $venta->destinatario ? [
                'id' => $venta->destinatario->id,
                'nombre' => $venta->destinatario->nombre,
                'apellidos' => $venta->destinatario->apellidos,
                'carnet_identidad' => $venta->destinatario->carnet_identidad,
                'direccion_residencia' => $venta->destinatario->direccion_residencia,
                'telefono_contacto' => $venta->destinatario->telefono_contacto,
                'parentesco_cliente' => $venta->destinatario->parentesco_cliente,
                'observaciones' => $venta->destinatario->observaciones,
            ] : null,
            'items' => $venta->detalles->map(function ($detalle) {
                $user = Auth::user();

                return [
                    'id' => $detalle->id,
                    'producto' => [
                        'id' => $detalle->producto->id,
                        'nombre' => $detalle->producto->nombre_producto,
                        'marca' => $detalle->producto->marca_producto,
                        'modelo' => $detalle->producto->modelo_producto,
                        'capacidad' => $detalle->producto->capacidad_producto,
                        'color' => $detalle->producto->color_producto,
                        'codigo' => $detalle->producto->codigo_producto,
                        'codigo_vendido' => $detalle->productoCodigo?->codigo_barras ?? $detalle->producto->codigo_producto,
                        'imagen_url' => $detalle->producto->imagen_url,
                        'categoria' => $detalle->producto->categoria->nombre_categoria ?? 'Sin categoría',
                    ],
                    'cantidad' => $detalle->cantidad,
                    'precio_venta' => $detalle->precio_venta,
                    'precio_base' => $detalle->precio_base,
                    'subtotal' => $detalle->subtotal,
                    'costo_unitario' => in_array($user->role, ['admin', 'moderador']) ? $detalle->costo_unitario : null,
                    'ganancia' => $detalle->ganancia,
                    'comision_unitaria' => (float) $detalle->comision_unitaria,
                ];
            }),
            'total' => $venta->total,
            'total_ganancia' => $venta->total_ganancia,
            'total_comision' => (float) $venta->total_comision,
            'ganancia_agencia' => round($venta->detalles->sum(fn ($d) => (float) $d->ganancia - ((float) $d->comision_unitaria * $d->cantidad)
            ), 2),
            'total_esperado_usd' => $venta->total_esperado_usd,
            'ganancia_perdida_cambiaria' => $venta->ganancia_perdida_cambiaria,
            'ganancia_real_total' => $venta->ganancia_real_total,
            'estado' => $venta->estado,
            'motivo_anulacion' => $venta->motivo_anulacion,
            'detalle_anulacion' => $venta->detalle_anulacion,
            'fecha' => $venta->created_at->toISOString(),
            'usuario' => [
                'id' => $venta->usuario->id,
                'nombre' => $venta->usuario->name,
                'email' => $venta->usuario->email,
                'rol' => $venta->usuario->role,
            ],
            // Quién atendía realmente (feature "Atendido por" / Turnos) — distinto de
            // `usuario` (cuenta de punto de venta), salvo cuando no hay turno (admin, que
            // nunca captura uno, o ventas anteriores a esta feature): ahí se cae al nombre
            // de la cuenta, que para admin ya es la persona real.
            'atendido_por' => $venta->turnoVendedor?->nombre_vendedor ?? $venta->usuario->name,
            'pagos' => $venta->pagos->map(function ($pago) {
                // ✅ DETERMINAR TIPO DE DESTINO
                $destinoTipo = $pago->cliente_id ? 'cliente' : 'cuenta';

                return [
                    'metodo' => $pago->tipo_pago,
                    'moneda' => $pago->moneda ? [
                        'id' => $pago->moneda->id,
                        'codigo' => $pago->moneda->codigo_moneda,
                        'nombre' => $pago->moneda->nombre_moneda,
                    ] : null,
                    'monto' => $pago->monto,
                    'via' => $pago->via_pago,
                    'tasa_cambio' => $pago->tasa_cambio_aplicada,
                    'monto_equivalente' => $pago->monto_equivalente,
                    // ✅ NUEVO: Información del destino
                    'destino_tipo' => $destinoTipo,
                    // ✅ SI ES CLIENTE: mostrar info del cliente destino
                    'cliente_destino' => $pago->cliente ? [
                        'id' => $pago->cliente->id,
                        'nombre' => $pago->cliente->nombre_cliente,
                        'tipo_cliente' => $pago->cliente->tipo_cliente,
                        'deuda_actual' => $pago->cliente->deuda_pago_cliente,
                    ] : null,
                    // ✅ SI ES CUENTA: mantener estructura existente
                    'cuenta' => $pago->cuenta ? [
                        'id' => $pago->cuenta->id,
                        'nombre' => $pago->cuenta->nombre_cuenta,
                        'tipo' => $pago->cuenta->tipo,
                        // Feature "Cuentas → tarjetas bancarias" (ver CatalogoTarjetasService) —
                        // mismo mecanismo que CuentaController, para mostrar el logo/insignia
                        // real de la cuenta en la fila "Destino" de Detalles de Pago.
                        'banco' => CatalogoTarjetasService::porSlug($pago->cuenta->imagen),
                        'moneda' => $pago->cuenta->moneda ? [
                            'id' => $pago->cuenta->moneda->id,
                            'codigo' => $pago->cuenta->moneda->codigo_moneda,
                            'nombre' => $pago->cuenta->moneda->nombre_moneda,
                        ] : null,
                    ] : null,
                ];
            }),
            'total_pagado' => $venta->pagos->sum('monto_equivalente'),
            'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
            // ✅ NUEVO: Totales por tipo de destino
            'total_pagado_clientes' => $venta->pagos->whereNotNull('cliente_id')->sum('monto'),
            'total_pagado_cuentas' => $venta->pagos->whereNotNull('cuenta_id')->sum('monto'),
            'moneda_principal' => $venta->moneda ? [
                'id' => $venta->moneda->id,
                'codigo' => $venta->moneda->codigo_moneda,
                'nombre' => $venta->moneda->nombre_moneda,
                'simbolo' => $venta->moneda->simbolo_moneda,
            ] : null,
            'tasa_cambio_principal' => $venta->tasa_cambio_principal,
            'tasa_aplicada_venta' => $venta->tasa_aplicada_venta,
            'moneda_cobro' => $venta->monedaCobro ? [
                'id' => $venta->monedaCobro->id,
                'codigo' => $venta->monedaCobro->codigo_moneda,
                'nombre' => $venta->monedaCobro->nombre_moneda,
                'simbolo' => $venta->monedaCobro->simbolo_moneda,
            ] : null,
            'monedas_para_reporte' => $this->buildMonedasParaReporte($venta),
            'monto_diferencia_cambiaria' => $venta->monto_diferencia_cambiaria,
            'es_venta_especial' => (bool) $venta->es_venta_especial,
            'nota_venta_especial' => $venta->nota_venta_especial,
            'decision_notificada' => (bool) $venta->decision_notificada,
            'mensajero' => $venta->mensajero_monto > 0 ? [
                'monto' => (float) $venta->mensajero_monto,
                'tipo' => $venta->mensajero_tipo,
                'moneda' => $venta->mensajeroMoneda?->codigo_moneda ?? 'USD',
                'moneda_id' => $venta->mensajero_moneda_id,
                'monto_original' => $venta->mensajero_monto_original ? (float) $venta->mensajero_monto_original : null,
                'tasa_entrada' => $venta->mensajero_tasa_entrada ? (float) $venta->mensajero_tasa_entrada : null,
                'tasa' => $venta->mensajero_tasa ? (float) $venta->mensajero_tasa : null,
                'monto_cup' => $venta->mensajero_tasa > 0
                    ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
                    : null,
                'monto_final_cup' => $venta->mensajero_monto_final_cup ? (float) $venta->mensajero_monto_final_cup : null,
                'cuenta' => $venta->mensajeroCuenta ? [
                    'id' => $venta->mensajeroCuenta->id,
                    'nombre' => $venta->mensajeroCuenta->nombre_cuenta,
                    'moneda' => $venta->mensajeroCuenta->moneda?->codigo_moneda,
                ] : null,
                'cuenta_origen' => $venta->mensajeroOrigenCuenta ? [
                    'id' => $venta->mensajeroOrigenCuenta->id,
                    'nombre' => $venta->mensajeroOrigenCuenta->nombre_cuenta,
                ] : null,
            ] : null,
            'comision_pago' => $venta->comision_cuenta_id ? [
                'tasa' => $venta->comision_tasa ? (float) $venta->comision_tasa : null,
                'monto_cup' => ($venta->comision_tasa > 0)
                    ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
                    : null,
                'cuenta' => $venta->comisionCuenta ? [
                    'id' => $venta->comisionCuenta->id,
                    'nombre' => $venta->comisionCuenta->nombre_cuenta,
                    'moneda' => $venta->comisionCuenta->moneda?->codigo_moneda,
                    'saldo_disponible' => (float) $venta->comisionCuenta->saldo_cuenta,
                ] : null,
            ] : null,
            'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
                'monto' => (float) $venta->gestor_monto,
                'monto_usd' => $venta->tasa_aplicada_gestor > 0
                    ? round((float) $venta->gestor_monto / (float) $venta->tasa_aplicada_gestor, 2)
                    : (float) $venta->gestor_monto,
                'cuenta_id' => $venta->gestor_cuenta_id,
                'comentario' => $venta->gestor_comentario,
                'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
                'saldo_disponible' => (float) ($venta->gestorCuenta?->saldo_cuenta ?? 0),
                'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
                'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
                'moneda' => $venta->gestorCuenta?->moneda ? [
                    'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
                    'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
                    'nombre' => $venta->gestorCuenta->moneda->nombre_moneda,
                    'tasa_cambio' => (float) $venta->gestorCuenta->moneda->tasa_cambio,
                ] : null,
                'tipo_cuenta' => $venta->gestorCuenta?->tipo,
            ] : null,
        ];

        $monedasSistema = Moneda::where('estado', true)->orderBy('codigo_moneda')->get()->map(fn ($m) => [
            'id' => $m->id,
            'codigo' => $m->codigo_moneda,
            'nombre' => $m->nombre_moneda,
            'simbolo' => $m->simbolo_moneda,
            'tasa' => (float) $m->tasa_cambio,
        ])->values()->toArray();

        return Inertia::render('Vendor/Show', [
            'venta' => $ventaData,
            'userRole' => Auth::user()->role ?? 'vendedor',
            'monedasSistema' => $monedasSistema,
        ]);
    }

    /**
     * Página de impresión dedicada (Ticket + Factura de Venta lado a lado, media hoja A4).
     * Reemplaza el mecanismo roto de imprimir dentro del diálogo (document.body.innerHTML
     * swap) — se abre en pestaña nueva y usa Ctrl+P / "Guardar como PDF" del navegador sobre
     * una página real, con su propio CSS @media print.
     */
    public function imprimir(Request $request, Venta $venta)
    {
        $venta->load([
            'destinatario',
            'detalles.producto.categoria',
            'usuario',
            'turnoVendedor',
            'almacen',
            'moneda',
        ]);

        // Moneda/tasa del reporte: el modal (Vendor/Show.tsx, sección "Moneda del reporte")
        // ya resuelve cuál tasa aplicar (capturada o tecleada a mano) y la manda por query
        // string al abrir esta página — acá solo se aplica, no se recalcula. Sin query params
        // (acceso directo por URL), cae a la moneda principal de la venta, tasa 1.
        $monedaReporteId = $request->query('moneda_id');
        $tasaReporte = $monedaReporteId ? (float) $request->query('tasa', 1) : 1.0;
        $monedaReporte = $monedaReporteId ? Moneda::find($monedaReporteId) : $venta->moneda;
        $codigoReporte = $monedaReporte->codigo_moneda ?? $venta->moneda?->codigo_moneda ?? 'USD';

        $totalPagado = (float) $venta->pagos()->sum('monto_equivalente');
        $qrUrl = route('ventas.show', $venta->id);
        $qrPng = DNS2D::getBarcodePNG($qrUrl, 'QRCODE,M', 4, 4, [0, 0, 0]);

        return Inertia::render('Vendor/Imprimir', [
            'venta' => [
                'id' => $venta->id,
                'fecha' => $venta->created_at->toISOString(),
                'almacen' => [
                    'nombre' => $venta->almacen->nombre_almacen,
                    'ciudad' => $venta->almacen->ciudad_almacen,
                    'provincia' => $venta->almacen->provincia_almacen,
                ],
                'usuario' => [
                    'nombre' => $venta->usuario->name,
                ],
                // Quién atendía realmente (feature "Atendido por" / Turnos) — distinto de
                // `usuario` (cuenta de punto de venta), salvo cuando no hay turno (admin,
                // que nunca captura uno, o ventas anteriores a esta feature): ahí se cae al
                // nombre de la cuenta, que para admin ya es la persona real.
                'atendido_por' => $venta->turnoVendedor?->nombre_vendedor ?? $venta->usuario->name,
                'destinatario' => $venta->destinatario ? [
                    'nombre' => $venta->destinatario->nombre,
                    'apellidos' => $venta->destinatario->apellidos,
                    'carnet_identidad' => $venta->destinatario->carnet_identidad,
                    'telefono_contacto' => $venta->destinatario->telefono_contacto,
                ] : null,
                'items' => $venta->detalles->map(fn ($detalle) => [
                    'producto' => [
                        'nombre' => $detalle->producto->nombre_producto,
                        'marca' => $detalle->producto->marca_producto,
                        'modelo' => $detalle->producto->modelo_producto,
                        'categoria' => $detalle->producto->categoria->nombre_categoria ?? 'Sin categoría',
                    ],
                    'cantidad' => $detalle->cantidad,
                    'subtotal' => (float) $detalle->subtotal * $tasaReporte,
                ]),
                'total' => (float) $venta->total * $tasaReporte,
                'total_pagado' => $totalPagado * $tasaReporte,
                'restante' => ((float) $venta->total - $totalPagado) * $tasaReporte,
                'moneda_principal' => [
                    'codigo' => $codigoReporte,
                    'simbolo' => $monedaReporte->simbolo_moneda ?? $venta->moneda?->simbolo_moneda,
                ],
            ],
            'qrCode' => 'data:image/png;base64,'.$qrPng,
        ]);
    }

    /**
     * Construye la lista de monedas disponibles para el reporte con sus tasas de la operación.
     *
     * @return array<int, array{id: int, codigo: string, nombre: string, simbolo: string|null, tasa: float}>
     */
    private function buildMonedasParaReporte(Venta $venta): array
    {
        $map = [];

        if ($venta->moneda) {
            $map[$venta->moneda->id] = [
                'id' => $venta->moneda->id,
                'codigo' => $venta->moneda->codigo_moneda,
                'nombre' => $venta->moneda->nombre_moneda,
                'simbolo' => $venta->moneda->simbolo_moneda,
                'tasa' => (float) $venta->tasa_cambio_principal,
            ];
        }

        if ($venta->monedaCobro && $venta->tasa_aplicada_venta && ! isset($map[$venta->monedaCobro->id])) {
            $map[$venta->monedaCobro->id] = [
                'id' => $venta->monedaCobro->id,
                'codigo' => $venta->monedaCobro->codigo_moneda,
                'nombre' => $venta->monedaCobro->nombre_moneda,
                'simbolo' => $venta->monedaCobro->simbolo_moneda,
                'tasa' => (float) $venta->tasa_aplicada_venta,
            ];
        }

        foreach ($venta->pagos as $pago) {
            if ($pago->moneda && $pago->tasa_cambio_aplicada && ! isset($map[$pago->moneda->id])) {
                $map[$pago->moneda->id] = [
                    'id' => $pago->moneda->id,
                    'codigo' => $pago->moneda->codigo_moneda,
                    'nombre' => $pago->moneda->nombre_moneda,
                    'simbolo' => $pago->moneda->simbolo_moneda,
                    'tasa' => (float) $pago->tasa_cambio_aplicada,
                ];
            }
        }

        return array_values($map);
    }

    // ========================================================================
    // MÉTODOS DE PROCESAMIENTO - ACTUALIZADOS CON DESCUENTO INMEDIATO
    // ========================================================================

    /**
     * Procesa la venta con tasas de cambio editables por operación - MEJORADO
     * ✅ NUEVO: Descuenta stock inmediatamente al crear venta pendiente
     */
    public function procesarVenta(Request $request)
    {
        // Pagos requeridos solo si no es venta especial con total 0
        $esEspecial = (bool) $request->input('es_venta_especial', false);
        $totalCero = ((float) $request->input('total', 0)) == 0;
        $pagosRule = ($esEspecial && $totalCero) ? 'nullable|array' : 'required|array|min:1';

        $validatedData = $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'cliente_id' => 'nullable|exists:clientes,id',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.producto_codigo_id' => 'required|exists:producto_codigos,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.precio_venta' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'pagos' => $pagosRule,
            'pagos.*.metodo' => 'nullable|in:transferencia,efectivo',
            'pagos.*.moneda_id' => 'nullable|exists:monedas,id',
            'pagos.*.monto' => 'nullable|numeric|min:0',
            'pagos.*.via' => 'nullable|string',
            'pagos.*.tasa_cambio' => 'nullable|numeric|min:0.0001',
            'pagos.*.monto_equivalente' => 'nullable|numeric|min:0',
            'pagos.*.cuenta_id' => 'nullable|exists:cuentas,id',
            'pagos.*.cliente_id' => 'nullable|exists:clientes,id',
            'pagos.*.referencia' => 'nullable|string',
            'moneda_principal_id' => 'required|exists:monedas,id',
            'tasa_cambio_principal' => 'required|numeric|min:0.0001',
            'tasa_aplicada_venta' => 'nullable|numeric|min:0.0001',
            'moneda_cobro_id' => 'nullable|exists:monedas,id',
            'es_venta_gestor' => 'nullable|boolean',
            'gestor_monto' => 'nullable|numeric|min:0',
            'gestor_cuenta_id' => 'nullable|exists:cuentas,id',
            'gestor_comentario' => 'nullable|string|max:500',
            'tasa_aplicada_gestor' => 'nullable|numeric|min:0.0001',
            // VENTA ESPECIAL
            'es_venta_especial' => 'nullable|boolean',
            'nota_venta_especial' => 'nullable|string|max:500|required_if:es_venta_especial,true',
            // MENSAJERO
            'mensajero_monto' => 'nullable|numeric|min:0.01',
            // 'propio' (vehículo propio) no está implementado — ver el bloque comentado
            // en aprobarVenta()/anularVenta() más abajo. Rechazar acá evita que se cree
            // una venta con un tipo que después no mueve dinero al aprobar/anular.
            'mensajero_tipo' => 'nullable|in:externo',
            'mensajero_cuenta_id' => 'nullable|exists:cuentas,id',
            'mensajero_tasa' => 'nullable|numeric|min:0.0001',
            'mensajero_moneda_id' => 'nullable|exists:monedas,id',
            'mensajero_monto_original' => 'nullable|numeric|min:0.01',
            'mensajero_tasa_entrada' => 'nullable|numeric|min:0.0001',
            // COMISIÓN VENDEDOR
            'comision_cuenta_id' => 'nullable|exists:cuentas,id',
            'comision_tasa' => 'nullable|numeric|min:0.0001',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        // ✅ CAMBIO 2: Agregar validación lógica después del validate
        foreach ($validatedData['pagos'] ?? [] as $pago) {
            // Cada pago debe tener cuenta_id O cliente_id
            if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
                throw new \Exception('Cada pago debe tener una cuenta o un cliente como destino.');
            }

            // No pueden tener ambos
            if (! empty($pago['cuenta_id']) && ! empty($pago['cliente_id'])) {
                throw new \Exception('Un pago no puede tener cuenta y cliente al mismo tiempo.');
            }
        }

        // ✅ VALIDACIÓN GESTOR
        if ($validatedData['es_venta_gestor'] ?? false) {
            $validator = Validator::make($request->all(), [
                'gestor_monto' => 'required|numeric|min:0.01',
                'gestor_cuenta_id' => 'required|exists:cuentas,id',
                'tasa_aplicada_gestor' => 'required|numeric|min:0.0001',
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            // Validar acceso a la cuenta del gestor
            $cuentaGestor = Cuenta::find($validatedData['gestor_cuenta_id']);
            if (
                ! in_array($user->role, ['admin', 'moderador']) &&
                ! $user->cuentas->contains('id', $validatedData['gestor_cuenta_id'])
            ) {
                throw new \Exception('No tienes acceso a la cuenta del gestor');
            }

            // ✅ NUEVO: Validar compatibilidad de moneda (opcional: requerir que coincida con moneda de cobro si existe)
            $monedaCobro = $validatedData['moneda_cobro_id'] ? Moneda::find($validatedData['moneda_cobro_id']) : null;
            if ($monedaCobro && $cuentaGestor->moneda_id !== $monedaCobro->id && $cuentaGestor->tipo_moneda !== $monedaCobro->codigo_moneda) {
                throw new \Exception('La moneda de la cuenta del gestor debe coincidir con la moneda de cobro seleccionada');
            }
        }

        DB::beginTransaction();

        try {
            if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains('id', $validatedData['almacen_id'])) {
                throw new \Exception('No tienes acceso a este almacén');
            }
            $total_ganancia = 0;
            $total_comision = 0;
            $costo_total_productos = 0;
            $esGestor = $validatedData['es_venta_gestor'] ?? false;
            $esEspecial = (bool) ($validatedData['es_venta_especial'] ?? false);

            // Pre-cargar precios del almacén para todos los productos del carrito
            $productIds = collect($validatedData['items'])->pluck('producto_id')->unique()->toArray();
            $preciosAlmacen = DB::table('producto_vendedors')
                ->where('almacen_id', $validatedData['almacen_id'])
                ->whereIn('producto_id', $productIds)
                ->get()
                ->keyBy('producto_id');

            // Validación y descuento inmediato de stock
            $historialStockIds = [];
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);

                // Ventas especiales permiten precio por debajo del costo
                if (! $esEspecial && $item['precio_venta'] < $producto->precio_compra_producto) {
                    throw new \Exception("El precio de venta de \"{$producto->nombre_producto}\" no puede ser menor que su costo de compra.");
                }

                // Validar que el precio no baje del límite permitido (precio_base - comisión)
                if (! $esEspecial) {
                    $precioRow = $preciosAlmacen->get($item['producto_id']);
                    if ($precioRow) {
                        $precioMinimo = round((float) $precioRow->precio_venta - (float) $precioRow->comision, 2);
                        if ((float) $item['precio_venta'] < $precioMinimo) {
                            throw new \Exception(
                                "El precio de \"{$producto->nombre_producto}\" (\${$item['precio_venta']}) ".
                                "está por debajo del mínimo permitido (\${$precioMinimo}). ".
                                'Use Venta Especial para aplicar este descuento.'
                            );
                        }
                    }
                }

                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])->first();

                if (! $almacenProducto || $almacenProducto->cantidad < $item['cantidad']) {
                    throw new \Exception("Stock insuficiente para: {$producto->nombre_producto}.");
                }

                $codigoVenta = ProductoCodigo::where('id', $item['producto_codigo_id'])
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if (! $codigoVenta) {
                    throw new \Exception("El código seleccionado no pertenece al producto: {$producto->nombre_producto}.");
                }

                if ($codigoVenta->cantidad < $item['cantidad']) {
                    throw new \Exception("Stock insuficiente para el código {$codigoVenta->codigo_barras}.");
                }

                $costo = $producto->precio_compra_producto * $item['cantidad'];
                $costo_total_productos += $costo;

                $almacenProducto->decrement('cantidad', $item['cantidad']);
                $historial = HistorialStock::create([
                    'producto_id' => $item['producto_id'],
                    'almacen_id' => $validatedData['almacen_id'],
                    'venta_id' => null,
                    'cantidad_anterior' => $almacenProducto->cantidad + $item['cantidad'],
                    'cantidad_nueva' => $almacenProducto->cantidad,
                    'diferencia' => -$item['cantidad'],
                    'tipo' => 'venta_pendiente',
                    'observaciones' => 'Stock reservado por venta pendiente',
                    'user_id' => $user->id,
                ]);
                $historialStockIds[] = $historial->id;

                // Descontar del código exacto utilizado en la venta
                $codigoVenta->decrement('cantidad', $item['cantidad']);
            }

            // ✅ CAMBIO 3: Modificar validación de cuentas (solo si tiene cuenta_id)
            foreach ($validatedData['pagos'] as $pago) {
                if (! empty($pago['cuenta_id'])) {
                    $cuenta = Cuenta::find($pago['cuenta_id']);
                    if (! in_array($user->role, ['admin', 'moderador']) && ! $user->cuentas->contains('id', $pago['cuenta_id'])) {
                        throw new \Exception('No tienes acceso a la cuenta seleccionada');
                    }
                }
            }

            // Crear la venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'turno_vendedor_id' => $user->turnoActivo()?->id,
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'total_ganancia' => 0,
                'total_comision' => 0,
                // Ventas especiales inician en solicitud_especial, esperando aprobación del admin
                'estado' => $esEspecial ? 'solicitud_especial' : 'pendiente',
                'moneda_id' => $validatedData['moneda_principal_id'],
                'tasa_cambio_principal' => $validatedData['tasa_cambio_principal'],
                'tasa_aplicada_venta' => $validatedData['tasa_aplicada_venta'] ?? null,
                'moneda_cobro_id' => $validatedData['moneda_cobro_id'] ?? null,
                // CAMPOS GESTOR (no aplica en ventas especiales)
                'es_venta_gestor' => $esEspecial ? false : ($validatedData['es_venta_gestor'] ?? false),
                'gestor_monto' => $esEspecial ? 0 : ($validatedData['gestor_monto'] ?? 0),
                'gestor_cuenta_id' => $esEspecial ? null : ($validatedData['gestor_cuenta_id'] ?? null),
                'gestor_comentario' => $esEspecial ? null : ($validatedData['gestor_comentario'] ?? null),
                'tasa_aplicada_gestor' => $esEspecial ? null : ($validatedData['tasa_aplicada_gestor'] ?? null),
                // CAMPOS VENTA ESPECIAL
                'es_venta_especial' => $esEspecial,
                'nota_venta_especial' => $esEspecial ? ($validatedData['nota_venta_especial'] ?? null) : null,
                'decision_notificada' => false,
                // MENSAJERO
                'mensajero_monto' => $validatedData['mensajero_monto'] ?? null,
                'mensajero_tipo' => $validatedData['mensajero_tipo'] ?? null,
                'mensajero_cuenta_id' => $validatedData['mensajero_cuenta_id'] ?? null,
                'mensajero_tasa' => $validatedData['mensajero_tasa'] ?? null,
                'mensajero_moneda_id' => $validatedData['mensajero_moneda_id'] ?? null,
                'mensajero_monto_original' => $validatedData['mensajero_monto_original'] ?? null,
                'mensajero_tasa_entrada' => $validatedData['mensajero_tasa_entrada'] ?? null,
                // COMISIÓN VENDEDOR
                'comision_cuenta_id' => $validatedData['comision_cuenta_id'] ?? null,
                'comision_tasa' => $validatedData['comision_tasa'] ?? null,
            ]);

            HistorialStock::whereIn('id', $historialStockIds)->update(['venta_id' => $venta->id]);

            // Crear detalles y calcular ganancia + comision
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);
                $ganancia = ($item['precio_venta'] - $producto->precio_compra_producto) * $item['cantidad'];
                $total_ganancia += $ganancia;

                // Usar datos precargados del almacén
                $productoVendedor = $preciosAlmacen->get($item['producto_id']);

                $precioBase = $productoVendedor ? (float) $productoVendedor->precio_venta : (float) $item['precio_venta'];
                $baseComision = (! $esEspecial && $productoVendedor) ? (float) $productoVendedor->comision : 0;

                // Calcular comisión según el precio aplicado
                if ($esEspecial || $esGestor) {
                    $comisionUnitaria = 0;
                } elseif ((float) $item['precio_venta'] >= $precioBase) {
                    // Igual o por encima del precio base: comisión base + markup extra
                    $comisionUnitaria = $baseComision + ((float) $item['precio_venta'] - $precioBase);
                } else {
                    // Por debajo del precio base: el descuento lo absorbe la comisión del vendedor
                    $descuento = $precioBase - (float) $item['precio_venta'];
                    $comisionUnitaria = max(0.0, $baseComision - $descuento);
                }
                $total_comision += round($comisionUnitaria * $item['cantidad'], 2);

                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $item['producto_id'],
                    'producto_codigo_id' => $item['producto_codigo_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_venta' => $item['precio_venta'],
                    'precio_base' => $precioBase,
                    'subtotal' => $item['subtotal'],
                    'costo_unitario' => $producto->precio_compra_producto,
                    'ganancia' => $ganancia,
                    'comision_unitaria' => $comisionUnitaria,
                ]);
            }

            // USD objetivo real (costo + ganancia deseada)
            $usd_objetivo = $costo_total_productos + $total_ganancia;

            // CÁLCULO DE DIFERENCIA CAMBIARIA (POSITIVA O NEGATIVA)
            // El mensajero es pass-through y se excluye del cálculo — no es ingreso de la agencia
            $monto_diferencia_cambiaria = 0;
            if ($venta->moneda_cobro_id) {
                $monedaCobro = Moneda::find($venta->moneda_cobro_id);
                if ($monedaCobro) {
                    $tasa_oficial = $monedaCobro->tasa_cambio;
                    $monto_esperado_oficial = $usd_objetivo * $tasa_oficial;

                    $monto_real_cobrado = collect($validatedData['pagos'])
                        ->where('moneda_id', $venta->moneda_cobro_id)
                        ->sum('monto');

                    // Excluir el mensajero (solo si la moneda de cobro coincide con la del mensajero)
                    $mensajero_en_moneda_cobro = 0;
                    if ($venta->mensajero_monto > 0) {
                        if ($venta->mensajero_tasa > 0) {
                            // Mensajero era USD → su equivalente en moneda cobro
                            $mensajero_en_moneda_cobro = (float) $venta->mensajero_monto * (float) $venta->mensajero_tasa;
                        } else {
                            // Mensajero ya era en la moneda de cobro directamente
                            $mensajero_en_moneda_cobro = (float) $venta->mensajero_monto;
                        }
                    }

                    $monto_real_cobrado_productos = $monto_real_cobrado - $mensajero_en_moneda_cobro;
                    $monto_diferencia_cambiaria = round($monto_real_cobrado_productos - $monto_esperado_oficial, 2);
                }
            }

            $venta->update([
                'total_ganancia' => $total_ganancia,
                'total_comision' => round($total_comision, 2),
                'total_esperado_usd' => $usd_objetivo,
                'monto_diferencia_cambiaria' => $monto_diferencia_cambiaria,
            ]);

            // Crear pagos — para regalos (total=0) el array puede estar vacío
            foreach ($validatedData['pagos'] ?? [] as $pago) {
                PagoVenta::create([
                    'venta_id' => $venta->id,
                    'tipo_pago' => $pago['metodo'],
                    'moneda_id' => $pago['moneda_id'],
                    'cuenta_id' => $pago['cuenta_id'] ?? null,
                    'cliente_id' => $pago['cliente_id'] ?? null,
                    'via_pago' => $pago['via'] ?? null,
                    'monto' => $pago['monto'],
                    'tasa_cambio_aplicada' => $pago['tasa_cambio'],
                    'monto_equivalente' => $pago['monto_equivalente'],
                    'referencia' => $pago['referencia'] ?? null,
                ]);
            }

            DB::commit();

            // Notificar a Admins y Moderadores
            try {
                $admins = User::whereIn('role', ['admin', 'moderador'])->get();
                if ($esEspecial) {
                    Notification::send($admins, new VentaEspecialSolicitudNotification($venta));
                } else {
                    Notification::send($admins, new VentaCreadaNotification($venta));
                }
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de venta: '.$e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Venta creada correctamente.',
                'redirect' => route('ventas.show', $venta->id),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error al procesar venta: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la venta: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Guarda o actualiza el destinatario de una venta pendiente
     */
    /**
     * Guarda o actualiza el destinatario de una venta pendiente
     * Permite duplicados libremente - cada venta tiene su registro independiente
     */
    public function guardarDestinatario(Request $request, Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        if ($venta->estado !== 'pendiente') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se puede modificar el receptor en ventas pendientes.',
            ], 403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'carnet_identidad' => 'nullable|string|size:11|regex:/^\d+$/',
            'direccion_residencia' => 'nullable|string|max:500',
            'telefono_contacto' => 'required|string|max:20',
            'parentesco_cliente' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
            // Campos opcionales del gestor
            'es_venta_gestor' => 'nullable|boolean',
            'gestor_monto' => 'nullable|numeric|min:0',
            'gestor_cuenta_id' => 'nullable|exists:cuentas,id',
            'gestor_comentario' => 'nullable|string|max:500',
            'tasa_aplicada_venta' => 'nullable|numeric|min:0.0001',
            'tasa_aplicada_gestor' => 'nullable|numeric|min:0.0001',
        ]);

        if ($request->filled('carnet_identidad')) {
            $validated['carnet_identidad'] = preg_replace('/\D/', '', $validated['carnet_identidad']);
        }

        // Validar datos del gestor si está activado
        if ($request->boolean('es_venta_gestor')) {
            if (empty($validated['gestor_cuenta_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe seleccionar una cuenta del gestor',
                ], 422);
            }
            if (empty($validated['gestor_monto']) || $validated['gestor_monto'] <= 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'El monto del gestor debe ser mayor a 0',
                ], 422);
            }
            if (empty($validated['tasa_aplicada_gestor'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debe ingresar la tasa aplicada del gestor',
                ], 422);
            }
        }

        DB::transaction(function () use ($venta, $validated, $request) {
            // Guardar destinatario
            if ($venta->destinatario) {
                $venta->destinatario->update($validated);
            } else {
                $venta->destinatario()->create($validated);
            }

            // Guardar datos del gestor si es que vienen
            if ($request->boolean('es_venta_gestor')) {
                $venta->update([
                    'es_venta_gestor' => true,
                    'gestor_monto' => $validated['gestor_monto'] ?? 0,
                    'gestor_cuenta_id' => ! empty($validated['gestor_cuenta_id']) ? (int) $validated['gestor_cuenta_id'] : null,
                    'gestor_comentario' => $validated['gestor_comentario'] ?? null,
                    'tasa_aplicada_venta' => ! empty($validated['tasa_aplicada_venta']) ? (float) $validated['tasa_aplicada_venta'] : null,
                    'tasa_aplicada_gestor' => ! empty($validated['tasa_aplicada_gestor']) ? (float) $validated['tasa_aplicada_gestor'] : null,
                ]);
            } else {
                // Si no es venta con gestor, limpiar los datos
                $venta->update([
                    'es_venta_gestor' => false,
                    'gestor_monto' => 0,
                    'gestor_cuenta_id' => null,
                    'gestor_comentario' => null,
                    'tasa_aplicada_venta' => null,
                    'tasa_aplicada_gestor' => null,
                ]);
            }
        });

        // Refrescar el modelo y relaciones para devolver datos actualizados
        // inmediatamente al frontend (sin necesidad de F5).
        $venta->refresh()->load(['destinatario', 'gestorCuenta.moneda']);

        return response()->json([
            'success' => true,
            'message' => 'Información del receptor guardada correctamente',
            'destinatario' => $venta->destinatario ? [
                'id' => $venta->destinatario->id,
                'nombre' => $venta->destinatario->nombre,
                'apellidos' => $venta->destinatario->apellidos,
                'carnet_identidad' => $venta->destinatario->carnet_identidad,
                'direccion_residencia' => $venta->destinatario->direccion_residencia,
                'telefono_contacto' => $venta->destinatario->telefono_contacto,
                'parentesco_cliente' => $venta->destinatario->parentesco_cliente,
                'observaciones' => $venta->destinatario->observaciones,
            ] : null,
            'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
                'monto' => (float) $venta->gestor_monto,
                'monto_usd' => $venta->tasa_aplicada_gestor > 0
                    ? round((float) $venta->gestor_monto / (float) $venta->tasa_aplicada_gestor, 2)
                    : (float) $venta->gestor_monto,
                'cuenta_id' => $venta->gestor_cuenta_id,
                'comentario' => $venta->gestor_comentario,
                'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
                'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
                'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
                'moneda' => $venta->gestorCuenta?->moneda ? [
                    'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
                    'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
                    'nombre' => $venta->gestorCuenta->moneda->nombre_moneda,
                    'tasa_cambio' => (float) $venta->gestorCuenta->moneda->tasa_cambio,
                ] : null,
                'tipo_cuenta' => $venta->gestorCuenta?->tipo,
            ] : null,
            'total_comision' => (float) $venta->total_comision,
        ]);
    }

    /**
     * Admin/moderador pueden gestionar cualquier venta; un vendedor solo las suyas.
     * Mismo criterio que ya usa listadoVentas() para filtrar por dueño.
     */
    private function puedeGestionarVenta(Venta $venta): bool
    {
        $user = Auth::user();

        return in_array($user->role, ['admin', 'moderador']) || $venta->user_id === $user->id;
    }

    /**
     * Solo admin/moderador — a propósito SIN la excepción de "el dueño también puede" que tiene
     * puedeGestionarVenta(). Estas acciones deciden si se acepta una venta por debajo del
     * precio/costo mínimo; si el vendedor dueño pudiera aprobarla, se estaría auto-concediendo
     * una excepción de precio a sí mismo.
     */
    private function puedeDecidirSolicitudEspecial(): bool
    {
        return in_array(Auth::user()->role, ['admin', 'moderador']);
    }

    /**
     * Aprobar la venta
     */
    public function aprobarVenta(Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        if ($venta->estado !== 'pendiente') {
            return response()->json(['success' => false, 'message' => 'Ya no está pendiente'], 400);
        }

        if (! $venta->destinatario) {
            return response()->json(['success' => false, 'message' => 'Falta receptor'], 400);
        }

        if ($venta->mensajero_monto > 0 && ! $venta->mensajero_cuenta_id) {
            return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha asignado la cuenta destino del mensajero'], 400);
        }

        if ($venta->mensajero_monto > 0 && ! $venta->mensajero_tipo) {
            return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha definido el tipo (propio o externo)'], 400);
        }

        // Validación propio comentada — habilitar cuando se implemente vehículo propio
        // if ($venta->mensajero_monto > 0 && $venta->mensajero_tipo === 'propio' && !$venta->mensajero_cuenta_origen_id) {
        //     return response()->json(['success' => false, 'message' => 'El mensajero propio requiere especificar la cuenta CUP de donde sale el dinero'], 400);
        // }

        if (! $venta->es_venta_gestor && $venta->total_comision > 0 && (! $venta->comision_cuenta_id || ! $venta->comision_tasa)) {
            return response()->json(['success' => false, 'message' => 'Esta venta tiene comisión pendiente por configurar (falta cuenta o tasa de la comisión del vendedor)'], 400);
        }

        DB::transaction(function () use ($venta) {
            // 1. Cambiar estado a completada
            $venta->update(['estado' => 'completada']);

            // 2. Tasa oficial del CUP para ganancia/perdida cambiaria
            $tasaOficialCUP = DB::table('monedas')
                ->where('codigo_moneda', 'CUP')
                ->value('tasa_cambio') ?? 365;

            // El mensajero es pass-through — excluirlo del cálculo de ganancia cambiaria
            $mensajero_cup = 0;
            if ($venta->mensajero_monto > 0) {
                $mensajero_cup = $venta->mensajero_tasa > 0
                    ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
                    : (float) $venta->mensajero_monto;
            }

            $totalCupPagado = 0;
            $totalCupContadoUSD = 0;

            $gananciaExtraUSD = 0;

            foreach ($venta->pagos as $pago) {
                // Acumular CUP separado del loop de cuentas para calcular cambiaria limpia
                if ($pago->moneda && $pago->moneda->codigo_moneda === 'CUP') {
                    $totalCupPagado += $pago->monto;
                    $totalCupContadoUSD += $pago->monto_equivalente;
                }

                // ✅ CAMBIO: Manejar destino del dinero (cuenta O cliente)
                // CASO 1: El destino es un Cliente Físico
                if ($pago->cliente_id) {
                    $clienteDestino = $pago->cliente;

                    // Verificar que el cliente destino existe y es físico
                    if ($clienteDestino && $clienteDestino->tipo_cliente === 'fisico') {
                        $saldoAnteriorPago = (float) $clienteDestino->deuda_pago_cliente;
                        // ✅ Incrementar la deuda del cliente destino
                        $clienteDestino->increment('deuda_pago_cliente', $pago->monto);
                        $pago->update([
                            'saldo_anterior' => $saldoAnteriorPago,
                            'saldo_posterior' => $saldoAnteriorPago + (float) $pago->monto,
                        ]);

                        // ✅ IMPORTANTE: Saltar al siguiente pago, NO procesar cuenta
                        continue;
                    }
                }

                // CASO 2: El destino es una Cuenta (flujo normal)
                $cuenta = $pago->cuenta;
                if (! $cuenta) {
                    continue;
                }

                $codigoCuenta = $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda;
                $codigoPago = $pago->moneda?->codigo_moneda;

                if ($codigoPago === $codigoCuenta) {
                    $saldoAnteriorPago = (float) $cuenta->saldo_cuenta;
                    $cuenta->increment('saldo_cuenta', $pago->monto);
                    $pago->update([
                        'saldo_anterior' => $saldoAnteriorPago,
                        'saldo_posterior' => $saldoAnteriorPago + (float) $pago->monto,
                    ]);
                }
                // Si no coinciden, por seguridad no acumulamos
            }

            // Calcular ganancia cambiaria solo sobre los CUP de productos (sin mensajero)
            $cupProductos = max(0.0, $totalCupPagado - $mensajero_cup);
            if ($totalCupPagado > 0 && $cupProductos > 0) {
                $proporcion = $cupProductos / $totalCupPagado;
                $cupContadoUSD_productos = $totalCupContadoUSD * $proporcion;
                $gananciaExtraUSD = round(($cupProductos / $tasaOficialCUP) - $cupContadoUSD_productos, 2);
            }

            // Ganancia neta = margen bruto − comisión (total_comision ya es la suma de
            // comision_unitaria*cantidad por línea, ver store()) + ganancia/pérdida
            // cambiaria recién calculada arriba. Nota: para ventas con gestor, este
            // "total_comision" es la comisión teórica por línea, no el gestor_monto
            // real pagado desde la cuenta del gestor (modelo distinto) — mismo criterio
            // que ya usa VentaController::show() para 'ganancia_agencia', no es nuevo.
            $gananciaAgencia = (float) $venta->total_ganancia - (float) $venta->total_comision;

            $venta->update([
                'ganancia_perdida_cambiaria' => $gananciaExtraUSD,
                'ganancia_real_total' => $venta->total_ganancia + $gananciaExtraUSD,
                'ganancia_neta' => round($gananciaAgencia + $gananciaExtraUSD, 2),
            ]);

            // DESCUENTO GESTOR
            if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
                $cuentaGestor = $venta->gestorCuenta;

                if ($cuentaGestor) {
                    if ($cuentaGestor->saldo_cuenta < $venta->gestor_monto) {
                        throw new \Exception('La cuenta del gestor no tiene saldo suficiente para cubrir la comisión');
                    }

                    $gestorSaldoAnterior = (float) $cuentaGestor->saldo_cuenta;
                    $cuentaGestor->decrement('saldo_cuenta', $venta->gestor_monto);
                    $venta->update([
                        'gestor_saldo_anterior' => $gestorSaldoAnterior,
                        'gestor_saldo_posterior' => $gestorSaldoAnterior - (float) $venta->gestor_monto,
                    ]);
                }
            }

            // MENSAJERO
            if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
                $cuentaMensajero = $venta->mensajeroCuenta;

                if ($cuentaMensajero) {
                    // monto_final_cup es el monto editable desde Show (puede incluir premio/sanción).
                    // Si no fue configurado, cae al monto original que pagó el cliente en el POS.
                    $montoFinal = $venta->mensajero_monto_final_cup
                        ? (float) $venta->mensajero_monto_final_cup
                        : (float) $venta->mensajero_monto_original;

                    // Bloque propio comentado — habilitar cuando se implemente vehículo propio
                    // if ($venta->mensajero_tipo === 'propio') {
                    //     if ($venta->mensajero_cuenta_origen_id) {
                    //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
                    //         if ($cuentaOrigen) {
                    //             $cuentaOrigen->decrement('saldo_cuenta', $montoFinal);
                    //         }
                    //     }
                    //     $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
                    // } else

                    // EXTERNO: sale de la cuenta del POS para pagar al mensajero (pago físico)
                    if ($venta->mensajero_tipo === 'externo') {
                        $mensajeroSaldoAnterior = (float) $cuentaMensajero->saldo_cuenta;
                        $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
                        $venta->update([
                            'mensajero_saldo_anterior' => $mensajeroSaldoAnterior,
                            'mensajero_saldo_posterior' => $mensajeroSaldoAnterior - $montoFinal,
                        ]);
                    }
                }
            }

            // COMISIÓN VENDEDOR — solo si no es venta con gestor (XOR)
            if (! $venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
                $cuentaComision = $venta->comisionCuenta;

                if ($cuentaComision) {
                    $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);

                    if ($cuentaComision->saldo_cuenta < $montoCUP) {
                        throw new \Exception(
                            "La cuenta de comisión no tiene saldo suficiente. Necesita {$montoCUP} CUP, disponible: {$cuentaComision->saldo_cuenta} CUP."
                        );
                    }

                    $comisionSaldoAnterior = (float) $cuentaComision->saldo_cuenta;
                    $cuentaComision->decrement('saldo_cuenta', $montoCUP);
                    $venta->update([
                        'comision_saldo_anterior' => $comisionSaldoAnterior,
                        'comision_saldo_posterior' => $comisionSaldoAnterior - $montoCUP,
                    ]);
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Venta Aprobada Satisfactoriamente',
        ]);
    }

    /**
     * Obtener listado de ventas con filtros y paginación.
     */
    public function listadoVentas(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $esAdminOModerador = in_array($user->role, ['admin', 'moderador']);

        // Construir query base
        $query = Venta::with(['cliente', 'almacen', 'usuario', 'pagos', 'moneda', 'destinatario', 'monedaCobro', 'gestorCuenta', 'mensajeroCuenta'])
            ->withCount('detalles');

        // Filtrar por usuario (excepto admin y moderador)
        if (! $esAdminOModerador) {
            $query->where('user_id', $user->id);
        }

        // Aplicar filtros
        if ($request->has('estado') && $request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->has('almacen_id') && $request->almacen_id) {
            $query->where('almacen_id', $request->almacen_id);
        }

        if ($request->has('fecha_desde') && $request->fecha_desde) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta') && $request->fecha_hasta) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', "%{$search}%")
                    ->orWhereHas('cliente', function ($q2) use ($search) {
                        $q2->where('nombre_cliente', 'like', "%{$search}%");
                    })
                    ->orWhereHas('almacen', function ($q2) use ($search) {
                        $q2->where('nombre_almacen', 'like', "%{$search}%");
                    })
                    ->orWhereHas('destinatario', function ($q2) use ($search) {
                        $q2->where('nombre', 'like', "%{$search}%")
                            ->orWhere('apellidos', 'like', "%{$search}%");
                    });
            });
        }

        // Ordenar y paginar
        $ventas = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($venta) use ($esAdminOModerador) {
                return [
                    'id' => $venta->id,
                    'cliente' => $venta->cliente ? [
                        'id' => $venta->cliente->id,
                        'nombre' => $venta->cliente->nombre_cliente,
                    ] : null,
                    'almacen' => [
                        'id' => $venta->almacen->id,
                        'nombre' => $venta->almacen->nombre_almacen,
                    ],
                    'usuario' => [
                        'id' => $venta->usuario->id,
                        'nombre' => $venta->usuario->name,
                    ],
                    'total' => $venta->total,
                    // Comisión Punto de Venta: es la ganancia propia del vendedor en esta venta,
                    // visible para cualquier rol que llegue acá (un vendedor solo ve sus propias
                    // ventas de todas formas). Ganancia Agencia (ganancia neta real del negocio)
                    // solo se manda para admin/moderador — null para vendedor, igual que el resto
                    // de reportes que ocultan costo/margen por rol (ver Rastreo de Operaciones).
                    'total_ganancia' => $esAdminOModerador ? $venta->total_ganancia : null,
                    'total_comision' => (float) $venta->total_comision,
                    'total_esperado_usd' => $venta->total_esperado_usd,
                    'ganancia_perdida_cambiaria' => $esAdminOModerador ? $venta->ganancia_perdida_cambiaria : null,
                    'ganancia_real_total' => $esAdminOModerador ? $venta->ganancia_real_total : null,
                    'estado' => $venta->estado,
                    'total_pagado' => $venta->pagos->sum('monto_equivalente'),
                    'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
                    'cantidad_items' => $venta->detalles_count,
                    'fecha' => $venta->created_at->format('d/m/Y H:i'),
                    'fecha_iso' => $venta->created_at->toISOString(),
                    'moneda_principal' => $venta->moneda ? [
                        'id' => $venta->moneda->id,
                        'codigo' => $venta->moneda->codigo_moneda,
                        'nombre' => $venta->moneda->nombre_moneda,
                    ] : null,
                    'destinatario' => $venta->destinatario ? [
                        'id' => $venta->destinatario->id,
                        'nombre' => $venta->destinatario->nombre,
                        'apellidos' => $venta->destinatario->apellidos,
                        'carnet_identidad' => $venta->destinatario->carnet_identidad,
                        'telefono_contacto' => $venta->destinatario->telefono_contacto,
                    ] : null,
                    // NUEVOS CAMPOS
                    'tasa_aplicada_venta' => $venta->tasa_aplicada_venta,
                    'moneda_cobro' => $venta->monedaCobro ? [
                        'id' => $venta->monedaCobro->id,
                        'codigo' => $venta->monedaCobro->codigo_moneda,
                        'simbolo' => $venta->monedaCobro->simbolo_moneda,
                    ] : null,
                    'monto_diferencia_cambiaria' => $venta->monto_diferencia_cambiaria,
                    'es_venta_especial' => (bool) $venta->es_venta_especial,
                    'nota_venta_especial' => $venta->nota_venta_especial,
                    // MENSAJERO
                    'mensajero' => $venta->mensajero_monto > 0 ? [
                        'monto' => (float) $venta->mensajero_monto,
                        'tipo' => $venta->mensajero_tipo,
                    ] : null,
                    // GESTOR
                    'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
                        'monto' => (float) $venta->gestor_monto,
                        'cuenta_id' => $venta->gestor_cuenta_id,
                        'comentario' => $venta->gestor_comentario,
                        'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
                        'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
                        'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
                        'monto_usd' => $venta->gestor_monto && $venta->tasa_aplicada_gestor
                            ? round($venta->gestor_monto / $venta->tasa_aplicada_gestor, 2)
                            : null,
                        'moneda' => $venta->gestorCuenta?->moneda ? [
                            'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
                            'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
                        ] : null,
                    ] : null,
                ];
            });

        // Obtener almacenes para filtros
        $almacenes = in_array($user->role, ['admin', 'moderador'])
            ? Almacen::select('id', 'nombre_almacen')->get()
            : ($user ? $user->almacenes()->select('id', 'nombre_almacen')->get() : collect());

        return Inertia::render('Vendor/Listado', [
            'ventas' => $ventas,
            'filters' => $request->only(['estado', 'almacen_id', 'fecha_desde', 'fecha_hasta', 'search']),
            'almacenes' => $almacenes,
            'estados_venta' => [
                ['value' => 'pendiente',           'label' => 'Pendiente'],
                ['value' => 'completada',          'label' => 'Completada'],
                ['value' => 'cancelada',           'label' => 'Cancelada'],
                ['value' => 'devuelta',            'label' => 'Devuelta'],
                ['value' => 'solicitud_especial',  'label' => 'Solicitud Especial'],
                ['value' => 'rechazada',           'label' => 'Rechazada'],
            ],
        ]);
    }

    /**
     * Editar pagos y/o precios de una venta en estado pendiente.
     */
    public function editarVentaPendiente(Request $request, Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        if ($venta->estado !== 'pendiente') {
            return response()->json(['success' => false, 'message' => 'Solo se pueden editar ventas en estado pendiente.'], 400);
        }

        $validated = $request->validate([
            'pagos' => 'required|array|min:1',
            'pagos.*.metodo' => 'required|in:transferencia,efectivo',
            'pagos.*.moneda_id' => 'required|exists:monedas,id',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.via' => 'nullable|string',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0.0001',
            'pagos.*.monto_equivalente' => 'required|numeric|min:0',
            'pagos.*.cuenta_id' => 'nullable|exists:cuentas,id',
            'pagos.*.cliente_id' => 'nullable|exists:clientes,id',
            'pagos.*.referencia' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.venta_detalle_id' => 'required|exists:venta_detalles,id',
            'items.*.precio_venta' => 'required|numeric|min:0',
        ]);

        // Validar XOR en pagos
        foreach ($validated['pagos'] as $pago) {
            if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
                return response()->json(['success' => false, 'message' => 'Cada pago debe tener una cuenta o un cliente como destino.'], 422);
            }
            if (! empty($pago['cuenta_id']) && ! empty($pago['cliente_id'])) {
                return response()->json(['success' => false, 'message' => 'Un pago no puede tener cuenta y cliente al mismo tiempo.'], 422);
            }
        }

        $user = Auth::user();

        try {
            DB::transaction(function () use ($venta, $validated) {
                // ── Actualizar precios si vienen ──────────────────────────────────
                if (! empty($validated['items'])) {
                    $venta->load('detalles.producto');

                    // Precargar precios del almacén para validar mínimos
                    $productIds = $venta->detalles->pluck('producto_id')->toArray();
                    $preciosAlmacen = DB::table('producto_vendedors')
                        ->where('almacen_id', $venta->almacen_id)
                        ->whereIn('producto_id', $productIds)
                        ->get()
                        ->keyBy('producto_id');

                    $nuevoTotal = 0;
                    $nuevaGanancia = 0;
                    $nuevaComision = 0;

                    foreach ($validated['items'] as $itemData) {
                        $detalle = $venta->detalles->firstWhere('id', $itemData['venta_detalle_id']);
                        if (! $detalle) {
                            continue;
                        }

                        $nuevoPrecio = (float) $itemData['precio_venta'];
                        $costo = (float) $detalle->costo_unitario;

                        // Validar mínimo solo si no es venta especial
                        if (! $venta->es_venta_especial) {
                            $precioRow = $preciosAlmacen->get($detalle->producto_id);
                            if ($precioRow) {
                                $precioMinimo = round((float) $precioRow->precio_venta - (float) $precioRow->comision, 2);
                                if ($nuevoPrecio < $precioMinimo) {
                                    throw new \Exception(
                                        "El precio de \"{$detalle->producto->nombre_producto}\" (\${$nuevoPrecio}) ".
                                        "está por debajo del mínimo permitido (\${$precioMinimo})."
                                    );
                                }
                            }
                            if ($nuevoPrecio < $costo) {
                                throw new \Exception(
                                    "El precio de \"{$detalle->producto->nombre_producto}\" no puede ser menor que su costo."
                                );
                            }
                        }

                        // Recalcular comisión
                        $precioRow = $preciosAlmacen->get($detalle->producto_id);
                        $precioBase = $precioRow ? (float) $precioRow->precio_venta : $nuevoPrecio;
                        $baseComision = (! $venta->es_venta_especial && $precioRow) ? (float) $precioRow->comision : 0;

                        if ($venta->es_venta_especial) {
                            $comisionUnitaria = 0;
                        } elseif ($nuevoPrecio >= $precioBase) {
                            $comisionUnitaria = $baseComision + ($nuevoPrecio - $precioBase);
                        } else {
                            $descuento = $precioBase - $nuevoPrecio;
                            $comisionUnitaria = max(0.0, $baseComision - $descuento);
                        }

                        $ganancia = ($nuevoPrecio - $costo) * $detalle->cantidad;
                        $subtotal = $nuevoPrecio * $detalle->cantidad;

                        $detalle->update([
                            'precio_venta' => $nuevoPrecio,
                            'subtotal' => $subtotal,
                            'ganancia' => $ganancia,
                            'comision_unitaria' => round($comisionUnitaria, 2),
                        ]);

                        $nuevoTotal += $subtotal;
                        $nuevaGanancia += $ganancia;
                        $nuevaComision += round($comisionUnitaria * $detalle->cantidad, 2);
                    }

                    // Sumar mensajero en USD al total (si era USD; si era CUP directo no se suma al total USD)
                    $mensajeroEnUSD = ($venta->mensajero_monto > 0 && $venta->mensajero_tasa > 0)
                        ? (float) $venta->mensajero_monto
                        : 0;

                    $venta->update([
                        'total' => $nuevoTotal + $mensajeroEnUSD,
                        'total_ganancia' => $nuevaGanancia,
                        'total_comision' => round($nuevaComision, 2),
                    ]);
                }

                // ── Reemplazar pagos ──────────────────────────────────────────────
                $venta->pagos()->delete();

                foreach ($validated['pagos'] as $pago) {
                    PagoVenta::create([
                        'venta_id' => $venta->id,
                        'tipo_pago' => $pago['metodo'],
                        'moneda_id' => $pago['moneda_id'],
                        'cuenta_id' => $pago['cuenta_id'] ?? null,
                        'cliente_id' => $pago['cliente_id'] ?? null,
                        'via_pago' => $pago['via'] ?? null,
                        'monto' => $pago['monto'],
                        'tasa_cambio_aplicada' => $pago['tasa_cambio'],
                        'monto_equivalente' => $pago['monto_equivalente'],
                        'referencia' => $pago['referencia'] ?? null,
                    ]);
                }
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        // Devolver venta actualizada para refrescar el frontend sin recargar
        $venta->refresh()->load(['detalles.producto', 'pagos.cuenta.moneda', 'pagos.moneda', 'pagos.cliente']);

        return response()->json([
            'success' => true,
            'message' => 'Venta actualizada correctamente.',
            'total' => (float) $venta->total,
            'pagos' => $venta->pagos->map(fn ($p) => [
                'metodo' => $p->tipo_pago,
                'monto' => $p->monto,
                'monto_equivalente' => $p->monto_equivalente,
                'via' => $p->via_pago,
                'tasa_cambio' => $p->tasa_cambio_aplicada,
                'moneda' => $p->moneda ? [
                    'id' => $p->moneda->id,
                    'codigo' => $p->moneda->codigo_moneda,
                    'nombre' => $p->moneda->nombre_moneda,
                ] : null,
                'cuenta' => $p->cuenta ? [
                    'id' => $p->cuenta->id,
                    'nombre' => $p->cuenta->nombre_cuenta,
                ] : null,
                'cliente_destino' => $p->cliente ? [
                    'id' => $p->cliente->id,
                    'nombre' => $p->cliente->nombre_cliente,
                ] : null,
                'destino_tipo' => $p->cliente_id ? 'cliente' : 'cuenta',
            ]),
            'items' => $venta->detalles->map(fn ($d) => [
                'precio_venta' => (float) $d->precio_venta,
                'subtotal' => (float) $d->subtotal,
                'ganancia' => (float) $d->ganancia,
                'comision_unitaria' => (float) $d->comision_unitaria,
            ]),
        ]);
    }

    /**
     * Guardar distribución de la venta: mensajero y comisión vendedor
     */
    public function guardarDistribucion(Request $request, Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        if ($venta->estado !== 'pendiente') {
            return response()->json(['success' => false, 'message' => 'Solo se puede modificar una venta pendiente.'], 422);
        }

        $validated = $request->validate([
            'mensajero_monto' => 'nullable|numeric|min:0.01',
            // 'propio' no implementado — mismo motivo que en procesarVenta().
            'mensajero_tipo' => 'nullable|in:externo',
            'mensajero_cuenta_id' => 'nullable|exists:cuentas,id',
            'mensajero_cuenta_origen_id' => 'nullable|exists:cuentas,id',
            'mensajero_tasa' => 'nullable|numeric|min:0.0001',
            'mensajero_monto_final_cup' => 'nullable|numeric|min:0.01',
            'limpiar_mensajero' => 'nullable|boolean',
            'limpiar_gestor' => 'nullable|boolean',
            'comision_cuenta_id' => 'nullable|exists:cuentas,id',
            'comision_tasa' => 'nullable|numeric|min:0.0001',
            'limpiar_comision' => 'nullable|boolean',
        ]);

        $totalProductos = (float) $venta->detalles->sum('subtotal');

        $limpiarMensajero = $validated['limpiar_mensajero'] ?? false;
        $limpiarComision = $validated['limpiar_comision'] ?? false;
        $limpiarGestor = $validated['limpiar_gestor'] ?? false;

        // El monto USD del mensajero viene del POS y no cambia desde Show.
        // Solo se actualiza si el payload incluye explícitamente mensajero_monto (caso raro).
        $nuevoMensajeroMonto = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? $venta->mensajero_monto);
        $mensajeroEnUSD = $nuevoMensajeroMonto > 0 ? (float) $nuevoMensajeroMonto : 0;

        $updates = ['total' => $totalProductos + $mensajeroEnUSD];

        // Actualizar monto solo si viene explícito
        if (array_key_exists('mensajero_monto', $validated) || $limpiarMensajero) {
            $updates['mensajero_monto'] = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? null);
        }

        // Tipo, cuenta y tasa se pueden actualizar sin enviar monto (Show.tsx solo configura distribución)
        $hayConfigMensajero = $limpiarMensajero
            || array_key_exists('mensajero_tipo', $request->all())
            || array_key_exists('mensajero_cuenta_id', $request->all())
            || array_key_exists('mensajero_cuenta_origen_id', $request->all())
            || array_key_exists('mensajero_tasa', $request->all());

        if ($hayConfigMensajero) {
            $updates['mensajero_tipo'] = $limpiarMensajero ? null : ($validated['mensajero_tipo'] ?? $venta->mensajero_tipo);
            $updates['mensajero_cuenta_id'] = $limpiarMensajero ? null : ($validated['mensajero_cuenta_id'] ?? null);
            $updates['mensajero_cuenta_origen_id'] = $limpiarMensajero ? null : ($validated['mensajero_cuenta_origen_id'] ?? null);
            $updates['mensajero_tasa'] = $limpiarMensajero ? null : ($validated['mensajero_tasa'] ?? null);
            $updates['mensajero_monto_final_cup'] = $limpiarMensajero ? null : ($validated['mensajero_monto_final_cup'] ?? null);
        }

        if (array_key_exists('comision_cuenta_id', $validated) || $limpiarComision) {
            $updates['comision_cuenta_id'] = $limpiarComision ? null : ($validated['comision_cuenta_id'] ?? null);
            $updates['comision_tasa'] = $limpiarComision ? null : ($validated['comision_tasa'] ?? null);
        }

        // Limpiar gestor: la comisión pasa al punto de venta
        if ($limpiarGestor) {
            $updates['es_venta_gestor'] = false;
            $updates['gestor_cuenta_id'] = null;
            $updates['gestor_monto'] = null;
            $updates['gestor_comentario'] = null;
            $updates['tasa_aplicada_gestor'] = null;
        }

        $venta->update($updates);
        $venta->refresh()->load(['mensajeroCuenta.moneda', 'comisionCuenta.moneda', 'mensajeroMoneda', 'mensajeroOrigenCuenta']);

        return response()->json([
            'success' => true,
            'message' => 'Distribución guardada correctamente.',
            'total' => (float) $venta->total,
            'gestor' => $limpiarGestor ? null : 'unchanged',
            'mensajero' => $venta->mensajero_monto > 0 ? [
                'monto' => (float) $venta->mensajero_monto,
                'tipo' => $venta->mensajero_tipo,
                'moneda' => $venta->mensajeroMoneda?->codigo_moneda ?? ($venta->mensajero_tasa > 0 ? 'USD' : 'CUP'),
                'moneda_id' => $venta->mensajero_moneda_id,
                'monto_original' => $venta->mensajero_monto_original ? (float) $venta->mensajero_monto_original : null,
                'tasa_entrada' => $venta->mensajero_tasa_entrada ? (float) $venta->mensajero_tasa_entrada : null,
                'tasa' => $venta->mensajero_tasa ? (float) $venta->mensajero_tasa : null,
                'monto_cup' => $venta->mensajero_tasa > 0
                    ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
                    : null,
                'monto_final_cup' => $venta->mensajero_monto_final_cup ? (float) $venta->mensajero_monto_final_cup : null,
                'cuenta' => $venta->mensajeroCuenta ? [
                    'id' => $venta->mensajeroCuenta->id,
                    'nombre' => $venta->mensajeroCuenta->nombre_cuenta,
                    'moneda' => $venta->mensajeroCuenta->moneda?->codigo_moneda,
                ] : null,
                'cuenta_origen' => $venta->mensajeroOrigenCuenta ? [
                    'id' => $venta->mensajeroOrigenCuenta->id,
                    'nombre' => $venta->mensajeroOrigenCuenta->nombre_cuenta,
                ] : null,
            ] : null,
            'comision_pago' => $venta->comision_cuenta_id ? [
                'tasa' => $venta->comision_tasa ? (float) $venta->comision_tasa : null,
                'monto_cup' => $venta->comision_tasa > 0
                    ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
                    : null,
                'cuenta' => $venta->comisionCuenta ? [
                    'id' => $venta->comisionCuenta->id,
                    'nombre' => $venta->comisionCuenta->nombre_cuenta,
                    'moneda' => $venta->comisionCuenta->moneda?->codigo_moneda,
                    'saldo_disponible' => (float) ($venta->comisionCuenta->saldo_cuenta ?? 0),
                ] : null,
            ] : null,
        ]);
    }

    /**
     * Guarda/corrige manualmente la tasa de cambio usada para convertir el reporte/ticket
     * de la venta a otra moneda (ej. CUP), para el caso donde la venta se pagó 100% en la
     * moneda principal y nunca se capturó ninguna tasa de conversión. No afecta ningún
     * movimiento de dinero ya realizado (aprobarVenta usa gestor_monto/comision directamente,
     * no deriva nada de tasa_aplicada_venta) — es puramente informativa para el reporte,
     * por eso se permite en cualquier estado de la venta, no solo pendiente.
     */
    public function actualizarTasaReporte(Request $request, Venta $venta)
    {
        $validated = $request->validate([
            'moneda_cobro_id' => 'required|exists:monedas,id',
            'tasa' => 'required|numeric|min:0.0001',
        ]);

        $venta->update([
            'moneda_cobro_id' => $validated['moneda_cobro_id'],
            'tasa_aplicada_venta' => $validated['tasa'],
        ]);

        $venta->refresh()->load('monedaCobro');

        return response()->json([
            'success' => true,
            'message' => 'Tasa de cambio del reporte actualizada.',
            'tasa_aplicada_venta' => (float) $venta->tasa_aplicada_venta,
            'moneda_cobro' => $venta->monedaCobro ? [
                'id' => $venta->monedaCobro->id,
                'codigo' => $venta->monedaCobro->codigo_moneda,
                'nombre' => $venta->monedaCobro->nombre_moneda,
                'simbolo' => $venta->monedaCobro->simbolo_moneda,
            ] : null,
            'monedas_para_reporte' => $this->buildMonedasParaReporte($venta),
        ]);
    }

    /**
     * Anular venta (pendiente o completada)
     */
    public function anularVenta(Request $request, Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        if ($venta->estado === 'cancelada') {
            return response()->json(['success' => false, 'message' => 'La venta ya está anulada'], 400);
        }

        if ($venta->estado === 'devuelta') {
            return response()->json(['success' => false, 'message' => 'La venta ya fue devuelta'], 400);
        }

        $validated = $request->validate([
            'motivo_anulacion' => 'required|in:error_precio,solicitud_cliente,producto_defectuoso,duplicado_venta,error_pedido,otros',
            'detalle_anulacion' => 'nullable|string|max:500|required_if:motivo_anulacion,otros',
        ]);

        // Una venta pendiente nunca movió dinero real — anularla es una simple
        // cancelación. Una venta completada ya movió stock y dinero de verdad —
        // revertirla es conceptualmente una Devolución, aunque el mecanismo de
        // reversión (abajo) sea idéntico. Se decide el estado final ANTES de la
        // transacción porque dentro de ella $venta->estado ya cambia a 'cancelada'.
        $eraCompletada = $venta->estado === 'completada';

        // Cargar relaciones necesarias para poder revertirlas
        $venta->load(['detalles', 'pagos.cliente', 'pagos.cuenta', 'gestorCuenta', 'comisionCuenta', 'mensajeroCuenta', 'mensajeroMoneda', 'usuario', 'moneda']);

        DB::transaction(function () use ($venta, $validated, $eraCompletada) {
            // ✅ SIEMPRE revertir stock (pendiente o completada)
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)->first();

                if ($almacenProducto) {
                    $almacenProducto->increment('cantidad', $detalle->cantidad);
                }

                // ✅ Devolver stock al mismo código usado en la venta.
                // Para ventas antiguas sin producto_codigo_id, usar default o primero.
                if ($detalle->producto_codigo_id) {
                    $codigoUsado = ProductoCodigo::find($detalle->producto_codigo_id);
                    if ($codigoUsado) {
                        $codigoUsado->increment('cantidad', $detalle->cantidad);
                    }
                } else {
                    $codigoDefault = ProductoCodigo::where('producto_id', $detalle->producto_id)
                        ->orderByDesc('es_default')
                        ->first();

                    if ($codigoDefault) {
                        $codigoDefault->increment('cantidad', $detalle->cantidad);
                    }
                }

                HistorialStock::create([
                    'producto_id' => $detalle->producto_id,
                    'almacen_id' => $venta->almacen_id,
                    'venta_id' => $venta->id,
                    'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
                    'cantidad_nueva' => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
                    'diferencia' => $detalle->cantidad,
                    'tipo' => 'venta_anulada',
                    'observaciones' => 'Stock revertido por anulación de venta',
                    'user_id' => Auth::id(),
                ]);
            }

            // Revertir pagos y gestor solo si la venta fue completada.
            // En ventas pendientes, cuentas y deudas nunca fueron modificadas.
            if ($venta->estado === 'completada') {
                foreach ($venta->pagos as $pago) {
                    if ($pago->cliente_id) {
                        $cliente = $pago->cliente;
                        if ($cliente) {
                            $cliente->decrement('deuda_pago_cliente', $pago->monto);
                        }
                    }

                    if ($pago->cuenta_id) {
                        $cuenta = $pago->cuenta;
                        if ($cuenta) {
                            $cuenta->decrement('saldo_cuenta', $pago->monto);
                        }
                    }
                }

                if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
                    $cuentaGestor = $venta->gestorCuenta;
                    if ($cuentaGestor) {
                        $cuentaGestor->increment('saldo_cuenta', $venta->gestor_monto);
                    }
                }

                // Revertir mensajero — inverso exacto del aprobarVenta
                if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
                    $cuentaMensajero = $venta->mensajeroCuenta;
                    if ($cuentaMensajero) {
                        $montoFinal = $venta->mensajero_monto_final_cup
                            ? (float) $venta->mensajero_monto_final_cup
                            : (float) $venta->mensajero_monto_original;

                        // Bloque propio comentado — habilitar cuando se implemente vehículo propio
                        // if ($venta->mensajero_tipo === 'propio') {
                        //     if ($venta->mensajero_cuenta_origen_id) {
                        //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
                        //         if ($cuentaOrigen) {
                        //             $cuentaOrigen->increment('saldo_cuenta', $montoFinal);
                        //         }
                        //     }
                        //     $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
                        // } else

                        // EXTERNO: devolver el dinero a la cuenta del POS
                        if ($venta->mensajero_tipo === 'externo') {
                            $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
                        }
                    }
                }

                // Revertir comisión vendedor — solo si no es venta con gestor (XOR)
                if (! $venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
                    $cuentaComision = $venta->comisionCuenta;
                    if ($cuentaComision) {
                        $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);
                        $cuentaComision->increment('saldo_cuenta', $montoCUP);
                    }
                }
            }

            $venta->update([
                'estado' => $eraCompletada ? 'devuelta' : 'cancelada',
                'motivo_anulacion' => $validated['motivo_anulacion'],
                'detalle_anulacion' => $validated['detalle_anulacion'] ?? null,
            ]);
        });

        // Notificar por Telegram solo cuando es una Devolución real (venta que ya
        // había movido dinero de verdad). Anular una venta pendiente no lo hace.
        if ($eraCompletada) {
            try {
                $admins = User::whereIn('role', ['admin', 'moderador'])->get();
                Notification::send($admins, new VentaDevueltaNotification($venta));
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de devolución de venta: '.$e->getMessage());
            }
        }

        return response()->json([
            'success' => true,
            'message' => $eraCompletada ? 'Devolución procesada correctamente' : 'Venta anulada correctamente',
        ]);
    }

    // ========================================================================
    // VENTAS ESPECIALES
    // ========================================================================

    /**
     * Admin aprueba la solicitud especial → pasa a "pendiente" (flujo normal continúa).
     */
    public function aprobarSolicitudEspecial(Venta $venta)
    {
        if (! $this->puedeDecidirSolicitudEspecial()) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para decidir esta solicitud.'], 403);
        }

        if ($venta->estado !== 'solicitud_especial') {
            return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
        }

        $venta->update([
            'estado' => 'pendiente',
            'decision_notificada' => false,
        ]);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'aprobada'));
        } catch (\Exception $e) {
            \Log::error('Error enviando notificación de decisión especial: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud aprobada. La venta está ahora pendiente de receptor.',
        ]);
    }

    /**
     * Admin rechaza la solicitud especial → revierte stock y pasa a "rechazada".
     */
    public function rechazarSolicitudEspecial(Venta $venta)
    {
        if (! $this->puedeDecidirSolicitudEspecial()) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para decidir esta solicitud.'], 403);
        }

        if ($venta->estado !== 'solicitud_especial') {
            return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
        }

        $venta->load(['detalles']);

        DB::transaction(function () use ($venta) {
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)->first();

                if ($almacenProducto) {
                    $almacenProducto->increment('cantidad', $detalle->cantidad);
                }

                if ($detalle->producto_codigo_id) {
                    $codigo = ProductoCodigo::find($detalle->producto_codigo_id);
                    if ($codigo) {
                        $codigo->increment('cantidad', $detalle->cantidad);
                    }
                }

                HistorialStock::create([
                    'producto_id' => $detalle->producto_id,
                    'almacen_id' => $venta->almacen_id,
                    'venta_id' => $venta->id,
                    'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
                    'cantidad_nueva' => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
                    'diferencia' => $detalle->cantidad,
                    'tipo' => 'venta_anulada',
                    'observaciones' => 'Stock revertido por rechazo de solicitud especial',
                    'user_id' => Auth::id(),
                ]);
            }

            $venta->update([
                'estado' => 'rechazada',
                'decision_notificada' => false,
            ]);
        });

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
        } catch (\Exception $e) {
            \Log::error('Error enviando notificación de decisión especial: '.$e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Solicitud rechazada. El stock ha sido revertido.',
        ]);
    }

    /**
     * Marca que el vendedor ya vio el veredicto del admin.
     */
    public function marcarDecisionNotificada(Venta $venta)
    {
        if (! $this->puedeGestionarVenta($venta)) {
            return response()->json(['success' => false, 'message' => 'No tienes permiso para gestionar esta venta.'], 403);
        }

        $venta->update(['decision_notificada' => true]);

        return response()->json(['success' => true]);
    }
}
