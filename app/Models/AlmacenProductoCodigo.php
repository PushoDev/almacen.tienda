<?php

namespace App\Models;

use Database\Factories\AlmacenProductoCodigoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Unidades de un código de barras que hay en un almacén (ver CodigoStockService).
 */
class AlmacenProductoCodigo extends Model
{
    /** @use HasFactory<AlmacenProductoCodigoFactory> */
    use HasFactory;

    protected $fillable = [
        'almacen_id',
        'producto_codigo_id',
        'cantidad',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
        ];
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    public function productoCodigo(): BelongsTo
    {
        return $this->belongsTo(ProductoCodigo::class);
    }
}
