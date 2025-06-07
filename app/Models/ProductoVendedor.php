<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductoVendedor extends Pivot
{
    protected $table = 'producto_vendedors';

    protected $casts = [
        'precio_venta' => 'decimal:2',
        'importe_ganancia' => 'decimal:2'
    ];

    // Relación con Producto (opcional, si necesitas acceder desde aquí)
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Relación con User (opcional)
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
