<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class AlmacenProducto extends Model
{
    protected $table = 'almacen_producto';

    protected $fillable = [
        'almacen_id',
        'producto_id',
        'cantidad',
    ];

    // Boot method to add model events
    protected static function boot()
    {
        parent::boot();

        // Adding model events to prevent negative quantities
        static::saving(function ($model) {
            if ($model->cantidad < 0) {
                Log::warning("Intento de guardar cantidad negativa para producto {$model->producto_id} en almacén {$model->almacen_id}", [
                    'cantidad' => $model->cantidad,
                    'user' => auth()->id() ?? 'system'
                ]);
                $model->cantidad = 0;
            }
        });
    }

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
