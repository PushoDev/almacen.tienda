<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VentaDetalle extends Model
{
    use HasFactory;

    protected $fillable = [
        'venta_id',
        'producto_id',
        'producto_codigo_id',
        'cantidad',
        'precio_venta',
        'precio_base',
        'subtotal',
        'costo_unitario',
        'ganancia',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    public function productoCodigo()
    {
        return $this->belongsTo(ProductoCodigo::class);
    }
}
