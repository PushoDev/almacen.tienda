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
        'comision_base',
        'subtotal',
        'costo_unitario',
        'ganancia',
        'comision_unitaria',
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

    /**
     * De qué lote(s) salió esta línea (ver LoteConsumoService::consumir()) — puede ser más de
     * uno si el pedido cruzó el remanente de un lote. Usado para revertir el consumo al anular
     * la venta (ver VentaController::anularVenta()).
     */
    public function loteConsumos()
    {
        return $this->hasMany(VentaDetalleLote::class);
    }
}
