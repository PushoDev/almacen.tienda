<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class CompraController extends Controller
{
    // Métodos para obtener datos (sin cambios)
    public function getAlmacen()
    {
        return response()->json(Almacen::select('id', 'nombre_almacen')->get());
    }

    public function getProveedor()
    {
        return response()->json(Proveedor::select('id', 'nombre_proveedor')->get());
    }

    public function getCategorias()
    {
        return response()->json(Categoria::select('id', 'nombre_categoria')->get());
    }

    public function getClientesFisicos()
    {
        return response()->json(Cliente::where('tipo_cliente', 'fisico')->get());
    }

    public function getCuentas()
    {
        return response()->json(
            Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
                ->select('id', 'nombre_cuenta', 'saldo_cuenta')
                ->get()
        );
    }

    public function index()
    {
        // Sin cambios
        $cuentas = Cuenta::all();
        $almacenes = Almacen::all();
        $proveedores = Proveedor::all();
        $categorias = Categoria::all();
        $clientes = Cliente::all();

        return Inertia::render('Comprar/Index', compact('cuentas', 'almacenes', 'proveedores', 'categorias', 'clientes'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash',
            'almacen' => 'required|string|max:255',
            'proveedor' => 'required|string|max:255',
            'cliente' => [
                'nullable',
                'exists:clientes,id,tipo_cliente,fisico'
            ],
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.categoria' => 'required|string|max:255',
            'productos.*.codigo' => [
                'required',
                'string',
                'max:255',
                Rule::unique('productos', 'codigo_producto')
            ],
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio' => 'required|numeric|min:0',
            'pagos' => [
                Rule::requiredIf(fn() => $request->input('compra') === 'pago_cash'),
                'array',
                'min:1',
            ],
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.monto' => 'required|numeric|min:0.01',
        ]);

        DB::beginTransaction();

        try {
            $almacen = Almacen::firstOrCreate(['nombre_almacen' => $validated['almacen']]);
            $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $validated['proveedor']]);
            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);

            $compraData = [
                'almacen_id' => $almacen->id,
                'proveedor_id' => $proveedor->id,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
                'cliente_id' => $validated['cliente'] ?? null,
            ];

            // Lógica para pagos parciales/completos
            if ($validated['compra'] === 'pago_cash') {
                $sumaPagos = collect($validated['pagos'])->sum('monto');
                $diferencia = $total - $sumaPagos;

                if ($sumaPagos > $total) {
                    throw new \Exception("El pago excede el total de la compra por $" . number_format($sumaPagos - $total, 2));
                }

                // Procesar pagos
                foreach ($validated['pagos'] as $pago) {
                    $cuenta = Cuenta::findOrFail($pago['cuenta_id']);

                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en {$cuenta->nombre_cuenta}: $" . $cuenta->saldo_cuenta);
                    }

                    $cuenta->saldo_cuenta -= $pago['monto'];
                    $cuenta->save();
                }

                // Manejo de deuda residual
                if ($diferencia > 0) {
                    $cliente = $validated['cliente'] ? Cliente::find($validated['cliente']) : null;

                    if ($cliente) {
                        $cliente->deuda_pago_cliente += $diferencia;
                        $cliente->save();
                    } else {
                        // Crear deuda con proveedor si no hay cliente
                        $cuentaDeuda = Cuenta::firstOrCreate(
                            ['nombre_cuenta' => "Deuda Residual - {$proveedor->nombre_proveedor}"],
                            [
                                'tipo_cuenta' => 'deudas',
                                'saldo_cuenta' => $diferencia,
                                'tipo_moneda' => 'USD',
                                'notas_cuenta' => "Deuda Pendiente: {$proveedor->nombre_proveedor}",
                            ]
                        );
                        $cuentaDeuda->saldo_cuenta += $diferencia;
                        $cuentaDeuda->save();
                        $compraData['cuenta_id'] = $cuentaDeuda->id;
                    }
                }
            }

            // Lógica para deuda completa
            if ($validated['compra'] === 'deuda_proveedor') {
                $cuentaDeuda = Cuenta::firstOrCreate(
                    ['nombre_cuenta' => "Deuda - {$proveedor->nombre_proveedor}"],
                    [
                        'tipo_cuenta' => 'deudas',
                        'saldo_cuenta' => $total,
                        'tipo_moneda' => 'USD',
                        'notas_cuenta' => "Deuda Completa: {$proveedor->nombre_proveedor}",
                    ]
                );

                if (!$cuentaDeuda->wasRecentlyCreated) {
                    $cuentaDeuda->saldo_cuenta += $total;
                    $cuentaDeuda->save();
                }
                $compraData['cuenta_id'] = $cuentaDeuda->id;
            }

            // Crear compra y productos
            $compra = Compra::create($compraData);

            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                $producto = Producto::updateOrCreate(
                    ['codigo_producto' => $item['codigo']],
                    [
                        'nombre_producto' => $item['producto'],
                        'categoria_id' => $categoria->id,
                        'precio_compra_producto' => $item['precio'],
                        'cantidad_producto' => DB::raw("cantidad_producto + {$item['cantidad']}"),
                    ]
                );

                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                ]);

                AlmacenProducto::updateOrCreate(
                    ['almacen_id' => $almacen->id, 'producto_id' => $producto->id],
                    ['cantidad' => DB::raw("cantidad + {$item['cantidad']}")]
                );
            }

            DB::commit();

            return redirect()->route('dashboard')->with('success', [
                'title' => 'Compra registrada',
                'message' => 'Operación completada exitosamente',
                'total' => $total,
                'tipo' => $validated['compra']
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return Inertia::render('Comprar/Index', [
                'errors' => [
                    '_error' => 'Error en transacción: ' . $e->getMessage(),
                    'details' => 'Verifique: 1. Saldos de cuentas 2. Códigos únicos 3. Datos requeridos'
                ]
            ])->toResponse($request)->setStatusCode(500);
        }
    }
    /**
     * Mostrar los productos de un almacén.
     */
    public function getProductos($id)
    {
        $almacen = Almacen::with('compras.productos')->find($id);

        if (!$almacen) {
            return response()->json([
                'message' => 'Almacén no encontrado'
            ], 404);
        }

        $productos = [];

        foreach ($almacen->compras as $compra) {
            foreach ($compra->productos as $producto) {
                $productos[] = [
                    'compra_id' => $compra->id,
                    'producto_id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'cantidad' => $producto->pivot->cantidad,
                    'precio' => $producto->pivot->precio,
                    'fecha_compra' => $compra->fecha_compra
                ];
            }
        }

        return response()->json([
            'almacen' => $almacen,
            'productos' => $productos
        ]);
    }
}
