<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con precios de vendedor
     */
    public function index()
    {
        $user = Auth::user();

        $query = Producto::with(['categoria']);

        // Filtrado por rol y almacenes
        if ($user->role === 'admin') {
            $query->with(['almacenes' => fn($q) => $q->withPivot('cantidad')]);
        } else {
            $almacenIds = $user->almacenes->pluck('id');
            $query->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $almacenIds))
                ->with(['almacenes' => fn($q) => $q->whereIn('almacens.id', $almacenIds)->withPivot('cantidad')]);
        }

        // Carga optimizada de datos de vendedor
        $query->with(['vendedores' => function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
        }]);

        $productos = $query->get();

        // Transformación de datos
        $productosTransformados = $productos->map(function ($producto) use ($user) {
            $vendedor = $producto->vendedores->first();

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                'precio_compra' => $producto->precio_compra_producto,
                'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                'precio_venta' => $vendedor->pivot->precio_venta ?? 0.00,
                'ganancia' => $vendedor->pivot->venta_ganancia ?? 0.00,
                'tiene_precio' => ($vendedor->pivot->precio_venta ?? 0) > 0
            ];
        });

        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productosTransformados,
            'meta' => [
                'total_productos' => $productosTransformados->count(),
                'role_usuario' => $user->role
            ]
        ]);
    }

    /**
     * Actualizar precio y ganancia (Método principal)
     */
    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        // Validación reforzada
        $validated = $request->validate([
            'precio_venta' => 'required|numeric|min:0.01|decimal:0,2'
        ]);

        // Cálculo preciso de ganancia
        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);

        // Sincronización de datos en pivot
        $producto->vendedores()->syncWithoutDetaching([
            $user->id => [
                'precio_venta' => $precioVenta,
                'venta_ganancia' => $ganancia,
                'updated_at' => now()  // Actualización manual de timestamp
            ]
        ]);

        return response()->json([
            'success' => true,
            'new_profit' => $ganancia,
            'new_price' => $precioVenta
        ]);
    }

    // --- Métodos no implementados (seguridad) ---
    public function create()
    {
        abort(404, 'Recurso no disponible');
    }

    public function store(Request $request)
    {
        throw new MethodNotAllowedHttpException([], 'Método no permitido');
    }

    public function show($id)
    {
        abort(404, 'Recurso no disponible');
    }

    public function edit($id)
    {
        abort(404, 'Recurso no disponible');
    }

    public function destroy($id)
    {
        throw new MethodNotAllowedHttpException([], 'Método no permitido');
    }
}
