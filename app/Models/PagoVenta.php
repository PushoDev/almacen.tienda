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
        'via_pago',
        'tipo_moneda',
        'monto',
    ];

    protected $casts = [
        'monto' => 'decimal:2',
    ];

    // Relación con la venta principal
    public function venta(): BelongsTo
    {
        return $this->belongsTo(Venta::class);
    }
}