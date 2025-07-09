<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class VentaController extends Controller
{
    /**
     * Mostrar interfaz del punto de venta
     */
    public function index()
    {
        $user = Auth::user();

        // Consulta base de productos
        $query = Producto::with(['categoria']);

        // Filtrado por rol y almacenes
        if ($user->role === 'admin') {
            $query->with(['almacenes' => fn($q) => $q->withPivot('cantidad')]);
        } else {
            $almacenIds = $user->almacenes->pluck('id');
            $query->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $almacenIds))
                ->with(['almacenes' => fn($q) => $q->whereIn('almacens.id', $almacenIds)->withPivot('cantidad')]);
        }

        // Cargar datos específicos del vendedor actual
        $query->with(['vendedores' => function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
        }]);

        // Obtener productos
        $productos = $query->get();

        // Transformar datos para el frontend
        $productosTransformados = $productos->map(function ($producto) use ($user) {
            $vendedor = $producto->vendedores->first();

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                'precio_compra' => $producto->precio_compra_producto,
                'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                'ganancia' => $vendedor?->pivot->venta_ganancia ?? null,
                'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
            ];
        });

        return Inertia::render('Vendor/Index', [
            'productos' => $productosTransformados,
            'meta' => [
                'total_productos' => $productosTransformados->count(),
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
            ],
        ]);
    }

    /**
     * Registrar una nueva venta
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'productos' => 'required|array',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_venta' => 'required|numeric|min:0.01',
            'pagos' => 'required|array',
            'pagos.*.tipo_pago' => 'required|string',
            'pagos.*.via_pago' => 'required|string',
            'pagos.*.tipo_moneda' => 'required|string',
            'pagos.*.monto' => 'required|numeric|min:0.01',
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
                'total' => round($total, 2),
            ]);

            // Registrar cada producto vendido
            foreach ($productosVendidos as $item) {
                $producto = Producto::findOrFail($item['producto_id']);
                $cantidad = $item['cantidad'];
                $precioVenta = $item['precio_venta'];
                $subtotal = round($cantidad * $precioVenta, 2);

                // Validar stock
                $stockDisponible = $producto->almacenes()
                    ->where('almacens.id', $almacenId)
                    ->first()?->pivot->cantidad ?? 0;

                if ($stockDisponible < $cantidad) {
                    throw new \Exception("Stock insuficiente para {$producto->nombre_producto}");
                }

                // Registrar detalle
                VentaDetalle::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad,
                    'precio_venta' => $precioVenta,
                    'subtotal' => $subtotal,
                ]);

                // Restar stock
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
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'venta' => $venta->load('detalles.producto', 'pagos')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
