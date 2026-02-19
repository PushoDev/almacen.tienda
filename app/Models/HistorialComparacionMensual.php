<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialComparacionMensual extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'mes_comparado',
        'moneda_codigo',
        'moneda_nombre',
        'moneda_simbolo',
        'monto_anterior',
        'monto_actual',
        'diferencia',
        'porcentaje_cambio',
        'tasa_cambio_usada',
    ];

    protected $casts = [
        'mes_comparado' => 'date',
        'monto_anterior' => 'decimal:2',
        'monto_actual' => 'decimal:2',
        'diferencia' => 'decimal:2',
        'porcentaje_cambio' => 'decimal:2',
        'tasa_cambio_usada' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function esPositivo(): bool
    {
        return $this->diferencia >= 0;
    }

    public function getDiferenciaFormateadaAttribute(): string
    {
        $signo = $this->diferencia >= 0 ? '+' : '';
        return $signo . number_format($this->diferencia, 2);
    }

    public function getPorcentajeFormateadoAttribute(): string
    {
        $signo = $this->porcentaje_cambio >= 0 ? '+' : '';
        return $signo . number_format($this->porcentaje_cambio, 2) . '%';
    }
}
