<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraEdicion;
use App\Models\CompraPago; // ✅ AGREGAR IMPORT DE COMPRAPAGO
use App\Models\Cuenta;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\Proveedor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class CompraController extends Controller
{
    /**
     * Devuelve una lista de proveedores y clientes tipo fisico combinados.
     *
     * @return JsonResponse
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
     * @return JsonResponse
     */
    public function getSoloProveedores()
    {
        $proveedores = Proveedor::select('id', 'nombre_proveedor')->get();

        return response()->json($proveedores);
    }

    /**
     * Devuelve una lista de categorías.
     *
     * @return JsonResponse
     */
    public function getCategorias()
    {
        $categorias = Categoria::select('id', 'nombre_categoria')->get();

        return response()->json($categorias);
    }

    /**
     * Devuelve una lista de clientes físicos con opción de búsqueda.
     *
     * @return JsonResponse
     */
    public function getClientesFisicos(Request $request)
    {
        $query = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente', 'deuda_pago_cliente', 'telefono_cliente');

        // Agregar búsqueda si se proporciona
        if ($request->has('search') && ! empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nombre_cliente', 'like', '%'.$searchTerm.'%')
                    ->orWhere('telefono_cliente', 'like', '%'.$searchTerm.'%');
            });
        }

        // Ordenar por nombre
        $query->orderBy('nombre_cliente');

        $clientes = $query->get();

        return response()->json($clientes);
    }

    /**
     * Devuelve una lista de cuentas permanentes SOLO EN USD.
     * ('temporales' se unificó en 'permanentes' el 2026-07-28, ya no existe como tipo aparte)
     *
     * @return JsonResponse
     */
    public function getCuentas()
    {
        $cuentas = Cuenta::where('tipo_cuenta', 'permanentes')
            ->whereHas('moneda', function ($query) {
                $query->where('codigo_moneda', 'USD')->where('estado', true);
            })
            ->with('moneda')
            ->select('id', 'nombre_cuenta', 'saldo_cuenta', 'moneda_id')
            ->get();

        return response()->json($cuentas);
    }

    /**
     * Busca productos existentes por nombre/marca/modelo/código para autocompletar el
     * formulario de alta de compra, mostrando stock y costo actual antes de sobreescribirlo.
     *
     * @return JsonResponse
     */
    public function buscarProductosExistentes(Request $request)
    {
        $request->validate([
            'search' => 'required|string|min:2',
        ]);

        $productos = Producto::buscar($request->search)
            ->with(['categoria', 'almacenes'])
            ->limit(8)
            ->get()
            ->map(function ($producto) {
                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'categoria' => $producto->categoria?->nombre_categoria,
                    'precio_compra_producto' => (float) $producto->precio_compra_producto,
                    'cantidad_total' => $producto->cantidad_total,
                    // Stock desglosado por almacén: el costo es un solo dato por producto,
                    // pero el stock sí es específico de cada almacén.
                    'stock_por_almacen' => $producto->almacenes
                        ->map(fn ($almacen) => [
                            'almacen_id' => $almacen->id,
                            'nombre_almacen' => $almacen->nombre_almacen,
                            'cantidad' => (int) $almacen->pivot->cantidad,
                        ])
                        ->filter(fn ($item) => $item['cantidad'] > 0)
                        ->values(),
                ];
            });

        return response()->json($productos);
    }

    /**
     * Busca clientes rápidamente por nombre o teléfono.
     * Usado para verificación en tiempo real en el frontend.
     *
     * @return JsonResponse
     */
    public function buscarClienteRapido(Request $request)
    {
        $request->validate([
            'search' => 'required|string|min:2',
        ]);

        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->where(function ($query) use ($request) {
                $query->where('nombre_cliente', 'like', '%'.$request->search.'%')
                    ->orWhere('telefono_cliente', 'like', '%'.$request->search.'%');
            })
            ->select('id', 'nombre_cliente', 'telefono_cliente', 'deuda_pago_cliente')
            ->limit(10)
            ->get();

        return response()->json($clientes);
    }

    /**
     * Muestra la vista de creación de compra.
     *
     * @return Response
     */
    public function index()
    {
        $cuentasUSD = Cuenta::where('tipo_cuenta', 'permanentes')
            ->whereHas('moneda', function ($query) {
                $query->where('codigo_moneda', 'USD')->where('estado', true);
            })
            ->with('moneda')
            ->get();

        $comprasRecientes = Compra::with(['proveedor', 'cliente', 'pagos'])
            ->latest()
            ->take(15)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'fecha_compra' => $c->fecha_compra,
                'total_compra' => $c->total_compra,
                'tipo_compra' => $c->tipo_compra,
                'estado' => $c->estado,
                'proveedor' => $c->proveedor?->nombre_proveedor,
                'cliente' => $c->cliente?->nombre_cliente,
                'es_parcial' => $c->es_parcial,
            ]);

        return Inertia::render('Comprar/Index', [
            'cuentas' => $cuentasUSD,
            'almacenes' => Almacen::all(),
            'proveedores' => Proveedor::all(),
            'categorias' => Categoria::all(),
            'clientes' => Cliente::where('tipo_cliente', 'fisico')->get(),
            'compras_recientes' => $comprasRecientes,
        ]);
    }

    /**
     * Procesa y almacena una nueva compra.
     */
    public function store(Request $request): Response|RedirectResponse
    {
        $validated = $request->validate($this->reglasProductosYPagos());

        $permitirDeudaParcial = $request->boolean('permitir_deuda_parcial');

        DB::beginTransaction();

        try {
            $tipoProveedor = $validated['tipo_proveedor'];
            $nombreProveedor = $validated['proveedor'];

            if ($tipoProveedor === 'proveedor') {
                $entidad = Proveedor::firstOrCreate(['nombre_proveedor' => $nombreProveedor]);
            } else {
                $entidad = Cliente::firstOrCreate([
                    'nombre_cliente' => $nombreProveedor,
                    'tipo_cliente' => 'fisico',
                ]);
            }

            $total = collect($validated['productos'])->sum(fn ($p) => $p['cantidad'] * $p['precio']);

            $resultadoPagos = $this->procesarPagos($validated['compra'], $tipoProveedor, $entidad, $total, $validated, $permitirDeudaParcial);

            $compraData = $resultadoPagos['compraData'] + [
                'user_id' => $request->user()->id,
                'turno_vendedor_id' => $request->user()->turnoActivo()?->id,
                'proveedor_id' => $tipoProveedor === 'proveedor' ? $entidad->id : null,
                'cliente_id' => $tipoProveedor === 'cliente' ? $entidad->id : null,
                'fecha_compra' => $validated['fecha'],
                'total_compra' => $total,
                'tipo_compra' => $validated['compra'],
                // Nace pendiente: el dinero ya se movió (arriba), pero el stock (ProductoCodigo /
                // AlmacenProducto) queda diferido hasta aprobar() — ver ese método.
                'estado' => 'pendiente',
            ];

            $compra = Compra::create($compraData);

            $this->crearRegistrosPago($compra, $validated['compra'], $resultadoPagos);

            $productosConAlmacen = $this->procesarLineasProducto($compra, $validated['productos']);

            DB::commit();

            $compra->load(['proveedor', 'cliente', 'pagos.cuenta', 'pagos.cliente']);

            return Inertia::render('Comprar/Show', [
                'compra' => $this->shapeCompraParaVista($compra),
                'productos' => $productosConAlmacen,
                'success' => 'Compra registrada correctamente — queda pendiente de aprobación.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Error al procesar la compra: '.$e->getMessage()]);
        }
    }

    /**
     * Reglas de validación compartidas por store() y actualizar() para el carrito de productos y
     * los métodos de pago. `$incluirProveedor` se apaga en actualizar(): el proveedor/cliente y el
     * tipo de compra (deuda_proveedor|pago_cash) de una compra pendiente no son editables, solo
     * sus líneas de producto y los pagos que las cubren.
     *
     * @return array<string, string>
     */
    private function reglasProductosYPagos(bool $incluirProveedor = true): array
    {
        $reglas = [
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
            'productos.*.precio' => 'required|numeric|min:0.01',
            'pagos' => 'array|nullable',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'pagos_clientes' => 'array|nullable',
            'pagos_clientes.*.cliente_id' => 'required|exists:clientes,id',
            'pagos_clientes.*.monto' => 'required|numeric|min:0.01',
            'permitir_deuda_parcial' => 'nullable|boolean',
        ];

        if ($incluirProveedor) {
            $reglas = [
                'compra' => 'required|in:deuda_proveedor,pago_cash',
                'proveedor' => 'required|string|max:255',
                'tipo_proveedor' => 'required|in:proveedor,cliente',
                'fecha' => 'required|date',
            ] + $reglas;
        }

        return $reglas;
    }

    /**
     * Procesa la lógica de pago/deuda de una compra (crear o editar) contra el proveedor/cliente
     * ya resuelto por el caller. No toca `compra_producto` ni el stock — de eso se encarga
     * procesarLineasProducto().
     *
     * @return array{compraData: array<string, mixed>, pagosCuenta: array<int, array<string, mixed>>, pagosClientes: array<int, array<string, mixed>>, montoFaltante: float}
     */
    private function procesarPagos(
        string $tipoCompra,
        string $tipoProveedor,
        Proveedor|Cliente $entidad,
        float $total,
        array $validated,
        bool $permitirDeudaParcial
    ): array {
        $compraData = [];
        $montoFaltante = 0;
        $pagos = [];
        $pagosClientes = [];

        if ($tipoCompra === 'deuda_proveedor') {
            if ($tipoProveedor === 'proveedor') {
                $receptorSaldoAnterior = (float) $entidad->saldo_proveedor;
                $entidad->decrement('saldo_proveedor', $total);
                $compraData['receptor_saldo_anterior'] = $receptorSaldoAnterior;
                $compraData['receptor_saldo_posterior'] = $receptorSaldoAnterior - $total;
            } else {
                $receptorSaldoAnterior = (float) $entidad->deuda_pago_cliente;
                $entidad->decrement('deuda_pago_cliente', $total);
                $compraData['receptor_saldo_anterior'] = $receptorSaldoAnterior;
                $compraData['receptor_saldo_posterior'] = $receptorSaldoAnterior - $total;
            }
            $compraData['cuenta_id'] = null;
        } elseif ($tipoCompra === 'pago_cash') {
            $pagos = $validated['pagos'] ?? [];
            $pagosClientes = $validated['pagos_clientes'] ?? [];

            if (empty($pagos) && empty($pagosClientes)) {
                throw new \Exception('Debe especificar al menos un método de pago (cuenta o cliente).');
            }

            $sumaTotalPagos = collect($pagos)->sum('monto') + collect($pagosClientes)->sum('monto');

            // Pagar de más nunca se permite, con o sin deuda parcial habilitada.
            if ($sumaTotalPagos - $total > 0.01) {
                throw new \Exception("La suma de los pagos ({$sumaTotalPagos}) supera el total de la compra ({$total}).");
            }

            $montoFaltante = round($total - $sumaTotalPagos, 2);

            if ($montoFaltante > 0.01 && ! $permitirDeudaParcial) {
                throw new \Exception("La suma de los pagos ({$sumaTotalPagos}) no coincide con el total de la compra ({$total}).");
            }

            if ($montoFaltante > 0.01) {
                // El usuario habilitó completar con deuda: el resto no cubierto por cuentas/clientes
                // se suma como deuda al proveedor/cliente de la compra — misma lógica que
                // tipo_compra=deuda_proveedor, pero solo por la parte que faltó. Tiene que ir ANTES
                // del foreach de pagosClientes de abajo, que usa un Cliente propio para el cliente
                // que está pagando, no el dueño de la compra.
                if ($tipoProveedor === 'proveedor') {
                    $receptorSaldoAnterior = (float) $entidad->saldo_proveedor;
                    $entidad->decrement('saldo_proveedor', $montoFaltante);
                    $compraData['receptor_saldo_anterior'] = $receptorSaldoAnterior;
                    $compraData['receptor_saldo_posterior'] = $receptorSaldoAnterior - $montoFaltante;
                } else {
                    $receptorSaldoAnterior = (float) $entidad->deuda_pago_cliente;
                    $entidad->decrement('deuda_pago_cliente', $montoFaltante);
                    $compraData['receptor_saldo_anterior'] = $receptorSaldoAnterior;
                    $compraData['receptor_saldo_posterior'] = $receptorSaldoAnterior - $montoFaltante;
                }
            } else {
                $montoFaltante = 0;
            }

            // ✅ VALIDAR Y PROCESAR PAGOS CON CUENTAS
            foreach ($pagos as $idx => $pago) {
                $cuenta = Cuenta::with('moneda')->findOrFail($pago['cuenta_id']);

                if ($cuenta->moneda->codigo_moneda !== 'USD') {
                    throw new \Exception("La cuenta {$cuenta->nombre_cuenta} no es una cuenta en USD. Solo se permiten cuentas en USD para compras.");
                }

                if ($cuenta->saldo_cuenta < $pago['monto']) {
                    throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                }
                $saldoAnteriorPago = (float) $cuenta->saldo_cuenta;
                $cuenta->decrement('saldo_cuenta', $pago['monto']);
                $pagos[$idx]['saldo_anterior'] = $saldoAnteriorPago;
                $pagos[$idx]['saldo_posterior'] = $saldoAnteriorPago - $pago['monto'];
            }

            // ✅ PROCESAR PAGOS CON CLIENTES (deuda)
            foreach ($pagosClientes as $idx => $pagoCliente) {
                $clientePagador = Cliente::findOrFail($pagoCliente['cliente_id']);
                $saldoAnteriorPago = (float) $clientePagador->deuda_pago_cliente;
                $clientePagador->decrement('deuda_pago_cliente', $pagoCliente['monto']);
                $pagosClientes[$idx]['saldo_anterior'] = $saldoAnteriorPago;
                $pagosClientes[$idx]['saldo_posterior'] = $saldoAnteriorPago - $pagoCliente['monto'];
            }

            $compraData['cuenta_id'] = ! empty($pagos) ? $pagos[0]['cuenta_id'] : null;
        }

        return [
            'compraData' => $compraData,
            'pagosCuenta' => $pagos,
            'pagosClientes' => $pagosClientes,
            'montoFaltante' => $montoFaltante,
        ];
    }

    /**
     * Crea las filas de `compra_pago` a partir del resultado de procesarPagos().
     *
     * @param  array{pagosCuenta: array<int, array<string, mixed>>, pagosClientes: array<int, array<string, mixed>>, montoFaltante: float}  $resultadoPagos
     */
    private function crearRegistrosPago(Compra $compra, string $tipoCompra, array $resultadoPagos): void
    {
        if ($tipoCompra === 'deuda_proveedor') {
            CompraPago::create([
                'compra_id' => $compra->id,
                'cuenta_id' => null,
                'cliente_id' => null,
                'monto' => $compra->total_compra,
                'tipo_pago' => 'deuda_proveedor',
            ]);

            return;
        }

        foreach ($resultadoPagos['pagosCuenta'] as $pago) {
            CompraPago::create([
                'compra_id' => $compra->id,
                'cuenta_id' => $pago['cuenta_id'],
                'cliente_id' => null,
                'monto' => $pago['monto'],
                'tipo_pago' => 'cuenta',
                'saldo_anterior' => $pago['saldo_anterior'],
                'saldo_posterior' => $pago['saldo_posterior'],
            ]);
        }

        foreach ($resultadoPagos['pagosClientes'] as $pagoCliente) {
            CompraPago::create([
                'compra_id' => $compra->id,
                'cuenta_id' => null,
                'cliente_id' => $pagoCliente['cliente_id'],
                'monto' => $pagoCliente['monto'],
                'tipo_pago' => 'cliente',
                'saldo_anterior' => $pagoCliente['saldo_anterior'],
                'saldo_posterior' => $pagoCliente['saldo_posterior'],
            ]);
        }

        // Registrar el faltante (si el usuario habilitó completar con deuda) como un pago más,
        // mismo tipo que usa una compra 100% a deuda — así "Detalles de Pago" lo muestra junto
        // a los demás sin necesitar ningún cambio en el frontend.
        if ($resultadoPagos['montoFaltante'] > 0) {
            CompraPago::create([
                'compra_id' => $compra->id,
                'cuenta_id' => null,
                'cliente_id' => null,
                'monto' => $resultadoPagos['montoFaltante'],
                'tipo_pago' => 'deuda_proveedor',
            ]);
        }
    }

    /**
     * Procesa las líneas de producto del carrito: crea/matchea la ficha de Producto (identidad =
     * atributos + precio, sin margen de tolerancia) y registra la línea en `compra_producto`,
     * incluido el código de barras tal cual se escribió. NO toca ProductoCodigo ni
     * AlmacenProducto — ambos quedan diferidos hasta aprobar() (ver ese método), para que una
     * compra pendiente nunca afecte el stock real ni el inventario de códigos de barras. Esto es
     * lo que hace trivial a actualizar(): como nada de esto se tocó, editar solo implica volver a
     * llamar este método con la lista nueva, sin revertir nada aquí.
     *
     * @return array<int, array<string, mixed>>
     */
    private function procesarLineasProducto(Compra $compra, array $productos): array
    {
        $productosConAlmacen = [];

        foreach ($productos as $item) {
            $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

            $searchAttributes = [
                'nombre_producto' => $item['producto'],
                'categoria_id' => $categoria->id,
                'marca_producto' => $item['marca'] ?? null,
                'modelo_producto' => $item['modelo'] ?? null,
                'capacidad_producto' => $item['capacidad'] ?? null,
            ];

            // El precio de costo es parte de la identidad del producto: si el mismo
            // producto (mismo nombre+categoría+marca+modelo+capacidad) se compra a un
            // precio distinto — misma compra para llenar un contenedor, compra separada,
            // u otro proveedor — es legalmente otro producto. No se pisa el costo del
            // existente: se crea una ficha aparte. Comparación exacta, sin margen de
            // tolerancia (decisión explícita del cliente).
            $producto = Producto::where($searchAttributes)
                ->where('precio_compra_producto', $item['precio'])
                ->first();
            $isNew = ! $producto;

            if ($isNew) {
                $producto = new Producto;
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

            // Castear almacen_id a integer
            $almacenId = (int) $item['almacen_id'];
            $lineaCantidad = (int) $item['cantidad'];
            $lineaPrecio = (float) $item['precio'];
            $codigoBarrasInput = trim((string) ($item['codigo_barras'] ?? $item['codigo'] ?? ''));

            // Cada línea del carrito queda como su propia fila en compra_producto — si el mismo
            // producto aparece dos veces en esta compra (distinto almacén y/o color), son dos
            // líneas reales, no se fusionan ni se promedia el precio entre ellas.
            $compra->productos()->attach($producto->id, [
                'cantidad' => $lineaCantidad,
                'precio' => $lineaPrecio,
                'almacen_id' => $almacenId,
                'es_producto_nuevo' => $isNew,
                'codigo_barras' => $codigoBarrasInput !== '' ? $codigoBarrasInput : null,
            ]);

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
                'es_producto_nuevo' => $isNew,
            ];
        }

        return $productosConAlmacen;
    }

    /**
     * Revierte los efectos monetarios de una compra pendiente: cuentas y clientes-pagadores
     * recuperan exactamente lo que se les descontó, y la deuda con el proveedor/cliente-fuente
     * (total o parcial) se cancela a 0. No toca stock — una compra pendiente nunca lo tuvo.
     *
     * NO borra las filas de `compra_pago` — eso queda a cargo del caller. La usan actualizar()
     * (que sí las borra después, para "empezar de cero" antes de reprocesar con los datos nuevos)
     * y anular() en su variante de reversión total (que las deja intactas a propósito: son el
     * único registro de qué cuenta/cliente pagó qué, y sin ellas la vista de detalle de una
     * compra anulada quedaría sin nada que mostrar en "Detalles de Pago").
     */
    private function revertirEfectosMonetarios(Compra $compra): void
    {
        $compra->loadMissing(['pagos.cuenta', 'pagos.cliente', 'proveedor', 'cliente']);

        foreach ($compra->pagos as $pago) {
            if ($pago->tipo_pago === 'cuenta' && $pago->cuenta) {
                $pago->cuenta->increment('saldo_cuenta', $pago->monto);
            } elseif ($pago->tipo_pago === 'cliente' && $pago->cliente) {
                $pago->cliente->increment('deuda_pago_cliente', $pago->monto);
            } elseif ($pago->tipo_pago === 'deuda_proveedor') {
                if ($compra->proveedor) {
                    $compra->proveedor->increment('saldo_proveedor', $pago->monto);
                } elseif ($compra->cliente) {
                    $compra->cliente->increment('deuda_pago_cliente', $pago->monto);
                }
            }
        }
    }

    /**
     * Aprueba una compra pendiente: recién en este momento se suma el stock real —
     * ProductoCodigo (código de barras) y AlmacenProducto (inventario por almacén). Antes de
     * aprobar, la compra es solo una intención financiera (el dinero ya se movió en
     * store()/actualizar()) sin ningún efecto sobre el inventario. Una vez aprobada, la compra
     * queda inmutable — no se puede editar ni anular, fluye normal como cualquier compra
     * histórica (mismo comportamiento que ya existía antes de este estado).
     */
    public function aprobar(Compra $comprar): RedirectResponse
    {
        if ($comprar->estado !== 'pendiente') {
            return back()->withErrors(['error' => 'Solo se puede aprobar una compra pendiente.']);
        }

        DB::transaction(function () use ($comprar) {
            $numeroLinea = 0;

            foreach ($comprar->productos as $producto) {
                $numeroLinea++;

                $cantidad = (int) $producto->pivot->cantidad;
                $almacenId = (int) $producto->pivot->almacen_id;
                $codigoBarrasInput = trim((string) ($producto->pivot->codigo_barras ?? ''));

                if ($codigoBarrasInput !== '') {
                    $esPrimerCodigo = ! ProductoCodigo::where('producto_id', $producto->id)->exists();
                    $productoCodigo = ProductoCodigo::firstOrNew([
                        'producto_id' => $producto->id,
                        'codigo_barras' => $codigoBarrasInput,
                    ]);
                    $productoCodigo->cantidad = ($productoCodigo->cantidad ?? 0) + $cantidad;
                    if (! $productoCodigo->exists) {
                        $productoCodigo->es_default = $esPrimerCodigo;
                        try {
                            $productoCodigo->imagen_barcode = ProductoCodigo::generarImagenBarcode($codigoBarrasInput);
                        } catch (\Exception $e) {
                            logger()->warning('No se pudo generar barcode para '.$codigoBarrasInput.': '.$e->getMessage());
                        }
                    }
                    $productoCodigo->save();
                } else {
                    $defaultCodigo = ProductoCodigo::where('producto_id', $producto->id)
                        ->where('es_default', true)
                        ->first();

                    if ($defaultCodigo) {
                        $defaultCodigo->increment('cantidad', $cantidad);
                    } else {
                        ProductoCodigo::generarYGuardarDefault($producto, $cantidad);
                    }
                }

                $almacenProducto = AlmacenProducto::firstOrNew([
                    'almacen_id' => $almacenId,
                    'producto_id' => $producto->id,
                ]);
                $almacenProducto->cantidad = max(0, ($almacenProducto->cantidad ?? 0) + $cantidad);
                $almacenProducto->save();

                // Registro de trazabilidad: qué línea de qué compra trajo esta tanda de stock.
                // No reemplaza AlmacenProducto (el total real) ni implica ningún consumo por
                // lote todavía — es historial aditivo hacia atrás.
                LoteStock::create([
                    'codigo' => LoteStock::generarCodigo($comprar->id, $numeroLinea),
                    'compra_producto_id' => $producto->pivot->id,
                    'producto_id' => $producto->id,
                    'almacen_id' => $almacenId,
                    'cantidad' => $cantidad,
                    'precio_costo' => $producto->pivot->precio,
                ]);
            }

            $comprar->update(['estado' => 'aprobada']);
        });

        return redirect()->route('comprar.show', $comprar->id)->with('success', 'Compra aprobada — stock actualizado.');
    }

    /**
     * Anula una compra pendiente. Como el stock nunca se tocó (se difiere hasta aprobar()), la
     * anulación es puramente financiera. Dos variantes, elegidas por el usuario:
     * - 'reversion': todo el dinero vuelve exactamente a donde salió.
     * - 'fondo': el dinero que sí se pagó (cuentas/clientes) no vuelve — se convierte en crédito
     *   a favor con el proveedor/cliente-fuente (mismo mecanismo que ya usan Proveedores/Clientes
     *   para clasificar un saldo positivo como "Con Fondo"). Solo disponible si hubo pago real:
     *   una compra 100% deuda_proveedor (sin pago real) nunca puede terminar en fondo, solo
     *   revertirse — no hay dinero real que convertir. La porción de deuda de una compra parcial
     *   sigue la misma regla y siempre se revierte a 0, aunque el resto sí se convierta en fondo.
     */
    public function anular(Request $request, Compra $comprar): RedirectResponse
    {
        if ($comprar->estado !== 'pendiente') {
            return back()->withErrors(['error' => 'Solo se puede anular una compra pendiente.']);
        }

        $validated = $request->validate([
            'tipo_anulacion' => 'required|in:reversion,fondo',
            'motivo_anulacion' => 'required|string|max:500',
        ]);

        if ($comprar->tipo_compra === 'deuda_proveedor' && $validated['tipo_anulacion'] === 'fondo') {
            return back()->withErrors([
                'tipo_anulacion' => 'Esta compra fue 100% a deuda (sin pago real) — solo se puede anular revirtiendo la deuda, no puede convertirse en fondo.',
            ]);
        }

        $comprar->loadMissing(['pagos.cuenta', 'pagos.cliente', 'proveedor', 'cliente']);

        DB::transaction(function () use ($comprar, $validated) {
            if ($validated['tipo_anulacion'] === 'reversion') {
                $this->revertirEfectosMonetarios($comprar);
            } else {
                // La porción de deuda (si la hubo, ej. compra parcial) siempre se revierte a 0 —
                // nunca se convierte en fondo, haya habido pago real en el resto o no.
                $pagoDeuda = $comprar->pagos->firstWhere('tipo_pago', 'deuda_proveedor');
                if ($pagoDeuda) {
                    if ($comprar->proveedor) {
                        $comprar->proveedor->increment('saldo_proveedor', $pagoDeuda->monto);
                    } elseif ($comprar->cliente) {
                        $comprar->cliente->increment('deuda_pago_cliente', $pagoDeuda->monto);
                    }
                }

                // El dinero que sí se pagó (cuentas + clientes-pagadores) no vuelve a su origen —
                // se convierte en crédito a favor con el proveedor/cliente-fuente de esta compra.
                $montoRealPagado = $comprar->pagos->whereIn('tipo_pago', ['cuenta', 'cliente'])->sum('monto');

                if ($montoRealPagado > 0) {
                    if ($comprar->proveedor) {
                        $comprar->proveedor->increment('saldo_proveedor', $montoRealPagado);
                    } elseif ($comprar->cliente) {
                        $comprar->cliente->increment('deuda_pago_cliente', $montoRealPagado);
                    }
                }
                // Las filas de compra_pago NO se borran — quedan como el registro de qué cuenta/
                // cliente puso cada monto originalmente, para que el detalle de la compra anulada
                // lo pueda mostrar (ver shapeCompraParaVista() y el frontend).
            }

            $comprar->update([
                'estado' => 'anulada',
                'tipo_anulacion' => $validated['tipo_anulacion'],
                'motivo_anulacion' => $validated['motivo_anulacion'],
            ]);
        });

        return redirect()->route('comprar.index')->with('success', 'Compra anulada correctamente.');
    }

    /**
     * Edita una compra pendiente. El producto puede cambiar por completo (agregar/quitar líneas,
     * cambiar cantidades) — en vez de calcular un diff, se trata como si fuera una compra nueva:
     * se revierten todos los efectos monetarios y se sueltan las líneas de producto actuales, y
     * se vuelve a procesar todo desde cero con los datos nuevos, sobre la misma fila de Compra.
     * Como el stock nunca se tocó mientras está pendiente, no hay nada que revertir ahí — por
     * eso editar es seguro incluso si cambian por completo los productos. Proveedor/cliente y
     * tipo de compra NO son editables aquí, solo productos y sus pagos (ver reglasProductosYPagos).
     *
     * Toda edición exige un motivo — una compra pendiente puede editarse más de una vez, así que
     * queda auditada en `compra_ediciones` (mismo patrón que `ajustes_saldo_cuenta` en Cuentas)
     * en vez de pisar un solo campo en `compras`.
     */
    public function actualizar(Request $request, Compra $comprar): Response|RedirectResponse
    {
        if ($comprar->estado !== 'pendiente') {
            return back()->withErrors(['error' => 'Solo se puede editar una compra pendiente.']);
        }

        $validated = $request->validate($this->reglasProductosYPagos(incluirProveedor: false) + [
            'nota' => 'required|string|max:500',
        ]);

        $permitirDeudaParcial = $request->boolean('permitir_deuda_parcial');
        $totalAnterior = (float) $comprar->total_compra;

        DB::beginTransaction();

        try {
            $comprar->loadMissing(['proveedor', 'cliente']);
            $tipoProveedor = $comprar->proveedor_id ? 'proveedor' : 'cliente';
            $entidad = $comprar->proveedor_id ? $comprar->proveedor : $comprar->cliente;

            $this->revertirEfectosMonetarios($comprar);
            // A diferencia de anular(), aquí sí se borran — se está reemplazando todo por datos
            // nuevos, no dejando un registro histórico de una compra que queda cerrada.
            CompraPago::where('compra_id', $comprar->id)->delete();
            $comprar->productos()->detach();

            $total = collect($validated['productos'])->sum(fn ($p) => $p['cantidad'] * $p['precio']);

            $resultadoPagos = $this->procesarPagos($comprar->tipo_compra, $tipoProveedor, $entidad, $total, $validated, $permitirDeudaParcial);

            $comprar->update($resultadoPagos['compraData'] + ['total_compra' => $total]);

            $this->crearRegistrosPago($comprar, $comprar->tipo_compra, $resultadoPagos);

            $productosConAlmacen = $this->procesarLineasProducto($comprar, $validated['productos']);

            CompraEdicion::create([
                'compra_id' => $comprar->id,
                'user_id' => $request->user()->id,
                'total_anterior' => $totalAnterior,
                'total_nuevo' => $total,
                'motivo' => $validated['nota'],
            ]);

            DB::commit();

            $comprar->load(['proveedor', 'cliente', 'pagos.cuenta', 'pagos.cliente']);

            return Inertia::render('Comprar/Show', [
                'compra' => $this->shapeCompraParaVista($comprar),
                'productos' => $productosConAlmacen,
                'success' => 'Compra editada correctamente.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return back()->withErrors(['error' => 'Error al editar la compra: '.$e->getMessage()]);
        }
    }

    /**
     * Muestra el detalle de una compra existente.
     */
    public function show(Compra $comprar)
    {
        $comprar->load(['proveedor', 'cliente', 'pagos.cuenta', 'pagos.cliente']);

        $productos = $comprar->productos()
            ->with('categoria')
            ->withPivot('cantidad', 'precio', 'almacen_id', 'es_producto_nuevo')
            ->get()
            ->map(function ($producto) {
                $almacen = $producto->pivot->almacen_id
                    ? Almacen::find($producto->pivot->almacen_id)
                    : null;

                return [
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'color_producto' => $producto->color_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'categoria' => $producto->categoria?->nombre_categoria,
                    'pivot' => [
                        'cantidad' => $producto->pivot->cantidad,
                        'precio' => $producto->pivot->precio,
                    ],
                    'almacen' => [
                        'nombre_almacen' => $almacen?->nombre_almacen ?? 'N/A',
                    ],
                    'es_producto_nuevo' => $producto->pivot->es_producto_nuevo === null
                        ? null
                        : (bool) $producto->pivot->es_producto_nuevo,
                ];
            });

        return Inertia::render('Comprar/Show', [
            'compra' => $this->shapeCompraParaVista($comprar),
            'productos' => $productos,
        ]);
    }

    /**
     * Arma el array de compra para Comprar/Show — mismo shape para store() y show() para que el
     * detalle de pago (cuentas/clientes de origen y monto de cada uno) se vea igual recién
     * registrada la compra o al navegar desde el historial. Requiere que el caller ya haya
     * cargado ['proveedor', 'cliente', 'pagos.cuenta', 'pagos.cliente'].
     */
    private function shapeCompraParaVista(Compra $compra): array
    {
        return [
            'id' => $compra->id,
            'fecha_compra' => $compra->fecha_compra,
            'total_compra' => (float) $compra->total_compra,
            'tipo_compra' => $compra->tipo_compra,
            'estado' => $compra->estado,
            'tipo_anulacion' => $compra->tipo_anulacion,
            'motivo_anulacion' => $compra->motivo_anulacion,
            'es_parcial' => $compra->es_parcial,
            'proveedor' => $compra->proveedor
                ? ['id' => $compra->proveedor->id, 'nombre_proveedor' => $compra->proveedor->nombre_proveedor]
                : null,
            'cliente' => $compra->cliente
                ? ['id' => $compra->cliente->id, 'nombre_cliente' => $compra->cliente->nombre_cliente]
                : null,
            'pagos' => $compra->pagos->map(fn ($pago) => [
                'tipo_pago' => $pago->tipo_pago,
                'monto' => (float) $pago->monto,
                'cuenta' => $pago->cuenta
                    ? ['id' => $pago->cuenta->id, 'nombre_cuenta' => $pago->cuenta->nombre_cuenta]
                    : null,
                'cliente' => $pago->cliente
                    ? ['id' => $pago->cliente->id, 'nombre_cliente' => $pago->cliente->nombre_cliente]
                    : null,
            ])->values(),
        ];
    }

    /**
     * Store a newly created cliente for use during compra process.
     *
     * @return JsonResponse
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
                'existe' => true,
            ], 200);
        }

        // Validación de datos
        $validator = Validator::make($request->all(), [
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
            'existe' => false,
        ], 201);
    }

    /**
     * Devuelve los productos asociados a un almacén.
     *
     * @param  int  $id
     * @return JsonResponse
     */
    public function getProductos($id)
    {
        $almacen = Almacen::with('productos')->find($id);

        if (! $almacen) {
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
     * @return JsonResponse
     */
    public function getAlmacenes(Request $request)
    {
        $query = Almacen::select('id', 'nombre_almacen', 'tipo_almacen');

        // Agregar búsqueda si se proporciona
        if ($request->has('search') && ! empty($request->search)) {
            $searchTerm = $request->search;
            $query->where(function ($q) use ($searchTerm) {
                $q->where('nombre_almacen', 'like', '%'.$searchTerm.'%')
                    ->orWhere('tipo_almacen', 'like', '%'.$searchTerm.'%');
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
     * @return JsonResponse
     */
    public function storeAlmacenForCompra(Request $request)
    {
        // Mismo patrón que storeClienteForCompra: si ya existe (por nombre O teléfono), devolverlo
        // directo en vez de dejar que la validación 'unique' de abajo lo rechace con un 422 crudo.
        $almacenExistente = Almacen::where('nombre_almacen', $request->nombre_almacen)
            ->orWhere('telefono_almacen', $request->telefono_almacen)
            ->first();

        if ($almacenExistente) {
            return response()->json([
                'message' => 'Almacén ya existe en el sistema. Usando almacén existente.',
                'almacen' => $almacenExistente,
                'existe' => true,
            ], 200);
        }

        // Validación de datos
        $validator = Validator::make($request->all(), [
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
            'almacen' => $almacen,
            'existe' => false,
        ], 201);
    }

    /**
     * Crea o busca un proveedor/cliente para uso durante el proceso de compra.
     *
     * @return JsonResponse
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
                    'existe' => true,
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
                'existe' => true,
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
                'existe' => false,
            ], 201);
        } else {
            // Para clientes, el teléfono es obligatorio
            $telefono = $request->telefono_cliente ?? null;
            if (empty($telefono)) {
                return response()->json([
                    'errors' => ['telefono_cliente' => 'El teléfono es requerido para clientes.'],
                ], 422);
            }

            // Verificar si ya existe con ese teléfono
            $clienteExistentePorTelefono = Cliente::where('telefono_cliente', $telefono)->first();
            if ($clienteExistentePorTelefono) {
                return response()->json([
                    'message' => 'Ya existe un cliente con ese teléfono.',
                    'data' => $clienteExistentePorTelefono,
                    'tipo' => 'cliente',
                    'existe' => true,
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
                'existe' => false,
            ], 201);
        }
    }

    /**
     * Store a newly created categoria for use during compra process.
     *
     * @return JsonResponse
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
            'categoria' => $categoria,
        ], 201);
    }
}
