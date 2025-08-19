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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VentaController extends Controller
{
    public function getAlmacenes()
    {
        $user = Auth::user();
        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

        return response()->json($almacenes);
    }

    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();

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

    public function getClientes()
    {
        $clientes = Cliente::select('id', 'nombre_cliente')->get();
        return response()->json($clientes);
    }

    public function getCuentas()
    {
        $cuentas = Cuenta::select('id', 'nombre_cuenta', 'tipo_moneda')->get();
        return response()->json($cuentas);
    }

    public function index()
    {
        $user = Auth::user();

        return Inertia::render('Vendor/Index', [
            'productos' => [],
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
            ]
        ]);
    }

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
            'pagos.*.moneda' => 'required|in:USD,EUR,MLC,CUP',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.via' => 'nullable|string',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0',
            'pagos.*.monto_usd' => 'required|numeric|min:0',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
        ]);

        DB::beginTransaction();

        try {
            // Crear la venta
            $venta = Venta::create([
                'user_id' => Auth::id(),
                'almacen_id' => $validatedData['almacen_id'],
                'cliente_id' => $validatedData['cliente_id'],
                'total' => $validatedData['total'],
                'estado' => 'completada',
            ]);

            // Crear detalles de venta y actualizar stock
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

                // Actualizar stock
                $almacenProducto = AlmacenProducto::where('almacen_id', $validatedData['almacen_id'])
                    ->where('producto_id', $item['producto_id'])
                    ->first();

                if ($almacenProducto) {
                    $cantidadAnterior = $almacenProducto->cantidad;
                    $nuevaCantidad = $cantidadAnterior - $item['cantidad'];

                    HistorialStock::create([
                        'producto_id' => $item['producto_id'],
                        'almacen_id' => $validatedData['almacen_id'],
                        'venta_id' => $venta->id,
                        'cantidad_anterior' => $cantidadAnterior,
                        'cantidad_nueva' => $nuevaCantidad,
                        'diferencia' => -$item['cantidad'],
                        'tipo' => 'venta',
                        'observaciones' => 'Venta realizada',
                        'user_id' => Auth::id(),
                    ]);

                    $almacenProducto->update(['cantidad' => $nuevaCantidad]);
                }
            }

            // Procesar pagos y actualizar cuentas
            foreach ($validatedData['pagos'] as $pago) {
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
                $nuevoSaldo = $cuenta->saldo_cuenta + $pago['monto_usd'];
                $cuenta->update(['saldo_cuenta' => $nuevoSaldo]);
            }

            DB::commit();

            // Preparar respuesta
            $almacen = Almacen::find($validatedData['almacen_id']);
            $cliente = $validatedData['cliente_id'] ? Cliente::find($validatedData['cliente_id']) : null;

            $itemsDetallados = collect($validatedData['items'])->map(function ($item) {
                $producto = Producto::find($item['producto_id']);
                return [
                    'producto' => [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre_producto,
                        'marca' => $producto->marca_producto,
                        'categoria' => $producto->categoria?->nombre_categoria
                    ],
                    'cantidad' => $item['cantidad'],
                    'precio_venta' => $item['precio_venta'],
                    'subtotal' => $item['subtotal']
                ];
            });

            $pagosDetallados = collect($validatedData['pagos'])->map(function ($pago) {
                return [
                    'metodo' => $pago['metodo'],
                    'moneda' => $pago['moneda'],
                    'monto' => $pago['monto'],
                    'via' => $pago['via'] ?? null,
                    'tasa_cambio' => $pago['tasa_cambio'],
                    'monto_usd' => $pago['monto_usd']
                ];
            });

            $totalPagado = collect($validatedData['pagos'])->sum('monto_usd');
            $restante = $validatedData['total'] - $totalPagado;

            $datosVenta = [
                'venta' => [
                    'id' => $venta->id,
                    'almacen' => [
                        'id' => $almacen->id,
                        'nombre' => $almacen->nombre_almacen
                    ],
                    'cliente' => $cliente ? [
                        'id' => $cliente->id,
                        'nombre' => $cliente->nombre_cliente
                    ] : null,
                    'items' => $itemsDetallados,
                    'total' => $validatedData['total'],
                    'fecha' => $venta->created_at->toISOString(),
                    'usuario' => [
                        'id' => Auth::id(),
                        'nombre' => Auth::user()->name,
                        'email' => Auth::user()->email,
                        'rol' => Auth::user()->role
                    ],
                    'pagos' => $pagosDetallados,
                    'total_pagado' => $totalPagado,
                    'restante' => $restante
                ],
                'metadata' => [
                    'timestamp' => now()->toISOString(),
                ]
            ];

            return response()->json(['success' => true, 'data' => $datosVenta]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
        // O si prefieres mostrarlo en una vista Inertia:
//        return Inertia::render('Vendor/Resultados', ['datos' => $datosVenta]);
