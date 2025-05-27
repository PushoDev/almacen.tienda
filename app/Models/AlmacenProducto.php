<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AlmacenProducto extends Model
{
    use HasFactory;

    // Especifica el nombre de la tabla
    protected $table = 'almacen_producto';

    // Define los campos que pueden ser llenados
    protected $fillable = ['almacen_id', 'producto_id', 'cantidad'];

    // Relación con Almacen
    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }
}
