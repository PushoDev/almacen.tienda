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
use Illuminate\Validation\Rule;

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
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash,pago_cliente_fisico',
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
            'pagos' => [
                Rule::requiredIf(fn() => $request->input('compra') === 'pago_cash'),
                'array',
                'min:1',
            ],
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'cliente_id' => [
                Rule::requiredIf(fn() => $request->input('compra') === 'pago_cliente_fisico'),
                'exists:clientes,id',
            ],
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
            ];

            if ($validated['compra'] === 'deuda_proveedor') {
                $nombreCuentaTemporal = "Deuda - {$proveedor->nombre_proveedor}";

                $cuentaDeuda = Cuenta::firstOrCreate(
                    ['nombre_cuenta' => $nombreCuentaTemporal],
                    [
                        'tipo_cuenta' => 'deudas',
                        'saldo_cuenta' => 0,
                        'tipo_moneda' => 'USD',
                        'notas_cuenta' => "Deuda Pendiente: {$proveedor->nombre_proveedor}",
                    ]
                );

                $cuentaDeuda->saldo_cuenta += $total;
                $cuentaDeuda->save();

                $compraData['cuenta_id'] = $cuentaDeuda->id;
            } elseif ($validated['compra'] === 'pago_cash') {
                $sumaPagos = collect($validated['pagos'])->sum('monto');

                if ($sumaPagos < $total) {
                    throw new \Exception("La suma de los montos es menor al total de la compra.");
                }

                foreach ($validated['pagos'] as $pago) {
                    $cuenta = Cuenta::findOrFail($pago['cuenta_id']);
                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                    }
                    $cuenta->saldo_cuenta -= $pago['monto'];
                    $cuenta->save();
                }

                $compraData['cuenta_id'] = $validated['pagos'][0]['cuenta_id'];
            } elseif ($validated['compra'] === 'pago_cliente_fisico') {
                $cliente = Cliente::findOrFail($validated['cliente_id']);

                // 🔥 CORREGIDO: La empresa recibe dinero del cliente → le debe
                // Por tanto, restamos del campo (queda negativo si era 0)
                $cliente->deuda_pago_cliente -= $total;
                $cliente->save();

                $compraData['cliente_id'] = $cliente->id;
            }

            $compra = Compra::create($compraData);

            if ($validated['compra'] === 'pago_cliente_fisico') {
                CompraPago::create([
                    'compra_id' => $compra->id,
                    'cliente_id' => $cliente->id,
                    'monto' => $total,
                ]);
            }

            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);
                $producto = Producto::firstOrCreate(
                    ['codigo_producto' => $item['codigo']],
                    [
                        'nombre_producto' => $item['producto'],
                        'categoria_id' => $categoria->id,
                        'precio_compra_producto' => $item['precio'],
                        'cantidad_producto' => 0,
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
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $productos = [];
        foreach ($almacen->compras as $compra) {
            foreach ($compra->productos as $producto) {
                $productos[] = [
                    'compra_id' => $compra->id,
                    'producto_id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto ?? null,
                    'cantidad' => $producto->pivot->cantidad,
                    'precio' => $producto->pivot->precio,
                    'fecha_compra' => $compra->fecha_compra,
                ];
            }
        }

        return response()->json([
            'almacen' => $almacen,
            'productos' => $productos,
        ]);
    }
}
