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
        // 1. Validar la entrada
        $validated = $request->validate([
            'compra' => 'required|in:deuda_proveedor,pago_cash',
            'proveedor' => 'required|string|max:255',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.almacen_id' => 'required|exists:almacens,id',
            'productos.*.producto' => 'required|string|max:255',
            // Nuevos campos opcionales del producto
            'productos.*.marca' => 'nullable|string|max:255',
            'productos.*.modelo' => 'nullable|string|max:255',
            'productos.*.capacidad' => 'nullable|string|max:255',
            // El campo 'codigo' ya no se valida como clave, el modelo lo genera
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

            // 2. Lógica de Pagos y Deuda (Mantenida)
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

                // Procesar pagos con cuentas
                foreach ($pagos as $pago) {
                    $cuenta = Cuenta::findOrFail($pago['cuenta_id']);
                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                    }
                    $cuenta->decrement('saldo_cuenta', $pago['monto']);
                }

                // Procesar pagos con clientes (deuda)
                foreach ($pagosClientes as $pagoCliente) {
                    $cliente = Cliente::findOrFail($pagoCliente['cliente_id']);
                    $cliente->decrement('deuda_pago_cliente', $pagoCliente['monto']);
                }

                $compraData['cuenta_id'] = !empty($pagos) ? $pagos[0]['cuenta_id'] : null;
            }

            $compra = Compra::create($compraData);

            $productosConAlmacen = [];
            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                // ------------------------------------------------------------------------------------
                // 3. CORRECCIÓN CLAVE: Buscar por atributos descriptivos (nombre, marca, etc.),
                // no por el código de barras (que viene vacío del FE para forzar la autogeneración).
                // ------------------------------------------------------------------------------------
                $searchAttributes = [
                    'nombre_producto' => $item['producto'],
                    'categoria_id' => $categoria->id,
                    // Usar null para los campos opcionales si no se proporcionan
                    'marca_producto' => $item['marca'] ?? null,
                    'modelo_producto' => $item['modelo'] ?? null,
                    'capacidad_producto' => $item['capacidad'] ?? null,
                ];

                // Buscar el producto por sus atributos.
                $producto = Producto::where($searchAttributes)->first();

                $isNew = !$producto;

                if ($isNew) {
                    $producto = new Producto();
                    // Al ser nuevo, inicializamos el código a null para que el método 'creating' lo autogenere.
                    $producto->codigo_producto = null;
                }
                // ------------------------------------------------------------------------------------

                // 4. ACTUALIZAR LOS CAMPOS DEL PRODUCTO
                $producto->fill([
                    'nombre_producto' => $item['producto'],
                    'marca_producto' => $item['marca'] ?? null, // Usar null para mantener consistencia
                    'modelo_producto' => $item['modelo'] ?? null, // Usar null para mantener consistencia
                    'capacidad_producto' => $item['capacidad'] ?? null, // Usar null para mantener consistencia
                    'categoria_id' => $categoria->id,
                    'precio_compra_producto' => $item['precio'],
                    'imagen_producto' => $producto->imagen_producto ?? 'productos/producto-default.png',
                ]);
                $producto->save(); // ⬅️ Si es nuevo, aquí se activa la autogeneración del código de barras.

                // 5. Lógica de Inventario (Mantenida)

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

                $almacenProducto->cantidad = ($almacenProducto->cantidad ?? 0) + $item['cantidad'];
                $almacenProducto->save();

                // 6. Preparar datos para la vista
                $productosConAlmacen[] = [
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'codigo_producto' => $producto->codigo_producto, // Usa el código final generado
                    'categoria' => $categoria->nombre_categoria,
                    'pivot' => [
                        'cantidad' => $item['cantidad'],
                        'precio' => $item['precio'],
                    ],
                    'almacen' => Almacen::find($item['almacen_id']),
                ];
            }

            DB::commit();

            // Renderizar la vista de la compra realizada
            return Inertia::render('Comprar/Show', [
                'compra' => $compra->load('proveedor'),
                'productos' => $productosConAlmacen,
                'success' => 'Compra registrada y productos actualizados correctamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            // Mostrar un error claro al usuario
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
