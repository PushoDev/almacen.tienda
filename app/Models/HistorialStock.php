<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialStock extends Model
{
    use HasFactory;

    protected $table = 'historial_stock'; // Asegúrate de que coincida con el nombre de la tabla

    protected $fillable = [
        'producto_id',
        'almacen_id',
        'venta_id',
        'cantidad_anterior',
        'cantidad_nueva',
        'diferencia',
        'tipo',
        'observaciones',
        'user_id',
    ];

    // Relaciones
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
