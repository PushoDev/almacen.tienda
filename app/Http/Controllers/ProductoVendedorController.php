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
     * Listado de Productos disponibles por empleados (admin/vendedor)
     */
    public function index()
    {
        $user = auth()->user();

        // Lógica para ambos roles
        $productos = Producto::with([
            'categoria',
            'almacenes' => function ($q) use ($user) {
                if ($user->role !== 'admin') {
                    $q->whereIn('almacens.id', $user->almacenes()->pluck('almacens.id'));
                }
                $q->withPivot('cantidad'); // Usamos 'cantidad' (coherente con tu modelo Producto)
            },
            'vendedores' => fn($q) => $q->where('user_id', $user->id)
        ])
            ->when($user->role !== 'admin', function ($q) use ($user) {
                $q->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $user->almacenes()->pluck('almacens.id')));
            })
            ->get();

        // Estructura de respuesta API/JSON (sin Inertia)
        // return response()->json([
        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productos->map(function ($producto) use ($user) {
                $precioPersonalizado = $producto->vendedores
                    ->firstWhere('id', $user->id)?->pivot->precio_venta;

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'precio_compra' => $producto->precio_compra_producto,
                    'precio_venta' => $precioPersonalizado ?? $producto->precio_compra_producto * 1.25,
                    'stock_disponible' => $producto->almacenes->sum('pivot.cantidad'), // Key corregida a 'cantidad'
                    'categoria' => $producto->categoria->nombre ?? null,
                    'almacenes' => $producto->almacenes->map(fn($a) => [
                        'id' => $a->id,
                        'nombre' => $a->nombre_almacen,
                        'stock' => $a->pivot->cantidad
                    ]),
                    'es_precio_personalizado' => !is_null($precioPersonalizado),
                    'permisos' => [
                        'editar_precio' => $user->role === 'admin' || $user->id === $producto->vendedores->first()?->id
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
     * Store/Update: Asigna o actualiza un precio personalizado para un vendedor.
     */
    public function store(Request $request)
    {
        $request->validate([
            'producto_id' => 'required|exists:productos,id',
            'precio_venta' => 'required|numeric|min:0.01',
            'user_id' => 'sometimes|exists:users,id' // Opcional para admin
        ]);

        $userId = $request->input('user_id', auth()->id());
        $productoId = $request->producto_id;

        // Verificar permisos (solo admin puede asignar a otros)
        if ($userId !== auth()->id() && auth()->user()->role !== 'admin') {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        // Sincronizar precio (create or update)
        auth()->user()->productos()->syncWithoutDetaching([
            $productoId => [
                'precio_venta' => $request->precio_venta,
                'importe_ganancia' => $request->precio_venta - Producto::find($productoId)->precio_compra_producto
            ]
        ]);

        return response()->json([
            'success' => true,
            'precio_actualizado' => $request->precio_venta
        ]);
    }

    /**
     * Remove: Elimina un precio personalizado.
     */
    public function destroy($productoId)
    {
        $user = auth()->user();
        $producto = Producto::findOrFail($productoId);

        // Solo admin o el vendedor dueño puede eliminar
        if ($user->role !== 'admin' && !$producto->vendedores->contains($user->id)) {
            return response()->json(['error' => 'No autorizado'], 403);
        }

        $user->productos()->detach($productoId);

        return response()->json([
            'success' => true,
            'precio_revertido' => $producto->precio_compra_producto * 1.25
        ]);
    }
}
