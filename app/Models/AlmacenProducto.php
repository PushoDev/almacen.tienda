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

    // Relación con Almacen
    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
