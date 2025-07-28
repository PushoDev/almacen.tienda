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

    private function stockProductos()
    {
        return DB::table('almacen_producto')
            ->where('producto_id')->sum('cantidad');
    }
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
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Productos/Create', [
            'categorias' => Categoria::all(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'codigo_producto' => ['nullable', 'string', 'unique:productos,codigo_producto'],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            'cantidad_producto' => ['required', 'integer', 'min:0'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ]);

        $imagenPath = null;
        if ($request->hasFile('imagen_producto')) {
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

        $producto = Producto::create([
            'nombre_producto' => $request->nombre_producto,
            'marca_producto' => $request->marca_producto,
            'codigo_producto' => $request->codigo_producto,
            'categoria_id' => $request->categoria_id,
            'precio_compra_producto' => $request->precio_compra_producto,
            'cantidad_producto' => $request->cantidad_producto,
            'imagen_producto' => $imagenPath,
        ]);

        // Obtener o crear el almacén por defecto
        $almacen = Almacen::where('nombre_almacen', 'Almacén de Conservas')->first();
        if (!$almacen) {
            $almacen = Almacen::create([
                'nombre_almacen' => 'Almacén de Conservas',
                'telefono_almacen' => 'N/A',
                'correo_almacen' => 'almacen@default.com',
                'provincia_almacen' => 'Default',
                'ciudad_almacen' => 'Default',
            ]);
        }

        // Asociar el producto al almacén
        $almacen->productos()->attach($producto->id, [
            'cantidad' => $request->cantidad_producto,
        ]);

        return redirect()->route('productos.index')->with('success', 'Producto creado exitosamente.');
    }

    /**
     * Display the specified resource.
     * Detalle del Producto
     */
    public function show(Producto $producto)
    {
        // Cargar relaciones de categorias y almacenes
        $producto->load(['categoria', 'almacenes']);

        // Verificar si hay almacenes asociados
        $almacenes = $producto->getAlmacenesConCantidad();
        if ($almacenes->isEmpty()) {
            $almacenes = collect([[
                'id' => null,
                'nombre_almacen' => 'Sin almacén asociado',
                'pivot' => [
                    'cantidad' => 0,
                ],
            ]]);
        }

        return Inertia::render('Productos/Show', [
            'producto' => $producto,
            'almacenes' => $almacenes,
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
            'cantidad_producto' => ['required', 'integer', 'min:0'],
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
            'cantidad_producto' => $request->cantidad_producto,
            'imagen_producto' => $imagenPath,
        ]);

        // Actualizar cantidad en almacen_producto
        $almacen = Almacen::getDefault();
        $almacen->productos()->updateExistingPivot($producto->id, [
            'cantidad' => $request->cantidad_producto,
        ]);

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
