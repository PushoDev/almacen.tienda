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
use App\Models\TasaCambio;
use App\Models\TasaCambioMLC;
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
                    // Cargar solo el almacén solicitado para obtener su stock
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
                    // CORRECCIÓN DE STOCK - Usar el stock disponible del almacén seleccionado.
                    'stock_disponible' => $almacen?->pivot->cantidad ?? 0,
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
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
        $cuentas = Cuenta::select('id', 'nombre_cuenta', 'tipo_moneda')->get();
        return response()->json($cuentas);
    }

    /**
     * Cargar datos de la Tasa de Cambio para USD.
     */
    public function getTasaUSD()
    {
        $tasaUSD = TasaCambio::select('id', 'tasa')->get();
        return response()->json($tasaUSD);
    }

    /**
     * Cargar datos de la tasa de MLC.
     */
    public function getTasaMLC()
    {
        $tasaMLC = TasaCambioMLC::select('id', 'tasa_mlc')->get();
        return response()->json($tasaMLC);
    }

    // ========================================================================
    // MÉTODOS DE VISTA (INERTIA)
    // ========================================================================

    /**
     * Muestra la vista principal para realizar ventas (Inertia/Vue component).
     */
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return redirect()->route('login');
        }

        // Obtener las últimas tasas de cambio
        $tasaUSD = TasaCambio::latest()->first();
        $tasaMLC = TasaCambioMLC::latest()->first();

        return Inertia::render('Vendor/Index', [
            'meta' => [
                'role_usuario' => $user->role,
                // Si el rol es admin, carga todos los almacenes, sino, los que tiene asignados
                'almacenes_usuario' => $user->role === 'admin'
                    ? Almacen::select('id', 'nombre_almacen')->get()->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen])
                    : $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
                'tasa_usd' => $tasaUSD ? $tasaUSD->tasa : 1,
                'tasa_mlc' => $tasaMLC ? $tasaMLC->tasa_mlc : 1,
            ]
        ]);
    }

    /**
     * Muestra los detalles de una venta específica.
     */
    public function show($id)
    {
        // Cargar las relaciones necesarias (detalles, pagos, cliente, almacén, usuario)
        $venta = Venta::with(['detalles.producto.categoria', 'pagos.cuenta', 'cliente', 'almacen', 'usuario'])
            ->findOrFail($id);

        // Formatear los datos para la vista
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
                    'costo_unitario' => $detalle->costo_unitario, // Incluido por si se usa en la vista
                ];
            }),
            'total' => $venta->total,
            'estado' => $venta->estado, // Estado de la venta
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
                    'moneda' => $pago->tipo_moneda,
                    'monto' => $pago->monto,
                    'via' => $pago->via_pago,
                    'tasa_cambio' => $pago->tasa_cambio,
                    'monto_usd' => $pago->monto_equivalente,
                    'cuenta' => [
                        'id' => $pago->cuenta->id,
                        'nombre' => $pago->cuenta->nombre_cuenta,
                        'moneda' => $pago->cuenta->tipo_moneda,
                    ]
                ];
            }),
            // Los campos `total_pagado` y `restante` son cruciales para la visualización.
            'total_pagado' => $venta->pagos->sum('monto_equivalente'),
            'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
            // Agregar las tasas utilizadas en la venta
            'tasa_usd_utilizada' => $venta->tasa_usd_utilizada,
            'tasa_mlc_utilizada' => $venta->tasa_mlc_utilizada,
        ];

        return Inertia::render('Vendor/Show', [
            'venta' => $ventaData
        ]);
    }

    // ========================================================================
    // MÉTODOS DE PROCESAMIENTO
    // ========================================================================

    /**
     * Procesa la venta: crea registros de venta y pago con estado 'pendiente'.
     * Los procesos de stock y cuentas se hacen en 'aprobarVenta'.
     */
    public function procesarVenta(Request $request)
    {
        // Validar los datos recibidos
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
            'pagos.*.moneda' => 'required|in:USD,EUR,MLC,CUP',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.via' => 'nullable|string',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0',
            'pagos.*.monto_usd' => 'required|numeric|min:0',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.referencia' => 'nullable|string',
            'tasas_temporales' => 'nullable|array',
            'tasas_temporales.tasa_usd' => 'nullable|numeric|min:0',
            'tasas_temporales.tasa_mlc' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                // Debería ser atrapado por un middleware, pero es un buen doble check.
                throw new \Exception("Usuario no autenticado");
            }

            // **Validación de stock** antes de crear la venta (para prevenir errores del usuario)
            foreach ($validatedData['items'] as $item) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if (!$almacenProducto || $almacenProducto->cantidad < $item['cantidad']) {
                    $producto = Producto::find($item['producto_id']);
                    // Mensaje claro para el usuario
                    throw new \Exception("Stock insuficiente en el almacén para el producto: " . $producto->nombre_producto);
                }
            }


            // Obtener tasas de cambio - usar las temporales si están disponibles, sino las de la BD
            $tasaUSDaCUP = $validatedData['tasas_temporales']['tasa_usd'] ?? (TasaCambio::latest()->first()->tasa ?? 1);
            $tasaMLCaUSD = $validatedData['tasas_temporales']['tasa_mlc'] ?? (TasaCambioMLC::latest()->first()->tasa_mlc ?? 1);

            // Crear la venta con estado PENDIENTE
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'estado' => 'pendiente', // Estado inicial a pendiente
                'tasa_usd_utilizada' => $tasaUSDaCUP,
                'tasa_mlc_utilizada' => $tasaMLCaUSD,
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

                // Se omite la actualización de stock y el registro en HistorialStock. Esto se hace en aprobarVenta.
            }

            // Procesar pagos y registrarlos (sin afectar el saldo de cuentas aún)
            foreach ($validatedData['pagos'] as $pago) {
                // Crear pago de venta
                PagoVenta::create([
                    'venta_id' => $venta->id,
                    'tipo_pago' => $pago['metodo'],
                    'tipo_moneda' => $pago['moneda'],
                    'cuenta_id' => $pago['cuenta_id'],
                    'via_pago' => $pago['via'] ?? null,
                    'monto' => $pago['monto'],
                    'tasa_cambio' => $pago['tasa_cambio'],
                    'monto_equivalente' => $pago['monto_usd'],
                    'referencia' => $pago['referencia'] ?? null,
                ]);

                // Se omite la actualización de saldo de la cuenta. Esto se hace en aprobarVenta.
            }

            DB::commit();

            // Redirigir a la vista de detalle de venta
            return response()->json([
                'success' => true,
                'message' => 'Venta creada correctamente. Pendiente de aprobación.',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            // Retornar respuesta JSON de error
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la venta',
                'error' => $e->getMessage(),
                // 'trace' => config('app.debug') ? $e->getTraceAsString() : null // Descomentar para debug
            ], 500);
        }
    }


    /**
     * Aprueba una venta pendiente: actualiza stock y saldos de cuentas, y cambia el estado.
     */
    public function aprobarVenta(Venta $venta)
    {
        // 1. Verificar si la venta es pendiente
        if ($venta->estado !== 'pendiente') {
            return response()->json(['error' => 'Solo se pueden aprobar ventas con estado "pendiente". Estado actual: ' . $venta->estado], 400);
        }

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception("Usuario no autenticado");
            }

            $tasaUSDaCUP = $venta->tasa_usd_utilizada;
            $tasaMLCaUSD = $venta->tasa_mlc_utilizada;

            // 2. ACTUALIZAR STOCK Y REGISTRAR EN HISTORIAL
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)
                    ->first();

                if ($almacenProducto) {
                    $cantidadAnterior = $almacenProducto->cantidad;
                    $nuevaCantidad = $cantidadAnterior - $detalle->cantidad;

                    // Verificar stock suficiente (doble check por si el stock cambió entre procesarVenta y aprobarVenta)
                    if ($nuevaCantidad < 0) {
                        $producto = Producto::find($detalle->producto_id);
                        throw new \Exception("Stock insuficiente para el producto: " . $producto->nombre_producto . " (El stock disponible es menor a la cantidad vendida al momento de la aprobación).");
                    }

                    // Registrar en historial de stock
                    HistorialStock::create([
                        'producto_id' => $detalle->producto_id,
                        'almacen_id' => $venta->almacen_id,
                        'venta_id' => $venta->id,
                        'cantidad_anterior' => $cantidadAnterior,
                        'cantidad_nueva' => $nuevaCantidad,
                        'diferencia' => -$detalle->cantidad, // Salida
                        'tipo' => 'venta',
                        'observaciones' => 'Venta aprobada y stock descontado',
                        'user_id' => $user->id,
                    ]);

                    // Actualizar stock
                    $almacenProducto->update(['cantidad' => $nuevaCantidad]);
                } else {
                    throw new \Exception("Producto no encontrado en el almacén: " . $detalle->producto_id);
                }
            }

            // 3. PROCESAR PAGOS Y ACTUALIZAR CUENTAS
            $venta->load('pagos.cuenta'); // Recargar las relaciones si no están cargadas
            foreach ($venta->pagos as $pago) {
                $cuenta = Cuenta::find($pago->cuenta_id);
                $pagoArray = $pago->toArray(); // Convertir el modelo de pago a array para usar el helper

                if ($cuenta) {
                    // Determinar el monto a incrementar basado en la moneda de la cuenta
                    $montoIncremento = $this->calcularMontoIncremento($cuenta, $pagoArray, $tasaUSDaCUP, $tasaMLCaUSD);

                    $nuevoSaldo = $cuenta->saldo_cuenta + $montoIncremento;
                    // Actualizar saldo de la cuenta
                    $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
                } else {
                    throw new \Exception("Cuenta no encontrada: " . $pago->cuenta_id);
                }
            }

            // 4. ACTUALIZAR EL ESTADO DE LA VENTA a 'completada'
            $venta->update([
                'estado' => 'completada',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta aprobada y completada correctamente. Stock y saldos actualizados. 🎉',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error al aprobar la venta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Anula una venta: revierte stock, saldos de cuenta (si estaba completada) y cambia el estado de la venta.
     */
    public function anularVenta(Venta $venta)
    {
        // 1. Verificar si la venta ya está cancelada
        if ($venta->estado === 'cancelada') {
            return response()->json(['error' => 'Esta venta ya fue cancelada previamente.'], 400);
        }

        // 2. Iniciar Transacción para asegurar la atomicidad
        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception("Usuario no autenticado");
            }

            // **Solo se revierte stock y saldos si la venta ya estaba COMPLETADA.**
            if ($venta->estado === 'completada') {
                // A. REVERTIR STOCK DE PRODUCTOS
                foreach ($venta->detalles as $detalle) {
                    $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                        ->where('producto_id', $detalle->producto_id)
                        ->first();

                    if ($almacenProducto) {
                        $cantidadDevuelta = $detalle->cantidad;
                        $cantidadAnterior = $almacenProducto->cantidad;
                        $nuevaCantidad = $cantidadAnterior + $cantidadDevuelta;

                        // 1. Actualizar el stock: sumar la cantidad vendida
                        $almacenProducto->update(['cantidad' => $nuevaCantidad]);

                        // 2. Registrar la reversión en el historial de stock
                        HistorialStock::create([
                            'producto_id' => $detalle->producto_id,
                            'almacen_id' => $venta->almacen_id,
                            'venta_id' => $venta->id, // Referencia a la venta cancelada
                            'cantidad_anterior' => $cantidadAnterior,
                            'cantidad_nueva' => $nuevaCantidad,
                            'diferencia' => $cantidadDevuelta, // Positivo (ingreso al stock)
                            'tipo' => 'anulacion_venta',
                            'observaciones' => 'Reversión por anulación de la Venta ID: ' . $venta->id,
                            'user_id' => $user->id,
                        ]);
                    } else {
                        throw new \Exception("Error de stock: El producto " . $detalle->producto_id . " no se encontró en el almacén de la venta. Se requiere intervención manual.");
                    }
                }

                // B. REVERTIR PAGOS Y SALDOS DE CUENTAS
                $tasaUSDaCUP = $venta->tasa_usd_utilizada;
                $tasaMLCaUSD = $venta->tasa_mlc_utilizada;
                $venta->load('pagos.cuenta'); // Asegurar la carga

                foreach ($venta->pagos as $pago) {
                    $cuenta = Cuenta::find($pago->cuenta_id);

                    if ($cuenta) {
                        // Reconstruir el array de pago para usar el método de cálculo existente
                        $pagoArray = $pago->toArray();

                        // Usar el mismo cálculo para saber cuánto se agregó originalmente (el monto a deducir)
                        $montoDeduccion = $this->calcularMontoIncremento($cuenta, $pagoArray, $tasaUSDaCUP, $tasaMLCaUSD);

                        // Restar el monto
                        $nuevoSaldo = $cuenta->saldo_cuenta - $montoDeduccion;

                        // Actualizar el saldo de la cuenta
                        $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
                    } else {
                        throw new \Exception("Cuenta de pago no encontrada: " . $pago->cuenta_id . ". Se requiere intervención manual.");
                    }
                }
            }
            // Si estaba "pendiente", solo se cambia el estado, ya que no se había afectado stock ni saldos.

            // C. ACTUALIZAR EL ESTADO DE LA VENTA
            $venta->update([
                'estado' => 'cancelada',
            ]);

            // D. Commit de la transacción
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta ID ' . $venta->id . ' anulada correctamente. ' . ($venta->estado === 'completada' ? 'Stock y saldos revertidos.' : 'Estado actualizado.'),
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            // Retornar respuesta JSON de error
            return response()->json([
                'success' => false,
                'message' => 'Error al anular la venta',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Actualizar tasas de cambio globales (Requiere permisos de administrador).
     * Nota: Asegúrate de tener un middleware de autorización (ej. 'can:manage-tasas') aplicado a esta ruta.
     */
    public function actualizarTasas(Request $request)
    {
        $request->validate([
            'tasa_usd' => 'required|numeric|min:0', // Tasa CUP por USD
            'tasa_mlc' => 'required|numeric|min:0', // Tasa USD por MLC
        ]);

        try {
            // Actualizar/Crear tasa USD (CUP por USD)
            $tasaUSD = TasaCambio::latest()->first();
            $tasaUSD
                ? $tasaUSD->update(['tasa' => $request->tasa_usd])
                : TasaCambio::create(['tasa' => $request->tasa_usd]);

            // Actualizar/Crear tasa MLC (USD por MLC)
            $tasaMLC = TasaCambioMLC::latest()->first();
            $tasaMLC
                ? $tasaMLC->update(['tasa_mlc' => $request->tasa_mlc])
                : TasaCambioMLC::create(['tasa_mlc' => $request->tasa_mlc]);

            return response()->json([
                'success' => true,
                'message' => 'Tasas de cambio actualizadas correctamente 💹'
            ]);
        } catch (\Exception $e) {
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
     * Calcula el monto a incrementar en la cuenta basado en su tipo de moneda.
     * Utiliza las tasas fijadas en la Venta para asegurar la trazabilidad.
     */
    private function calcularMontoIncremento(Cuenta $cuenta, array $pago, float $tasaUSDaCUP, float $tasaMLCaUSD): float
    {
        // Si la cuenta tiene la misma moneda que el pago, usar el monto original
        if ($cuenta->tipo_moneda === $pago['tipo_moneda']) {
            return $pago['monto'];
        }

        // Si la cuenta está en USD
        if ($cuenta->tipo_moneda === 'USD') {
            // Si el pago es en CUP, convertir a USD (CUP / TASA_CUP_A_USD)
            if ($pago['tipo_moneda'] === 'CUP') {
                return $pago['monto'] / $tasaUSDaCUP;
            }
            // Si el pago es en MLC, convertir a USD (MLC * TASA_MLC_A_USD)
            if ($pago['tipo_moneda'] === 'MLC') {
                return $pago['monto'] * $tasaMLCaUSD;
            }
            // Si el pago es en EUR o cualquier otro, usamos el monto_equivalente precalculado.
            return $pago['monto_equivalente'];
        }

        // Si la cuenta está en CUP
        if ($cuenta->tipo_moneda === 'CUP') {
            // Si el pago es en USD, convertir a CUP (USD * TASA_CUP_A_USD)
            if ($pago['tipo_moneda'] === 'USD') {
                return $pago['monto'] * $tasaUSDaCUP;
            }
            // Si el pago es en MLC, convertir MLC->USD->CUP
            if ($pago['tipo_moneda'] === 'MLC') {
                $montoUSD = $pago['monto'] * $tasaMLCaUSD; // MLC a USD
                return $montoUSD * $tasaUSDaCUP; // USD a CUP
            }
            // Si el pago es en EUR o cualquier otro (usamos el monto_usd y convertimos a CUP)
            return $pago['monto_equivalente'] * $tasaUSDaCUP;
        }

        // Si la cuenta está en MLC
        if ($cuenta->tipo_moneda === 'MLC') {
            // Si el pago es en USD, convertir USD->MLC (USD / TASA_MLC_A_USD)
            if ($pago['tipo_moneda'] === 'USD') {
                return $pago['monto'] / $tasaMLCaUSD;
            }
            // Si el pago es en CUP, convertir CUP->USD->MLC
            if ($pago['tipo_moneda'] === 'CUP') {
                $montoUSD = $pago['monto'] / $tasaUSDaCUP; // CUP a USD
                return $montoUSD / $tasaMLCaUSD; // USD a MLC
            }
            // Si el pago es en EUR o cualquier otro (usamos el monto_usd y convertimos a MLC)
            return $pago['monto_equivalente'] / $tasaMLCaUSD;
        }

        // Si la cuenta está en EUR
        if ($cuenta->tipo_moneda === 'EUR') {
            // **IMPORTANTE**: Para la conversión a EUR, se necesita la tasa USD/EUR.
            // ASUMO una tasa fija para el ejemplo (0.93 USD/EUR), pero DEBERÍA OBTENERSE de una tabla de tasas si es variable.
            $tasaUSDaEUR = 0.93;

            // Si el pago es en USD, convertir a EUR
            if ($pago['tipo_moneda'] === 'USD') {
                return $pago['monto'] * $tasaUSDaEUR;
            }
            // Para el resto de pagos, si ya tenemos el monto_usd, lo convertimos a EUR
            return $pago['monto_equivalente'] * $tasaUSDaEUR;
        }

        // Para otras monedas no contempladas
        throw new \Exception("Conversión de moneda no implementada para la cuenta: " . $cuenta->tipo_moneda);
    }
}
