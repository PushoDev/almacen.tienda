<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PagoVenta extends Model
{
    use HasFactory;

    protected $fillable = [
        'venta_id',
        'tipo_pago',
        'tipo_moneda',
        'cuenta_id',
        'via_pago',
        'monto',
        'tasa_cambio',
        'monto_equivalente',
        'referencia'
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class);
    }
}
