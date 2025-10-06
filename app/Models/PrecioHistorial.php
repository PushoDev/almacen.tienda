<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrecioHistorial extends Model
{
    protected $fillable = [
        'producto_id',
        'user_id',
        'almacen_id', // 🚨 AGREGADO
        'precio_anterior',
        'precio_nuevo',
        'accion'
    ];

    // Relación con producto
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Relación con usuario
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // 💡 NUEVA RELACIÓN: Con Almacén
    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }
}
