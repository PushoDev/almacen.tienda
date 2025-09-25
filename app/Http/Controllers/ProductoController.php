<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Almacen;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use App\Exports\ProductoExport;
use App\Imports\ProductoImport;
use Maatwebsite\Excel\Facades\Excel;

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
                'cantidad_total' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
                'precio_venta' => $producto->vendedores->first()->pivot->precio_venta ?? null,
                'stock_bajo' => $producto->stock_bajo,
            ]),
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(), // ← AÑADIDO para el frontend
        ]);
    }

    /**
     * Mostrar producto con detalle por almacén
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
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
                'precio_venta' => $precioVenta,
                'stock_bajo' => $producto->stock_bajo,
                'almacenes' => $producto->almacenes->map(fn($almacen) => [
                    'id' => $almacen->id,
                    'nombre_almacen' => $almacen->nombre_almacen,
                    'ciudad_almacen' => $almacen->ciudad_almacen,
                    'provincia_almacen' => $almacen->provincia_almacen,
                    'telefono_almacen' => $almacen->telefono_almacen,
                    'correo_almacen' => $almacen->correo_almacen,
                    'cantidad' => $almacen->pivot->cantidad,
                    'stock_bajo' => $almacen->pivot->cantidad < 3,
                ]),
            ],
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

        $imagenPath = $producto->imagen_producto;

        if ($request->hasFile('imagen_producto')) {
            if ($imagenPath && $imagenPath !== 'productos/producto-default.png') {
                Storage::disk('public')->delete($imagenPath);
            }
            $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
        }

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

    /**
     * Exportar productos a Excel
     */
    public function export(Request $request)
    {
        $almacenId = $request->get('almacen_id', 1);

        // Validar que el almacén exista
        if (!Almacen::find($almacenId)) {
            return redirect()->back()->withErrors(['error' => 'El almacén especificado no existe.']);
        }

        return Excel::download(
            new ProductoExport($almacenId),
            'productos-almacen-' . $almacenId . '-' . date('Y-m-d') . '.xlsx'
        );
    }

    /**
     * Importar productos desde Excel y asignar al almacén
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls|max:2048',
            'almacen_id' => 'sometimes|integer|exists:almacens,id'
        ]);

        $almacenId = $request->get('almacen_id', 1);

        try {
            $import = new ProductoImport($almacenId);
            Excel::import($import, $request->file('file'));

            return redirect()
                ->route('productos.index')
                ->with('success', 'Productos importados y asignados al almacén correctamente');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Error al importar: ' . $e->getMessage()]);
        }
    }

    /**
     * Importar a un almacén específico (ruta con parámetro)
     */
    public function importToAlmacen(Request $request, $almacenId)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls|max:2048'
        ]);

        // Validar que el almacén exista
        if (!Almacen::find($almacenId)) {
            return redirect()->back()->withErrors(['error' => 'El almacén especificado no existe.']);
        }

        try {
            $import = new ProductoImport($almacenId);
            Excel::import($import, $request->file('file'));

            return redirect()
                ->route('productos.index')
                ->with('success', "Productos importados al almacén {$almacenId} correctamente");
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Error al importar: ' . $e->getMessage()]);
        }
    }

    /**
     * Descargar plantilla para importación (OPCIONAL - descomenta si la necesitas)
     */
    /*
    public function downloadTemplate()
    {
        $template = [
            [
                'nombre_producto',
                'marca',
                'codigo',
                'categoria',
                'precio_compra',
                'cantidad',
                'imagen'
            ],
            [
                'Laptop HP',
                'HP',
                'LP-HP001',
                'Tecnología',
                '1500.00',
                '10',
                ''
            ],
            [
                'Mouse Inalámbrico',
                'Logitech',
                'M-LOG001',
                'Accesorios',
                '25.50',
                '5',
                ''
            ]
        ];

        return Excel::download(
            new \App\Exports\TemplateExport($template),
            'plantilla-importacion-productos.xlsx'
        );
    }
    */
}
