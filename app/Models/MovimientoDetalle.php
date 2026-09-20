<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoDetalle extends Model
{
    use HasFactory;

    protected $fillable = [
        'movimiento_id',
        'producto_id',
        'cantidad_solicitada',
        'cantidad_despachada',
        'cantidad_recibida',
        'costo_unitario',
        'observaciones',
    ];

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class);
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }
}
