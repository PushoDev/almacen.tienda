<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MovimientosPendiente extends Model
{
    use HasFactory;

    protected $fillable = [
        'producto_id',
        'almacen_emisor_id',
        'almacen_receptor_id',
        'cantidad',
        'user_id',
        'estado',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function almacenEmisor()
    {
        return $this->belongsTo(Almacen::class, 'almacen_emisor_id');
    }

    public function almacenReceptor()
    {
        return $this->belongsTo(Almacen::class, 'almacen_receptor_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
