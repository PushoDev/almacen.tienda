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

class CompraController extends Controller
{
    /**
     * Devuelve una lista de almacenes.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAlmacen()
    {
        $almacenes = Almacen::select('id', 'nombre_almacen')->get();
        return response()->json($almacenes);
    }

    /**
     * Devuelve una lista de proveedores.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProveedor()
    {
        $proveedores = Proveedor::select('id', 'nombre_proveedor')->get();
        return response()->json($proveedores);
    }

    /**
     * Devuelve una lista de categorías.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCategorias()
    {
        $categorias = Categoria::select('id', 'nombre_categoria')->get();
        return response()->json($categorias);
    }

    /**
     * Devuelve una lista de clientes físicos.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getClientesFisicos()
    {
        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente', 'deuda_pago_cliente')
            ->get();
        return response()->json($clientes);
    }

    /**
     * Devuelve una lista de cuentas permanentes y temporales.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCuentas()
    {
        $cuentas = Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->whereIn('tipo_moneda', ['USD', 'EUR'])
            ->select('id', 'nombre_cuenta', 'saldo_cuenta', 'tipo_moneda')
            ->get();
        return response()->json($cuentas);
    }

    /**
     * Muestra la vista de creación de compra.
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return Inertia::render('Comprar/Index', [
            'cuentas' => Cuenta::all(),
            'almacenes' => Almacen::all(),
            'proveedores' => Proveedor::all(),
            'categorias' => Categoria::all(),
            'clientes' => Cliente::where('tipo_cliente', 'fisico')->get(),
        ]);
    }

    /**
     * Procesa y almacena una nueva compra.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\RedirectResponse|\Inertia\Response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash',
            'proveedor' => 'required|string|max:255',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.almacen_id' => 'required|exists:almacens,id',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.categoria' => 'required|string|max:255',
            'productos.*.codigo' => [
                'required',
                'string',
                'max:255',
            ],
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio' => 'required|numeric|min:0',
            'pagos' => 'array|nullable',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'pagos_clientes' => 'array|nullable',
            'pagos_clientes.*.cliente_id' => 'required|exists:clientes,id',
            'pagos_clientes.*.monto' => 'required|numeric|min:0.01',
        ]);

        DB::beginTransaction();

        try {
            $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $validated['proveedor']]);

            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);

            $compraData = [
                'proveedor_id' => $proveedor->id,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
            ];

            if ($validated['compra'] === 'deuda_proveedor') {
                // ✅ CORREGIDO: Actualizar directamente el saldo del proveedor en lugar de crear cuenta de deuda
                $proveedor->decrement('saldo_proveedor', $total); // Restar el total (hacerlo más negativo)
                $compraData['cuenta_id'] = null; // No asociar a cuenta de deuda
            } else if ($validated['compra'] === 'pago_cash') {
                $pagos = $validated['pagos'] ?? [];
                $pagosClientes = $validated['pagos_clientes'] ?? [];

                if (empty($pagos) && empty($pagosClientes)) {
                    throw new \Exception("Debe especificar al menos un método de pago (cuenta o cliente).");
                }

                $sumaPagosCuentas = collect($pagos)->sum('monto');
                $sumaPagosClientes = collect($pagosClientes)->sum('monto');
                $sumaTotalPagos = $sumaPagosCuentas + $sumaPagosClientes;

                if (abs($sumaTotalPagos - $total) > 0.01) {
                    throw new \Exception("La suma de los pagos ({$sumaTotalPagos}) no coincide con el total de la compra ({$total}).");
                }

                foreach ($pagos as $pago) {
                    $cuenta = Cuenta::findOrFail($pago['cuenta_id']);
                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                    }
                    $cuenta->decrement('saldo_cuenta', $pago['monto']);
                }

                foreach ($pagosClientes as $pagoCliente) {
                    $cliente = Cliente::findOrFail($pagoCliente['cliente_id']);
                    $cliente->decrement('deuda_pago_cliente', $pagoCliente['monto']);
                }

                if (!empty($pagos)) {
                    $compraData['cuenta_id'] = $pagos[0]['cuenta_id'];
                } else {
                    $compraData['cuenta_id'] = null;
                }
            }

            $compra = Compra::create($compraData);

            $productosConAlmacen = [];
            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                $producto = Producto::firstOrNew(['codigo_producto' => $item['codigo']]);
                $producto->fill([
                    'nombre_producto' => $item['producto'],
                    'categoria_id' => $categoria->id,
                    'precio_compra_producto' => $item['precio'],
                    'imagen_producto' => $producto->imagen_producto ?? 'productos/producto-default.png',
                ]);
                $producto->save();

                // Asociar producto a la compra, AHORA CON EL ID DEL ALMACÉN
                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                    'almacen_id' => $item['almacen_id'], // ¡¡ESTA ES LA LÍNEA CLAVE!!
                ]);

                // Actualizar inventario en el almacén específico
                $almacenProducto = AlmacenProducto::firstOrNew([
                    'almacen_id' => $item['almacen_id'],
                    'producto_id' => $producto->id
                ]);

                $almacenProducto->cantidad = ($almacenProducto->cantidad ?? 0) + $item['cantidad'];
                $almacenProducto->save();

                // Preparamos los datos para la vista, cargando el almacén
                $productosConAlmacen[] = [
                    'nombre_producto' => $producto->nombre_producto,
                    'pivot' => [
                        'cantidad' => $item['cantidad'],
                        'precio' => $item['precio'],
                    ],
                    'almacen' => Almacen::find($item['almacen_id']),
                ];
            }

            DB::commit();

            return Inertia::render('Comprar/Show', [
                'compra' => $compra->load('proveedor'),
                'productos' => $productosConAlmacen,
                'success' => 'Compra registrada correctamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Error al procesar la compra: ' . $e->getMessage()]);
        }
    }

    /**
     * Devuelve los productos asociados a un almacén.
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductos($id)
    {
        $almacen = Almacen::with('productos')->find($id);

        if (!$almacen) {
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $productos = $almacen->productos->map(function ($producto) {
            return [
                'producto_id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'codigo_producto' => $producto->codigo_producto,
                'cantidad' => $producto->pivot->cantidad,
            ];
        });

        return response()->json([
            'almacen' => $almacen,
            'productos' => $productos,
        ]);
    }
}
