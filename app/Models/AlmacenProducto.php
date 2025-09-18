<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlmacenProducto extends Model
{
    protected $table = 'almacen_producto';

    protected $fillable = [
        'almacen_id',
        'producto_id',
        'cantidad',
    ];

    // 🔹 Relación con almacén
    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    // 🔹 Relación con producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    // 🔥 Accesor: stock bajo si la cantidad < 3
    public function getStockBajoAttribute(): bool
    {
        return $this->cantidad < 3;
    }
}
