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
use App\Services\FichasHermanasService;
use App\Services\FusionLotesService;
use App\Services\FusionProductosService;
use App\Services\ValorInventarioService;
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
    public function index(Request $request, ValorInventarioService $valorInventario)
    {
        $user = Auth::user();

        // No ejecutar migraciones/seed automáticamente desde la petición.

        // Query base con relaciones
        $query = Producto::with(['categoria', 'almacenes', 'codigos']);

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
        $almacenFiltroId = ($request->has('almacen_id') && $request->almacen_id != '') ? (int) $request->almacen_id : null;
        if ($almacenFiltroId !== null) {
            $query->whereHas('almacenes', function ($q) use ($almacenFiltroId) {
                $q->where('almacen_id', $almacenFiltroId);
            });
        }

        // Ordenamiento
        $sortField = $request->get('sort_field', 'nombre_producto');
        $sortDirection = $request->get('sort_direction', 'asc');

        if (in_array($sortField, ['nombre_producto', 'marca_producto', 'codigo_producto', 'precio_compra_producto', 'cantidad_total'])) {
            if ($sortField === 'cantidad_total') {
                // `cantidad_total` no es una columna real (accessor de Producto), así que
                // ordenar por ella directo tira "Unknown column" — subquery sobre
                // almacen_producto, coherente con lo que muestra la fila: suma de todos los
                // almacenes sin filtro, o la cantidad de ESE almacén cuando hay uno filtrado.
                $subCantidad = DB::table('almacen_producto')
                    ->selectRaw($almacenFiltroId !== null ? 'cantidad' : 'COALESCE(SUM(cantidad), 0)')
                    ->whereColumn('producto_id', 'productos.id');

                if ($almacenFiltroId !== null) {
                    $subCantidad->where('almacen_id', $almacenFiltroId);
                }

                $query->orderBy($subCantidad, $sortDirection);
            } elseif ($sortField === 'precio_compra_producto') {
                // Mismo criterio que ValorInventarioService::costosPonderadosPorProducto(): promedio ponderado real de
                // lotes_stock (del almacén filtrado, o de todos), cayendo al costo de la ficha
                // cuando no hay ningún lote — para que el orden coincida con el número mostrado.
                $subCosto = DB::table('lotes_stock')
                    ->selectRaw('COALESCE(SUM(cantidad_disponible * precio_costo) / NULLIF(SUM(cantidad_disponible), 0), productos.precio_compra_producto)')
                    ->whereColumn('producto_id', 'productos.id')
                    ->where('cantidad_disponible', '>', 0);

                if ($almacenFiltroId !== null) {
                    $subCosto->where('almacen_id', $almacenFiltroId);
                }

                $query->orderBy($subCosto, $sortDirection);
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

        // Costo real ponderado por producto (lotes_stock), en bulk para las filas de esta
        // página — evita N+1 de llamar Producto::costoEnAlmacen() una vez por fila. Sin
        // filtro de almacén, pondera sobre lotes de TODOS los almacenes del producto.
        $productoIds = $paginatedProducts->getCollection()->pluck('id')->all();
        $costosPonderados = $valorInventario->costosPonderadosPorProducto($productoIds, $almacenFiltroId);

        // Transformar los datos para la vista después de paginar
        $paginatedProducts->getCollection()->transform(function ($producto) use ($costosPonderados, $almacenFiltroId) {
            // Costo: promedio ponderado real de lotes_stock (ver ValorInventarioService::costosPonderadosPorProducto()
            // abajo); cae al costo estático de la ficha si el producto no tiene ningún lote
            // (catálogo viejo, mismo fallback que Producto::costoEnAlmacen()).
            $costo = $costosPonderados[$producto->id] ?? (float) $producto->precio_compra_producto;

            // Cantidad: total en todos los almacenes sin filtro; con un almacén filtrado, la
            // cantidad real ahí (el pivote ya está cargado en memoria por el eager load de
            // 'almacenes' de arriba, sin query extra).
            $cantidad = $almacenFiltroId !== null
                ? (int) ($producto->almacenes->firstWhere('id', $almacenFiltroId)?->pivot->cantidad ?? 0)
                : $producto->cantidad_total;

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'capacidad_producto' => $producto->capacidad_producto,
                'color_producto' => $producto->color_producto,
                // `productos.codigo_producto` está vacío en todo el catálogo real — el código
                // de barras real vive en `producto_codigos` (relación `codigos`, eager-loaded
                // arriba). Se manda el marcado `es_default` (o el primero si ninguno lo está).
                'codigo_producto' => $producto->codigos->sortByDesc('es_default')->first()?->codigo_barras,
                'categoria' => $producto->categoria?->nombre_categoria,
                'categoria_id' => $producto->categoria_id,
                'precio_compra_producto' => $costo,
                'cantidad_total' => $cantidad,
                'imagen_url' => $producto->imagen_url,
                'barcode_image_url' => $producto->barcode_image_url,
                'stock_bajo' => $producto->stock_bajo,
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ];
        });

        $canViewStockStats = in_array($user->role, ['admin', 'moderador']);
        $canViewSensitiveData = in_array($user->role, ['admin', 'moderador']);

        // Valor total del inventario global (todos los productos, sin filtros) — costo real
        // por lote, no el costo estático de la ficha (ver ValorInventarioService::valorTotal()).
        $totalImporteGlobal = $valorInventario->valorTotal();

        // Widget "Stock Bajo" / "Valor Stock Bajo" — sobre todo el catálogo, no solo las filas de
        // la página visible. Mismo umbral e inclusión de productos sin stock que el filtro
        // "stock bajo" de esta misma pantalla (Producto::getStockBajoAttribute()). El conteo lo ve
        // cualquier rol (como antes); el valor, solo quien ve datos de costo.
        $resumenStockBajo = $valorInventario->resumenStockBajo(5, incluirSinStock: true);
        if (! $canViewStockStats) {
            $resumenStockBajo['valor'] = null;
        }

        return Inertia::render('Productos/Index', [
            'productos' => $paginatedProducts,
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(),
            'categorias' => Categoria::select('id', 'nombre_categoria')->get(),
            'filters' => $request->only(['search', 'categoria_id', 'almacen_id', 'stock_bajo']),
            'sort' => ['field' => $sortField, 'direction' => $sortDirection],
            'canViewStockStats' => $canViewStockStats,
            'canViewSensitiveData' => $canViewSensitiveData,
            'total_importe_global' => (float) $totalImporteGlobal,
            'resumen_stock_bajo' => $resumenStockBajo,
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
                    // Desglose por lote (2026-09-20) — un mismo almacén puede tener 2+ lotes a
                    // costo distinto bajo esta ficha (compras/traslados que llegaron en momentos
                    // o precios distintos). `costo` de arriba sigue siendo el promedio, para no
                    // romper nada que ya lo use — esto es lo que permite mostrarlos por separado
                    // cuando hay más de uno. Vacío para productos viejos sin lotes_stock, que
                    // caen al fallback de costoEnAlmacen().
                    'lotes' => $this->lotesParaVista($producto, $almacen->id),
                ]),
                'created_at' => $producto->created_at?->toISOString(),
                'updated_at' => $producto->updated_at?->toISOString(),
            ],
            'fichas_hermanas' => $this->fichasHermanas($producto),
        ]);
    }

    /**
     * Otras fichas de Producto con la misma identidad descriptiva (nombre+marca+modelo+
     * capacidad+categoría) pero costo global distinto — CompraController::procesarLineasProducto()
     * reusa una ficha existente cuando coincide esta misma identidad (2026-09-20), así que esto
     * ya solo debería aparecer para catálogo viejo, de antes de ese cambio (entre 2026-09-18 y
     * 2026-09-20 cada compra creaba siempre una ficha nueva). Se deja tal cual a propósito — no
     * se fusiona automáticamente el catálogo viejo, ver conversación 2026-09-20.
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
     * Desglose por lote de un producto en un almacén puntual (ver Producto::lotesActivosEnAlmacen())
     * — para Show.tsx/Edit.tsx, que muestran cada lote por separado cuando hay más de uno en vez
     * del promedio único de costoEnAlmacen(). Vacío para catálogo viejo sin lotes_stock.
     *
     * @return array<int, array<string, mixed>>
     */
    private function lotesParaVista(Producto $producto, int $almacenId): array
    {
        return $producto->lotesActivosEnAlmacen($almacenId)
            ->map(fn (LoteStock $lote) => [
                'id' => $lote->id,
                'codigo' => $lote->codigo,
                'cantidad' => $lote->cantidad_disponible,
                'costo' => (float) $lote->precio_costo,
                // Precio de venta "Opción A" (2026-09-20): 'precio_venta' es el override propio
                // de ESTE lote (null si no tiene, el caso normal) — 'precio_venta_efectivo' ya
                // resuelto contra el precio del almacén, para no obligar al frontend a repetir
                // esa lógica. Ver Producto::precioVentaEfectivo().
                'precio_venta' => $lote->precio_venta !== null ? (float) $lote->precio_venta : null,
                'precio_venta_efectivo' => $producto->precioVentaEfectivo($lote),
            ])
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
                    'lotes' => $this->lotesParaVista($producto, $almacen->id),
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
            // Lote puntual a corregir (2026-09-20) — cuando el almacén tiene 2+ lotes, Edit.tsx
            // manda cuál. Nulo cuando el almacén no tiene ningún lote todavía (crea uno de
            // ajuste, ver corregirCostoEnAlmacen()) o para datos viejos con un solo lote sin id
            // explícito en la card.
            'lote_id' => ['nullable', 'integer', 'exists:lotes_stock,id'],
            'activo' => ['nullable', 'boolean'],
            'descripcion_producto' => ['nullable', 'string'],
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
            'password_confirmacion' => ['nullable', 'string'],
            'motivo_cambio_costo' => ['nullable', 'string', 'max:500'],
        ]);

        $user = Auth::user();

        $almacenId = isset($validatedData['almacen_id']) ? (int) $validatedData['almacen_id'] : null;
        $loteId = isset($validatedData['lote_id']) ? (int) $validatedData['lote_id'] : null;

        if ($almacenId !== null && ! $producto->almacenes()->where('almacens.id', $almacenId)->exists()) {
            return redirect()->back()
                ->with('error', 'Ese almacén no corresponde a este producto.')
                ->withInput();
        }

        $loteAEditar = null;
        if ($loteId !== null) {
            $loteAEditar = LoteStock::where('id', $loteId)
                ->where('producto_id', $producto->id)
                ->where('almacen_id', $almacenId)
                ->first();

            if (! $loteAEditar) {
                return redirect()->back()
                    ->with('error', 'Ese lote no corresponde a este producto/almacén.')
                    ->withInput();
            }
        }

        // "Anterior" es el dato real de lo que se está corrigiendo: el costo de ESE lote
        // puntual si se eligió uno, o el promedio del almacén si no (almacén con 0-1 lote,
        // o corrección legado sin selector).
        $precioCostoAnterior = match (true) {
            $loteAEditar !== null => (float) $loteAEditar->precio_costo,
            $almacenId !== null => $producto->costoEnAlmacen($almacenId),
            default => (float) $producto->precio_compra_producto,
        };
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

            // El impacto financiero de corregir UN lote solo aplica a las unidades de ESE lote,
            // no a todo el almacén (que puede tener otros lotes a otro costo, sin tocar).
            $stockMomento = match (true) {
                $loteAEditar !== null => $loteAEditar->cantidad_disponible,
                $almacenId !== null => (int) (AlmacenProducto::where('producto_id', $producto->id)->where('almacen_id', $almacenId)->value('cantidad') ?? 0),
                default => $producto->cantidad_total,
            };

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
                $this->corregirCostoEnAlmacen($producto, $almacenId, $precioCostoNuevo, $loteId);
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
     * "Opción A" (2026-09-20): override opcional del precio de venta de UN lote puntual, sin
     * tocar `producto_vendedors` (el precio general del almacén, que sigue siendo el default
     * para el resto de los lotes). Enviar `precio_venta` vacío/null quita el override — el lote
     * vuelve a heredar el precio del almacén. Mismo criterio de permisos que
     * ProductoVendedorController (precio de venta es decisión comercial, no requiere contraseña
     * como el costo): admin/moderador, o el vendedor asignado a ese almacén.
     */
    public function actualizarPrecioVentaLote(Request $request, Producto $producto, LoteStock $lote)
    {
        if ($lote->producto_id !== $producto->id) {
            abort(404);
        }

        $user = Auth::user();
        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains($lote->almacen_id)) {
            abort(403, 'No tienes acceso a este almacén.');
        }

        $validated = $request->validate([
            'precio_venta' => 'nullable|numeric|min:0',
        ]);

        $lote->update(['precio_venta' => $validated['precio_venta'] ?? null]);

        // /disponibles lo llama por fetch (varios lotes seleccionados a la vez) y necesita JSON;
        // Edit.tsx sigue usando la redirección de siempre.
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'lote_id' => $lote->id,
                'precio_venta' => $lote->precio_venta !== null ? (float) $lote->precio_venta : null,
            ]);
        }

        return redirect()->route('productos.edit', $producto)
            ->with('success', $validated['precio_venta'] !== null
                ? "Precio de venta corregido para el lote {$lote->codigo}."
                : "El lote {$lote->codigo} vuelve a usar el precio del almacén.");
    }

    /**
     * Fusiona 2+ lotes de este producto en un almacén en UN solo lote, a pedido del usuario
     * (ver FusionLotesService): suma cantidades, costo promedio ponderado, fecha del lote más
     * viejo. Los lotes unidos quedan en 0 para el historial. Solo admin/moderador (ruta).
     */
    public function fusionarLotes(Request $request, Producto $producto, FusionLotesService $fusionLotes)
    {
        $validated = $request->validate([
            'almacen_id' => 'required|integer|exists:almacens,id',
            'lote_ids' => 'required|array|min:2',
            'lote_ids.*' => 'integer|distinct|exists:lotes_stock,id',
            'precio_venta' => 'nullable|numeric|min:0.01',
        ]);

        $lote = $fusionLotes->fusionar(
            $producto->id,
            (int) $validated['almacen_id'],
            array_map('intval', $validated['lote_ids']),
            isset($validated['precio_venta']) ? (float) $validated['precio_venta'] : null,
            $request->user(),
        );

        return response()->json([
            'success' => true,
            'message' => "Lotes fusionados en {$lote->codigo}: {$lote->cantidad_disponible} unidades a costo ".number_format((float) $lote->precio_costo, 2).'.',
            'lote' => [
                'id' => $lote->id,
                'codigo' => $lote->codigo,
                'cantidad' => $lote->cantidad_disponible,
                'costo' => (float) $lote->precio_costo,
                'precio_venta' => $lote->precio_venta !== null ? (float) $lote->precio_venta : null,
            ],
        ]);
    }

    /**
     * Corrige el costo real de un producto en UN almacén puntual, sin tocar el campo global de
     * la ficha ni los demás almacenes.
     *
     * Con `$loteId` (2026-09-20, cuando Edit.tsx ofrece elegir de cuál lote — ya validado en
     * update() que pertenece a este producto/almacén): corrige SOLO ese lote, el resto del
     * almacén queda intacto aunque tenga más lotes a otro costo.
     *
     * Sin `$loteId` (legado, o un almacén con un solo lote sin selector): sobrescribe el
     * `precio_costo` de TODOS los lotes de ese almacén al mismo valor (sin ponderar contra el
     * valor viejo — el admin está corrigiendo, no promediando). Si el almacén todavía no tiene
     * ningún lote, se crea uno de ajuste manual (sin compra ni movimiento de origen) con la
     * cantidad actual, para que Producto::costoEnAlmacen() deje de caer al fallback global.
     */
    private function corregirCostoEnAlmacen(Producto $producto, int $almacenId, float $nuevoCosto, ?int $loteId = null): void
    {
        if ($loteId !== null) {
            LoteStock::where('id', $loteId)->update(['precio_costo' => $nuevoCosto]);

            return;
        }

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
            'cantidad_disponible' => max($cantidadActual, 0),
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
     * Detectar fichas hermanas (mismo producto repetido como 2+ fichas, ver
     * FichasHermanasService) con su stock por almacén, costo real y los almacenes donde tienen
     * precios de venta distintos (a resolver antes de fusionar, ver FusionProductosService).
     */
    public function duplicados(FichasHermanasService $fichasHermanas, FusionProductosService $fusion, ValorInventarioService $valorInventario)
    {
        $grupos = $fichasHermanas->grupos()->map(function ($fichas) use ($fusion, $valorInventario) {
            $fichas->load('almacenes', 'codigos', 'categoria');
            $costosReales = $valorInventario->costosPonderadosPorProducto($fichas->pluck('id')->all());

            $productos = $fichas->map(fn (Producto $p) => [
                'id' => $p->id,
                'nombre' => $p->nombre_producto,
                'marca' => $p->marca_producto,
                'modelo' => $p->modelo_producto,
                'capacidad' => $p->capacidad_producto,
                'color' => $p->color_producto,
                'codigo' => $p->codigos->sortByDesc('es_default')->first()?->codigo_barras,
                // Costo real por lote (incluye prorrateos); sin lotes, el de la ficha.
                'precio_compra' => $costosReales[$p->id] ?? (float) $p->precio_compra_producto,
                'cantidad_total' => $p->cantidad_total,
                'categoria' => $p->categoria?->nombre_categoria,
                'categoria_id' => $p->categoria_id,
                'almacenes' => $p->almacenes->map(fn ($a) => [
                    'id' => $a->id,
                    'nombre' => $a->nombre_almacen,
                    'cantidad' => $a->pivot->cantidad,
                ])->values(),
                'codigos_barras' => $p->codigos->pluck('codigo_barras')->values(),
            ])->values();

            $cantidadTotal = $productos->sum('cantidad_total');
            $costoPromedio = $cantidadTotal > 0
                ? $productos->sum(fn ($p) => $p['precio_compra'] * $p['cantidad_total']) / $cantidadTotal
                : $productos->avg('precio_compra');

            // Campos que varían entre las fichas y se pueden normalizar antes de fusionar.
            $camposVariables = [];
            foreach (['capacidad_producto' => 'capacidad', 'categoria_id' => 'categoria_id'] as $campo => $clave) {
                $valores = $productos->pluck($clave)->filter()->unique()->values();
                if ($valores->count() > 1) {
                    $camposVariables[] = [
                        'campo' => $campo,
                        'valores' => $valores->all(),
                        'valor_sugerido' => $productos->pluck($clave)->filter()->countBy()->sortDesc()->keys()->first(),
                    ];
                }
            }

            $primera = $fichas->first();

            return [
                'clave' => trim("{$primera->nombre_producto} {$primera->marca_producto} {$primera->modelo_producto}")
                    .($primera->capacidad_producto ? " ({$primera->capacidad_producto})" : '')
                    .($primera->color_producto ? " - {$primera->color_producto}" : ''),
                'productos' => $productos,
                'cantidad_total' => $cantidadTotal,
                'precio_promedio' => round($costoPromedio, 2),
                'campos_variables' => $camposVariables,
                'conflictos_precio' => $fusion->conflictosDePrecio($fichas),
            ];
        })->values();

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
     * Normalizar + fusionar fichas hermanas en una sola. Reasigna ventas, compras, lotes,
     * movimientos e historiales a la ficha conservada (ver FusionProductosService) — nunca los
     * borra. Donde las fichas tienen precios de venta distintos, `precios_por_almacen` indica
     * con qué precio queda cada almacén.
     */
    public function fusionarDuplicados(Request $request, FusionProductosService $fusion)
    {
        $validated = $request->validate([
            'producto_conservar_id' => 'required|exists:productos,id',
            'productos_eliminar_ids' => 'required|array|min:1',
            'productos_eliminar_ids.*' => 'integer|distinct|exists:productos,id|different:producto_conservar_id',
            'valores_canonicos' => 'sometimes|array',
            'precios_por_almacen' => 'sometimes|array',
            'precios_por_almacen.*.precio_venta' => 'required|numeric|min:0.01',
            'precios_por_almacen.*.comision' => 'nullable|numeric|min:0',
        ]);

        $todosIds = array_merge([(int) $validated['producto_conservar_id']], array_map('intval', $validated['productos_eliminar_ids']));

        // Normalización previa (capacidad/categoría) en la misma transacción que la fusión: si la
        // fusión se rechaza (fichas ajenas, precio sin resolver), la normalización se revierte.
        $resultado = DB::transaction(function () use ($validated, $todosIds, $fusion, $request) {
            $actualizar = array_intersect_key($validated['valores_canonicos'] ?? [], array_flip(['capacidad_producto', 'categoria_id']));
            if (! empty($actualizar)) {
                Producto::whereIn('id', $todosIds)->update($actualizar);
            }

            $conservar = Producto::findOrFail($validated['producto_conservar_id']);
            $eliminar = Producto::whereIn('id', $validated['productos_eliminar_ids'])->get();

            return $fusion->fusionar($conservar, $eliminar, $validated['precios_por_almacen'] ?? [], $request->user());
        });

        return response()->json([
            'success' => true,
            'message' => 'Fusión completada. Producto conservado: ID '.$resultado['producto_id'].' — '.$resultado['cantidad_total'].' unidades totales. Ventas, compras, lotes y movimientos de las fichas fusionadas pasaron a esta ficha.',
            'resultado' => $resultado,
        ]);
    }
}
