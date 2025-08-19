<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
        // Obtener todos los clientes
        $clientes = Cliente::select('id', 'nombre_cliente')->get();

        return response()->json($clientes);
    }

    // Ruta donde se procesa la Venta de los Productos
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

    // Function para Test
    public function procesarVenta(Request $request)
    {
        // Validar los datos recibidos
        $validatedData = $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'cliente_id' => 'required|exists:clientes,id',
            'items' => 'required|array|min:1',
            'items.*.producto_id' => 'required|exists:productos,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.precio_venta' => 'required|numeric|min:0',
            'items.*.subtotal' => 'required|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'pagos' => 'required|array|min:1', // Nuevo campo para pagos múltiples
            'pagos.*.metodo' => 'required|in:transferencia,efectivo',
            'pagos.*.moneda' => 'required|in:USD,EUR,MLC,CUP',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.via' => 'nullable|string',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0',
            'pagos.*.monto_usd' => 'required|numeric|min:0',
        ]);

        // Obtener información adicional para el response
        $almacen = Almacen::find($validatedData['almacen_id']);
        $cliente = Cliente::find($validatedData['cliente_id']);

        // Obtener información detallada de los productos
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

        // Obtener información detallada de los pagos
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

        // Calcular total pagado en USD
        $totalPagado = collect($validatedData['pagos'])->sum('monto_usd');
        $restante = $validatedData['total'] - $totalPagado;

        // Preparar datos de respuesta
        $datosVenta = [
            'venta' => [
                'almacen' => [
                    'id' => $almacen->id,
                    'nombre' => $almacen->nombre_almacen
                ],
                'cliente' => [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombre_cliente
                ],
                'items' => $itemsDetallados,
                'total' => $validatedData['total'],
                'fecha' => now()->toISOString(),
                'usuario' => [
                    'id' => Auth::id(),
                    'nombre' => Auth::user()->name,
                    'email' => Auth::user()->email,
                    'rol' => Auth::user()->role
                ],
                'pagos' => $pagosDetallados, // Incluir pagos en la respuesta
                'total_pagado' => $totalPagado,
                'restante' => $restante
            ],
            'metadata' => [
                'timestamp' => now()->toISOString(),
                'endpoint' => '/ventas/procesar',
                'metodo' => 'POST'
            ]
        ];

        // Para debugging - puedes retornar JSON directamente
        // return response()->json($datosVenta, 200, [], JSON_PRETTY_PRINT);

        // O si prefieres mostrarlo en una vista Inertia:
        return Inertia::render('Vendor/Resultados', ['datos' => $datosVenta]);
    }
}
