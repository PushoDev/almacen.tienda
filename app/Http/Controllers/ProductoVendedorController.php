<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\ProductoVendedor;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductoVendedorController extends Controller
{
    /**
     * Display a listing of the resource.
     * Lógica separada para admin vs vendedor
     */
    public function index()
    {
        $user = auth()->user();

        // Query base
        $query = Producto::with(['categoria', 'vendedores' => fn($q) => $q->where('user_id', $user->id)]);

        // Filtros por rol
        if ($user->role === 'admin') {
            $query->with(['almacenes' => fn($q) => $q->withPivot('cantidad')]);
        } else {
            $query->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $user->almacenes()->pluck('almacens.id')))
                ->with(['almacenes' => fn($q) => $q->whereIn('almacens.id', $user->almacenes()->pluck('almacens.id'))->withPivot('cantidad')]);
        }

        $productos = $query->get();

        // Estructura de respuesta
        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productos->map(function ($producto) use ($user) {
                $precioPersonalizado = $producto->vendedores->firstWhere('id', $user->id)?->pivot->precio_venta;

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'precio_compra' => $user->role === 'admin' ? $producto->precio_compra_producto : null, // Solo admin
                    'precio_venta' => $precioPersonalizado ?? $producto->precio_compra_producto * 1.25,
                    'stock_disponible' => $producto->almacenes->sum('pivot.cantidad'),
                    'categoria' => $producto->categoria->nombre ?? null,
                    'almacenes' => $producto->almacenes->map(fn($a) => [
                        'id' => $a->id,
                        'nombre' => $a->nombre_almacen,
                        'stock' => $a->pivot->cantidad
                    ]),
                    'es_precio_personalizado' => !is_null($precioPersonalizado),
                    'permisos' => [
                        'editar_precio' => $user->role === 'vendedor', // Solo vendedores
                        'ver_precio_compra' => $user->role === 'admin' // Solo admin
                    ]
                ];
            }),
            'meta' => [
                'total_productos' => $productos->count(),
                'role_usuario' => $user->role
            ]
        ]);
    }

    /**
     * Store/Update: Asigna o actualiza un precio personalizado.
     * Solo vendedor puede modificar SU precio
     */
    public function store(Request $request)
    {
        $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'precio_venta' => 'required|numeric|min:' . ($request->precio_compra ?? 0.01)
        ]);

        $user = auth()->user();
        $producto = Producto::findOrFail($request->producto_id);

        // Validación de precio mínimo para vendedor
        if ($user->role === 'vendedor' && $request->precio_venta < ($producto->precio_compra_producto * 1.10)) {
            return response()->json([
                'error' => 'El precio debe ser al menos 10% mayor al de compra'
            ], 422);
        }

        $user->productos()->syncWithoutDetaching([
            $request->producto_id => [
                'precio_venta' => $request->precio_venta,
                'importe_ganancia' => $request->precio_venta - $producto->precio_compra_producto
            ]
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Remove: Elimina un precio personalizado.
     * Solo el vendedor dueño o admin puede eliminar
     */
    public function destroy($productoId)
    {
        $user = auth()->user();
        $producto = Producto::findOrFail($productoId);

        if ($user->role !== 'admin' && !$producto->vendedores->contains($user->id)) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $user->productos()->detach($productoId);

        return response()->json([
            'success' => true,
            'nuevo_precio' => $producto->precio_compra_producto * 1.25
        ]);
    }
}
