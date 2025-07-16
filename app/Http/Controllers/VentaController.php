<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class VentaController extends Controller
{
    /**
     * Devuelve los almacenes permitidos para el usuario autenticado
     */
    public function getAlmacenes()
    {
        $user = Auth::user();

        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

        return response()->json($almacenes);
    }

    /**
     * Devuelve los productos disponibles en un almacén específico
     */
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();

        // Verificar acceso al almacén
        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $id)) {
            return response()->json(['error' => 'Acceso denegado al almacén'], 403);
        }

        // Obtener productos del almacén con categoría y precio del vendedor
        $productos = Producto::whereHas('almacenes', function ($q) use ($id) {
            $q->where('almacens.id', $id);
        })
            ->with([
                'categoria',
                'vendedores' => function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
                },
                'almacenes' => function ($q) use ($id) {
                    $q->where('almacens.id', $id)
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad as stock_disponible');
                }
            ])
            ->get()
            ->map(function ($producto) {
                $vendedor = $producto->vendedores->first();
                $almacen = $producto->almacenes->first();

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'categoria_nombre' => $producto->categoria?->nombre_categoria ?? 'Sin categoría',
                    'precio_compra_producto' => $producto->precio_compra_producto,
                    'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
                ];
            });

        return response()->json($productos);
    }

    /**
     * Mostrar interfaz del punto de venta
     */
    public function index()
    {
        $user = Auth::user();

        return Inertia::render('Vendor/Index', [
            'productos' => [], // Cargados dinámicamente desde la vista
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
            ],
            'cuentas' => Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])->get(),


        ]);
    }

    /**
     * Registrar una nueva venta con varios productos y pago
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'cliente_id' => 'nullable|exists:clientes,id',
            'detalles_venta' => 'nullable|string|max:255',

            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_venta' => 'required|numeric|min:0.01',

            'pagos' => 'required|array|min:1',
            'pagos.*.tipo_pago' => ['required', Rule::in(['efectivo', 'tarjeta', 'transferencia', 'otros'])],
            'pagos.*.via_pago' => ['required', Rule::in(['zelle', 'visa', 'paypal', 'mastercard', 'stripe', 'transfermovil', 'enzona', 'otros'])],
            'pagos.*.tipo_moneda' => ['required', Rule::in(['usd', 'euro', 'mlc', 'cup'])],
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'pagos.*.cuenta_id' => [
                'required',
                'exists:cuentas,id',
                Rule::in(Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])->pluck('id'))
            ],
        ]);

        $user = Auth::user();
        $almacenId = $validated['almacen_id'];
        $productosVendidos = collect($validated['productos']);
        $pagos = $validated['pagos'];

        // Verificar acceso al almacén
        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $almacenId)) {
            return response()->json(['error' => 'No tienes acceso a este almacén'], 403);
        }

        DB::beginTransaction();

        try {
            // Calcular total
            $total = $productosVendidos->sum(fn($p) => $p['cantidad'] * $p['precio_venta']);

            // Crear venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
                'cliente_id' => $validated['cliente_id'] ?? null,
                'total' => round($total, 2),
                'detalles_venta' => $validated['detalles_venta'] ?? null,
            ]);

            // Registrar cada producto vendido
            foreach ($productosVendidos as $item) {
                $producto = Producto::findOrFail($item['producto_id']);
                $cantidad = $item['cantidad'];
                $precioVenta = $item['precio_venta'];
                $subtotal = round($cantidad * $precioVenta, 2);

                // Validar stock disponible
                $stockDisponible = $producto->almacenes()
                    ->where('almacens.id', $almacenId)
                    ->first()?->pivot->cantidad ?? 0;

                if ($stockDisponible < $cantidad) {
                    throw new \Exception("Stock insuficiente para {$producto->nombre_producto}");
                }

                // Validar que el precio de venta sea mayor al costo
                if ($precioVenta <= $producto->precio_compra_producto) {
                    throw new \Exception("Precio de venta de '{$producto->nombre_producto}' debe ser mayor al costo");
                }

                // Registrar detalle de venta
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad,
                    'precio_venta' => $precioVenta,
                    'subtotal' => $subtotal,
                ]);

                // Actualizar stock
                $producto->almacenes()
                    ->updateExistingPivot($almacenId, [
                        'cantidad' => $stockDisponible - $cantidad
                    ]);
            }

            // Registrar pagos
            foreach ($pagos as $pago) {
                PagoVenta::create([
                    'venta_id' => $venta->id,
                    'tipo_pago' => $pago['tipo_pago'],
                    'via_pago' => $pago['via_pago'],
                    'tipo_moneda' => $pago['tipo_moneda'],
                    'monto' => $pago['monto'],
                    'cuenta_id' => $pago['cuenta_id'],
                ]);
            }

            DB::commit();

            // Devolver venta completa con relaciones cargadas
            return response()->json([
                'success' => true,
                'venta' => $venta->load(['detalles.producto', 'pagos.cuenta']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
