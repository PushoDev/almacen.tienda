<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use App\Models\AlmacenProducto;
use App\Models\Cuenta;
use App\Models\HistorialStock;
use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Cliente;
use App\Models\Moneda;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Notification;
use App\Notifications\VentaCreadaNotification;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class VentaController extends Controller
{
    // ========================================================================
    // MÉTODOS DE CARGA DE DATOS (API / JSON)
    // ========================================================================

    /**
     * Store a newly created cliente for use during venta process.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
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
                'existe' => true
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
            'existe' => false
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
     * Cargar Almacenes accesibles para el usuario autenticado.
     */
    public function getAlmacenes()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $almacenes = in_array($user->role, ['admin', 'moderador'])
            ? Almacen::select('id', 'nombre_almacen')->get()
            : ($user ? $user->almacenes()->select('id', 'nombre_almacen')->get() : collect());

        return response()->json($almacenes);
    }

    /**
     * Cargar Productos por Almacén, aplicando precios de venta del vendedor si existen.
     */
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 403);
        }

        // Validación de acceso al almacén (solo para no-admins)
        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains('id', $id)) {
            return response()->json(['error' => 'Acceso denegado al almacén'], 403);
        }

        $productos = Producto::whereHas('almacenes', function ($q) use ($id) {
            $q->where('almacens.id', $id);
        })
            ->with([
                'categoria',
                'vendedores' => function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
                },
                'almacenes' => function ($q) use ($id) {
                    $q->where('almacens.id', $id)
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad');
                }
            ])
            ->get()
            ->map(function ($producto) {
                $vendedor = $producto->vendedores->first();
                $almacen = $producto->almacenes->first();

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'categoria_nombre' => $producto->categoria?->nombre_categoria ?? 'Sin categoría',
                    'precio_compra_producto' => $producto->precio_compra_producto,
                    'stock_disponible' => $almacen?->pivot->cantidad ?? 0,
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
                    'imagen_url' => $producto->imagen_url,
                    'codigo_barras' => $producto->codigo_producto,
                    'barcode_image_url' => $producto->barcode_image_url,
                ];
            });

        return response()->json($productos);
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
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        // Filtrar cuentas: admins ven todas, vendedores solo las suyas
        $query = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta');

        if (!in_array($user->role, ['admin', 'moderador'])) {
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
                    ]
                ];
            });

        return response()->json($cuentas);
    }

    /**
     * Cargar cuentas filtradas por moneda y accesibles para el usuario - MEJORADO
     */
    public function getCuentasFiltradas(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $request->validate([
            'moneda_id' => 'required|exists:monedas,id'
        ]);

        $moneda = Moneda::find($request->moneda_id);
        if (!$moneda) {
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
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta');

        // Filtrar por usuario si no es admin
        if (!in_array($user->role, ['admin', 'moderador'])) {
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
                    ]
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
                'id' => (string)$moneda->id, // Convertir a string para consistencia con frontend
                'codigo_moneda' => $moneda->codigo_moneda,
                'nombre_moneda' => $moneda->nombre_moneda,
                'simbolo_moneda' => $moneda->simbolo_moneda,
                'tasa_cambio' => (float)$moneda->tasa_cambio,
                'principal' => (bool)$moneda->principal,
                'estado' => (bool)$moneda->estado,
            ];
        });

        return response()->json($monedasFormateadas);
    }

    /**
     * Devuelve un reporte de ventas agregado por período (diario, semanal, mensual).
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getVentasReporte(Request $request)
    {
        $request->validate([
            'periodo' => 'required|in:diario,semanal,mensual',
        ]);

        $user = Auth::user();
        $periodo = $request->input('periodo');

        $query = Venta::query()->where('estado', 'completada');

        // Filtrar por rol de usuario
        if (!in_array($user->role, ['admin', 'moderador'])) {
            $query->where('user_id', $user->id);
        }

        // Configurar rango de fechas según el período
        switch ($periodo) {
            case 'diario':
                $query->whereDate('created_at', today());
                break;
            case 'semanal':
                $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'mensual':
                $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year);
                break;
        }

        // Obtener y agregar los resultados
        $reporte = $query->select(
            DB::raw('SUM(total) as total_vendido'),
            DB::raw('COUNT(id) as cantidad_ventas'),
            DB::raw('SUM(total_ganancia) as ganancia_total')
        )->first();

        return response()->json([
            'total_vendido' => $reporte->total_vendido ?? 0,
            'cantidad_ventas' => $reporte->cantidad_ventas ?? 0,
            'ganancia_total' => $reporte->ganancia_total ?? 0,
        ]);
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
        if (!$user) {
            return redirect()->route('login');
        }

        $monedas = Moneda::where('estado', true)->get()
            ->map(function ($moneda) {
                return [
                    'id' => (string)$moneda->id, // Convertir a string para consistencia
                    'codigo_moneda' => $moneda->codigo_moneda,
                    'nombre_moneda' => $moneda->nombre_moneda,
                    'simbolo_moneda' => $moneda->simbolo_moneda,
                    'tasa_cambio' => (float)$moneda->tasa_cambio,
                    'principal' => (bool)$moneda->principal,
                    'estado' => (bool)$moneda->estado,
                ];
            });

        // Obtener cuentas accesibles del usuario
        $cuentasQuery = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta');

        if (!in_array($user->role, ['admin', 'moderador'])) {
            $cuentasQuery->whereHas('users', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        $cuentas = $cuentasQuery->get()->map(function ($cuenta) {
            return [
                'id' => (string)$cuenta->id,
                'nombre' => $cuenta->nombre_cuenta,
                'saldo' => (float)$cuenta->saldo_cuenta,
                'moneda' => $cuenta->moneda ? [
                    'id' => (string)$cuenta->moneda->id,
                    'codigo' => $cuenta->moneda->codigo_moneda,
                ] : null
            ];
        });

        return Inertia::render('Vendor/Index', [
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => in_array($user->role, ['admin', 'moderador'])
                    ? Almacen::select('id', 'nombre_almacen')->get()->map(fn($a) => ['id' => (string)$a->id, 'nombre' => $a->nombre_almacen])
                    : $user->almacenes->map(fn($a) => ['id' => (string)$a->id, 'nombre' => $a->nombre_almacen]),
                'cuentas_usuario' => $cuentas,
                'monedas' => $monedas,
            ]
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
            'pagos.cuenta.moneda',
            'pagos.cliente', // ✅ AGREGAR: relación con cliente para pagos
            'pagos.moneda',
            'cliente',
            'almacen',
            'usuario',
            'moneda',
            'monedaCobro'
        ])->findOrFail($id);

        $ventaData = [
            'id' => $venta->id,
            'almacen' => [
                'id' => $venta->almacen->id,
                'nombre' => $venta->almacen->nombre_almacen,
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
                return [
                    'producto' => [
                        'id' => $detalle->producto->id,
                        'nombre' => $detalle->producto->nombre_producto,
                        'marca' => $detalle->producto->marca_producto,
                        'categoria' => $detalle->producto->categoria->nombre_categoria ?? 'Sin categoría',
                    ],
                    'cantidad' => $detalle->cantidad,
                    'precio_venta' => $detalle->precio_venta,
                    'subtotal' => $detalle->subtotal,
                    'costo_unitario' => $detalle->costo_unitario,
                    'ganancia' => $detalle->ganancia,
                ];
            }),
            'total' => $venta->total,
            'total_ganancia' => $venta->total_ganancia,
            'total_esperado_usd' => $venta->total_esperado_usd,
            'ganancia_perdida_cambiaria' => $venta->ganancia_perdida_cambiaria,
            'ganancia_real_total' => $venta->ganancia_real_total,
            'estado' => $venta->estado,
            'fecha' => $venta->created_at->toISOString(),
            'usuario' => [
                'id' => $venta->usuario->id,
                'nombre' => $venta->usuario->name,
                'email' => $venta->usuario->email,
                'rol' => $venta->usuario->role,
            ],
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
            ] : null,
            'tasa_cambio_principal' => $venta->tasa_cambio_principal,
            'tasa_aplicada_venta' => $venta->tasa_aplicada_venta,
            'moneda_cobro' => $venta->monedaCobro ? [
                'id' => $venta->monedaCobro->id,
                'codigo' => $venta->monedaCobro->codigo_moneda,
                'nombre' => $venta->monedaCobro->nombre_moneda,
                'simbolo' => $venta->monedaCobro->simbolo_moneda,
            ] : null,
            'monto_diferencia_cambiaria' => $venta->monto_diferencia_cambiaria,
        ];

        return Inertia::render('Vendor/Show', [
            'venta' => $ventaData
        ]);
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
        $validatedData = $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'cliente_id' => 'nullable|exists:clientes,id',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.precio_venta' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'pagos' => 'required|array|min:1',
            'pagos.*.metodo' => 'required|in:transferencia,efectivo',
            'pagos.*.moneda_id' => 'required|exists:monedas,id',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.via' => 'nullable|string|required_if:pagos.*.metodo,transferencia',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0.0001',
            'pagos.*.monto_equivalente' => 'required|numeric|min:0',
            // ✅ CAMBIO 1: Hacer nullable cuenta_id y agregar cliente_id
            'pagos.*.cuenta_id' => 'nullable|exists:cuentas,id',
            'pagos.*.cliente_id' => 'nullable|exists:clientes,id',
            'pagos.*.referencia' => 'nullable|string|required_if:pagos.*.metodo,transferencia',
            'moneda_principal_id' => 'required|exists:monedas,id',
            'tasa_cambio_principal' => 'required|numeric|min:0.0001',
            'tasa_aplicada_venta' => 'nullable|numeric|min:0.0001',
            'moneda_cobro_id' => 'nullable|exists:monedas,id',
        ]);

        // ✅ CAMBIO 2: Agregar validación lógica después del validate
        foreach ($validatedData['pagos'] as $pago) {
            // Cada pago debe tener cuenta_id O cliente_id
            if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
                throw new \Exception('Cada pago debe tener una cuenta o un cliente como destino.');
            }

            // No pueden tener ambos
            if (!empty($pago['cuenta_id']) && !empty($pago['cliente_id'])) {
                throw new \Exception('Un pago no puede tener cuenta y cliente al mismo tiempo.');
            }
        }

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception('Usuario no autenticado');
            }

            if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains('id', $validatedData['almacen_id'])) {
                throw new \Exception('No tienes acceso a este almacén');
            }
            $total_ganancia = 0;
            $costo_total_productos = 0;

            // Validación y descuento inmediato de stock
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);
                if ($item['precio_venta'] < $producto->precio_compra_producto) {
                    throw new \Exception("El precio de venta de {$producto->nombre_producto} no puede ser menor que su costo de compra.");
                }

                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])->first();

                if (!$almacenProducto || $almacenProducto->cantidad < $item['cantidad']) {
                    throw new \Exception("Stock insuficiente para: {$producto->nombre_producto}.");
                }

                $costo = $producto->precio_compra_producto * $item['cantidad'];
                $costo_total_productos += $costo;

                $almacenProducto->decrement('cantidad', $item['cantidad']);
                HistorialStock::create([
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
            }

            // ✅ CAMBIO 3: Modificar validación de cuentas (solo si tiene cuenta_id)
            foreach ($validatedData['pagos'] as $pago) {
                if (!empty($pago['cuenta_id'])) {
                    $cuenta = Cuenta::find($pago['cuenta_id']);
                    if (!in_array($user->role, ['admin', 'moderador']) && !$user->cuentas->contains('id', $pago['cuenta_id'])) {
                        throw new \Exception('No tienes acceso a la cuenta seleccionada');
                    }
                }
            }

            // Crear la venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'total_ganancia' => 0,
                'estado' => 'pendiente',
                'moneda_id' => $validatedData['moneda_principal_id'],
                'tasa_cambio_principal' => $validatedData['tasa_cambio_principal'],
                'tasa_aplicada_venta' => $validatedData['tasa_aplicada_venta'] ?? null,
                'moneda_cobro_id' => $validatedData['moneda_cobro_id'] ?? null,
            ]);

            HistorialStock::where('user_id', $user->id)->where('tipo', 'venta_pendiente')->whereNull('venta_id')->update(['venta_id' => $venta->id]);

            // Crear detalles y calcular ganancia
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);
                $ganancia = ($item['precio_venta'] - $producto->precio_compra_producto) * $item['cantidad'];
                $total_ganancia += $ganancia;
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_venta' => $item['precio_venta'],
                    'subtotal' => $item['subtotal'],
                    'costo_unitario' => $producto->precio_compra_producto,
                    'ganancia' => $ganancia,
                ]);
            }

            // USD objetivo real (costo + ganancia deseada)
            $usd_objetivo = $costo_total_productos + $total_ganancia;

            // CÁLCULO DE DIFERENCIA CAMBIARIA (POSITIVA O NEGATIVA)
            $monto_diferencia_cambiaria = 0;
            if ($venta->moneda_cobro_id) {
                $monedaCobro = Moneda::find($venta->moneda_cobro_id);
                if ($monedaCobro) {
                    $tasa_oficial = $monedaCobro->tasa_cambio;

                    $monto_esperado_oficial = $usd_objetivo * $tasa_oficial;

                    $monto_real_cobrado = collect($validatedData['pagos'])
                        ->where('moneda_id', $venta->moneda_cobro_id)
                        ->sum('monto');

                    $monto_diferencia_cambiaria = $monto_real_cobrado - $monto_esperado_oficial;
                }
            }

            $venta->update([
                'total_ganancia' => $total_ganancia,
                'total_esperado_usd' => $usd_objetivo,
                'monto_diferencia_cambiaria' => $monto_diferencia_cambiaria,
            ]);

            // ✅ CAMBIO 4: Modificar creación de pagos para incluir cliente_id
            foreach ($validatedData['pagos'] as $pago) {
                PagoVenta::create([
                    'venta_id' => $venta->id,
                    'tipo_pago' => $pago['metodo'],
                    'moneda_id' => $pago['moneda_id'],
                    // ✅ Permite null si el destino es cliente
                    'cuenta_id' => $pago['cuenta_id'] ?? null,
                    // ✅ Nuevo campo para cliente destino
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
                Notification::send($admins, new VentaCreadaNotification($venta));
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de venta: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Venta creada correctamente.',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error al procesar venta: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la venta: ' . $e->getMessage()
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
        if ($venta->estado !== 'pendiente') {
            return response()->json([
                'success' => false,
                'message' => 'Solo se puede modificar el receptor en ventas pendientes.'
            ], 403);
        }

        $validated = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellidos' => 'required|string|max:100',
            'carnet_identidad' => 'nullable|string|size:11|regex:/^\d+$/',
            'direccion_residencia' => 'nullable|string|max:500', // Modificado a nullable
            'telefono_contacto' => 'nullable|string|max:20',
            'parentesco_cliente' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string|max:500',
        ]);

        if ($request->filled('carnet_identidad')) {
            $validated['carnet_identidad'] = preg_replace('/\D/', '', $validated['carnet_identidad']);
        }

        DB::transaction(function () use ($venta, $validated) {
            if ($venta->destinatario) {
                $venta->destinatario->update($validated);
            } else {
                $venta->destinatario()->create($validated);
            }
        });

        $venta->load('destinatario');

        return response()->json([
            'success' => true,
            'message' => 'Información del receptor guardada correctamente',
            'destinatario' => $venta->destinatario,
        ]);
    }


    /**
     * Aprobar la venta
     */
    public function aprobarVenta(Venta $venta)
    {
        if ($venta->estado !== 'pendiente') {
            return response()->json(['success' => false, 'message' => 'Ya no está pendiente'], 400);
        }

        if (!$venta->destinatario) {
            return response()->json(['success' => false, 'message' => 'Falta receptor'], 400);
        }

        DB::transaction(function () use ($venta) {
            // 1. Cambiar estado a completada
            $venta->update(['estado' => 'completada']);

            // 2. Tasa oficial del CUP para ganancia/perdida cambiaria
            $tasaOficialCUP = DB::table('monedas')
                ->where('codigo_moneda', 'CUP')
                ->value('tasa_cambio') ?? 365;

            $gananciaExtraUSD = 0;

            foreach ($venta->pagos as $pago) {
                // Cálculo de ganancia/perdida cambiaria solo para pagos en CUP
                if ($pago->moneda && $pago->moneda->codigo_moneda === 'CUP') {
                    $montoCUP = $pago->monto;
                    $valorRealUSD = $montoCUP / $tasaOficialCUP;
                    $valorContadoUSD = $pago->monto_equivalente;
                    $gananciaExtraUSD += ($valorRealUSD - $valorContadoUSD);
                }

                // ✅ CAMBIO: Manejar destino del dinero (cuenta O cliente)
                // CASO 1: El destino es un Cliente Físico
                if ($pago->cliente_id) {
                    $clienteDestino = $pago->cliente;

                    // Verificar que el cliente destino existe y es físico
                    if ($clienteDestino && $clienteDestino->tipo_cliente === 'fisico') {
                        // ✅ Incrementar la deuda del cliente destino
                        $clienteDestino->increment('deuda_pago_cliente', $pago->monto);

                        // ✅ IMPORTANTE: Saltar al siguiente pago, NO procesar cuenta
                        continue;
                    }
                }

                // CASO 2: El destino es una Cuenta (flujo normal)
                $cuenta = $pago->cuenta;
                if (!$cuenta) {
                    continue;
                }

                $codigoCuenta = $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda;
                $codigoPago = $pago->moneda?->codigo_moneda;

                if ($codigoPago === $codigoCuenta) {
                    $cuenta->increment('saldo_cuenta', $pago->monto);
                }
                // Si no coinciden, por seguridad no acumulamos
            }

            $gananciaExtraUSD = round($gananciaExtraUSD, 2);

            $venta->update([
                'ganancia_perdida_cambiaria' => $gananciaExtraUSD,
                'ganancia_real_total'        => $venta->total_ganancia + $gananciaExtraUSD,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Venta Aprobada Satisfactoriamente'
        ]);
    }

    /**
     * Obtener listado de ventas con filtros y paginación.
     */
    public function listadoVentas(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return redirect()->route('login');
        }

        // Construir query base
        $query = Venta::with(['cliente', 'almacen', 'usuario', 'pagos', 'moneda', 'destinatario', 'monedaCobro'])
            ->withCount('detalles');

        // Filtrar por usuario (excepto admin y moderador)
        if (!in_array($user->role, ['admin', 'moderador'])) {
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

        // Ordenar y paginar
        $ventas = $query->orderBy('created_at', 'desc')
            ->paginate(15)
            ->through(function ($venta) {
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
                    'total_ganancia' => $venta->total_ganancia,
                    'total_esperado_usd' => $venta->total_esperado_usd,
                    'ganancia_perdida_cambiaria' => $venta->ganancia_perdida_cambiaria,
                    'ganancia_real_total' => $venta->ganancia_real_total,
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
                ];
            });

        // Obtener almacenes para filtros
        $almacenes = in_array($user->role, ['admin', 'moderador'])
            ? Almacen::select('id', 'nombre_almacen')->get()
            : ($user ? $user->almacenes()->select('id', 'nombre_almacen')->get() : collect());

        return Inertia::render('Vendor/Listado', [
            'ventas' => $ventas,
            'filters' => $request->only(['estado', 'almacen_id', 'fecha_desde', 'fecha_hasta']),
            'almacenes' => $almacenes,
            'estados_venta' => [
                ['value' => 'pendiente', 'label' => 'Pendiente'],
                ['value' => 'completada', 'label' => 'Completada'],
                ['value' => 'cancelada', 'label' => 'Cancelada'],
            ]
        ]);
    }
}
