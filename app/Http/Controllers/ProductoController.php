<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Almacen;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
// NOTE: Removed automatic migration/seed calls for safety in production
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

        // No ejecutar migraciones/seed automáticamente desde la petición.

        // Query base con relaciones
        $query = Producto::with(['categoria', 'almacenes']);

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

        // Filtro por almacén
        if ($request->has('almacen_id') && $request->almacen_id != '') {
            $almacenId = $request->almacen_id;
            $query->whereHas('almacenes', function ($q) use ($almacenId) {
                $q->where('almacen_id', $almacenId);
            });
        }

        // Ordenamiento
        $sortField = $request->get('sort_field', 'nombre_producto');
        $sortDirection = $request->get('sort_direction', 'asc');

        if (in_array($sortField, ['nombre_producto', 'marca_producto', 'codigo_producto', 'precio_compra_producto', 'cantidad_total'])) {
            // El ordenamiento por cantidad_total requiere una lógica especial si no es una columna directa
            if ($sortField === 'cantidad_total') {
                // Asumiendo que `cantidad_total` es un accesor, necesitamos ordenar por la columna real o una subconsulta
                // Por simplicidad aquí, si `cantidad_total` no es una columna real, este orden no funcionará como se espera sin SQL más complejo.
                // Si es una columna en la tabla `productos`, está bien.
                $query->orderBy('cantidad_total', $sortDirection);
            } else {
                $query->orderBy($sortField, $sortDirection);
            }
        }

        // Filtrar por stock bajo
        if ($request->has('stock_bajo') && $request->stock_bajo) {
            // Obtener todos los productos y filtrar por stock bajo usando el scope
            $productosStockBajo = Producto::with(['categoria', 'almacenes'])->stockBajo();

            // Convertir a query builder para mantener compatibilidad con paginación
            $ids = $productosStockBajo->pluck('id')->toArray();
            $query->whereIn('id', $ids);
        }

        // Paginación
        $perPage = $request->get('per_page', 15);
        $paginatedProducts = $query->paginate($perPage)->withQueryString();

        // Transformar los datos para la vista después de paginar
        $paginatedProducts->getCollection()->transform(function ($producto) {
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
                'cantidad_total' => $producto->cantidad_total,
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'stock_bajo' => $producto->stock_bajo,
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ];
        });

        $canViewStockStats = in_array($user->role, ['admin', 'moderador']);

        return Inertia::render('Productos/Index', [
            'productos' => $paginatedProducts,
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(),
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
            'filters' => $request->only(['search', 'categoria_id', 'almacen_id', 'stock_bajo']),
            'sort' => ['field' => $sortField, 'direction' => $sortDirection],
            'canViewStockStats' => $canViewStockStats,
        ]);
    }



    /**
     * Mostrar producto con detalle completo
     */
    public function show(Producto $producto)
    {
        $user = Auth::user();

        // ✅ FORZAR recarga de relaciones para datos ACTUALIZADOS
        $producto->load(['categoria', 'almacenes']);

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
                'activo' => (bool) $producto->activo,
                'descripcion_producto' => $producto->descripcion_producto,
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
            'activo' => ['nullable', 'boolean'],
            'descripcion_producto' => ['nullable', 'string'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ]);

        DB::beginTransaction();
        try {
            $imagenPath = $producto->imagen_producto;

            // Manejar imagen de producto
            if ($request->hasFile('imagen_producto')) {
                // Eliminar imagen anterior si no es la default
                if ($imagenPath && $imagenPath !== 'productos/producto-default.png' && file_exists(public_path($imagenPath))) {
                    unlink(public_path($imagenPath));
                }

                $filename = time() . '_' . $request->file('imagen_producto')->getClientOriginalName();
                $request->file('imagen_producto')->move(public_path('productos'), $filename);
                $imagenPath = 'productos/' . $filename;
            }

            $updateData = array_merge($validatedData, [
                'imagen_producto' => $imagenPath,
            ]);

            // ✅ Restringir campos de ecommerce solo a admin/moderador
            $user = Auth::user();
            if ($user->role !== 'admin' && $user->role !== 'moderador') {
                unset($updateData['activo']);
                unset($updateData['descripcion_producto']);
            }

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
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }

        DB::beginTransaction();
        try {
            // Eliminar imagen del producto si no es la default
            // Eliminar imagen del producto si no es la default
            if ($producto->imagen_producto && $producto->imagen_producto !== 'productos/producto-default.png' && file_exists(public_path($producto->imagen_producto))) {
                unlink(public_path($producto->imagen_producto));
            }

            // Eliminar imagen del código de barras
            $producto->eliminarBarcodeImage();

            // Eliminar relaciones
            $producto->almacenes()->detach();

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
     * Exportar productos a Excel filtrando por almacén
     */
    public function export(Request $request)
    {
        try {
            $almacenId = $request->get('almacen_id', 1);

            // Validar que el almacén existe
            $almacen = Almacen::find($almacenId);
            if (!$almacen) {
                return redirect()->back()->withErrors(['error' => 'El almacén especificado no existe.']);
            }

            // Validar que el almacén tiene productos
            $productosCount = Producto::whereHas('almacenes', function ($query) use ($almacenId) {
                $query->where('almacen_id', $almacenId);
            })->count();

            if ($productosCount === 0) {
                return redirect()->back()->withErrors(['error' => 'Este almacén no tiene productos para exportar.']);
            }

            // Generar nombre del archivo
            $nombreArchivo = 'productos-' . Str::slug($almacen->nombre_almacen) . '-' . date('Y-m-d-His') . '.xlsx';

            return Excel::download(
                new ProductoExport($almacenId),
                $nombreArchivo
            );
        } catch (\Exception $e) {
            Log::error('Error al exportar productos: ' . $e->getMessage());
            return redirect()->back()->withErrors(['error' => 'Error al exportar: ' . $e->getMessage()]);
        }
    }

    /**
     * Importar productos desde Excel a un almacén específico
     */
    public function import(Request $request)
    {
        // Validación de archivo
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:5120',
            'almacen_id' => 'required|integer|exists:almacens,id'
        ], [
            'file.required' => 'Debes seleccionar un archivo para importar',
            'file.file' => 'El archivo debe ser un archivo válido',
            'file.mimes' => 'El archivo debe ser de tipo Excel (.xlsx o .xls)',
            'file.max' => 'El archivo no debe superar 5MB',
            'almacen_id.required' => 'Debes seleccionar un almacén',
            'almacen_id.exists' => 'El almacén seleccionado no existe',
        ]);

        DB::beginTransaction();
        try {
            $file = $request->file('file');
            $almacenId = $request->get('almacen_id');

            // Validar que el almacén existe
            $almacen = Almacen::find($almacenId);
            if (!$almacen) {
                throw new \Exception('El almacén especificado no existe.');
            }

            // Crear la instancia del importador
            $import = new ProductoImport($almacenId);
            Excel::import($import, $file);

            DB::commit();

            // Obtener estadísticas
            $stats = $import->getEstadisticas();

            $mensaje = "✓ Importación completada correctamente.\n";
            $mensaje .= "• Productos creados: {$stats['productos_creados']}\n";
            $mensaje .= "• Productos actualizados: {$stats['productos_actualizados']}\n";
            $mensaje .= "• Total procesado: {$stats['filas_procesadas']}\n";
            if ($stats['filas_omitidas'] > 0) {
                $mensaje .= "⚠ Filas omitidas: {$stats['filas_omitidas']}";
            }

            Log::info("Importación exitosa en almacén {$almacen->nombre_almacen}", $stats);

            return redirect()
                ->route('productos.index')
                ->with('success', $mensaje);
        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            return redirect()->back()
                ->withErrors($e->errors())
                ->withInput();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al importar productos: ' . $e->getMessage(), [
                'almacen_id' => $request->get('almacen_id'),
                'archivo' => $request->file('file')?->getClientOriginalName(),
            ]);

            return redirect()
                ->back()
                ->withErrors(['error' => 'Error al importar productos: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Importar a un almacén específico (ruta alternativa)
     */
    public function importToAlmacen(Request $request, $almacenId)
    {
        // Redirigir a import con el almacén en el request
        $request->merge(['almacen_id' => $almacenId]);
        return $this->import($request);
    }
}
