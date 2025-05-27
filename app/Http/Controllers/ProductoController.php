<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ProductoController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Productos
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
                    'cantidad_producto' => $producto->cantidad_producto,
                    'imagen_url' => $producto->imagen_producto ? Storage::url($producto->imagen_producto) : null,
                ];
            }),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear un nuevo producto
     */
    public function create()
    {
        return Inertia::render('Productos/Create', [
            'categorias' => Categoria::all(), // Pasar las categorías disponibles al formulario
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validaciones
        $request->validate([
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'codigo_producto' => ['nullable', 'string', 'unique:productos,codigo_producto'],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            'cantidad_producto' => ['required', 'integer', 'min:0'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'], // Máximo 2MB
        ]);

        // Subir imagen si se proporciona
        $imagenPath = null;
        if ($request->hasFile('imagen_producto')) {
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

        // Crear el producto
        $producto = Producto::create([
            'nombre_producto' => $request->nombre_producto,
            'marca_producto' => $request->marca_producto,
            'codigo_producto' => $request->codigo_producto,
            'categoria_id' => $request->categoria_id,
            'precio_compra_producto' => $request->precio_compra_producto,
            'cantidad_producto' => $request->cantidad_producto,
            'imagen_producto' => $imagenPath,
        ]);

        // Obtener el ID del "Almacén de Conservas"
        $almacenId = \App\Models\Almacen::getDefault()->id;

        // Asociar el producto al almacén usando la nueva tabla intermedia
        \App\Models\AlmacenProducto::create([
            'almacen_id' => $almacenId,
            'producto_id' => $producto->id,
            'cantidad' => $request->cantidad_producto,
        ]);

        // Redirigir al usuario
        return redirect()->route('productos.index')->with('success', 'Producto creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Producto $producto)
    {
        return Inertia::render('Productos/Show', [
            'producto' => $producto->load('categoria'), // Cargar la relación con categoría
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Producto $producto)
    {
        return Inertia::render('Productos/Edit', [
            'producto' => $producto,
            'categorias' => Categoria::all(), // Pasar las categorías disponibles al formulario
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Producto $producto)
    {
        // Validaciones
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
            'cantidad_producto' => ['required', 'integer', 'min:0'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'], // Máximo 2MB
        ]);

        // Subir nueva imagen si se proporciona
        $imagenPath = $producto->imagen_producto; // Conservar la imagen existente
        if ($request->hasFile('imagen_producto')) {
            // Eliminar la imagen anterior si existe
            if ($producto->imagen_producto) {
                Storage::disk('public')->delete($producto->imagen_producto);
            }
            // Guardar la nueva imagen
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

        // Actualizar el producto
        $producto->update([
            'nombre_producto' => $request->nombre_producto,
            'marca_producto' => $request->marca_producto,
            'codigo_producto' => $request->codigo_producto,
            'categoria_id' => $request->categoria_id,
            'precio_compra_producto' => $request->precio_compra_producto,
            'cantidad_producto' => $request->cantidad_producto,
            'imagen_producto' => $imagenPath,
        ]);

        // Redirigir al usuario
        return redirect()->route('productos.index')->with('success', 'Producto actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Producto $producto)
    {
        // Eliminar la imagen si existe
        if ($producto->imagen_producto) {
            Storage::disk('public')->delete($producto->imagen_producto);
        }

        // Eliminar el producto
        $producto->delete();

        // Redirigir al usuario
        return redirect()->route('productos.index')->with('success', 'Producto eliminado exitosamente.');
    }
}
