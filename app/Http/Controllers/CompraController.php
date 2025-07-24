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
            // Validaciones para pago_cash
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
                // Validar que haya al menos un método de pago
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

                // Procesar pagos con clientes (préstamo financiero)
                foreach ($pagosClientes as $pagoCliente) {
                    $cliente = Cliente::findOrFail($pagoCliente['cliente_id']);

                    // Aumentar la deuda del cliente (nosotros le debemos dinero)
                    $cliente->increment('deuda_pago_cliente', $pagoCliente['monto']);
                }

                // Usar la primera cuenta como referencia principal, si existe
                if (!empty($pagos)) {
                    $compraData['cuenta_id'] = $pagos[0]['cuenta_id'];
                } else {
                    // Si solo se usan clientes, asignamos null o el primer cliente
                    $compraData['cuenta_id'] = null;
                }
            }

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
                        'cantidad_producto' => 0, // El stock se maneja en AlmacenProducto
                    ]
                );

                // Asociar producto a la compra
                $compra->productos()->attach($producto->id, [
                    'cantidad' => $item['cantidad'],
                    'precio' => $item['precio'],
                ]);

                // Actualizar inventario en almacén de forma segura
                AlmacenProducto::updateOrCreate(
                    ['almacen_id' => $almacen->id, 'producto_id' => $producto->id],
                    ['cantidad' => DB::raw("cantidad + {$item['cantidad']}")]
                );
            }

            DB::commit();

            return redirect()->route('dashboard')->with('success', 'Compra registrada correctamente');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Error al procesar la compra: ' . $e->getMessage()]);
        }
    }

    public function getProductos($id)
    {
        $almacen = Almacen::with('compras.productos')->find($id);

        if (!$almacen) {
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $productos = $almacen->compras->flatMap(fn($compra) => $compra->productos->map(fn($producto) => [
            'compra_id' => $compra->id,
            'producto_id' => $producto->id,
            'nombre_producto' => $producto->nombre_producto,
            'marca_producto' => $producto->marca_producto ?? null,
            'cantidad' => $producto->pivot->cantidad,
            'precio' => $producto->pivot->precio,
            'fecha_compra' => $compra->fecha_compra,
        ]));

        return response()->json([
            'almacen' => $almacen,
            'productos' => $productos,
        ]);
    }
}
