<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PagoVenta extends Model
{
    use HasFactory;

    protected $fillable = [
        'venta_id',
        'tipo_pago',
        'moneda_id',
        'cuenta_id',
        'cliente_id',
        'via_pago',
        'monto',
        'tasa_cambio_aplicada',
        'monto_equivalente',
        'referencia',
        'saldo_anterior',
        'saldo_posterior',
    ];

    protected $casts = [
        'tasa_cambio_aplicada' => 'decimal:2',
        'monto' => 'decimal:2',
        'monto_equivalente' => 'decimal:2',
        'saldo_anterior' => 'double',
        'saldo_posterior' => 'double',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // NUEVA: Relación con moneda
    public function moneda()
    {
        return $this->belongsTo(Moneda::class);
    }
}
