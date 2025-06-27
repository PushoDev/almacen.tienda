<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrecioHistorial extends Model
{
    protected $fillable = [
        'producto_id',
        'user_id',
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
}
