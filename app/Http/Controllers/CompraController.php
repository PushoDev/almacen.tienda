<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago; // ✅ AGREGAR IMPORT DE COMPRAPAGO
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\Moneda;
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
     * Devuelve una lista de cuentas permanentes y temporales SOLO EN USD.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCuentas()
    {
        $cuentas = Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->whereHas('moneda', function ($query) {
                $query->where('codigo_moneda', 'USD')->where('estado', true);
            })
            ->with('moneda')
            ->select('id', 'nombre_cuenta', 'saldo_cuenta', 'moneda_id')
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
        $cuentasUSD = Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->whereHas('moneda', function ($query) {
                $query->where('codigo_moneda', 'USD')->where('estado', true);
            })
            ->with('moneda')
            ->get();

        return Inertia::render('Comprar/Index', [
            'cuentas' => $cuentasUSD,
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
        // 1. Validar la entrada
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash',
            'proveedor' => 'required|string|max:255',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.almacen_id' => 'required|exists:almacens,id',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.marca' => 'nullable|string|max:255',
            'productos.*.modelo' => 'nullable|string|max:255',
            'productos.*.capacidad' => 'nullable|string|max:255',
            'productos.*.categoria' => 'required|string|max:255',
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
            // Lógica de proveedor y cálculo total
            $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $validated['proveedor']]);
            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);

            $compraData = [
                'proveedor_id' => $proveedor->id,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
            ];

            // 2. Lógica de Pagos y Deuda
            if ($validated['compra'] === 'deuda_proveedor') {
                $proveedor->decrement('saldo_proveedor', $total);
                $compraData['cuenta_id'] = null;
            } else if ($validated['compra'] === 'pago_cash') {
                $pagos = $validated['pagos'] ?? [];
                $pagosClientes = $validated['pagos_clientes'] ?? [];

                if (empty($pagos) && empty($pagosClientes)) {
                    throw new \Exception("Debe especificar al menos un método de pago (cuenta o cliente).");
                }

                $sumaTotalPagos = collect($pagos)->sum('monto') + collect($pagosClientes)->sum('monto');

                if (abs($sumaTotalPagos - $total) > 0.01) {
                    throw new \Exception("La suma de los pagos ({$sumaTotalPagos}) no coincide con el total de la compra ({$total}).");
                }

                // ✅ VALIDAR Y PROCESAR PAGOS CON CUENTAS
                foreach ($pagos as $pago) {
                    $cuenta = Cuenta::with('moneda')->findOrFail($pago['cuenta_id']);

                    if ($cuenta->moneda->codigo_moneda !== 'USD') {
                        throw new \Exception("La cuenta {$cuenta->nombre_cuenta} no es una cuenta en USD. Solo se permiten cuentas en USD para compras.");
                    }

                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                    }
                    $cuenta->decrement('saldo_cuenta', $pago['monto']);
                }

                // ✅ PROCESAR PAGOS CON CLIENTES (deuda)
                foreach ($pagosClientes as $pagoCliente) {
                    $cliente = Cliente::findOrFail($pagoCliente['cliente_id']);
                    $cliente->decrement('deuda_pago_cliente', $pagoCliente['monto']);
                }

                $compraData['cuenta_id'] = !empty($pagos) ? $pagos[0]['cuenta_id'] : null;
            }

            $compra = Compra::create($compraData);

            // ✅ REGISTRAR TODOS LOS MÉTODOS DE PAGO EN COMPRA_PAGO
            if ($validated['compra'] === 'deuda_proveedor') {
                // Registrar pago como deuda con proveedor
                CompraPago::create([
                    'compra_id' => $compra->id,
                    'cuenta_id' => null,
                    'cliente_id' => null,
                    'monto' => $total,
                    'tipo_pago' => 'deuda_proveedor',
                ]);
            } else if ($validated['compra'] === 'pago_cash') {
                // Registrar pagos con cuentas
                foreach ($pagos as $pago) {
                    CompraPago::create([
                        'compra_id' => $compra->id,
                        'cuenta_id' => $pago['cuenta_id'],
                        'cliente_id' => null,
                        'monto' => $pago['monto'],
                        'tipo_pago' => 'cuenta',
                    ]);
                }

                // Registrar pagos con clientes
                foreach ($pagosClientes as $pagoCliente) {
                    CompraPago::create([
                        'compra_id' => $compra->id,
                        'cuenta_id' => null,
                        'cliente_id' => $pagoCliente['cliente_id'],
                        'monto' => $pagoCliente['monto'],
                        'tipo_pago' => 'cliente',
                    ]);
                }
            }

            $productosConAlmacen = [];
            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                $searchAttributes = [
                    'nombre_producto' => $item['producto'],
                    'categoria_id' => $categoria->id,
                    'marca_producto' => $item['marca'] ?? null,
                    'modelo_producto' => $item['modelo'] ?? null,
                    'capacidad_producto' => $item['capacidad'] ?? null,
                ];

                $producto = Producto::where($searchAttributes)->first();
                $isNew = !$producto;

                if ($isNew) {
                    $producto = new Producto();
                    $producto->codigo_producto = null;
                }

                $producto->fill([
                    'nombre_producto' => $item['producto'],
                    'marca_producto' => $item['marca'] ?? null,
                    'modelo_producto' => $item['modelo'] ?? null,
                    'capacidad_producto' => $item['capacidad'] ?? null,
                    'categoria_id' => $categoria->id,
                    'precio_compra_producto' => $item['precio'],
                    'imagen_producto' => $producto->imagen_producto ?? 'productos/producto-default.png',
                ]);
                $producto->save();

                // Asociar producto a la compra
                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                    'almacen_id' => $item['almacen_id'],
                ]);

                // Actualizar inventario en el almacén específico
                $almacenProducto = AlmacenProducto::firstOrNew([
                    'almacen_id' => $item['almacen_id'],
                    'producto_id' => $producto->id
                ]);

                // Asegurar que la cantidad no sea negativa (aunque en compras normalmente aumenta)
                $nuevaCantidad = max(0, ($almacenProducto->cantidad ?? 0) + $item['cantidad']);
                $almacenProducto->cantidad = $nuevaCantidad;
                $almacenProducto->save();

                // Preparar datos para la vista
                $productosConAlmacen[] = [
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'categoria' => $categoria->nombre_categoria,
                    'pivot' => [
                        'cantidad' => $item['cantidad'],
                        'precio' => $item['precio'],
                    ],
                    'almacen' => Almacen::find($item['almacen_id']),
                ];
            }

            DB::commit();

            // ✅ CARGAR RELACIONES ADICIONALES PARA LA VISTA
            $compra->load(['pagos.cuenta', 'pagos.cliente']);

            return Inertia::render('Comprar/Show', [
                'compra' => $compra->load('proveedor'),
                'productos' => $productosConAlmacen,
                'success' => 'Compra registrada y productos actualizados correctamente'
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
