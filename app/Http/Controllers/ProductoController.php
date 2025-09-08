<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Almacen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ProductoController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $productos = Producto::with('categoria')->get();

        return Inertia::render('Productos/Index', [
            'productos' => $productos->map(function ($producto) {
                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'codigo_producto' => $producto->codigo_producto,
                    'categoria' => $producto->categoria ? $producto->categoria->nombre_categoria : null,
                    'precio_compra_producto' => (float) $producto->precio_compra_producto,
                    'cantidad_producto' => $producto->almacenes->sum('pivot.cantidad'),
                    'imagen_url' => $producto->imagen_producto ? Storage::url($producto->imagen_producto) : null,
                ];
            }),
        ]);
    }



    /**
     * Display the specified resource.
     */
    public function show(Producto $producto)
    {
        $producto->load(['categoria', 'almacenes']);

        return Inertia::render('Productos/Show', [
            'producto' => $producto,
            'almacenes' => $producto->getAlmacenesConCantidad(),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Producto $producto)
    {
        return Inertia::render('Productos/Edit', [
            'producto' => $producto,
            'categorias' => Categoria::all(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Producto $producto)
    {
        $request->validate([
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

        $imagenPath = $producto->imagen_producto;
        if ($request->hasFile('imagen_producto')) {
            if ($producto->imagen_producto) {
                Storage::disk('public')->delete($producto->imagen_producto);
            }
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

        $producto->update([
            'nombre_producto' => $request->nombre_producto,
            'marca_producto' => $request->marca_producto,
            'codigo_producto' => $request->codigo_producto,
            'categoria_id' => $request->categoria_id,
            'precio_compra_producto' => $request->precio_compra_producto,
            'imagen_producto' => $imagenPath,
        ]);

        // No se actualiza la cantidad aquí

        return redirect()->route('productos.index')->with('success', 'Producto actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Producto $producto)
    {
        if ($producto->imagen_producto) {
            Storage::disk('public')->delete($producto->imagen_producto);
        }

        // Eliminar relaciones en almacen_producto
        $producto->almacenes()->detach();

        $producto->delete();

        return redirect()->route('productos.index')->with('success', 'Producto eliminado exitosamente.');
    }
}
