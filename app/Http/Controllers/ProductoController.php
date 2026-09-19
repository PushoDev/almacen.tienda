<?php

namespace App\Http\Controllers;

use App\Exports\PlantillaProductoExport;
use App\Exports\ProductoExport;
use App\Imports\ProductoImport;
use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\HistorialPrecioCosto;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
// NOTE: Removed automatic migration/seed calls for safety in production
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

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
                $q->buscar($search)
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
                'color_producto' => $producto->color_producto,
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
        $canViewSensitiveData = in_array($user->role, ['admin', 'moderador']);

        // Valor total del inventario global (todos los productos, sin filtros)
        $totalImporteGlobal = DB::table('almacen_producto')
            ->join('productos', 'productos.id', '=', 'almacen_producto.producto_id')
            ->sum(DB::raw('productos.precio_compra_producto * almacen_producto.cantidad'));

        return Inertia::render('Productos/Index', [
            'productos' => $paginatedProducts,
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(),
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
            'filters' => $request->only(['search', 'categoria_id', 'almacen_id', 'stock_bajo']),
            'sort' => ['field' => $sortField, 'direction' => $sortDirection],
            'canViewStockStats' => $canViewStockStats,
            'canViewSensitiveData' => $canViewSensitiveData,
            'total_importe_global' => (float) $totalImporteGlobal,
        ]);
    }

    /**
     * Mostrar producto con detalle completo
     */
    public function show(Producto $producto)
    {
        $user = Auth::user();

        // ✅ FORZAR recarga de relaciones para datos ACTUALIZADOS
        $producto->load(['categoria', 'almacenes', 'codigos']);

        foreach ($producto->codigos as $codigo) {
            if (! $codigo->imagen_barcode) {
                try {
                    $imagen = ProductoCodigo::generarImagenBarcode($codigo->codigo_barras);
                    $codigo->update(['imagen_barcode' => $imagen]);
                } catch (\Exception $e) {
                    logger()->warning('No se pudo generar barcode para '.$codigo->codigo_barras.': '.$e->getMessage());
                }
            }
        }

        // Precio de venta por almacén (producto_vendedors, clave real producto_id+almacen_id
        // pese al nombre de la tabla) — igual que el costo, no es un solo valor por producto.
        $preciosVenta = DB::table('producto_vendedors')
            ->where('producto_id', $producto->id)
            ->pluck('precio_venta', 'almacen_id');

        return Inertia::render('Productos/Show', [
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'color_producto' => $producto->color_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'cantidad_total' => $producto->cantidad_total, // ✅ Accessor del modelo (ya actualizado)
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'stock_bajo' => $producto->stock_bajo,
                'codigos' => $producto->codigos->map(fn ($codigo) => [
                    'id' => $codigo->id,
                    'codigo_barras' => $codigo->codigo_barras,
                    'cantidad' => $codigo->cantidad,
                    'es_default' => $codigo->es_default,
                    'imagen_barcode' => $codigo->imagen_barcode ? asset($codigo->imagen_barcode) : null,
                ]),
                'almacenes' => $producto->almacenes->map(fn ($almacen) => [
                    'id' => $almacen->id,
                    'nombre_almacen' => $almacen->nombre_almacen,
                    'ciudad_almacen' => $almacen->ciudad_almacen,
                    'provincia_almacen' => $almacen->provincia_almacen,
                    'telefono_almacen' => $almacen->telefono_almacen,
                    'correo_almacen' => $almacen->correo_almacen,
                    'cantidad' => $almacen->pivot->cantidad,
                    'stock_bajo' => $almacen->pivot->cantidad < 3,
                    // Costo real en ESTE almacén (promedio ponderado de lotes_stock) — puede
                    // diferir del costo global de la ficha si un traslado hacia acá se
                    // prorrateó de forma independiente. Ver Producto::costoEnAlmacen().
                    'costo' => $producto->costoEnAlmacen($almacen->id),
                    'precio_venta' => isset($preciosVenta[$almacen->id]) ? (float) $preciosVenta[$almacen->id] : null,
                ]),
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ],
            'fichas_hermanas' => $this->fichasHermanas($producto),
        ]);
    }

    /**
     * Otras fichas de Producto con la misma identidad descriptiva (nombre+marca+modelo+
     * capacidad+categoría) pero costo distinto — desde el 2026-09-18 cada compra crea siempre
     * una ficha nueva (ver CompraController::procesarLineasProducto()), así que "el mismo
     * artículo" comprado más de una vez a precios distintos queda repartido en varias fichas.
     * Mostrarlas juntas es lo que evita que el catálogo dé la impresión de un solo costo
     * cuando en realidad varía por lote/compra.
     *
     * @return array<int, array<string, mixed>>
     */
    private function fichasHermanas(Producto $producto): array
    {
        return Producto::where('id', '!=', $producto->id)
            ->where('nombre_producto', $producto->nombre_producto)
            ->where('categoria_id', $producto->categoria_id)
            ->where('marca_producto', $producto->marca_producto)
            ->where('modelo_producto', $producto->modelo_producto)
            ->where('capacidad_producto', $producto->capacidad_producto)
            ->with('almacenes')
            ->get()
            ->map(fn (Producto $hermana) => [
                'id' => $hermana->id,
                'codigo_producto' => $hermana->codigo_producto,
                'precio_compra_producto' => (float) $hermana->precio_compra_producto,
                'cantidad_total' => $hermana->cantidad_total,
                'almacenes' => $hermana->almacenes->map(fn ($almacen) => [
                    'id' => $almacen->id,
                    'nombre_almacen' => $almacen->nombre_almacen,
                    'cantidad' => $almacen->pivot->cantidad,
                ])->filter(fn ($a) => $a['cantidad'] > 0)->values(),
            ])
            ->sortBy('precio_compra_producto')
            ->values()
            ->all();
    }

    /**
     * Editar producto con datos completos
     */
    public function edit(Producto $producto)
    {
        // ✅ FORZAR recarga de relaciones
        $producto->load(['almacenes', 'categoria', 'codigos']);

        // Precio de venta ya asignado por almacén (producto_vendedors, clave real
        // producto_id+almacen_id pese al nombre de la tabla) — solo para mostrarlo junto al
        // costo; asignarlo/editarlo sigue siendo trabajo de /disponibles, no de esta pantalla.
        $preciosVenta = DB::table('producto_vendedors')
            ->where('producto_id', $producto->id)
            ->pluck('precio_venta', 'almacen_id');

        return Inertia::render('Productos/Edit', [
            'producto' => [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'color_producto' => $producto->color_producto,
                'codigo_producto' => $producto->codigo_producto,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => (float) $producto->precio_compra_producto,
                'activo' => (bool) $producto->activo,
                'descripcion_producto' => $producto->descripcion_producto,
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'cantidad_total' => $producto->cantidad_total,
                'stock_bajo' => $producto->stock_bajo,
                'codigos' => $producto->codigos->map(fn ($codigo) => [
                    'id' => $codigo->id,
                    'codigo_barras' => $codigo->codigo_barras,
                    'cantidad' => $codigo->cantidad,
                    'es_default' => $codigo->es_default,
                    'imagen_barcode' => $codigo->imagen_barcode ? asset($codigo->imagen_barcode) : null,
                ]),
                // Costo real por almacén (ver Producto::costoEnAlmacen()) — permite corregir el
                // precio de costo acotado a un solo almacén en vez del campo global de la ficha.
                'almacenes' => $producto->almacenes->map(fn ($almacen) => [
                    'id' => $almacen->id,
                    'nombre_almacen' => $almacen->nombre_almacen,
                    'ciudad_almacen' => $almacen->ciudad_almacen,
                    'provincia_almacen' => $almacen->provincia_almacen,
                    'cantidad' => $almacen->pivot->cantidad,
                    'stock_bajo' => $almacen->pivot->cantidad < 3,
                    'costo' => $producto->costoEnAlmacen($almacen->id),
                    'precio_venta' => isset($preciosVenta[$almacen->id]) ? (float) $preciosVenta[$almacen->id] : null,
                ]),
            ],
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
            'fichas_hermanas' => $this->fichasHermanas($producto),
        ]);
    }

    /**
     * Actualizar producto con validación mejorada
     */
    public function update(Request $request, Producto $producto)
    {
        // Inertia manda '' (nunca ausente) cuando el producto no tiene almacenes que elegir —
        // 'nullable' de Laravel solo perdona null real, no string vacío.
        $request->merge(['almacen_id' => $request->input('almacen_id') ?: null]);

        $validatedData = $request->validate([
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'modelo_producto' => ['nullable', 'string', 'max:255'],
            'capacidad_producto' => ['nullable', 'string', 'max:255'],
            'color_producto' => ['nullable', 'string', 'max:100'],
            'codigo_producto' => [
                'nullable',
                'string',
                'max:14',
                'unique:productos,codigo_producto,'.$producto->id,
            ],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            // Almacén a corregir cuando el nuevo costo debe acotarse a uno solo (ver
            // corregirCostoEnAlmacen()) — nulo cuando el producto no tiene ningún almacén todavía
            // y el campo global de la ficha sigue siendo la única fuente de costo posible.
            'almacen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'activo' => ['nullable', 'boolean'],
            'descripcion_producto' => ['nullable', 'string'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'password_confirmacion' => ['nullable', 'string'],
            'motivo_cambio_costo' => ['nullable', 'string', 'max:500'],
        ]);

        $user = Auth::user();

        $almacenId = isset($validatedData['almacen_id']) ? (int) $validatedData['almacen_id'] : null;

        if ($almacenId !== null && ! $producto->almacenes()->where('almacens.id', $almacenId)->exists()) {
            return redirect()->back()
                ->with('error', 'Ese almacén no corresponde a este producto.')
                ->withInput();
        }

        $precioCostoAnterior = $almacenId !== null
            ? $producto->costoEnAlmacen($almacenId)
            : (float) $producto->precio_compra_producto;
        $precioCostoNuevo = (float) $validatedData['precio_compra_producto'];
        $precioCostoChanged = abs($precioCostoAnterior - $precioCostoNuevo) > 0.0001;

        if ($precioCostoChanged) {
            if ($user->role !== 'admin') {
                return redirect()->back()
                    ->with('error', 'No tiene permisos para modificar el precio de costo.');
            }

            $password = $validatedData['password_confirmacion'] ?? '';
            if (empty($password) || ! Hash::check($password, $user->password)) {
                return redirect()->back()
                    ->withErrors(['password_confirmacion' => 'Contraseña incorrecta. El precio de costo no fue actualizado.'])
                    ->withInput();
            }
        }

        DB::beginTransaction();
        try {
            $imagenPath = $producto->imagen_producto;

            // Manejar imagen de producto
            if ($request->hasFile('imagen_producto')) {
                // Eliminar imagen anterior si no es la default
                if ($imagenPath && $imagenPath !== 'productos/producto-default.png' && file_exists(public_path($imagenPath))) {
                    unlink(public_path($imagenPath));
                }

                $filename = time().'_'.$request->file('imagen_producto')->getClientOriginalName();
                $request->file('imagen_producto')->move(public_path('productos'), $filename);
                $imagenPath = 'productos/'.$filename;
            }

            $stockMomento = $almacenId !== null
                ? (int) (AlmacenProducto::where('producto_id', $producto->id)->where('almacen_id', $almacenId)->value('cantidad') ?? 0)
                : $producto->cantidad_total;

            $updateData = $validatedData;
            unset($updateData['password_confirmacion']);
            unset($updateData['motivo_cambio_costo']);
            unset($updateData['almacen_id']);
            $updateData['imagen_producto'] = $imagenPath;

            // Corrección acotada a un almacén: el costo se corrige en lotes_stock (ver abajo),
            // el campo global de la ficha no se toca — los demás almacenes quedan intactos.
            if ($almacenId !== null) {
                unset($updateData['precio_compra_producto']);
            }

            // Restringir campos de ecommerce solo a admin/moderador
            if (! in_array($user->role, ['admin', 'moderador'])) {
                unset($updateData['activo']);
                unset($updateData['descripcion_producto']);
            }

            $producto->update($updateData);

            if ($precioCostoChanged && $almacenId !== null) {
                $this->corregirCostoEnAlmacen($producto, $almacenId, $precioCostoNuevo);
            }

            // Mismo patrón que DistribucionCostosController: la ganancia guardada en
            // producto_vendedors (precio_venta - costo) queda vieja si no se recalcula aquí.
            if ($precioCostoChanged) {
                app(ProductoVendedorController::class)->actualizarGananciaPorCambioCosto($producto->id, $almacenId);
            }

            if ($precioCostoChanged) {
                $diferencia = $precioCostoNuevo - $precioCostoAnterior;
                $impactoFinanciero = $diferencia * $stockMomento;

                HistorialPrecioCosto::create([
                    'producto_id' => $producto->id,
                    'almacen_id' => $almacenId,
                    'user_id' => $user->id,
                    'precio_anterior' => $precioCostoAnterior,
                    'precio_nuevo' => $precioCostoNuevo,
                    'diferencia' => $diferencia,
                    'stock_momento' => $stockMomento,
                    'impacto_financiero' => $impactoFinanciero,
                    'es_perdida' => $impactoFinanciero < 0,
                    'motivo' => $validatedData['motivo_cambio_costo'] ?? null,
                ]);
            }

            DB::commit();

            // Corrección de costo por almacén (desde una card en Edit): se queda en la misma
            // ficha para ver el resto de los almacenes, no vuelve al listado como el guardado
            // completo del formulario principal.
            if ($almacenId !== null) {
                return redirect()->route('productos.edit', $producto)
                    ->with('success', 'Costo actualizado correctamente.');
            }

            return redirect()->route('productos.index')
                ->with('success', 'Producto actualizado correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()
                ->with('error', 'Error al actualizar el producto: '.$e->getMessage());
        }
    }

    /**
     * Corrige el costo real de un producto en UN almacén puntual, sin tocar el campo global de
     * la ficha ni los demás almacenes. Sobrescribe el `precio_costo` de todos los lotes ya
     * registrados ahí (sin ponderar contra el valor viejo — el admin está corrigiendo, no
     * promediando). Si el almacén todavía no tiene ningún lote, se crea uno de ajuste manual
     * (sin compra ni movimiento de origen) con la cantidad actual, para que
     * Producto::costoEnAlmacen() deje de caer al fallback global.
     */
    private function corregirCostoEnAlmacen(Producto $producto, int $almacenId, float $nuevoCosto): void
    {
        $lotesActualizados = LoteStock::where('producto_id', $producto->id)
            ->where('almacen_id', $almacenId)
            ->update(['precio_costo' => $nuevoCosto]);

        if ($lotesActualizados > 0) {
            return;
        }

        $cantidadActual = (int) (AlmacenProducto::where('producto_id', $producto->id)
            ->where('almacen_id', $almacenId)
            ->value('cantidad') ?? 0);

        LoteStock::create([
            'codigo' => LoteStock::generarCodigoAjuste($producto->id, $almacenId),
            'compra_producto_id' => null,
            'movimiento_id' => null,
            'producto_id' => $producto->id,
            'almacen_id' => $almacenId,
            'cantidad' => max($cantidadActual, 0),
            'precio_costo' => $nuevoCosto,
        ]);
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
                ->with('error', 'Error al eliminar el producto: '.$e->getMessage());
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
            $query->buscar($search);
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
     * Transferir cantidad entre códigos de barras o crear nuevo escaneado
     */
    public function transferirCodigo(Request $request, Producto $producto)
    {
        $request->validate([
            'codigo_origen_id' => 'required|exists:producto_codigos,id',
            'nuevo_codigo' => 'required|string|max:255',
            'cantidad' => 'required|integer|min:1',
        ]);

        $codigoOrigen = ProductoCodigo::where('producto_id', $producto->id)
            ->where('id', $request->codigo_origen_id)
            ->firstOrFail();

        if ($codigoOrigen->cantidad < $request->cantidad) {
            return redirect()->back()->withErrors(['cantidad' => 'La cantidad a transferir es mayor a la disponible en el código de origen.']);
        }

        DB::beginTransaction();
        try {
            // Descontar del origen
            $codigoOrigen->decrement('cantidad', $request->cantidad);

            // Buscar o crear el nuevo código
            $nuevoCodigo = ProductoCodigo::firstOrNew([
                'producto_id' => $producto->id,
                'codigo_barras' => $request->nuevo_codigo,
            ]);

            // Asignar cantidad y asegurar que no es el default (solo el generado inicialmente es default)
            $nuevoCodigo->cantidad = ($nuevoCodigo->cantidad ?? 0) + $request->cantidad;
            if (! $nuevoCodigo->exists) {
                $nuevoCodigo->es_default = false;
            }
            $nuevoCodigo->save();

            DB::commit();

            return redirect()->back()->with('success', 'Código de barras asignado y cantidad transferida correctamente.');
        } catch (\Exception $e) {
            DB::rollBack();

            return redirect()->back()->withErrors(['error' => 'Error al transferir cantidad: '.$e->getMessage()]);
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

        if (! $producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado',
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
            ],
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
            if (! $almacen) {
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
            $nombreArchivo = 'productos-'.Str::slug($almacen->nombre_almacen).'-'.date('Y-m-d-His').'.xlsx';

            return Excel::download(
                new ProductoExport($almacenId),
                $nombreArchivo
            );
        } catch (\Exception $e) {
            Log::error('Error al exportar productos: '.$e->getMessage());

            return redirect()->back()->withErrors(['error' => 'Error al exportar: '.$e->getMessage()]);
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
            'almacen_id' => 'required|integer|exists:almacens,id',
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
            if (! $almacen) {
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
        } catch (ValidationException $e) {
            DB::rollBack();

            return redirect()->back()
                ->withErrors($e->errors())
                ->withInput();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al importar productos: '.$e->getMessage(), [
                'almacen_id' => $request->get('almacen_id'),
                'archivo' => $request->file('file')?->getClientOriginalName(),
            ]);

            return redirect()
                ->back()
                ->withErrors(['error' => 'Error al importar productos: '.$e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Descarga la plantilla Excel para importar productos
     */
    public function downloadTemplate()
    {
        return Excel::download(new PlantillaProductoExport, 'plantilla-importacion-productos.xlsx', \Maatwebsite\Excel\Excel::XLSX);
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

    /**
     * Detectar productos duplicados agrupados por nombre, marca, modelo
     */
    public function duplicados()
    {
        $duplicados = Producto::selectRaw("
            COUNT(*) as total,
            GROUP_CONCAT(id ORDER BY id) as ids,
            nombre_producto,
            marca_producto,
            modelo_producto,
            TRIM(REPLACE(REPLACE(REPLACE(capacidad_producto, UNHEX('C2B4'), ''), UNHEX('C2A8'), ''), '\"', '')) as capacidad_limpia,
            color_producto
        ")
            ->whereNotNull('nombre_producto')
            ->groupBy('nombre_producto', 'marca_producto', 'modelo_producto', 'capacidad_limpia', 'color_producto')
            ->having('total', '>', 1)
            ->get();

        $grupos = $duplicados->map(function ($grupo) {
            $ids = explode(',', $grupo->ids);
            $productos = Producto::with('almacenes', 'codigos', 'categoria')
                ->whereIn('id', $ids)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'nombre' => $p->nombre_producto,
                    'marca' => $p->marca_producto,
                    'modelo' => $p->modelo_producto,
                    'capacidad' => $p->capacidad_producto,
                    'color' => $p->color_producto,
                    'codigo' => $p->codigo_producto,
                    'precio_compra' => (float) $p->precio_compra_producto,
                    'cantidad_total' => $p->cantidad_total,
                    'categoria' => $p->categoria?->nombre_categoria,
                    'categoria_id' => $p->categoria_id,
                    'almacenes' => $p->almacenes->map(fn ($a) => [
                        'id' => $a->id,
                        'nombre' => $a->nombre_almacen,
                        'cantidad' => $a->pivot->cantidad,
                    ]),
                    'codigos_barras' => $p->codigos->map(fn ($c) => $c->codigo_barras)->values(),
                ]);

            $cantidadTotal = $productos->sum('cantidad_total');
            $precioPromedioPonderado = $cantidadTotal > 0
                ? $productos->sum(fn ($p) => $p['precio_compra'] * $p['cantidad_total']) / $cantidadTotal
                : $productos->avg('precio_compra');

            // Detectar campos que varían entre los productos del grupo
            $camposVariables = [];
            $camposRevisar = [
                'capacidad' => fn ($p) => $p['capacidad'],
                'categoria_id' => fn ($p) => $p['categoria_id'],
            ];
            foreach ($camposRevisar as $nombre => $extractor) {
                $valores = $productos->map($extractor)->filter()->unique()->values();
                if ($valores->count() > 1) {
                    $camposVariables[] = [
                        'campo' => $nombre,
                        'valores' => $valores->toArray(),
                        'valor_sugerido' => $valores->groupBy(fn ($v) => $v)->sortByDesc(fn ($g) => $g->count())->keys()->first(),
                    ];
                }
            }

            return [
                'clave' => trim("{$grupo->nombre_producto} {$grupo->marca_producto} {$grupo->modelo_producto}").($grupo->capacidad_limpia ? " ({$grupo->capacidad_limpia})" : '').($grupo->color_producto ? " - {$grupo->color_producto}" : ''),
                'productos' => $productos,
                'cantidad_total' => $cantidadTotal,
                'precio_promedio' => round($precioPromedioPonderado, 2),
                'campos_variables' => $camposVariables,
            ];
        });

        return response()->json([
            'success' => true,
            'total_grupos' => $grupos->count(),
            'grupos' => $grupos,
        ]);
    }

    /**
     * Normalizar valores canónicos de un grupo de productos (sin fusionar)
     */
    public function normalizarDuplicados(Request $request)
    {
        $request->validate([
            'productos_ids' => 'required|array|min:1',
            'productos_ids.*' => 'exists:productos,id',
            'valores_canonicos' => 'required|array',
        ]);

        $camposPermitidos = ['capacidad_producto', 'categoria_id'];
        $actualizar = array_intersect_key($request->valores_canonicos, array_flip($camposPermitidos));

        if (empty($actualizar)) {
            return response()->json(['success' => false, 'message' => 'No hay campos válidos para normalizar'], 422);
        }

        DB::beginTransaction();
        try {
            Producto::whereIn('id', $request->productos_ids)->update($actualizar);
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Valores normalizados correctamente en '.count($request->productos_ids).' productos.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json(['success' => false, 'message' => 'Error al normalizar: '.$e->getMessage()], 500);
        }
    }

    /**
     * Normalizar + fusionar productos duplicados en uno solo
     */
    public function fusionarDuplicados(Request $request)
    {
        $request->validate([
            'producto_conservar_id' => 'required|exists:productos,id',
            'productos_eliminar_ids' => 'required|array|min:1',
            'productos_eliminar_ids.*' => 'exists:productos,id|different:producto_conservar_id',
            'valores_canonicos' => 'sometimes|array',
        ]);

        DB::beginTransaction();
        try {
            $conservar = Producto::with('almacenes', 'codigos')->findOrFail($request->producto_conservar_id);

            // 0. Aplicar valores canónicos si se enviaron
            $camposPermitidos = ['capacidad_producto', 'categoria_id'];
            $actualizar = array_intersect_key($request->valores_canonicos ?? [], array_flip($camposPermitidos));
            if (! empty($actualizar)) {
                $todosIds = array_merge([$conservar->id], $request->productos_eliminar_ids);
                Producto::whereIn('id', $todosIds)->update($actualizar);
                $conservar->refresh();
            }

            foreach ($request->productos_eliminar_ids as $eliminarId) {
                $eliminar = Producto::with('almacenes', 'codigos')->find($eliminarId);
                if (! $eliminar) {
                    continue;
                }

                // 1. Sumar cantidades en almacen_producto
                foreach ($eliminar->almacenes as $almacen) {
                    $pivotExistente = AlmacenProducto::where('almacen_id', $almacen->id)
                        ->where('producto_id', $conservar->id)
                        ->first();

                    if ($pivotExistente) {
                        $pivotExistente->increment('cantidad', $almacen->pivot->cantidad);
                    } else {
                        AlmacenProducto::create([
                            'almacen_id' => $almacen->id,
                            'producto_id' => $conservar->id,
                            'cantidad' => $almacen->pivot->cantidad,
                        ]);
                    }
                }

                // 2. Transferir códigos de barras únicos
                foreach ($eliminar->codigos as $codigo) {
                    $existe = ProductoCodigo::where('producto_id', $conservar->id)
                        ->where('codigo_barras', $codigo->codigo_barras)
                        ->exists();

                    if (! $existe) {
                        $codigo->update(['producto_id' => $conservar->id]);
                    }
                }

                // 3. Eliminar relaciones y el producto
                $eliminar->almacenes()->detach();
                $eliminar->codigos()->delete();
                $eliminar->delete();
            }

            // 4. Recalcular precio promedio ponderado final
            $conservar->refresh();
            $totalCantidad = $conservar->cantidad_total ?? 0;

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Fusión completada. Producto conservado: ID '.$conservar->id.' — '.$totalCantidad.' unidades totales.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al fusionar duplicados: '.$e->getMessage());

            return response()->json(['success' => false, 'message' => 'Error al fusionar: '.$e->getMessage()], 500);
        }
    }
}
