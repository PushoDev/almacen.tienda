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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VentaController extends Controller
{
    // ========================================================================
    // MÉTODOS DE CARGA DE DATOS (API / JSON)
    // ========================================================================

    /**
     * Cargar Almacenes accesibles para el usuario autenticado.
     */
    public function getAlmacenes()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 401);
        }

        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

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
        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $id)) {
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
     * Cargar Todas las cuentas del Negocio.
     */
    public function getCuentas()
    {
        $cuentas = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta')
            ->get()
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
     * Cargar cuentas filtradas por moneda.
     */
    public function getCuentasFiltradas(Request $request)
    {
        $request->validate([
            'moneda_id' => 'required|exists:monedas,id'
        ]);

        $moneda = Moneda::find($request->moneda_id);
        if (!$moneda) {
            return response()->json([]);
        }

        // Buscar cuentas que coincidan por moneda_id O por tipo_moneda
        $cuentas = Cuenta::with('moneda')
            ->where(function ($query) use ($moneda) {
                $query->where('moneda_id', $moneda->id)
                    ->orWhere('tipo_moneda', $moneda->codigo_moneda);
            })
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta')
            ->get()
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
     * Cargar todas las monedas activas.
     */
    public function getMonedas()
    {
        $monedas = Moneda::where('estado', true)->get();
        return response()->json($monedas);
    }

    // ========================================================================
    // MÉTODOS DE VISTA (INERTIA)
    // ========================================================================

    /**
     * Muestra la vista principal para realizar ventas.
     */
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return redirect()->route('login');
        }

        $monedas = Moneda::where('estado', true)->get();

        return Inertia::render('Vendor/Index', [
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->role === 'admin'
                    ? Almacen::select('id', 'nombre_almacen')->get()->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen])
                    : $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
                'monedas' => $monedas,
            ]
        ]);
    }

    /**
     * Muestra los detalles de una venta específica.
     */
    public function show($id)
    {
        $venta = Venta::with([
            'detalles.producto.categoria',
            'pagos.cuenta.moneda',
            'pagos.moneda',
            'cliente',
            'almacen',
            'usuario',
            'moneda'
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
                ];
            }),
            'total' => $venta->total,
            'estado' => $venta->estado,
            'fecha' => $venta->created_at->toISOString(),
            'usuario' => [
                'id' => $venta->usuario->id,
                'nombre' => $venta->usuario->name,
                'email' => $venta->usuario->email,
                'rol' => $venta->usuario->role,
            ],
            'pagos' => $venta->pagos->map(function ($pago) {
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
                    'cuenta' => [
                        'id' => $pago->cuenta->id,
                        'nombre' => $pago->cuenta->nombre_cuenta,
                        'moneda' => $pago->cuenta->moneda ? [
                            'id' => $pago->cuenta->moneda->id,
                            'codigo' => $pago->cuenta->moneda->codigo_moneda,
                            'nombre' => $pago->cuenta->moneda->nombre_moneda,
                        ] : null,
                    ]
                ];
            }),
            'total_pagado' => $venta->pagos->sum('monto_equivalente'),
            'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
            'moneda_principal' => $venta->moneda ? [
                'id' => $venta->moneda->id,
                'codigo' => $venta->moneda->codigo_moneda,
                'nombre' => $venta->moneda->nombre_moneda,
            ] : null,
            'tasa_cambio_principal' => $venta->tasa_cambio_principal,
        ];

        return Inertia::render('Vendor/Show', [
            'venta' => $ventaData
        ]);
    }

    // ========================================================================
    // MÉTODOS DE PROCESAMIENTO
    // ========================================================================

    /**
     * Procesa la venta con tasas de cambio editables por operación.
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
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.referencia' => 'nullable|string|required_if:pagos.*.metodo,transferencia',
            'moneda_principal_id' => 'required|exists:monedas,id',
            'tasa_cambio_principal' => 'required|numeric|min:0.0001',
        ]);

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception('Usuario no autenticado');
            }

            if ($user->role !== 'admin' && !$user->almacenes->contains('id', $validatedData['almacen_id'])) {
                throw new \Exception('No tienes acceso a este almacén');
            }

            // Validación de stock
            foreach ($validatedData['items'] as $item) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if (!$almacenProducto || $almacenProducto->cantidad < $item['cantidad']) {
                    $producto = Producto::find($item['producto_id']);
                    throw new \Exception("Stock insuficiente para: {$producto->nombre_producto}. Disponible: " . ($almacenProducto->cantidad ?? 0));
                }
            }

            // Validar que las cuentas coincidan con la moneda del pago - CORREGIDO
            foreach ($validatedData['pagos'] as $index => $pago) {
                $cuenta = Cuenta::with('moneda')->find($pago['cuenta_id']);
                if (!$cuenta) {
                    throw new \Exception('Cuenta no encontrada');
                }

                $monedaPago = Moneda::find($pago['moneda_id']);
                if (!$monedaPago) {
                    throw new \Exception('Moneda de pago no encontrada');
                }

                // Validar compatibilidad de moneda
                if ($cuenta->moneda_id) {
                    // Si la cuenta tiene moneda_id, debe coincidir exactamente
                    if ($cuenta->moneda_id != $pago['moneda_id']) {
                        throw new \Exception("La cuenta seleccionada ({$cuenta->nombre_cuenta}) no coincide con la moneda del pago");
                    }
                } else {
                    // Si la cuenta usa tipo_moneda (legacy), validar por código
                    if ($cuenta->tipo_moneda != $monedaPago->codigo_moneda) {
                        throw new \Exception("La cuenta seleccionada ({$cuenta->nombre_cuenta}) no coincide con la moneda del pago");
                    }
                }
            }

            // Crear la venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'estado' => 'pendiente',
                'moneda_id' => $validatedData['moneda_principal_id'],
                'tasa_cambio_principal' => $validatedData['tasa_cambio_principal'],
            ]);

            // Crear detalles de venta
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);

                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_venta' => $item['precio_venta'],
                    'subtotal' => $item['subtotal'],
                    'costo_unitario' => $producto->precio_compra_producto,
                ]);
            }

            // Procesar pagos con tasas editables
            foreach ($validatedData['pagos'] as $pago) {
                PagoVenta::create([
                    'venta_id' => $venta->id,
                    'tipo_pago' => $pago['metodo'],
                    'moneda_id' => $pago['moneda_id'],
                    'cuenta_id' => $pago['cuenta_id'],
                    'via_pago' => $pago['via'] ?? null,
                    'monto' => $pago['monto'],
                    'tasa_cambio_aplicada' => $pago['tasa_cambio'],
                    'monto_equivalente' => $pago['monto_equivalente'],
                    'referencia' => $pago['referencia'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta creada correctamente. Pendiente de aprobación.',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la venta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validar stock antes de procesar.
     */
    public function validarStock(Request $request)
    {
        $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
        ]);

        $errores = [];

        foreach ($request->items as $index => $item) {
            $almacenProducto = AlmacenProducto::where('almacen_id', $request->almacen_id)
                ->where('producto_id', $item['producto_id'])
                ->first();

            if (!$almacenProducto) {
                $producto = Producto::find($item['producto_id']);
                $errores[] = "Producto {$producto->nombre_producto} no disponible en este almacén";
            } elseif ($almacenProducto->cantidad < $item['cantidad']) {
                $producto = Producto::find($item['producto_id']);
                $errores[] = "Stock insuficiente para {$producto->nombre_producto}. Disponible: {$almacenProducto->cantidad}";
            }
        }

        return response()->json([
            'valido' => empty($errores),
            'errores' => $errores
        ]);
    }

    /**
     * Aprueba una venta pendiente.
     */
    public function aprobarVenta(Venta $venta)
    {
        if ($venta->estado !== 'pendiente') {
            return response()->json(['error' => 'Solo se pueden aprobar ventas con estado "pendiente". Estado actual: ' . $venta->estado], 400);
        }

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception('Usuario no autenticado');
            }

            $venta->load(['detalles.producto', 'pagos.cuenta.moneda', 'pagos.moneda', 'moneda']);

            // Actualizar stock y registrar en historial
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)
                    ->first();

                if ($almacenProducto) {
                    $cantidadAnterior = $almacenProducto->cantidad;
                    $nuevaCantidad = $cantidadAnterior - $detalle->cantidad;

                    if ($nuevaCantidad < 0) {
                        $producto = $detalle->producto;
                        throw new \Exception("Stock insuficiente para: {$producto->nombre_producto}. Stock: {$cantidadAnterior}, Vendido: {$detalle->cantidad}");
                    }

                    HistorialStock::create([
                        'producto_id' => $detalle->producto_id,
                        'almacen_id' => $venta->almacen_id,
                        'venta_id' => $venta->id,
                        'cantidad_anterior' => $cantidadAnterior,
                        'cantidad_nueva' => $nuevaCantidad,
                        'diferencia' => -$detalle->cantidad,
                        'tipo' => 'venta',
                        'observaciones' => 'Venta aprobada y stock descontado',
                        'user_id' => $user->id,
                    ]);

                    $almacenProducto->update(['cantidad' => $nuevaCantidad]);
                } else {
                    throw new \Exception("Producto no encontrado en el almacén: {$detalle->producto_id}");
                }
            }

            // Procesar pagos y actualizar cuentas
            foreach ($venta->pagos as $pago) {
                $cuenta = $pago->cuenta;
                if ($cuenta) {
                    $montoIncremento = $this->calcularMontoIncremento($cuenta, $pago, $venta);
                    $nuevoSaldo = $cuenta->saldo_cuenta + $montoIncremento;
                    $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
                } else {
                    throw new \Exception("Cuenta no encontrada: {$pago->cuenta_id}");
                }
            }

            // Actualizar estado de la venta
            $venta->update(['estado' => 'completada']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta aprobada y completada correctamente. Stock y saldos actualizados.',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al aprobar la venta: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Anula una venta.
     */
    public function anularVenta(Venta $venta)
    {
        if ($venta->estado === 'cancelada') {
            return response()->json(['error' => 'Esta venta ya fue cancelada previamente.'], 400);
        }

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception('Usuario no autenticado');
            }

            // Solo revertir si estaba completada
            if ($venta->estado === 'completada') {
                // Revertir stock
                foreach ($venta->detalles as $detalle) {
                    $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                        ->where('producto_id', $detalle->producto_id)
                        ->first();

                    if ($almacenProducto) {
                        $cantidadDevuelta = $detalle->cantidad;
                        $cantidadAnterior = $almacenProducto->cantidad;
                        $nuevaCantidad = $cantidadAnterior + $cantidadDevuelta;

                        $almacenProducto->update(['cantidad' => $nuevaCantidad]);

                        HistorialStock::create([
                            'producto_id' => $detalle->producto_id,
                            'almacen_id' => $venta->almacen_id,
                            'venta_id' => $venta->id,
                            'cantidad_anterior' => $cantidadAnterior,
                            'cantidad_nueva' => $nuevaCantidad,
                            'diferencia' => $cantidadDevuelta,
                            'tipo' => 'anulacion_venta',
                            'observaciones' => 'Reversión por anulación de la Venta ID: ' . $venta->id,
                            'user_id' => $user->id,
                        ]);
                    } else {
                        throw new \Exception('Error de stock: El producto ' . $detalle->producto_id . ' no se encontró en el almacén.');
                    }
                }

                // Revertir pagos y saldos
                $venta->load(['pagos.cuenta.moneda', 'pagos.moneda', 'moneda']);
                foreach ($venta->pagos as $pago) {
                    $cuenta = $pago->cuenta;
                    if ($cuenta) {
                        $montoDeduccion = $this->calcularMontoIncremento($cuenta, $pago, $venta);
                        $nuevoSaldo = $cuenta->saldo_cuenta - $montoDeduccion;
                        $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
                    } else {
                        throw new \Exception('Cuenta de pago no encontrada: ' . $pago->cuenta_id);
                    }
                }
            }

            // Actualizar estado
            $venta->update(['estado' => 'cancelada']);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta ID ' . $venta->id . ' anulada correctamente. ' . ($venta->estado === 'completada' ? 'Stock y saldos revertidos.' : 'Estado actualizado.'),
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al anular la venta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Actualizar tasas de cambio en monedas.
     */
    public function actualizarTasas(Request $request)
    {
        $request->validate([
            'monedas' => 'required|array',
            'monedas.*.id' => 'required|exists:monedas,id',
            'monedas.*.tasa_cambio' => 'required|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($request->monedas as $monedaData) {
                $moneda = Moneda::find($monedaData['id']);
                $moneda->update(['tasa_cambio' => $monedaData['tasa_cambio']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Tasas de cambio actualizadas correctamente 💹'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar las tasas de cambio',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ========================================================================
    // MÉTODOS PRIVADOS (HELPER)
    // ========================================================================

    /**
     * Calcula el monto a incrementar usando el nuevo sistema de monedas.
     */
    private function calcularMontoIncremento(Cuenta $cuenta, PagoVenta $pago, Venta $venta): float
    {
        if (!$cuenta->relationLoaded('moneda')) {
            $cuenta->load('moneda');
        }
        if (!$pago->relationLoaded('moneda')) {
            $pago->load('moneda');
        }

        $monedaCuenta = $cuenta->moneda;
        $monedaPago = $pago->moneda;

        if (!$monedaCuenta || !$monedaPago) {
            throw new \Exception('Error en configuración de monedas para la conversión');
        }

        // Si la moneda de la cuenta es la misma que la del pago, no hay conversión
        if ($monedaCuenta->id === $monedaPago->id) {
            return $pago->monto;
        }

        // Obtener moneda principal de la venta
        $monedaPrincipal = $venta->moneda;
        $tasaPrincipal = $venta->tasa_cambio_principal;

        if (!$monedaPrincipal) {
            throw new \Exception('No se encontró moneda principal para la venta');
        }

        // Convertir el monto del pago a la moneda principal
        $montoEnPrincipal = $pago->monto * ($monedaPago->tasa_cambio / $tasaPrincipal);

        // Convertir de la moneda principal a la moneda de la cuenta
        $montoEnCuenta = $montoEnPrincipal * ($tasaPrincipal / $monedaCuenta->tasa_cambio);

        return $montoEnCuenta;
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
        $query = Venta::with(['cliente', 'almacen', 'usuario', 'pagos', 'moneda'])
            ->withCount('detalles');

        // Filtrar por usuario (excepto admin)
        if ($user->role !== 'admin') {
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
                ];
            });

        // Obtener almacenes para filtros
        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

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
