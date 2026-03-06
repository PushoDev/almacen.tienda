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
        // NUEVOS CAMPOS (aceptan negativos)
        'tasa_aplicada_venta',
        'moneda_cobro_id',
        'monto_diferencia_cambiaria',
        // CAMPOS GESTOR
        'es_venta_gestor',
        'gestor_monto',
        'gestor_cuenta_id',
        'gestor_comentario',
        'tasa_aplicada_gestor',
    ];

    protected $casts = [
        'tasa_cambio_principal' => 'decimal:2',
        'total_ganancia' => 'decimal:2',
        'total_esperado_usd' => 'decimal:2',
        'ganancia_perdida_cambiaria' => 'decimal:2',
        'ganancia_real_total' => 'decimal:2',
        'tasa_aplicada_venta' => 'decimal:2',
        'monto_diferencia_cambiaria' => 'decimal:2',
        'tasa_aplicada_gestor' => 'decimal:2',
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

    public function moneda()
    {
        return $this->belongsTo(Moneda::class);
    }

    // RELACIÓN NUEVA PARA LA MONEDA DE COBRO
    public function monedaCobro()
    {
        return $this->belongsTo(Moneda::class, 'moneda_cobro_id');
    }

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

    // RELACIÓN GESTOR
    public function gestorCuenta()
    {
        return $this->belongsTo(Cuenta::class, 'gestor_cuenta_id');
    }
}
