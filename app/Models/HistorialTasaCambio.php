<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialTasaCambio extends Model
{
    protected $fillable = [
        'moneda_id',
        'user_id',
        'tasa_anterior',
        'tasa_nueva',
        'diferencia_tasa',
        'porcentaje_cambio',
        'total_cuentas_afectadas',
        'impacto_financiero',
        'impacto_porcentaje',
        'numero_cuentas_afectadas',
    ];

    protected $casts = [
        'tasa_anterior' => 'decimal:2',
        'tasa_nueva' => 'decimal:2',
        'diferencia_tasa' => 'decimal:2',
        'porcentaje_cambio' => 'decimal:2',
        'total_cuentas_afectadas' => 'decimal:2',
        'impacto_financiero' => 'decimal:2',
        'impacto_porcentaje' => 'decimal:2',
        'numero_cuentas_afectadas' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación con la moneda afectada
     */
    public function moneda(): BelongsTo
    {
        return $this->belongsTo(Moneda::class);
    }

    /**
     * Relación con el usuario que hizo el cambio
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class);
    }

    /**
     * Determinar si el cambio fue positivo (ganancia)
     */
    public function esGanancia(): bool
    {
        return $this->impacto_financiero > 0;
    }

    /**
     * Determinar si el cambio fue negativo (pérdida)
     */
    public function esPerdida(): bool
    {
        return $this->impacto_financiero < 0;
    }

    /**
     * Obtener el impacto formateado con signo
     */
    public function getImpactoFormateadoAttribute(): string
    {
        $signo = $this->impacto_financiero >= 0 ? '+' : '';
        return $signo . number_format($this->impacto_financiero, 2);
    }

    /**
     * Obtener el porcentaje de impacto formateado con signo
     */
    public function getImpactoPorcentajeFormateadoAttribute(): string
    {
        $signo = $this->impacto_porcentaje >= 0 ? '+' : '';
        return $signo . number_format($this->impacto_porcentaje, 2) . '%';
    }

    /**
     * Scope para obtener solo cambios que generaron ganancias
     */
    public function scopeGanancias($query)
    {
        return $query->where('impacto_financiero', '>', 0);
    }

    /**
     * Scope para obtener solo cambios que generaron pérdidas
     */
    public function scopePerdidas($query)
    {
        return $query->where('impacto_financiero', '<', 0);
    }

    /**
     * Scope para filtrar por moneda
     */
    public function scopePorMoneda($query, $monedaId)
    {
        return $query->where('moneda_id', $monedaId);
    }

    /**
     * Scope para filtrar por usuario
     */
    public function scopePorUsuario($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope para obtener cambios recientes
     */
    public function scopeRecientes($query, $dias = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($dias));
    }
}
