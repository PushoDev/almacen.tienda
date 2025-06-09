<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con campos específicos (nombre, marca, categoría, precios, stock, ganancia).
     */
    public function index()
    {
        $user = auth()->user();

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

        // Cargar vendedores con filtro explícito por usuario actual
        $query->with(['vendedores' => fn($q) => $q->where('user_id', $user->id)]);

        // Ejecutar consulta
        $productos = $query->get();

        // Transformar datos para el frontend (solo campos solicitados)
        $productosTransformados = $productos->map(function ($producto) use ($user) {
            // Precio personalizado del usuario actual
            $precioPersonalizado = $producto->vendedores->first()?->pivot->precio_venta;

            // Calcular precio de venta (personalizado o por defecto)
            $precioVenta = $precioPersonalizado ?? $producto->precio_compra_producto * 1.25;

            return [
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'categoria' => $producto->categoria->nombre ?? null,
                'precio_compra' => $producto->precio_compra_producto,
                'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                'precio_venta' => $precioVenta,
                'ganancia' => $precioVenta - $producto->precio_compra_producto
            ];
        });

        // Renderizar vista Inertia con datos simplificados
        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productosTransformados,
            'meta' => [
                'total_productos' => $productosTransformados->count(),
                'role_usuario' => $user->role
            ]
        ]);
    }


    /**
     * Actualizar el precio de venta de un producto para el usuario actual.
     */
    /**
     * Actualizar el precio de venta de un producto para el usuario actual.
     */
    public function update(Request $request, $id)
    {
        $user = Auth::user();

        // Validar el precio
        $request->validate([
            'precio_venta' => 'required|numeric|min:0'
        ]);

        // Buscar el producto por ID
        $producto = Producto::findOrFail($id);

        // Actualizar o crear la relación con el precio personalizado
        $producto->vendedores()->syncWithoutDetaching([
            $user->id => ['precio_venta' => $request->precio_venta]
        ]);

        return response()->json(['success' => true]);
    }
}
