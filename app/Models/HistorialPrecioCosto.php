<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialPrecioCosto extends Model
{
    protected $table = 'historial_precio_costos';

    protected $fillable = [
        'producto_id',
        'almacen_id',
        'user_id',
        'precio_anterior',
        'precio_nuevo',
        'diferencia',
        'stock_momento',
        'impacto_financiero',
        'es_perdida',
        'motivo',
    ];

    protected $casts = [
        'precio_anterior' => 'decimal:4',
        'precio_nuevo' => 'decimal:4',
        'diferencia' => 'decimal:4',
        'stock_momento' => 'integer',
        'impacto_financiero' => 'decimal:4',
        'es_perdida' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function esGanancia(): bool
    {
        return (float) $this->impacto_financiero > 0;
    }

    public function getImpactoFormateadoAttribute(): string
    {
        $signo = (float) $this->impacto_financiero >= 0 ? '+' : '';

        return $signo.number_format((float) $this->impacto_financiero, 2);
    }

    public function scopeGanancias($query)
    {
        return $query->where('impacto_financiero', '>', 0);
    }

    public function scopePerdidas($query)
    {
        return $query->where('impacto_financiero', '<', 0);
    }

    public function scopePorProducto($query, $productoId)
    {
        return $query->where('producto_id', $productoId);
    }

    public function scopeRecientes($query, $dias = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($dias));
    }
}
