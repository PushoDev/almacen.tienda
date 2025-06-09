<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Producto extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'productos';

    protected $fillable = [
        'nombre_producto',
        'marca_producto',
        'codigo_producto',
        'categoria_id',
        'precio_compra_producto',
        'cantidad_producto',
        'imagen_producto',
    ];

    protected $casts = [
        'precio_compra_producto' => 'decimal:2',
        'cantidad_producto' => 'integer',
    ];

    // Relación con categorías
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    // Accesor para URL de imagen
    public function getImagenUrlAttribute(): ?string
    {
        return $this->imagen_producto
            ? asset('storage/' . $this->imagen_producto)
            : null;
    }

    // Relación con compras (many-to-many)
    public function compras()
    {
        return $this->belongsToMany(Compra::class, 'compra_producto')
            ->withPivot('cantidad', 'precio');
    }

    // Relación directa con un almacén (si se usa en otro contexto)
    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }

    // Relación con múltiples almacenes (many-to-many)
    public function almacenes()
    {
        return $this->belongsToMany(Almacen::class, 'almacen_producto')
            ->withPivot('cantidad')
            ->withTimestamps(); // Asegura manejo de timestamps si existen
    }

    // Método para estructurar datos de almacenes
    public function getAlmacenesConCantidad()
    {
        return $this->almacenes->map(function ($almacen) {
            return [
                'id' => $almacen->id,
                'nombre_almacen' => $almacen->nombre_almacen,
                'pivot' => [
                    'cantidad' => $almacen->pivot->cantidad,
                ],
            ];
        });
    }

    /**
     * Undocumented function
     * Relación con vendedores y sus precios
     * @return void
     */
    public function vendedores()
    {
        return $this->belongsToMany(User::class, 'producto_vendedors')
            ->using(ProductoVendedor::class)
            ->withPivot('precio_venta', 'venta_ganancia');
    }
}
