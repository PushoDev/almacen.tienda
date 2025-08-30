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
    // Cargar Almacenes
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

    // Cargar Productos por Almacenes
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Usuario no autenticado'], 403);
        }

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
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad as stock_disponible');
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
                    'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
                ];
            });

        return response()->json($productos);
    }

    // Cargar todos los Clientes
    public function getClientes()
    {
        $clientes = Cliente::select('id', 'nombre_cliente')->get();
        return response()->json($clientes);
    }

    // Cargar Todas las cuentas del Negocio
    public function getCuentas()
    {
        $cuentas = Cuenta::select('id', 'nombre_cuenta', 'tipo_moneda')->get();
        return response()->json($cuentas);
    }

    // Cargar datos de la Tasa de Cambio para USD
    public function getTasaUSD()
    {
        $tasaUSD = TasaCambio::select('id', 'tasa')->get();
        return response()->json($tasaUSD);
    }

    // Cargar datos de la tasa de MLC
    public function getTasaMLC()
    {
        $tasaMLC = TasaCambioMLC::select('id', 'tasa_mlc')->get();
        return response()->json($tasaMLC);
    }

    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return redirect()->route('login');
        }

        return Inertia::render('Vendor/Index', [
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
            ]
        ]);
    }

    public function show($id)
    {
        // Cargar la relación correcta (usuario en lugar de user)
        $venta = Venta::with(['detalles.producto', 'pagos', 'cliente', 'almacen', 'usuario'])
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
                ];
            }),
            'total' => $venta->total,
            'fecha' => $venta->created_at->toISOString(),
            // Acceder a través de la relación 'usuario'
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
                ];
            }),
            'total_pagado' => $venta->pagos->sum('monto_equivalente'),
            'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
        ];

        return Inertia::render('Vendor/Show', [
            'venta' => $ventaData
        ]);
    }

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
        ]);

        DB::beginTransaction();

        try {
            $user = Auth::user();
            if (!$user) {
                throw new \Exception("Usuario no autenticado");
            }

            // Crear la venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'estado' => 'completada',
            ]);

            // Crear detalles de venta y actualizar stock
            foreach ($validatedData['items'] as $item) {
                $producto = Producto::find($item['producto_id']);

                // Crear detalle de venta
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $item['producto_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_venta' => $item['precio_venta'],
                    'subtotal' => $item['subtotal'],
                    'costo_unitario' => $producto->precio_compra_producto,
                ]);

                // Actualizar stock
                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if ($almacenProducto) {
                    $cantidadAnterior = $almacenProducto->cantidad;
                    $nuevaCantidad = $cantidadAnterior - $item['cantidad'];

                    // Verificar stock suficiente
                    if ($nuevaCantidad < 0) {
                        throw new \Exception("Stock insuficiente para el producto: " . $producto->nombre_producto);
                    }

                    // Registrar en historial de stock
                    HistorialStock::create([
                        'producto_id' => $item['producto_id'],
                        'almacen_id' => $validatedData['almacen_id'],
                        'venta_id' => $venta->id,
                        'cantidad_anterior' => $cantidadAnterior,
                        'cantidad_nueva' => $nuevaCantidad,
                        'diferencia' => -$item['cantidad'],
                        'tipo' => 'venta',
                        'observaciones' => 'Venta realizada',
                        'user_id' => $user->id,
                    ]);

                    // Actualizar stock
                    $almacenProducto->update(['cantidad' => $nuevaCantidad]);
                } else {
                    throw new \Exception("Producto no encontrado en el almacén: " . $item['producto_id']);
                }
            }

            // Procesar pagos y actualizar cuentas
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

                // Actualizar saldo de la cuenta
                $cuenta = Cuenta::find($pago['cuenta_id']);
                if ($cuenta) {
                    $nuevoSaldo = $cuenta->saldo_cuenta + $pago['monto_usd'];
                    $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
                } else {
                    throw new \Exception("Cuenta no encontrada: " . $pago['cuenta_id']);
                }
            }

            DB::commit();

            // Redirigir a la vista de detalle de venta
            return response()->json([
                'success' => true,
                'message' => 'Venta procesada correctamente',
                'redirect' => route('ventas.show', $venta->id)
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            // Retornar respuesta JSON de error
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar la venta',
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null
            ], 500);
        }
    }
}
