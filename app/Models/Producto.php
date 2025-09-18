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
        'imagen_producto',
    ];

    protected $casts = [
        'precio_compra_producto' => 'decimal:2',
    ];

    protected $appends = ['imagen_url', 'cantidad_total', 'stock_bajo'];

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

    // 🔥 Stock bajo si es menor a 3
    public function getStockBajoAttribute(): bool
    {
        return $this->cantidad_total < 3;
    }

    // 🔥 Accesor para URL de imagen
    public function getImagenUrlAttribute(): string
    {
        return $this->imagen_producto
            ? asset('storage/' . $this->imagen_producto)
            : asset('storage/productos/producto-default.png');
    }
}
