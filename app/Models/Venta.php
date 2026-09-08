<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'turno_vendedor_id',
        'almacen_id',
        'cliente_id',
        'total',
        'estado',
        'moneda_id',
        'tasa_cambio_principal',
        'total_ganancia',
        'total_comision',
        'total_esperado_usd',
        'ganancia_perdida_cambiaria',
        'ganancia_real_total',
        'ganancia_neta',
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
        // CAMPOS VENTA ESPECIAL
        'es_venta_especial',
        'nota_venta_especial',
        'decision_notificada',
        // ANULACIÓN
        'motivo_anulacion',
        'detalle_anulacion',
        // MENSAJERO
        'mensajero_monto',
        'mensajero_tipo',
        'mensajero_cuenta_id',
        'mensajero_tasa',
        'mensajero_moneda_id',
        'mensajero_monto_original',
        'mensajero_tasa_entrada',
        'mensajero_monto_final_cup',
        // COMISIÓN VENDEDOR
        'comision_cuenta_id',
        'comision_tasa',
        // MENSAJERO ORIGEN
        'mensajero_cuenta_origen_id',
        // SALDO ANTERIOR/POSTERIOR (auditoría, ver Rastreo de Operaciones)
        'comision_saldo_anterior',
        'comision_saldo_posterior',
        'gestor_saldo_anterior',
        'gestor_saldo_posterior',
        'mensajero_saldo_anterior',
        'mensajero_saldo_posterior',
    ];

    protected $casts = [
        'tasa_cambio_principal' => 'decimal:2',
        'total_ganancia' => 'decimal:2',
        'total_comision' => 'decimal:2',
        'total_esperado_usd' => 'decimal:2',
        'ganancia_perdida_cambiaria' => 'decimal:2',
        'ganancia_real_total' => 'decimal:2',
        'ganancia_neta' => 'decimal:2',
        'tasa_aplicada_venta' => 'decimal:2',
        'monto_diferencia_cambiaria' => 'decimal:2',
        'tasa_aplicada_gestor' => 'decimal:2',
        'es_venta_especial' => 'boolean',
        'decision_notificada' => 'boolean',
        'mensajero_monto' => 'decimal:2',
        'mensajero_monto_final_cup' => 'decimal:2',
        'mensajero_tasa' => 'decimal:4',
        'mensajero_monto_original' => 'decimal:4',
        'mensajero_tasa_entrada' => 'decimal:4',
        'comision_tasa' => 'decimal:4',
        'comision_saldo_anterior' => 'double',
        'comision_saldo_posterior' => 'double',
        'gestor_saldo_anterior' => 'double',
        'gestor_saldo_posterior' => 'double',
        'mensajero_saldo_anterior' => 'double',
        'mensajero_saldo_posterior' => 'double',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function turnoVendedor()
    {
        return $this->belongsTo(TurnoVendedor::class);
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

    public function scopeSolicitudesEspeciales($query)
    {
        return $query->where('estado', 'solicitud_especial');
    }

    public function scopeRechazadas($query)
    {
        return $query->where('estado', 'rechazada');
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

    // RELACIÓN MENSAJERO
    public function mensajeroCuenta()
    {
        return $this->belongsTo(Cuenta::class, 'mensajero_cuenta_id');
    }

    public function mensajeroMoneda()
    {
        return $this->belongsTo(Moneda::class, 'mensajero_moneda_id');
    }

    // RELACIÓN COMISIÓN VENDEDOR
    public function comisionCuenta()
    {
        return $this->belongsTo(Cuenta::class, 'comision_cuenta_id');
    }

    // RELACIÓN MENSAJERO CUENTA ORIGEN (de donde sale el dinero)
    public function mensajeroOrigenCuenta()
    {
        return $this->belongsTo(Cuenta::class, 'mensajero_cuenta_origen_id');
    }
}
