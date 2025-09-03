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
    public function getAlmacen()
    {
        $almacenes = Almacen::select('id', 'nombre_almacen')->get();
        return response()->json($almacenes);
    }

    public function getProveedor()
    {
        $proveedores = Proveedor::select('id', 'nombre_proveedor')->get();
        return response()->json($proveedores);
    }

    public function getCategorias()
    {
        $categorias = Categoria::select('id', 'nombre_categoria')->get();
        return response()->json($categorias);
    }

    public function getClientesFisicos()
    {
        $clientes = Cliente::where('tipo_cliente', 'fisico')
            ->select('id', 'nombre_cliente', 'deuda_pago_cliente')
            ->get();
        return response()->json($clientes);
    }

    public function getCuentas()
    {
        $cuentas = Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->whereIn('tipo_moneda', ['USD', 'EUR'])
            ->select('id', 'nombre_cuenta', 'saldo_cuenta', 'tipo_moneda')
            ->get();
        return response()->json($cuentas);
    }

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
            'pagos' => 'array|nullable',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'pagos_clientes' => 'array|nullable',
            'pagos_clientes.*.cliente_id' => 'required|exists:clientes,id',
            'pagos_clientes.*.monto' => 'required|numeric|min:0.01',
        ]);

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
                'tipo_compra' => $validated['compra'],
            ];

            // Lógica según tipo de compra
            if ($validated['compra'] === 'deuda_proveedor') {
                $nombreCuenta = "Deuda - {$proveedor->nombre_proveedor}";

                $cuentaDeuda = Cuenta::firstOrCreate(
                    ['nombre_cuenta' => $nombreCuenta],
                    [
                        'tipo_cuenta' => 'deudas',
                        'saldo_cuenta' => 0,
                        'tipo_moneda' => 'USD',
                        'notas_cuenta' => "Deuda con: {$proveedor->nombre_proveedor}",
                    ]
                );

                // Aumentar la deuda de forma segura
                $cuentaDeuda->increment('saldo_cuenta', $total);
                $compraData['cuenta_id'] = $cuentaDeuda->id;
            } else if ($validated['compra'] === 'pago_cash') {
                $pagos = $validated['pagos'] ?? [];
                $pagosClientes = $validated['pagos_clientes'] ?? [];

                if (empty($pagos) && empty($pagosClientes)) {
                    throw new \Exception("Debe especificar al menos un método de pago (cuenta o cliente).");
                }

                // Calcular suma total de pagos
                $sumaPagosCuentas = collect($pagos)->sum('monto');
                $sumaPagosClientes = collect($pagosClientes)->sum('monto');
                $sumaTotalPagos = $sumaPagosCuentas + $sumaPagosClientes;

                // Validar que la suma total coincida con el total de la compra
                if (abs($sumaTotalPagos - $total) > 0.01) {
                    throw new \Exception("La suma de los pagos ({$sumaTotalPagos}) no coincide con el total de la compra ({$total}).");
                }

                // Procesar pagos con cuentas
                foreach ($pagos as $pago) {
                    $cuenta = Cuenta::findOrFail($pago['cuenta_id']);

                    if ($cuenta->saldo_cuenta < $pago['monto']) {
                        throw new \Exception("Saldo insuficiente en la cuenta: {$cuenta->nombre_cuenta}");
                    }

                    // Reducir saldo de forma segura
                    $cuenta->decrement('saldo_cuenta', $pago['monto']);
                }

                // Procesar pagos con clientes
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

            // Crear compra
            $compra = Compra::create($compraData);

            // Procesar productos
            foreach ($validated['productos'] as $item) {
                $categoria = Categoria::firstOrCreate(['nombre_categoria' => $item['categoria']]);

                // Buscar el producto por código o crear uno nuevo
                $producto = Producto::firstOrNew(['codigo_producto' => $item['codigo']]);

                // Si es un producto nuevo, establecer todos los campos necesarios
                if (!$producto->exists) {
                    $producto->fill([
                        'nombre_producto' => $item['producto'],
                        'categoria_id' => $categoria->id,
                        'precio_compra_producto' => $item['precio'],
                        'cantidad_producto' => 0, // Valor por defecto para PostgreSQL
                        'imagen_producto' => 'productos/producto-default.png',
                    ]);
                    $producto->save();
                } else {
                    // Si el producto ya existe, actualizar solo los campos necesarios
                    $producto->update([
                        'nombre_producto' => $item['producto'],
                        'categoria_id' => $categoria->id,
                        'precio_compra_producto' => $item['precio'],
                    ]);
                }

                // Asociar producto a la compra
                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                ]);

                // Actualizar inventario en almacén - Método optimizado para PostgreSQL
                $almacenProducto = AlmacenProducto::firstOrNew([
                    'almacen_id' => $almacen->id,
                    'producto_id' => $producto->id
                ]);

                $almacenProducto->cantidad = ($almacenProducto->cantidad ?? 0) + $item['cantidad'];
                $almacenProducto->save();
            }

            DB::commit();

            // Cargar las relaciones necesarias para la vista
            $compra->load(['proveedor', 'almacen', 'productos']);

            // Redirigir a la vista de compra completada
            return Inertia::render('Comprar/Show', [
                'compra' => $compra,
                'productos' => $compra->productos,
                'success' => 'Compra registrada correctamente'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Error al procesar la compra: ' . $e->getMessage()]);
        }
    }

    public function getProductos($id)
    {
        $almacen = Almacen::with(['compras.productos' => function ($query) {
            $query->select('productos.id', 'nombre_producto', 'marca_producto');
        }])->find($id);

        if (!$almacen) {
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $productos = $almacen->compras->flatMap(function ($compra) {
            return $compra->productos->map(function ($producto) use ($compra) {
                return [
                    'compra_id' => $compra->id,
                    'producto_id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto ?? null,
                    'cantidad' => $producto->pivot->cantidad,
                    'precio' => $producto->pivot->precio,
                    'fecha_compra' => $compra->fecha_compra,
                ];
            });
        });

        return response()->json([
            'almacen' => $almacen,
            'productos' => $productos,
        ]);
    }
}
