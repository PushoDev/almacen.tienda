<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Auditoría de un cambio en el valor real del inventario que no viene de una venta o compra
 * normal — ver la migración de creación para el porqué. `monto` positivo = ganancia, negativo =
 * pérdida.
 */
class AjusteValorInventario extends Model
{
    protected $table = 'ajustes_valor_inventario';

    public const TIPO_FUSION_LOTES = 'fusion_lotes';

    public const TIPO_PRORRATEO_SIN_DESTINO = 'prorrateo_sin_destino';

    protected $fillable = [
        'tipo',
        'producto_id',
        'almacen_id',
        'lote_id',
        'cost_distribution_id',
        'lote_fusion_id',
        'monto',
        'detalle',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'monto' => 'decimal:2',
        ];
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(LoteStock::class, 'lote_id');
    }

    public function costDistribution(): BelongsTo
    {
        return $this->belongsTo(CostDistribution::class);
    }

    public function loteFusion(): BelongsTo
    {
        return $this->belongsTo(LoteFusion::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
