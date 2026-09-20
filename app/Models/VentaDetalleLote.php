<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentaDetalleLote extends Model
{
    protected $fillable = [
        'venta_detalle_id',
        'lote_stock_id',
        'cantidad',
        'costo_unitario',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'costo_unitario' => 'decimal:2',
    ];

    public function ventaDetalle(): BelongsTo
    {
        return $this->belongsTo(VentaDetalle::class);
    }

    public function loteStock(): BelongsTo
    {
        return $this->belongsTo(LoteStock::class, 'lote_stock_id');
    }
}
