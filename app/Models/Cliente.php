<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre_cliente',
        'tipo_cliente',
        'deuda_pago_cliente',
        'telefono_cliente',
        'direccion_cliente',
        'ciudad_cliente',
    ];

    public $timestamps = true;

    protected $casts = [
        'deuda_pago_cliente' => 'decimal:2',
    ];

    public function setDeudaPagoClienteAttribute($value)
    {
        if (!is_null($value) && (!is_numeric($value) || $value < -9999999 || $value > 9999999)) {
            throw new \InvalidArgumentException('El valor de deuda debe estar entre -9999999 y 9999999');
        }
        $this->attributes['deuda_pago_cliente'] = $value;
    }

    // ❌ CORREGIR: Cambiar 'compra_pagos' por 'compra_pago'
    public function comprasComoPagador()
    {
        return $this->belongsToMany(Compra::class, 'compra_pago', 'cliente_id', 'compra_id')
            ->wherePivot('tipo_pago', 'cliente')
            ->withPivot('monto', 'tipo_pago')
            ->withTimestamps();
    }

    // ❌ ELIMINAR o COMENTAR: Esta relación no es correcta
    // public function compras()
    // {
    //     return $this->hasMany(Compra::class);
    // }

    // ✅ NUEVA: Relación directa con los pagos de compra
    public function pagosCompra()
    {
        return $this->hasMany(CompraPago::class, 'cliente_id')
            ->where('tipo_pago', 'cliente');
    }

    // Relaciones con ventas
    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }

    // Relación con movimientos financieros donde el cliente es origen
    public function movimientosComoOrigen()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cliente_origen_id')
            ->orderBy('fecha_operacion', 'desc');
    }

    // Relación con movimientos financieros donde el cliente es destino
    public function movimientosComoDestino()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cliente_destino_id')
            ->orderBy('fecha_operacion', 'desc');
    }

    // Relación combinada para todos los movimientos del cliente
    public function movimientosFinancieros()
    {
        $comoOrigen = $this->movimientosComoOrigen;
        $comoDestino = $this->movimientosComoDestino;

        return $comoOrigen->merge($comoDestino)->sortByDesc('fecha_operacion');
    }
}
