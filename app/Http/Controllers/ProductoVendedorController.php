<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con precios de vendedor
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

        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productosTransformados,
            'meta' => [
                'total_productos' => $productosTransformados->count(),
                'role_usuario' => $user->role,
            ],
        ]);
    }

    /**
     * Actualizar precio y ganancia (Método principal)
     */
    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        // Validación de datos
        $validated = $request->validate([
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
        ]);

        // Calcular valores
        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);

        // Verificar acceso al producto (solo para vendedores)
        if ($user->role !== 'admin') {
            $almacenIds = $user->almacenes->pluck('id');
            if (!$producto->almacenes->whereIn('id', $almacenIds)->isNotEmpty()) {
                return response()->json([
                    'error' => 'No tienes acceso a este producto.',
                ], 403);
            }
        }

        // Crear o actualizar el registro pivot
        DB::table('producto_vendedors')->updateOrInsert(
            [
                'producto_id' => $productoId,
                'user_id' => $user->id,
            ],
            [
                'precio_venta' => $precioVenta,
                'venta_ganancia' => $ganancia,
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Precio actualizado correctamente',
            'new_profit' => $ganancia,
            'new_price' => $precioVenta,
        ]);
    }

    /**
     * Métodos no implementados (seguridad)
     */
    public function create()
    {
        abort(404);
    }

    public function store(Request $request)
    {
        abort(405, 'Método no permitido');
    }

    public function show($id)
    {
        abort(404);
    }

    public function edit($id)
    {
        abort(404);
    }

    public function destroy($id)
    {
        abort(405, 'Método no permitido');
    }
}
