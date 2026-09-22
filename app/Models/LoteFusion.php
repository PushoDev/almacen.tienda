<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Registro de auditoría de una fusión de lotes (ver FusionLotesService).
 */
class LoteFusion extends Model
{
    protected $fillable = [
        'producto_id',
        'almacen_id',
        'lote_resultante_id',
        'user_id',
        'lotes_origen',
        'cantidad_total',
        'costo_resultante',
    ];

    protected function casts(): array
    {
        return [
            'lotes_origen' => 'array',
            'cantidad_total' => 'integer',
            'costo_resultante' => 'decimal:2',
        ];
    }

    public function loteResultante(): BelongsTo
    {
        return $this->belongsTo(LoteStock::class, 'lote_resultante_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
