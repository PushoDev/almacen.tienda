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
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
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
     * Devuelve una lista de proveedores y clientes tipo fisico combinados.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProveedor()
    {
        $proveedores = Proveedor::select('id', 'nombre_proveedor as nombre')
            ->addSelect(DB::raw("'proveedor' as tipo"))
            ->orderBy('nombre');

        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente as nombre')
            ->addSelect(DB::raw("'cliente' as tipo"))
            ->orderBy('nombre');

        return response()->json([
            'proveedores' => $proveedores->get(),
            'clientes' => $clientes->get(),
        ]);
    }

    /**
     * Devuelve una lista solo de proveedores.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getSoloProveedores()
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
     * Devuelve una lista de clientes físicos con opción de búsqueda.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getClientesFisicos(Request $request)
    {
        $query = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente', 'deuda_pago_cliente', 'telefono_cliente');

        // Agregar búsqueda si se proporciona
        if ($request->has('search') && !empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nombre_cliente', 'like', '%' . $searchTerm . '%')
                    ->orWhere('telefono_cliente', 'like', '%' . $searchTerm . '%');
            });
        }

        // Ordenar por nombre
        $query->orderBy('nombre_cliente');

        $clientes = $query->get();

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
     * Busca clientes rápidamente por nombre o teléfono.
     * Usado para verificación en tiempo real en el frontend.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function buscarClienteRapido(Request $request)
    {
        $request->validate([
            'search' => 'required|string|min:2'
        ]);

        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->where(function ($query) use ($request) {
                $query->where('nombre_cliente', 'like', '%' . $request->search . '%')
                    ->orWhere('telefono_cliente', 'like', '%' . $request->search . '%');
            })
            ->select('id', 'nombre_cliente', 'telefono_cliente', 'deuda_pago_cliente')
            ->limit(10)
            ->get();

        return response()->json($clientes);
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

        $comprasRecientes = Compra::with(['proveedor', 'cliente'])
            ->latest()
            ->take(15)
            ->get()
            ->map(fn($c) => [
                'id'           => $c->id,
                'fecha_compra' => $c->fecha_compra,
                'total_compra' => $c->total_compra,
                'tipo_compra'  => $c->tipo_compra,
                'proveedor'    => $c->proveedor?->nombre_proveedor,
                'cliente'      => $c->cliente?->nombre_cliente,
            ]);

        return Inertia::render('Comprar/Index', [
            'cuentas'           => $cuentasUSD,
            'almacenes'         => Almacen::all(),
            'proveedores'       => Proveedor::all(),
            'categorias'        => Categoria::all(),
            'clientes'          => Cliente::where('tipo_cliente', 'fisico')->get(),
            'compras_recientes' => $comprasRecientes,
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
            'tipo_proveedor' => 'required|in:proveedor,cliente',
            'fecha' => 'required|date',
            'productos' => 'required|array|min:1',
            'productos.*.almacen_id' => 'required|integer|exists:almacens,id',
            'productos.*.producto' => 'required|string|max:255',
            'productos.*.marca' => 'nullable|string|max:255',
            'productos.*.modelo' => 'nullable|string|max:255',
            'productos.*.capacidad' => 'nullable|string|max:255',
            'productos.*.color' => 'nullable|string|max:100',
            'productos.*.categoria' => 'required|string|max:255',
            'productos.*.codigo' => 'nullable|string|max:255',
            'productos.*.codigo_barras' => 'nullable|string|max:255',
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
            // Lógica de proveedor/cliente y cálculo total
            $tipoProveedor = $validated['tipo_proveedor'];
            $nombreProveedor = $validated['proveedor'];

            if ($tipoProveedor === 'proveedor') {
                $proveedor = Proveedor::firstOrCreate(['nombre_proveedor' => $nombreProveedor]);
            } else {
                $cliente = Cliente::firstOrCreate([
                    'nombre_cliente' => $nombreProveedor,
                    'tipo_cliente' => 'fisico',
                ]);
            }

            $total = collect($validated['productos'])->sum(fn($p) => $p['cantidad'] * $p['precio']);

            $compraData = [
                'proveedor_id' => $tipoProveedor === 'proveedor' ? $proveedor->id : null,
                'cliente_id' => $tipoProveedor === 'cliente' ? $cliente->id : null,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
            ];

            // 2. Lógica de Pagos y Deuda
            if ($validated['compra'] === 'deuda_proveedor') {
                if ($tipoProveedor === 'proveedor') {
                    $proveedor->decrement('saldo_proveedor', $total);
                } else {
                    $cliente->increment('deuda_pago_cliente', $total);
                }
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
            $pivotResumen = [];
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
                }

                $producto->fill([
                    'nombre_producto' => $item['producto'],
                    'marca_producto' => $item['marca'] ?? null,
                    'modelo_producto' => $item['modelo'] ?? null,
                    'capacidad_producto' => $item['capacidad'] ?? null,
                    'color_producto' => $item['color'] ?? null,
                    'categoria_id' => $categoria->id,
                    'precio_compra_producto' => $item['precio'],
                    'imagen_producto' => $producto->imagen_producto ?? 'productos/producto-default.png',
                ]);
                $producto->save();

                // Manejo de Códigos de Barras
                $codigoBarrasInput = trim((string) ($item['codigo_barras'] ?? $item['codigo'] ?? ''));
                if ($codigoBarrasInput !== '') {
                    $esPrimerCodigo = !\App\Models\ProductoCodigo::where('producto_id', $producto->id)->exists();
                    $productoCodigo = \App\Models\ProductoCodigo::firstOrNew([
                        'producto_id' => $producto->id,
                        'codigo_barras' => $codigoBarrasInput,
                    ]);
                    $productoCodigo->cantidad = ($productoCodigo->cantidad ?? 0) + $item['cantidad'];
                    if (!$productoCodigo->exists) {
                        $productoCodigo->es_default = $esPrimerCodigo;
                        try {
                            $productoCodigo->imagen_barcode = \App\Models\ProductoCodigo::generarImagenBarcode($codigoBarrasInput);
                        } catch (\Exception $e) {
                            logger()->warning('No se pudo generar barcode para ' . $codigoBarrasInput . ': ' . $e->getMessage());
                        }
                    }
                    $productoCodigo->save();
                } else {
                    $defaultCodigo = \App\Models\ProductoCodigo::where('producto_id', $producto->id)
                        ->where('es_default', true)
                        ->first();
                    
                    if ($defaultCodigo) {
                        $defaultCodigo->increment('cantidad', $item['cantidad']);
                    } else {
                        \App\Models\ProductoCodigo::generarYGuardarDefault($producto, $item['cantidad']);
                    }
                }

                // Castear almacen_id a integer
                $almacenId = (int) $item['almacen_id'];
                $lineaCantidad = (int) $item['cantidad'];
                $lineaPrecio = (float) $item['precio'];
                $lineaSubtotal = $lineaCantidad * $lineaPrecio;

                // Asociar producto a la compra (evita duplicado en pivote compra_producto)
                if (!isset($pivotResumen[$producto->id])) {
                    $compra->productos()->attach($producto->id, [
                        'cantidad' => $lineaCantidad,
                        'precio' => $lineaPrecio,
                        'almacen_id' => $almacenId,
                    ]);

                    $pivotResumen[$producto->id] = [
                        'cantidad' => $lineaCantidad,
                        'subtotal' => $lineaSubtotal,
                        'almacen_id' => $almacenId,
                    ];
                } else {
                    $resumen = $pivotResumen[$producto->id];
                    $nuevaCantidad = $resumen['cantidad'] + $lineaCantidad;
                    $nuevoSubtotal = $resumen['subtotal'] + $lineaSubtotal;
                    $precioPromedio = $nuevaCantidad > 0 ? round($nuevoSubtotal / $nuevaCantidad, 2) : $lineaPrecio;

                    // Si el producto entra a la misma compra desde distintos almacenes, dejamos null en pivote
                    // para reflejar mezcla de origen en ese documento de compra.
                    $almacenPivot = ($resumen['almacen_id'] === $almacenId) ? $almacenId : null;

                    $compra->productos()->updateExistingPivot($producto->id, [
                        'cantidad' => $nuevaCantidad,
                        'precio' => $precioPromedio,
                        'almacen_id' => $almacenPivot,
                    ]);

                    $pivotResumen[$producto->id] = [
                        'cantidad' => $nuevaCantidad,
                        'subtotal' => $nuevoSubtotal,
                        'almacen_id' => $almacenPivot,
                    ];
                }

                // Actualizar inventario en el almacén específico
                $almacenProducto = AlmacenProducto::firstOrNew([
                    'almacen_id' => $almacenId,
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
                    'color_producto' => $producto->color_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'categoria' => $categoria->nombre_categoria,
                    'pivot' => [
                        'cantidad' => $item['cantidad'],
                        'precio' => $item['precio'],
                    ],
                    'almacen' => Almacen::find($almacenId),
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
     * Muestra el detalle de una compra existente.
     */
    public function show(Compra $comprar)
    {
        $comprar->load(['proveedor', 'cliente']);

        $productos = $comprar->productos()
            ->withPivot('cantidad', 'precio', 'almacen_id')
            ->get()
            ->map(function ($producto) {
                $almacen = $producto->pivot->almacen_id
                    ? Almacen::find($producto->pivot->almacen_id)
                    : null;

                return [
                    'nombre_producto'    => $producto->nombre_producto,
                    'marca_producto'     => $producto->marca_producto,
                    'modelo_producto'    => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'color_producto'     => $producto->color_producto,
                    'codigo_producto'    => $producto->codigo_producto,
                    'pivot' => [
                        'cantidad' => $producto->pivot->cantidad,
                        'precio'   => $producto->pivot->precio,
                    ],
                    'almacen' => [
                        'nombre_almacen' => $almacen?->nombre_almacen ?? 'N/A',
                    ],
                ];
            });

        return Inertia::render('Comprar/Show', [
            'compra' => [
                'id'           => $comprar->id,
                'fecha_compra' => $comprar->fecha_compra,
                'total_compra' => (float) $comprar->total_compra,
                'tipo_compra'  => $comprar->tipo_compra,
                'proveedor'    => $comprar->proveedor
                    ? ['id' => $comprar->proveedor->id, 'nombre_proveedor' => $comprar->proveedor->nombre_proveedor]
                    : null,
                'cliente'      => $comprar->cliente
                    ? ['id' => $comprar->cliente->id, 'nombre_cliente' => $comprar->cliente->nombre_cliente]
                    : null,
            ],
            'productos' => $productos,
        ]);
    }

    /**
     * Store a newly created cliente for use during compra process.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeClienteForCompra(Request $request)
    {
        // Primero, verificar si el cliente ya existe (por nombre O teléfono)
        $clienteExistente = Cliente::where('nombre_cliente', $request->nombre_cliente)
            ->orWhere('telefono_cliente', $request->telefono_cliente)
            ->first();

        // Si el cliente ya existe, retornarlo inmediatamente
        if ($clienteExistente) {
            return response()->json([
                'message' => 'Cliente ya existe en el sistema. Usando cliente existente.',
                'cliente' => $clienteExistente,
                'existe' => true
            ], 200);
        }

        // Validación de datos
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'nombre_cliente' => ['required', 'string'],
            'tipo_cliente' => ['required', 'in:fisico,asociado'],
            'telefono_cliente' => ['required', 'string'],
            'direccion_cliente' => ['nullable', 'string'],
            'ciudad_cliente' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Crear el cliente con deuda_pago_cliente en 0
        $cliente = Cliente::create([
            'nombre_cliente' => $request->nombre_cliente,
            'tipo_cliente' => $request->tipo_cliente ?? 'fisico',
            'deuda_pago_cliente' => 0,
            'telefono_cliente' => $request->telefono_cliente,
            'direccion_cliente' => $request->direccion_cliente ?? null,
            'ciudad_cliente' => $request->ciudad_cliente ?? null,
        ]);

        return response()->json([
            'message' => 'Cliente creado exitosamente para la compra.',
            'cliente' => $cliente,
            'existe' => false
        ], 201);
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

    /**
     * Devuelve una lista de almacenes con opción de búsqueda.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAlmacenes(Request $request)
    {
        $query = Almacen::select('id', 'nombre_almacen', 'tipo_almacen');

        // Agregar búsqueda si se proporciona
        if ($request->has('search') && !empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nombre_almacen', 'like', '%' . $searchTerm . '%')
                    ->orWhere('tipo_almacen', 'like', '%' . $searchTerm . '%');
            });
        }

        // Ordenar por nombre
        $query->orderBy('nombre_almacen');

        $almacenes = $query->get();

        return response()->json($almacenes);
    }

    /**
     * Store a newly created almacen for use during compra process.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeAlmacenForCompra(Request $request)
    {
        // Validación de datos
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'nombre_almacen' => ['required', 'string', 'unique:almacens,nombre_almacen'],
            'tipo_almacen' => ['required', 'in:almacen,punto_venta,transportacion'],
            'telefono_almacen' => ['required', 'string', 'unique:almacens,telefono_almacen'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Crear el almacén
        $almacen = Almacen::create([
            'nombre_almacen' => $request->nombre_almacen,
            'tipo_almacen' => $request->tipo_almacen,
            'telefono_almacen' => $request->telefono_almacen,
            'correo_almacen' => $request->correo_almacen ?? null,
            'provincia_almacen' => $request->provincia_almacen ?? null,
            'ciudad_almacen' => $request->ciudad_almacen ?? null,
            'notas_almacen' => $request->notas_almacen ?? null,
        ]);

        return response()->json([
            'message' => 'Almacén creado exitosamente.',
            'almacen' => $almacen
        ], 201);
    }

    /**
     * Crea o busca un proveedor/cliente para uso durante el proceso de compra.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeProveedor(Request $request)
    {
        // Determinar el tipo
        $tipo = $request->tipo ?? 'proveedor';

        // Si ya existe como proveedor
        if ($tipo === 'proveedor') {
            $existente = Proveedor::where('nombre_proveedor', $request->nombre_proveedor)->first();
            if ($existente) {
                return response()->json([
                    'message' => 'Ya existe como proveedor.',
                    'data' => $existente,
                    'tipo' => 'proveedor',
                    'existe' => true
                ], 200);
            }
        }

        // Si ya existe como cliente
        $existenteCliente = Cliente::where('nombre_cliente', $request->nombre_cliente ?? $request->nombre_proveedor)->first();
        if ($existenteCliente) {
            return response()->json([
                'message' => 'Ya existe como cliente.',
                'data' => $existenteCliente,
                'tipo' => 'cliente',
                'existe' => true
            ], 200);
        }

        // Validación de datos
        $validator = Validator::make([
            'nombre_proveedor' => $request->nombre_proveedor,
            'nombre_cliente' => $request->nombre_cliente ?? $request->nombre_proveedor,
        ], [
            'nombre_proveedor' => 'required|string',
            'nombre_cliente' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($tipo === 'proveedor') {
            $proveedor = Proveedor::create([
                'nombre_proveedor' => $request->nombre_proveedor,
                'saldo_proveedor' => 0,
            ]);

            return response()->json([
                'message' => 'Proveedor creado exitosamente.',
                'data' => $proveedor,
                'tipo' => 'proveedor',
                'existe' => false
            ], 201);
        } else {
            // Para clientes, el teléfono es obligatorio
            $telefono = $request->telefono_cliente ?? null;
            if (empty($telefono)) {
                return response()->json([
                    'errors' => ['telefono_cliente' => 'El teléfono es requerido para clientes.']
                ], 422);
            }

            // Verificar si ya existe con ese teléfono
            $clienteExistentePorTelefono = Cliente::where('telefono_cliente', $telefono)->first();
            if ($clienteExistentePorTelefono) {
                return response()->json([
                    'message' => 'Ya existe un cliente con ese teléfono.',
                    'data' => $clienteExistentePorTelefono,
                    'tipo' => 'cliente',
                    'existe' => true
                ], 200);
            }

            $cliente = Cliente::create([
                'nombre_cliente' => $request->nombre_cliente ?? $request->nombre_proveedor,
                'tipo_cliente' => 'fisico',
                'deuda_pago_cliente' => 0,
                'telefono_cliente' => $telefono,
                'direccion_cliente' => $request->direccion_cliente ?? null,
                'ciudad_cliente' => $request->ciudad_cliente ?? null,
            ]);

            return response()->json([
                'message' => 'Cliente creado exitosamente.',
                'data' => $cliente,
                'tipo' => 'cliente',
                'existe' => false
            ], 201);
        }
    }

    /**
     * Store a newly created categoria for use during compra process.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function storeCategoria(Request $request)
    {
        // Validación de datos
        $validator = Validator::make($request->all(), [
            'nombre_categoria' => 'required|string|unique:categorias,nombre_categoria',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Crear la categoría
        $categoria = Categoria::create([
            'nombre_categoria' => $request->nombre_categoria,
        ]);

        return response()->json([
            'message' => 'Categoría creada exitosamente.',
            'categoria' => $categoria
        ], 201);
    }
}
