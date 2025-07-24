<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    // Atributos que pueden ser asignados masivamente
    protected $fillable = [
        'nombre_cliente',
        'tipo_cliente',
        'deuda_pago_cliente',
        'telefono_cliente',
        'direccion_cliente',
        'ciudad_cliente',
    ];

    // Desactivar marcas de tiempo si no son necesarias (opcional)
    public $timestamps = true;

    // Para forzar decimal
    protected $casts = [
        'deuda_pago_cliente' => 'decimal:2',
    ];

    // Validar antes de guardar
    public function setDeudaPagoClienteAttribute($value)
    {
        if (!is_null($value) && (!is_numeric($value) || $value < -9999999 || $value > 9999999)) {
            throw new \InvalidArgumentException('El valor de deuda debe estar entre -9999999 y 9999999');
        }
        $this->attributes['deuda_pago_cliente'] = $value;
    }

    // Relación con compras donde el cliente participa en el pago
    public function comprasComoPagador()
    {
        return $this->belongsToMany(Compra::class, 'compra_pagos')
            ->withPivot('monto');
    }

    public function compras()
    {
        return $this->hasMany(Compra::class);
    }

    // Relaciones (si las hay en el futuro)
    public function ventas()
    {
        return $this->hasMany(Venta::class);
    }
}
