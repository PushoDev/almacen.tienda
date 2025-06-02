<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movimiento extends Model
{
    protected $fillable = [
        'almacen_emisor_id',
        'almacen_receptor_id',
        'producto_id',
        'cantidad',
    ];

    // Relación con Almacen Emisor
    public function almacenEmisor()
    {
        return $this->belongsTo(Almacen::class, 'almacen_emisor_id');
    }

    // Relación con Almacen Receptor
    public function almacenReceptor()
    {
        return $this->belongsTo(Almacen::class, 'almacen_receptor_id');
    }

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }
}
