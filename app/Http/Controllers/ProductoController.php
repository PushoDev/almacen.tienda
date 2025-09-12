<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ProductoController extends Controller
{
    /**
     * Listado de productos
     */
    public function index()
    {
        $user = Auth::user();

        $productos = Producto::with('categoria', 'almacenes')
            ->with(['vendedores' => function ($query) use ($user) {
                $query->where('users.id', $user->id);
            }])->get();

        return Inertia::render('Productos/Index', [
            'productos' => $productos->map(fn($producto) => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_producto' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
                'precio_venta' => $producto->vendedores->first()->pivot->precio_venta ?? null,
            ]),
        ]);
    }

    /**
     * Mostrar producto
     */
    public function show(Producto $producto)
    {
        $user = Auth::user();

        $producto->load(['categoria', 'almacenes', 'vendedores' => function ($query) use ($user) {
            $query->where('users.id', $user->id)
                ->select('users.id', 'producto_vendedors.precio_venta');
        }]);

        $precioVenta = $producto->vendedores->first()->pivot->precio_venta ?? null;

        return Inertia::render('Productos/Show', [
            'producto' => $producto,
            'almacenes' => $producto->almacenes,
            'precio_venta' => $precioVenta,
        ]);
    }

    /**
     * Editar producto
     */
    public function edit(Producto $producto)
    {
        return Inertia::render('Productos/Edit', [
            'producto' => $producto->load('almacenes'),
            'categorias' => Categoria::all(),
        ]);
    }

    /**
     * Actualizar producto
     */
    public function update(Request $request, Producto $producto)
    {
        // 1. Validar la petición
        $validatedData = $request->validate([
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'codigo_producto' => [
                'nullable',
                'string',
                'unique:productos,codigo_producto,' . $producto->id,
            ],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ]);

        // 2. Manejar la imagen
        $imagenPath = $producto->imagen_producto;

        if ($request->hasFile('imagen_producto')) {
            if ($imagenPath && $imagenPath !== 'productos/producto-default.png') {
                Storage::disk('public')->delete($imagenPath);
            }
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

        // 3. Actualizar los datos del producto
        $producto->update(array_merge($validatedData, [
            'imagen_producto' => $imagenPath,
        ]));

        return redirect()->route('productos.index')->with('success', 'Producto actualizado correctamente.');
    }

    /**
     * Eliminar producto
     */
    public function destroy(Producto $producto)
    {
        if ($producto->imagen_producto && $producto->imagen_producto !== 'productos/producto-default.png') {
            Storage::disk('public')->delete($producto->imagen_producto);
        }

        $producto->almacenes()->detach();
        $producto->delete();

        return redirect()->route('productos.index')->with('success', 'Producto eliminado correctamente.');
    }
}
