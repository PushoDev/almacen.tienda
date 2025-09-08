<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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

    protected $appends = ['imagen_url', 'cantidad_total'];

    // Relación con categoría
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    // Relación con compras
    public function compras()
    {
        return $this->belongsToMany(Compra::class, 'compra_producto')
            ->withPivot('cantidad', 'precio');
    }

    // Relación con múltiples almacenes
    public function almacenes()
    {
        return $this->belongsToMany(Almacen::class, 'almacen_producto')
            ->withPivot('cantidad')
            ->withTimestamps();
    }

    // 🔥 Cantidad total en todos los almacenes
    public function getCantidadTotalAttribute()
    {
        return $this->almacenes->sum('pivot.cantidad');
    }

    // 🔥 Accesor para URL de la imagen (usa default si no hay)
    public function getImagenUrlAttribute(): string
    {
        return $this->imagen_producto
            ? asset('storage/' . $this->imagen_producto)
            : asset('storage/productos/producto-default.png');
    }
}
