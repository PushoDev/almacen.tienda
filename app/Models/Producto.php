<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Milon\Barcode\Facades\DNS1DFacade as DNS1D;
use Illuminate\Support\Facades\Storage;
use Exception;

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
        'barcode_image_url'
    ];

    protected static function boot()
    {
        parent::boot();

        // Limpiar cache relacionado con el catálogo público cuando cambia un producto
        static::saved(function ($producto) {
            try {
                $cache = \Illuminate\Support\Facades\Cache::getStore();

                if (method_exists($cache, 'tags')) {
                    \Illuminate\Support\Facades\Cache::tags(['catalogo', 'productos'])->flush();
                    \Illuminate\Support\Facades\Cache::tags(['catalogo', "producto:{$producto->id}"])->forget("catalogo:producto:{$producto->id}");
                } else {
                    \Illuminate\Support\Facades\Cache::forget("catalogo:producto:{$producto->id}");
                }
            } catch (\Exception $e) {
                logger()->warning('No se pudo limpiar cache de producto: ' . $e->getMessage());
            }
        });

        static::deleted(function ($producto) {
            try {
                $cache = \Illuminate\Support\Facades\Cache::getStore();

                if (method_exists($cache, 'tags')) {
                    \Illuminate\Support\Facades\Cache::tags(['catalogo', 'productos'])->flush();
                    \Illuminate\Support\Facades\Cache::tags(['catalogo', "producto:{$producto->id}"])->forget("catalogo:producto:{$producto->id}");
                } else {
                    \Illuminate\Support\Facades\Cache::forget("catalogo:producto:{$producto->id}");
                }
            } catch (\Exception $e) {
                logger()->warning('No se pudo limpiar cache de producto: ' . $e->getMessage());
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
        if (!$this->imagen_producto) {
            return asset('productos/producto-default.png');
        }

        return asset($this->imagen_producto);
    }

    public function getBarcodeImageUrlAttribute(): ?string
    {
        if (!$this->barcode_image || !file_exists(public_path($this->barcode_image))) {
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
