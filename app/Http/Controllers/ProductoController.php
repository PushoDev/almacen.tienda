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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductoController extends Controller
{
    /**
     * Listado de productos con paginación y búsqueda
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        // Query base con relaciones
        $query = Producto::with(['categoria', 'almacenes'])
            ->with(['vendedores' => function ($query) use ($user) {
                $query->where('users.id', $user->id);
            }]);

        // Búsqueda
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre_producto', 'LIKE', "%{$search}%")
                    ->orWhere('marca_producto', 'LIKE', "%{$search}%")
                    ->orWhere('modelo_producto', 'LIKE', "%{$search}%")
                    ->orWhere('codigo_producto', 'LIKE', "%{$search}%")
                    ->orWhereHas('categoria', function ($q) use ($search) {
                        $q->where('nombre_categoria', 'LIKE', "%{$search}%");
                    });
            });
        }

        // Filtro por categoría
        if ($request->has('categoria_id') && $request->categoria_id != '') {
            $query->where('categoria_id', $request->categoria_id);
        }

        // Ordenamiento
        $sortField = $request->get('sort_field', 'nombre_producto');
        $sortDirection = $request->get('sort_direction', 'asc');

        if (in_array($sortField, ['nombre_producto', 'marca_producto', 'codigo_producto', 'precio_compra_producto'])) {
            $query->orderBy($sortField, $sortDirection);
        }

        $productos = $query->get()->map(function ($producto) {
            // ✅ FORZAR recarga de relaciones para datos ACTUALIZADOS
            $producto->load('almacenes');

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total, // ✅ Accessor del modelo (ya actualizado)
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'precio_venta' => $producto->vendedores->first()->pivot->precio_venta ?? null,
                'stock_bajo' => $producto->stock_bajo, // ✅ Accessor del modelo (ya actualizado)
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ];
        });

        // ✅ CORRECCIÓN: Filtrar stock bajo usando el accessor del modelo (ya actualizado)
        if ($request->has('stock_bajo') && $request->stock_bajo) {
            $productos = $productos->filter(fn($producto) => $producto['stock_bajo']);
        }

        $perPage = $request->get('per_page', 15);
        $currentPage = $request->get('page', 1);
        $paginatedProducts = new \Illuminate\Pagination\LengthAwarePaginator(
            $productos->forPage($currentPage, $perPage),
            $productos->count(),
            $perPage,
            $currentPage,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('Productos/Index', [
            'productos' => $paginatedProducts,
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(),
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
            'filters' => $request->only(['search', 'categoria_id', 'stock_bajo']),
            'sort' => ['field' => $sortField, 'direction' => $sortDirection],
        ]);
    }

    /**
     * Mostrar producto con detalle completo
     */
    public function show(Producto $producto)
    {
        $user = Auth::user();

        // ✅ FORZAR recarga de relaciones para datos ACTUALIZADOS
        $producto->load(['categoria', 'almacenes', 'vendedores' => function ($query) use ($user) {
            $query->where('users.id', $user->id)
                ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
        }]);

        $precioVenta = $producto->vendedores->first()->pivot->precio_venta ?? null;
        $ganancia = $producto->vendedores->first()->pivot->venta_ganancia ?? null;

        return Inertia::render('Productos/Show', [
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total, // ✅ Accessor del modelo (ya actualizado)
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'precio_venta' => $precioVenta,
                'ganancia' => $ganancia,
                'stock_bajo' => $producto->stock_bajo, // ✅ Accessor del modelo (ya actualizado)
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
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ],
        ]);
    }

    /**
     * Editar producto con datos completos
     */
    public function edit(Producto $producto)
    {
        // ✅ FORZAR recarga de relaciones
        $producto->load(['almacenes', 'categoria']);

        return Inertia::render('Productos/Edit', [
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'cantidad_total' => $producto->cantidad_total,
                'stock_bajo' => $producto->stock_bajo,
            ],
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
        ]);
    }

    /**
     * Actualizar producto con validación mejorada
     */
    public function update(Request $request, Producto $producto)
    {
        $validatedData = $request->validate([
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'modelo_producto' => ['nullable', 'string', 'max:255'],
            'capacidad_producto' => ['nullable', 'string', 'max:255'],
            'codigo_producto' => [
                'nullable',
                'string',
                'max:14',
                'unique:productos,codigo_producto,' . $producto->id,
            ],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ]);

        DB::beginTransaction();
        try {
            $imagenPath = $producto->imagen_producto;

            // Manejar imagen de producto
            if ($request->hasFile('imagen_producto')) {
                // Eliminar imagen anterior si no es la default
                if ($imagenPath && $imagenPath !== 'productos/producto-default.png') {
                    Storage::disk('public')->delete($imagenPath);
                }
                $imagenPath = $request->file('imagen_producto')->store('productos', 'public');
            }

            $updateData = array_merge($validatedData, [
                'imagen_producto' => $imagenPath,
            ]);

            $producto->update($updateData);

            DB::commit();

            return redirect()->route('productos.index')
                ->with('success', 'Producto actualizado correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->with('error', 'Error al actualizar el producto: ' . $e->getMessage());
        }
    }

    /**
     * Eliminar producto con transacción
     */
    public function destroy(Producto $producto)
    {
        DB::beginTransaction();
        try {
            // Eliminar imagen del producto si no es la default
            if ($producto->imagen_producto && $producto->imagen_producto !== 'productos/producto-default.png') {
                Storage::disk('public')->delete($producto->imagen_producto);
            }

            // Eliminar imagen del código de barras
            if ($producto->barcode_image) {
                Storage::disk('public')->delete($producto->barcode_image);
            }

            // Eliminar relaciones
            $producto->almacenes()->detach();
            $producto->vendedores()->detach();

            // Eliminar producto
            $producto->delete();

            DB::commit();

            return redirect()->route('productos.index')
                ->with('success', 'Producto eliminado correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()
                ->with('error', 'Error al eliminar el producto: ' . $e->getMessage());
        }
    }

    /**
     * Búsqueda rápida de productos para selects o autocompletado
     */
    public function search(Request $request)
    {
        $query = Producto::with('categoria');

        if ($request->has('q') && $request->q != '') {
            $search = $request->q;
            $query->where(function ($q) use ($search) {
                $q->where('nombre_producto', 'LIKE', "%{$search}%")
                    ->orWhere('marca_producto', 'LIKE', "%{$search}%")
                    ->orWhere('codigo_producto', 'LIKE', "%{$search}%");
            });
        }

        $productos = $query->limit(10)->get()->map(function ($producto) {
            // ✅ FORZAR recarga para datos actualizados
            $producto->load('almacenes');

            return [
                'id' => $producto->id,
                'nombre' => $producto->nombre_producto,
                'marca' => $producto->marca_producto,
                'codigo' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'precio_compra' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
            ];
        });

        return response()->json($productos);
    }

    /**
     * Regenerar código de barras para un producto
     */
    public function regenerarBarcode(Producto $producto)
    {
        try {
            $success = $producto->regenerarBarcodeImage();

            if ($success) {
                return response()->json([
                    'success' => true,
                    'barcode_image_url' => $producto->barcode_image_url,
                    'message' => 'Código de barras regenerado correctamente'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Error al regenerar el código de barras'
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener producto por código de barras
     */
    public function porCodigo($codigo)
    {
        $producto = Producto::porCodigo($codigo)
            ->with('categoria', 'almacenes')
            ->first();

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        // ✅ FORZAR recarga para datos actualizados
        $producto->load('almacenes');

        return response()->json([
            'success' => true,
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
            ]
        ]);
    }

    /**
     * Exportar productos a Excel
     */
    public function export(Request $request)
    {
        $almacenId = $request->get('almacen_id', 1);

        $almacen = Almacen::find($almacenId);
        if (!$almacen) {
            return redirect()->back()->withErrors(['error' => 'El almacén especificado no existe.']);
        }

        return Excel::download(
            new ProductoExport($almacenId),
            'productos-almacen-' . $almacen->nombre_almacen . '-' . date('Y-m-d') . '.xlsx'
        );
    }

    /**
     * Importar productos desde Excel
     */
    public function import(Request $request)
    {
        // Validación básica
        if (!$request->hasFile('file')) {
            return redirect()->back()->withErrors(['error' => 'No se seleccionó ningún archivo.']);
        }

        $file = $request->file('file');

        // Validar tipo de archivo
        $allowedTypes = ['xlsx', 'xls'];
        $extension = $file->getClientOriginalExtension();

        if (!in_array($extension, $allowedTypes)) {
            return redirect()->back()->withErrors(['error' => 'El archivo debe ser de tipo Excel (.xlsx o .xls).']);
        }

        $almacenId = $request->get('almacen_id', 1);

        try {
            $import = new ProductoImport($almacenId);
            Excel::import($import, $file);

            return redirect()
                ->route('productos.index')
                ->with('success', 'Productos importados correctamente. Los códigos de barras se generaron automáticamente.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors(['error' => 'Error al importar: ' . $e->getMessage()]);
        }
    }

    /**
     * Importar a un almacén específico
     */
    public function importToAlmacen(Request $request, $almacenId)
    {
        if (!$request->hasFile('file')) {
            return redirect()->back()->withErrors(['error' => 'No se seleccionó ningún archivo.']);
        }

        $file = $request->file('file');
        $extension = $file->getClientOriginalExtension();

        if (!in_array($extension, ['xlsx', 'xls'])) {
            return redirect()->back()->withErrors(['error' => 'El archivo debe ser de tipo Excel (.xlsx o .xls).']);
        }

        if (!Almacen::find($almacenId)) {
            return redirect()->back()->withErrors(['error' => 'El almacén especificado no existe.']);
        }

        try {
            $import = new ProductoImport($almacenId);
            Excel::import($import, $file);

            return redirect()
                ->route('productos.index')
                ->with('success', "Productos importados al almacén {$almacenId} correctamente. Los códigos de barras se generaron automáticamente.");
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => 'Error al importar: ' . $e->getMessage()]);
        }
    }
}
