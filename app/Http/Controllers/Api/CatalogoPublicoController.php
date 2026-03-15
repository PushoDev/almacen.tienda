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

        $almacenes = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () {
            return Almacen::query()
                // Solo puntos de venta (visibles para catálogo público)
                ->where('tipo_almacen', 'punto_venta')
                ->select([
                    'id',
                    'nombre_almacen',
                    'ciudad_almacen',
                    'provincia_almacen',
                    'notas_almacen',
                ])
                ->orderBy('nombre_almacen')
                ->get()
                ->map(function (Almacen $almacen) {
                    return [
                        'id' => $almacen->id,
                        'nombre' => $almacen->nombre_almacen,
                        'ciudad' => $almacen->ciudad_almacen,
                        // En este modelo no hay dirección explícita, usamos notas como fallback
                        'direccion' => $almacen->notas_almacen,
                        'slug' => Str::slug($almacen->nombre_almacen),
                    ];
                });
        });

        return response()->json($almacenes);
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

        $perPage = (int) ($request->input('per_page', 20));
        $cacheKey = 'catalogo:productos:' . $almacenId . ':' . md5($request->fullUrl());

        $productosPaginados = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($request, $almacenId, $perPage) {
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
                        ->where('producto_vendedors.almacen_id', $almacenId)
                        // Por defecto se usa el precio del admin (user_id = 1) si existe.
                        ->where('producto_vendedors.user_id', 1);
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

            return $query->orderBy('productos.nombre_producto')
                ->paginate($perPage)
                ->through(function ($producto) {
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
                    ];
                });
        });

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

        $producto = Cache::remember($cacheKey, self::CACHE_TTL_SECONDS, function () use ($id) {
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
                ->leftJoin('producto_vendedors', function ($join) {
                    $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                        ->where('producto_vendedors.user_id', 1); // admin
                })
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
        });

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
