<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CatalogoPublicoController extends Controller
{
    private const CACHE_TTL_SECONDS = 60;

    private function supportsCacheTags(): bool
    {
        return method_exists(Cache::getStore(), 'tags');
    }

    private function cacheRemember(string $key, int $ttl, callable $callback, array $tags = [])
    {
        if ($this->supportsCacheTags() && !empty($tags)) {
            return Cache::tags($tags)->remember($key, $ttl, $callback);
        }
        return Cache::remember($key, $ttl, $callback);
    }

    private function cacheForget(string $key, array $tags = []): void
    {
        if ($this->supportsCacheTags() && !empty($tags)) {
            Cache::tags($tags)->forget($key);
            return;
        }

        Cache::forget($key);
    }

    /**
     * Construye una URL de WhatsApp para un teléfono dado.
     *
     * @param  string|null  $phone
     * @param  string|null  $message
     * @return string|null
     */
    private function buildWhatsAppUrl(?string $phone, ?string $message = null): ?string
    {
        if (! $phone) {
            return null;
        }

        // Normalizar a solo dígitos (WhatsApp requiere formato internacional sin signos)
        $clean = preg_replace('/[^0-9]/', '', $phone);
        if (empty($clean)) {
            return null;
        }

        $url = "https://wa.me/{$clean}";
        if ($message) {
            $url .= '?text=' . urlencode($message);
        }

        return $url;
    }

    /**
     * Lista los almacenes públicos (puntos de venta) disponibles para el catálogo.
     *
     * Ruta: GET /api/tienda/almacenes
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function indexAlmacenes()
    {
        $cacheKey = 'catalogo:almacenes';

        $almacenes = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () {
            return Almacen::query()
                // Solo puntos de venta (visibles para catálogo público)
                ->where('tipo_almacen', 'punto_venta')
                ->select([
                    'id',
                    'nombre_almacen',
                    'ciudad_almacen',
                    'provincia_almacen',
                    'notas_almacen',
                    'telefono_almacen',
                ])
                ->orderBy('nombre_almacen')
                ->get()
                ->map(function (Almacen $almacen) {
                    $whatsapp = $this->buildWhatsAppUrl(
                        $almacen->telefono_almacen,
                        "Hola, quiero información sobre los productos disponibles."
                    );

                    return [
                        'id' => $almacen->id,
                        'nombre' => $almacen->nombre_almacen,
                        'ciudad' => $almacen->ciudad_almacen,
                        // En este modelo no hay dirección explícita, usamos notas como fallback
                        'direccion' => $almacen->notas_almacen,
                        'telefono' => $almacen->telefono_almacen,
                        'whatsapp_url' => $whatsapp,
                        'slug' => Str::slug($almacen->nombre_almacen),
                    ];
                });
        }, ['catalogo', 'almacenes']);

        return response()->json($almacenes);
    }

    /**
     * Devuelve los datos de un almacén para el catálogo.
     *
     * Ruta: GET /api/tienda/almacenes/{id}
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function showAlmacen(int $id)
    {
        $cacheKey = "catalogo:almacen:{$id}";

        $almacen = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($id) {
            return Almacen::query()
                ->where('id', $id)
                ->where('tipo_almacen', 'punto_venta')
                ->select([
                    'id',
                    'nombre_almacen',
                    'ciudad_almacen',
                    'provincia_almacen',
                    'notas_almacen',
                    'telefono_almacen',
                ])
                ->first();
        }, ['catalogo', "almacen:{$id}"]);
        if (! $almacen) {
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $whatsapp = $this->buildWhatsAppUrl(
            $almacen->telefono_almacen,
            "Hola, quiero ver los productos disponibles en {$almacen->nombre_almacen}."
        );

        return response()->json([
            'id' => $almacen->id,
            'nombre' => $almacen->nombre_almacen,
            'ciudad' => $almacen->ciudad_almacen,
            'provincia' => $almacen->provincia_almacen,
            'direccion' => $almacen->notas_almacen,
            'telefono' => $almacen->telefono_almacen,
            'whatsapp_url' => $whatsapp,
            'slug' => Str::slug($almacen->nombre_almacen),
        ]);
    }

    /**
     * Lista productos públicos de un almacén con paginación, búsqueda y filtro por categoría.
     *
     * Ruta: GET /api/tienda/almacenes/{id}/productos
     *
     * Query params:
     *  - q: búsqueda por nombre o código
     *  - categoria_id: filtro por categoría
     *  - per_page: cantidad por página (default 20)
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $almacenId
     * @return \Illuminate\Http\JsonResponse
     */
    public function productosPorAlmacen(Request $request, int $almacenId)
    {
        $validator = Validator::make(array_merge($request->all(), ['almacen_id' => $almacenId]), [
            'almacen_id' => 'required|exists:almacens,id',
            'q' => 'nullable|string|max:255',
            'categoria_id' => 'nullable|exists:categorias,id',
            'marca' => 'nullable|string|max:100',
            'precio_min' => 'nullable|numeric|min:0',
            'precio_max' => 'nullable|numeric|min:0',
            'etiquetas' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $almacen = Almacen::query()
            ->where('id', $almacenId)
            ->where('tipo_almacen', 'punto_venta')
            ->select(['id', 'nombre_almacen', 'telefono_almacen'])
            ->first();

        if (! $almacen) {
            return response()->json(['message' => 'Almacén no encontrado'], 404);
        }

        $perPage = (int) ($request->input('per_page', 20));
        $cacheKey = 'catalogo:productos:' . $almacenId . ':' . md5($request->fullUrl());

        $almacenMeta = [
            'id' => $almacen->id,
            'nombre' => $almacen->nombre_almacen,
            'telefono' => $almacen->telefono_almacen,
            'whatsapp_url' => $this->buildWhatsAppUrl(
                $almacen->telefono_almacen,
                "Hola, quiero comprar productos del almacén {$almacen->nombre_almacen}."
            ),
        ];

        $productosPaginados = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($request, $almacenId, $perPage, $almacenMeta) {
            $query = Producto::query()
                ->select([
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'productos.codigo_producto',
                    // Se toma el precio de venta asociado al almacén. Si no existe, será 0.
                    DB::raw('COALESCE(producto_vendedors.precio_venta, 0) as precio_venta'),
                    'categorias.id as categoria_id',
                    'categorias.nombre_categoria as categoria_nombre',
                    'almacen_producto.cantidad as stock',
                ])
                ->join('almacen_producto', 'productos.id', '=', 'almacen_producto.producto_id')
                ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
                ->leftJoin('producto_vendedors', function ($join) use ($almacenId) {
                    $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                        ->where('producto_vendedors.almacen_id', $almacenId);
                })
                ->where('almacen_producto.almacen_id', $almacenId)
                ->where('productos.activo', true)
                ->where('almacen_producto.cantidad', '>', 0);

            if ($q = $request->input('q')) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('productos.nombre_producto', 'LIKE', "%{$q}%")
                        ->orWhere('productos.codigo_producto', 'LIKE', "%{$q}%");
                });
            }

            if ($categoriaId = $request->input('categoria_id')) {
                $query->where('productos.categoria_id', $categoriaId);
            }

            if ($marca = $request->input('marca')) {
                $query->where('productos.marca_producto', 'LIKE', "%{$marca}%");
            }

            if (($precioMin = $request->input('precio_min')) !== null) {
                $query->whereRaw('COALESCE(producto_vendedors.precio_venta, 0) >= ?', [$precioMin]);
            }

            if (($precioMax = $request->input('precio_max')) !== null) {
                $query->whereRaw('COALESCE(producto_vendedors.precio_venta, 0) <= ?', [$precioMax]);
            }

            if ($etiquetas = $request->input('etiquetas')) {
                $terms = array_filter(array_map('trim', explode(',', $etiquetas)));
                foreach ($terms as $term) {
                    $query->where(function ($sub) use ($term) {
                        $sub->where('productos.nombre_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.descripcion_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.marca_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.modelo_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.codigo_producto', 'LIKE', "%{$term}%");
                    });
                }
            }

            $orderBy = $request->input('order_by', 'nombre');
            $orderDir = strtolower($request->input('order_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

            $orderByMap = [
                'nombre' => 'productos.nombre_producto',
                'precio' => 'precio_venta',
                'stock' => 'stock',
            ];

            if (! isset($orderByMap[$orderBy])) {
                $orderBy = 'nombre';
            }

            $query->orderBy($orderByMap[$orderBy], $orderDir);

            return $query->paginate($perPage)
                ->through(function ($producto) use ($almacenMeta) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre_producto,
                        'slug' => Str::slug($producto->nombre_producto),
                        'precio_venta' => (float) $producto->precio_venta,
                        'stock' => (int) $producto->stock,
                        'imagen_principal' => $this->resolveImagenPrincipal($producto->imagen_producto),
                        'categoria' => [
                            'id' => $producto->categoria_id,
                            'nombre' => $producto->categoria_nombre,
                        ],
                        'descripcion_corta' => Str::limit($producto->descripcion_producto ?? '', 180),
                        'whatsapp_url' => $this->buildWhatsAppUrl(
                            $almacenMeta['telefono'],
                            "Hola, quiero comprar el producto {$producto->nombre_producto}"
                        ),
                    ];
                })
                ->additional(['almacen' => $almacenMeta]);
        }, ['catalogo', "productos:almacen:{$almacenId}"]);

        return response()->json($productosPaginados);
    }

    /**
     * Devuelve un producto público por ID.
     *
     * Ruta: GET /api/tienda/productos/{id}
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function showProducto(int $id)
    {
        $cacheKey = "catalogo:producto:{$id}";

        $producto = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($id) {
            return Producto::query()
                ->select([
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'productos.codigo_producto',
                    DB::raw('COALESCE(producto_vendedors.precio_venta, 0) as precio_venta'),
                    'categorias.id as categoria_id',
                    'categorias.nombre_categoria as categoria_nombre',
                    DB::raw('COALESCE(SUM(almacen_producto.cantidad), 0) as stock_total'),
                ])
                ->leftJoin('almacen_producto', 'productos.id', '=', 'almacen_producto.producto_id')
                ->leftJoin(
                    DB::raw('(SELECT producto_id, MIN(precio_venta) as precio_venta FROM producto_vendedors WHERE precio_venta > 0 GROUP BY producto_id) as producto_vendedors'),
                    'productos.id', '=', 'producto_vendedors.producto_id'
                )
                ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
                ->where('productos.id', $id)
                ->where('productos.activo', true)
                ->groupBy(
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'productos.codigo_producto',
                    'categorias.id',
                    'categorias.nombre_categoria',
                    'producto_vendedors.precio_venta'
                )
                ->first();
        }, ['catalogo', "producto:{$id}"]);
        if (! $producto) {
            return response()->json(['message' => 'Producto no encontrado'], 404);
        }

        return response()->json([
            'id' => $producto->id,
            'nombre' => $producto->nombre_producto,
            'slug' => Str::slug($producto->nombre_producto),
            'precio_venta' => (float) $producto->precio_venta,
            'stock' => (int) $producto->stock_total,
            'imagen_principal' => $this->resolveImagenPrincipal($producto->imagen_producto),
            'categoria' => [
                'id' => $producto->categoria_id,
                'nombre' => $producto->categoria_nombre,
            ],
            'descripcion_corta' => Str::limit($producto->descripcion_producto ?? '', 180),
            'codigo' => $producto->codigo_producto,
        ]);
    }

    /**
     * Lista categorías activas para el catálogo.
     *
     * Ruta: GET /api/tienda/categorias
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function indexCategorias()
    {
        $cacheKey = 'catalogo:categorias';

        $categorias = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () {
            return \App\Models\Categoria::query()
                ->where('activar_categoria', true)
                ->select(['id', 'nombre_categoria'])
                ->orderBy('nombre_categoria')
                ->get()
                ->map(fn($cat) => [
                    'id' => $cat->id,
                    'nombre' => $cat->nombre_categoria,
                ]);
        }, ['catalogo', 'categorias']);

        return response()->json($categorias);
    }

    /**
     * Búsqueda global de productos (sin filtrar por almacén)
     *
     * Ruta: GET /api/tienda/productos
     *
     * Query params: q, categoria_id, marca, precio_min, precio_max, etiquetas, per_page, order_by, order_dir
     */
    public function searchProductos(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'nullable|string|max:255',
            'categoria_id' => 'nullable|exists:categorias,id',
            'marca' => 'nullable|string|max:100',
            'precio_min' => 'nullable|numeric|min:0',
            'precio_max' => 'nullable|numeric|min:0',
            'etiquetas' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
            'order_by' => 'nullable|string|in:nombre,precio,stock',
            'order_dir' => 'nullable|string|in:asc,desc',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $perPage = (int) ($request->input('per_page', 20));
        $cacheKey = 'catalogo:productos:search:' . md5($request->fullUrl());

        $productosPaginados = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($request, $perPage) {
            $query = Producto::query()
                ->select([
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'productos.codigo_producto',
                    DB::raw('COALESCE(producto_vendedors.precio_venta, 0) as precio_venta'),
                    'categorias.id as categoria_id',
                    'categorias.nombre_categoria as categoria_nombre',
                    DB::raw('COALESCE(SUM(almacen_producto.cantidad), 0) as stock_total'),
                ])
                ->leftJoin('almacen_producto', 'productos.id', '=', 'almacen_producto.producto_id')
                ->leftJoin('producto_vendedors', function ($join) {
                    $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                        ->where('producto_vendedors.user_id', 1);
                })
                ->join('categorias', 'productos.categoria_id', '=', 'categorias.id')
                ->where('productos.activo', true)
                ->groupBy(
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'productos.codigo_producto',
                    'categorias.id',
                    'categorias.nombre_categoria',
                    'producto_vendedors.precio_venta'
                );

            if ($q = $request->input('q')) {
                $query->where(function ($sub) use ($q) {
                    $sub->where('productos.nombre_producto', 'LIKE', "%{$q}%")
                        ->orWhere('productos.codigo_producto', 'LIKE', "%{$q}%");
                });
            }

            if ($categoriaId = $request->input('categoria_id')) {
                $query->where('productos.categoria_id', $categoriaId);
            }

            if ($marca = $request->input('marca')) {
                $query->where('productos.marca_producto', 'LIKE', "%{$marca}%");
            }

            if (($precioMin = $request->input('precio_min')) !== null) {
                $query->whereRaw('COALESCE(producto_vendedors.precio_venta, 0) >= ?', [$precioMin]);
            }

            if (($precioMax = $request->input('precio_max')) !== null) {
                $query->whereRaw('COALESCE(producto_vendedors.precio_venta, 0) <= ?', [$precioMax]);
            }

            if ($etiquetas = $request->input('etiquetas')) {
                $terms = array_filter(array_map('trim', explode(',', $etiquetas)));
                foreach ($terms as $term) {
                    $query->where(function ($sub) use ($term) {
                        $sub->where('productos.nombre_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.descripcion_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.marca_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.modelo_producto', 'LIKE', "%{$term}%")
                            ->orWhere('productos.codigo_producto', 'LIKE', "%{$term}%");
                    });
                }
            }

            $orderBy = $request->input('order_by', 'nombre');
            $orderDir = strtolower($request->input('order_dir', 'asc')) === 'desc' ? 'desc' : 'asc';

            $orderByMap = [
                'nombre' => 'productos.nombre_producto',
                'precio' => 'precio_venta',
                'stock' => 'stock_total',
            ];

            if (! isset($orderByMap[$orderBy])) {
                $orderBy = 'nombre';
            }

            $query->orderBy($orderByMap[$orderBy], $orderDir);

            return $query->paginate($perPage)
                ->through(function ($producto) {
                    return [
                        'id' => $producto->id,
                        'nombre' => $producto->nombre_producto,
                        'slug' => Str::slug($producto->nombre_producto),
                        'precio_venta' => (float) $producto->precio_venta,
                        'stock' => (int) $producto->stock_total,
                        'imagen_principal' => $this->resolveImagenPrincipal($producto->imagen_producto),
                        'categoria' => [
                            'id' => $producto->categoria_id,
                            'nombre' => $producto->categoria_nombre,
                        ],
                        'descripcion_corta' => Str::limit($producto->descripcion_producto ?? '', 180),
                    ];
                });
        }, ['catalogo', 'productos', 'productos:search']);

        return response()->json($productosPaginados);
    }

    /**
     * Devuelve stock por producto desglosado por almacén.
     *
     * Ruta: GET /api/tienda/productos/{id}/stock
     *
     * @param  int  $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function stockPorProducto(int $id)
    {
        $cacheKey = "catalogo:producto:{$id}:stock";

        $stocks = $this->cacheRemember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($id) {
            return DB::table('almacen_producto')
                ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
                ->where('almacen_producto.producto_id', $id)
                ->where('almacen_producto.cantidad', '>', 0)
                ->select(
                    'almacens.id as almacen_id',
                    'almacens.nombre_almacen as almacen_nombre',
                    'almacen_producto.cantidad as stock'
                )
                ->orderBy('almacens.nombre_almacen')
                ->get();
        }, ['catalogo', "producto:{$id}"]);

        return response()->json($stocks);
    }

    /**
     * Devuelve un OpenAPI básico para el catálogo.
     *
     * Ruta: GET /api/tienda/docs/openapi.json
     */
    public function openApiSpec()
    {
        $spec = [
            'openapi' => '3.0.3',
            'info' => [
                'title' => 'Catálogo Público - API',
                'version' => '1.0.0',
                'description' => 'Documentación de la API pública para el catálogo de productos y almacenes.',
            ],
            'servers' => [
                ['url' => url('/')],
            ],
            'paths' => [
                '/api/tienda/almacenes' => [
                    'get' => [
                        'summary' => 'Lista todos los almacenes públicos',
                        'responses' => [
                            '200' => [
                                'description' => 'Lista de almacenes',
                            ],
                        ],
                    ],
                ],
                '/api/tienda/almacenes/{id}' => [
                    'get' => [
                        'summary' => 'Obtiene datos de un almacén',
                        'parameters' => [[
                            'name' => 'id',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'integer'],
                        ]],
                        'responses' => ['200' => ['description' => 'Datos del almacén']],
                    ],
                ],
                '/api/tienda/almacenes/{id}/productos' => [
                    'get' => [
                        'summary' => 'Lista productos de un almacén',
                        'parameters' => [
                            ['name' => 'id', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']],
                            ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'categoria_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                            ['name' => 'marca', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'precio_min', 'in' => 'query', 'schema' => ['type' => 'number']],
                            ['name' => 'precio_max', 'in' => 'query', 'schema' => ['type' => 'number']],
                            ['name' => 'order_by', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['nombre', 'precio', 'stock']]],
                            ['name' => 'order_dir', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['asc', 'desc']]],
                        ],
                        'responses' => ['200' => ['description' => 'Lista paginada de productos']],
                    ],
                ],
                '/api/tienda/productos' => [
                    'get' => [
                        'summary' => 'Búsqueda global de productos',
                        'parameters' => [
                            ['name' => 'q', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'categoria_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                            ['name' => 'marca', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'precio_min', 'in' => 'query', 'schema' => ['type' => 'number']],
                            ['name' => 'precio_max', 'in' => 'query', 'schema' => ['type' => 'number']],
                            ['name' => 'order_by', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['nombre', 'precio', 'stock']]],
                            ['name' => 'order_dir', 'in' => 'query', 'schema' => ['type' => 'string', 'enum' => ['asc', 'desc']]],
                        ],
                        'responses' => ['200' => ['description' => 'Resultados paginados de búsqueda de productos']],
                    ],
                ],
                '/api/tienda/productos/{id}' => [
                    'get' => [
                        'summary' => 'Obtiene un producto por ID',
                        'parameters' => [[
                            'name' => 'id',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'integer'],
                        ]],
                        'responses' => ['200' => ['description' => 'Detalle del producto']],
                    ],
                ],
                '/api/tienda/productos/{id}/stock' => [
                    'get' => [
                        'summary' => 'Stock por almacén para un producto',
                        'parameters' => [[
                            'name' => 'id',
                            'in' => 'path',
                            'required' => true,
                            'schema' => ['type' => 'integer'],
                        ]],
                        'responses' => ['200' => ['description' => 'Stock por almacén']],
                    ],
                ],
                '/api/tienda/categorias' => [
                    'get' => [
                        'summary' => 'Lista categorías activas',
                        'responses' => ['200' => ['description' => 'Listado de categorías']],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }

    /**
     * Página simple con Swagger UI apuntando al OpenAPI spec.
     *
     * Ruta: GET /api/tienda/docs
     */
    public function swaggerUi()
    {
        return response()->view('api-docs', [
            'openapiUrl' => url('/api/tienda/docs/openapi.json'),
        ]);
    }

    /**
     * Resuelve URL de imagen principal (fallback a placeholder si no existe).
     *
     * @param  string|null  $imagen
     * @return string|null
     */
    private function resolveImagenPrincipal(?string $imagen): ?string
    {
        if (!$imagen) {
            return asset('productos/producto-default.png');
        }

        // Asumimos que el campo almacena una ruta relativa usando storage público o public
        return asset($imagen);
    }
}
