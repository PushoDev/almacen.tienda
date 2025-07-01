<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
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
    /**
     * Opciones para Cargar los select
     * Almacenes, Proveedores, Categorias
     */
    // Alamcenes
    public function getAlmacen()
    {
        return response()->json(Almacen::select('id', 'nombre_almacen')->get());
    }
    // Proveedores
    public function getProveedor()
    {
        return response()->json(Proveedor::select('id', 'nombre_proveedor')->get());
    }
    // Categorias
    public function getCategorias()
    {
        return response()->json(Categoria::select('id', 'nombre_categoria')->get());
    }

    // Obtener cuentas monetarias
    public function getCuentas()
    {
        return response()->json(Cuenta::select('id', 'nombre_cuenta', 'saldo_cuenta')->get());
    }

    /**
     * Inicio de las Compras
     *
     * @return void
     */
    public function index()
    {
        $cuentas = Cuenta::all();
        $almacenes = Almacen::all();
        $proveedores = Proveedor::all();
        $categorias = Categoria::all();

        return Inertia::render('Comprar/Index', compact('cuentas', 'almacenes', 'proveedores', 'categorias'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash',
            'almacen' => 'required|string|max:255',
            'proveedor' => 'required|string|max:255',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.categoria' => 'required|string|max:255',
            'productos.*.codigo' => [
                'required',
                'string',
                'max:255',
                'unique:productos,codigo_producto'
            ],
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio' => 'required|numeric|min:0',
            'cuenta_id' => [
                Rule::requiredIf(fn() => $request->input('compra') === 'pago_cash'),
                'exists:cuentas,id',
            ],
        ]);

        DB::beginTransaction();

        try {
            // Crear/obtener almacén y proveedor
            $almacen = Almacen::firstOrCreate(['nombre_almacen' => $validated['almacen']]);
            $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $validated['proveedor']]);

            // Calcular total y crear compra
            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);
            $compraData = [
                'almacen_id' => $almacen->id,
                'proveedor_id' => $proveedor->id,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
            ];

            // Lógica de cuenta según tipo de compra
            if ($validated['compra'] === 'deuda_proveedor') {
                $nombreCuentaTemporal = "{$proveedor->nombre_proveedor}";

                // Buscar o crear cuenta temporal
                $cuentaTemporal = Cuenta::firstOrCreate(
                    ['nombre_cuenta' => $nombreCuentaTemporal],
                    [
                        'tipo_cuenta' => 'temporales',
                        'saldo_cuenta' => $total,
                        'tipo_moneda' => 'USD',
                        'notas_cuenta' => 'Deuda Pendiente, pagar luego en Transacciones',
                    ]
                );

                // Actualizar saldo si ya existía
                if (!$cuentaTemporal->wasRecentlyCreated) {
                    $cuentaTemporal->saldo_cuenta += $total;
                    $cuentaTemporal->save();
                }

                $compraData['cuenta_id'] = $cuentaTemporal->id;
            } else {
                // Validación adicional para pago en efectivo
                $cuenta = Cuenta::findOrFail($validated['cuenta_id']);

                if ($cuenta->saldo_cuenta < $total) {
                    throw new \Exception('Saldo insuficiente en la cuenta seleccionada');
                }

                $cuenta->saldo_cuenta -= $total;
                $cuenta->save();

                $compraData['cuenta_id'] = $cuenta->id;
            }

            // Crear compra
            $compra = Compra::create($compraData);

            // Procesar productos
            foreach ($validated['productos'] as $item) {
                // Crear categoría si no existe
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                // Crear producto si no existe
                $producto = Producto::firstOrCreate(
                    ['codigo_producto' => $item['codigo']],
                    [
                        'nombre_producto' => $item['producto'],
                        'categoria_id' => $categoria->id,
                        'precio_compra_producto' => $item['precio'],
                        'cantidad_producto' => $item['cantidad'],
                    ]
                );

                // Asociar producto a la compra
                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                ]);

                // Actualizar inventario en AlmacenProducto
                $registro = AlmacenProducto::updateOrCreate(
                    ['almacen_id' => $almacen->id, 'producto_id' => $producto->id],
                    ['cantidad' => DB::raw("cantidad + {$item['cantidad']}")]
                );
            }

            DB::commit();

            return Inertia::render('dashboard');
        } catch (\Exception $e) {
            DB::rollBack();

            // Respuesta de error corregida
            return Inertia::render('Comprar/Index', [
                'errors' => ['_error' => 'Error al procesar la compra: ' . $e->getMessage()]
            ])->setStatusCode(500);
        }
    }



    /**
     * Mostrar los productos de un almacén.
     */
    public function getProductos($id)
    {
        // Cargar el almacén con sus compras y los productos asociados
        $almacen = Almacen::with('compras.productos')->find($id);

        if (!$almacen) {
            return response()->json([
                'message' => 'Almacén no encontrado'
            ], 404);
        }

        // Coleccionar todos los productos con su cantidad y precio por compra
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
