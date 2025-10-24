<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Venta extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'almacen_id',
        'cliente_id',
        'total',
        'detalles_venta',
        'estado',
        'moneda_id', // NUEVO: Relación con moneda principal usada
        'tasa_cambio_principal', // NUEVO: Tasa de cambio de la moneda principal
    ];

    protected $casts = [
        'tasa_cambio_principal' => 'decimal:6',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class);
    }

    public function pagos()
    {
        return $this->hasMany(PagoVenta::class);
    }

    // NUEVA: Relación con moneda
    public function moneda()
    {
        return $this->belongsTo(Moneda::class);
    }

    // NUEVO: Scope para ventas activas
    public function scopeCompletadas($query)
    {
        return $query->where('estado', 'completada');
    }

    public function scopePendientes($query)
    {
        return $query->where('estado', 'pendiente');
    }
}
