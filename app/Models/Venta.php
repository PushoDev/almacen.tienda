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
        'estado',
        'moneda_id',
        'tasa_cambio_principal',
        'total_ganancia',
        'total_esperado_usd',
        'ganancia_perdida_cambiaria',
        'ganancia_real_total',
    ];

    protected $casts = [
        'tasa_cambio_principal' => 'decimal:6',
        'total_ganancia' => 'decimal:4',
        'total_esperado_usd' => 'decimal:4',
        'ganancia_perdida_cambiaria' => 'decimal:4',
        'ganancia_real_total' => 'decimal:4',
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

    public function destinatario()
    {
        return $this->hasOne(DestinatarioVenta::class);
    }
}
