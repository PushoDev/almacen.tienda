<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con campos específicos.
     */
    public function index()
    {
        $user = Auth::user();

        // Base de la consulta con relaciones esenciales
        $query = Producto::with(['categoria']);

        // Filtrar y cargar almacenes según el rol
        if ($user->role === 'admin') {
            $query->with(['almacenes' => fn($q) => $q->withPivot('cantidad')]);
        } else {
            $almacenIds = $user->almacenes->pluck('id');
            $query->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $almacenIds))
                ->with(['almacenes' => fn($q) => $q->whereIn('almacens.id', $almacenIds)->withPivot('cantidad')]);
        }

        // Cargar vendedores con filtro por usuario actual
        $query->with(['vendedores' => fn($q) => $q->where('user_id', $user->id)]);

        $productos = $query->get();

        // Transformar datos para el frontend
        $productosTransformados = $productos->map(function ($producto) use ($user) {
            $vendedor = $producto->vendedores->first();

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'categoria' => optional($producto->categoria)->nombre,
                'precio_compra' => $producto->precio_compra_producto,
                'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                'precio_venta' => $vendedor?->pivot?->precio_venta,
                'ganancia' => $vendedor?->pivot?->venta_ganancia,
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
     * Actualizar precio de venta y ganancia.
     */
    public function update(Request $request, Producto $producto)
    {
        $user = Auth::user();

        // Validar que precio_venta sea opcional
        $request->validate([
            'precio_venta' => 'nullable|numeric|min:0'
        ]);

        // Calcular ganancia si hay precio_venta
        $precioVenta = $request->input('precio_venta');
        $ganancia = $precioVenta !== null
            ? $precioVenta - $producto->precio_compra_producto
            : null;

        // Actualizar pivot
        $producto->vendedores()->syncWithoutDetaching([
            $user->id => [
                'precio_venta' => $precioVenta,
                'venta_ganancia' => $ganancia,
            ]
        ]);

        return response()->json(['success' => true]);
    }
}
