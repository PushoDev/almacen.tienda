<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CompraController extends Controller
{
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
        return response()->json(
            Cliente::where('tipo_cliente', 'fisico')
                ->select('id', 'nombre_cliente', 'deuda_pago_cliente')
                ->get()
        );
    }

    public function getCuentas()
    {
        return response()->json(
            Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
                ->whereIn('tipo_moneda', ['USD', 'EUR'])
                ->select('id', 'nombre_cuenta', 'saldo_cuenta', 'tipo_moneda')
                ->get()
        );
    }

    public function index()
    {
        $cuentas = Cuenta::all();
        $almacenes = Almacen::all();
        $proveedores = Proveedor::all();
        $categorias = Categoria::all();
        $clientes = Cliente::all();

        return Inertia::render('Comprar/Index', compact('cuentas', 'almacenes', 'proveedores', 'categorias', 'clientes'));
    }

    public function store(Request $request)
    {
        // Validaciones generales
        $validated = $request->validate([
            'almacen' => 'required|string|max:255',
            'proveedor' => 'required|string|max:255',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.categoria' => 'required|string|max:255',
            'productos.*.codigo' => 'required|string|max:255',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio' => 'required|numeric|min:0',
            'tipo_compra' => 'required|string|in:deuda_proveedor,pago_cash', // Validación del tipo de compra
        ]);

        // Validaciones específicas según el tipo de compra
        if ($validated['tipo_compra'] === 'pago_cash') {
            // Validar cliente y cuenta si son seleccionados
            if ($request->has('cliente_id')) {
                $validated['cliente_id'] = $request->validate([
                    'cliente_id' => 'required|exists:clientes,id',
                ]);
            } else {
                $validated['cliente_id'] = null; // No se proporciona cliente
            }

            if ($request->has('cuenta_id')) {
                $validated['cuenta_id'] = $request->validate([
                    'cuenta_id' => 'required|exists:cuentas,id',
                ]);
            } else {
                $validated['cuenta_id'] = null; // No se proporciona cuenta
            }
        } elseif ($validated['tipo_compra'] === 'deuda_proveedor') {
            // Para deuda_proveedor, no se requiere cliente ni cuenta
            $validated['cliente_id'] = null; // Asegúrate de que no se pase cliente
            $validated['cuenta_id'] = null; // Asegúrate de que no se pase cuenta
        }

        DB::beginTransaction();

        try {
            // Crear/obtener almacén y proveedor
            $almacen = Almacen::firstOrCreate(['nombre_almacen' => $validated['almacen']]);
            $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $validated['proveedor']]);

            // Calcular total
            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);

            // Preparar datos de compra
            $compraData = [
                'almacen_id' => $almacen->id,
                'proveedor_id' => $proveedor->id,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['tipo_compra'],
                'cliente_id' => $validated['cliente_id'], // Puede ser nulo
                'cuenta_id' => $validated['cuenta_id'], // Puede ser nulo
            ];

            // Crear compra
            $compra = Compra::create($compraData);

            // Procesar productos
            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);
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

                // Actualizar inventario
                AlmacenProducto::updateOrCreate(
                    ['almacen_id' => $almacen->id, 'producto_id' => $producto->id],
                    ['cantidad' => DB::raw("cantidad + {$item['cantidad']}")]
                );
            }

            // Ajustar la deuda del cliente si se proporciona
            if ($validated['tipo_compra'] === 'deuda_proveedor' && $validated['cliente_id']) {
                $cliente = Cliente::findOrFail($validated['cliente_id']);
                $cliente->deuda_pago_cliente -= $total; // Descontar de la deuda existente
                $cliente->save();
            }

            DB::commit();

            return Inertia::location(route('dashboard'));
        } catch (\Exception $e) {
            DB::rollBack();

            return Inertia::render('Comprar/Index', [
                'errors' => ['_error' => 'Error al procesar la compra: ' . $e->getMessage()]
            ])->toResponse($request)->setStatusCode(500);
        }
    }

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
