<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PagoVenta extends Model
{
    /** @use HasFactory<\Database\Factories\PagoVentaFactory> */
    use HasFactory;

    protected $fillable = [
        'venta_id',
        'tipo_pago',
        'monto',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }
}
