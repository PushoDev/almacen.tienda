<?php

namespace App\Models;

use Exception;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class Producto extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';

    protected $table = 'productos';

    protected $fillable = [
        'nombre_producto',
        'marca_producto',
        'modelo_producto',
        'capacidad_producto',
        'color_producto',
        'codigo_producto',
        'barcode_image',
        'categoria_id',
        'precio_compra_producto',
        'descripcion_producto',
        'imagen_producto',
        'activo',
    ];

    protected $casts = [
        'precio_compra_producto' => 'decimal:2',
    ];

    protected $appends = [
        'imagen_url',
        'cantidad_total',
        'stock_bajo',
        'barcode_image_url',
    ];

    protected static function boot()
    {
        parent::boot();

        // Limpiar cache relacionado con el catálogo público cuando cambia un producto
        static::saved(function ($producto) {
            try {
                $cache = Cache::getStore();

                if (method_exists($cache, 'tags')) {
                    Cache::tags(['catalogo', 'productos'])->flush();
                    Cache::tags(['catalogo', "producto:{$producto->id}"])->forget("catalogo:producto:{$producto->id}");
                } else {
                    Cache::forget("catalogo:producto:{$producto->id}");
                }
            } catch (Exception $e) {
                logger()->warning('No se pudo limpiar cache de producto: '.$e->getMessage());
            }
        });

        static::deleted(function ($producto) {
            try {
                $cache = Cache::getStore();

                if (method_exists($cache, 'tags')) {
                    Cache::tags(['catalogo', 'productos'])->flush();
                    Cache::tags(['catalogo', "producto:{$producto->id}"])->forget("catalogo:producto:{$producto->id}");
                } else {
                    Cache::forget("catalogo:producto:{$producto->id}");
                }
            } catch (Exception $e) {
                logger()->warning('No se pudo limpiar cache de producto: '.$e->getMessage());
            }
        });
    }

    /**
     * Relación con códigos de barras múltiples
     */
    public function codigos()
    {
        return $this->hasMany(ProductoCodigo::class);
    }

    // 🔹 Relación con categoría
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    // 🔹 Relación con almacenes
    public function almacenes()
    {
        return $this->belongsToMany(Almacen::class, 'almacen_producto')
            ->withPivot('cantidad')
            ->withTimestamps();
    }

    // 🔹 Relación con vendedores
    public function vendedores()
    {
        return $this->belongsToMany(User::class, 'producto_vendedors')
            ->using(ProductoVendedor::class)
            ->withPivot('precio_venta', 'venta_ganancia')
            ->withTimestamps();
    }

    // Historial de cambios de costo de este producto (una entrada por cada distribución de
    // costos que lo afectó, más antigua a más reciente por defecto).
    public function costoHistorial()
    {
        return $this->hasMany(CostoHistorial::class, 'product_id')->orderBy('created_at');
    }

    // Lotes de stock (trazabilidad de costo por almacén, ver LoteStock).
    public function lotesStock()
    {
        return $this->hasMany(LoteStock::class, 'producto_id');
    }

    /**
     * Costo real de este producto en un almacén puntual — promedio ponderado de los lotes con
     * stock disponible ahí (por compra directa o por movimiento recibido), no el costo global de
     * la ficha. Dos almacenes pueden tener costo distinto del mismo producto cuando un traslado
     * entre ellos se prorrateó (o no) de forma independiente.
     *
     * Pondera sobre `cantidad_disponible` (lo que realmente queda de cada lote), no `cantidad`
     * (lo que entró originalmente) — un lote ya parcial o totalmente consumido por una venta/
     * traslado posterior no debe seguir pesando en el promedio como si siguiera completo.
     *
     * Sin lotes con `cantidad_disponible` > 0 en ese almacén (producto nunca aprobado/recibido,
     * o dato de antes de que lotes_stock existiera, 2026-09-07) cae al costo global de la ficha —
     * mejor aproximación disponible, nunca un error.
     */
    public function costoEnAlmacen(int $almacenId): float
    {
        $lotes = $this->lotesStock()->where('almacen_id', $almacenId)->where('cantidad_disponible', '>', 0)->get();

        $cantidadTotal = $lotes->sum('cantidad_disponible');

        if ($lotes->isEmpty() || $cantidadTotal <= 0) {
            return (float) $this->precio_compra_producto;
        }

        $costoTotal = $lotes->sum(fn (LoteStock $lote) => $lote->cantidad_disponible * (float) $lote->precio_costo);

        return round($costoTotal / $cantidadTotal, 2);
    }

    /**
     * Lotes con stock disponible de este producto en un almacén, más viejo primero (orden FIFO
     * — ver LoteConsumoService). Usado donde hace falta mostrar/elegir el desglose real en vez
     * del promedio de costoEnAlmacen() (Show.tsx/Edit.tsx, selector de venta).
     *
     * @return Collection<int, LoteStock>
     */
    public function lotesActivosEnAlmacen(int $almacenId)
    {
        return $this->lotesStock()
            ->where('almacen_id', $almacenId)
            ->where('cantidad_disponible', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();
    }

    /**
     * Precio de venta general de este producto en un almacén — `producto_vendedors`, clave real
     * producto_id+almacen_id (no por `vendedores()`, esa relación quedó rota desde la migración
     * `refactor_producto_vendedors_unico_por_almacen`, columna `user_id` ya no existe). Null si
     * nunca se le asignó precio ahí (producto sin publicar para venta en ese almacén).
     */
    public function precioVentaEnAlmacen(int $almacenId): ?float
    {
        $precio = DB::table('producto_vendedors')
            ->where('producto_id', $this->id)
            ->where('almacen_id', $almacenId)
            ->value('precio_venta');

        return $precio !== null ? (float) $precio : null;
    }

    /**
     * Precio de venta efectivo de un lote puntual — "Opción A" (2026-09-20): por defecto hereda
     * el precio general del almacén (mismo para el 95% del catálogo, que nunca necesita un precio
     * distinto por lote), salvo que el lote tenga su propio `precio_venta` seteado a mano (cuando
     * el costo de ese lote específico deja muy poco margen con el precio general). Nunca
     * obligatorio: un lote recién creado (ej. por un Movimiento) nunca queda "sin precio".
     */
    public function precioVentaEfectivo(LoteStock $lote): ?float
    {
        if ($lote->precio_venta !== null) {
            return (float) $lote->precio_venta;
        }

        return $this->precioVentaEnAlmacen($lote->almacen_id);
    }

    // 🔥 Cantidad total en todos los almacenes
    public function getCantidadTotalAttribute(): int
    {
        return $this->almacenes->sum('pivot.cantidad');
    }

    // 🔥 Stock bajo si es menor a 5
    public function getStockBajoAttribute(): bool
    {
        return $this->cantidad_total < 5;
    }

    // 🔥 Accesor para URL de imagen
    public function getImagenUrlAttribute(): string
    {
        if (! $this->imagen_producto) {
            return asset('productos/producto-default.png');
        }

        return asset($this->imagen_producto);
    }

    public function getBarcodeImageUrlAttribute(): ?string
    {
        if (! $this->barcode_image || ! file_exists(public_path($this->barcode_image))) {
            return null;
        }

        return asset($this->barcode_image);
    }

    /**
     * Scope para buscar por código de barras
     */
    public function scopePorCodigo($query, $codigo)
    {
        return $query->where('codigo_producto', $codigo)
            ->orWhereHas('codigos', function ($q) use ($codigo) {
                $q->where('codigo_barras', $codigo);
            });
    }

    /**
     * Scope para buscar productos por partes del nombre, marca o modelo
     */
    public function scopeBuscar($query, $termino)
    {
        return $query->where('nombre_producto', 'LIKE', "%{$termino}%")
            ->orWhere('marca_producto', 'LIKE', "%{$termino}%")
            ->orWhere('modelo_producto', 'LIKE', "%{$termino}%")
            ->orWhere('codigo_producto', 'LIKE', "%{$termino}%")
            ->orWhereHas('codigos', function ($q) use ($termino) {
                $q->where('codigo_barras', 'LIKE', "%{$termino}%");
            });
    }

    /**
     * Scope para filtrar productos con stock bajo (menos de 3 unidades totales)
     */
    public function scopeStockBajo($query)
    {
        return $query->with('almacenes')->get()->filter(function ($producto) {
            return $producto->cantidad_total < 5;
        });
    }

    /**
     * Verifica si la imagen del código de barras existe físicamente
     */
    public function barcodeImageExists(): bool
    {
        return $this->barcode_image && file_exists(public_path($this->barcode_image));
    }

    /**
     * Elimina la imagen física del código de barras
     */
    public function eliminarBarcodeImage(): bool
    {
        if ($this->barcode_image && file_exists(public_path($this->barcode_image))) {
            return unlink(public_path($this->barcode_image));
        }

        return false;
    }
}
