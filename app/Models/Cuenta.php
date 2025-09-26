<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cuenta extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'cuentas';


    // Propiedades que pueden ser asignadas masivamente (ACTUALIZADO)
    protected $fillable = [
        'nombre_cuenta',
        'saldo_cuenta',
        'tipo_moneda',
        'deuda',
        'tipo_cuenta',
        'notas_cuenta',
        // NUEVOS CAMPOS
        'tipo',
        'saldo_disponible',
        'estado',
    ];

    // Casts para manejar tipos de datos específicos (ACTUALIZADO)
    protected $casts = [
        'saldo_cuenta' => 'double',
        'saldo_disponible' => 'double', // NUEVO
        'deuda' => 'double',
        'tipo_cuenta' => 'string',
        'tipo_moneda' => 'string',
        'tipo' => 'string', // NUEVO
    ];

    // Relación con compras (opcional) - MANTENIDA
    public function compras()
    {
        return $this->belongsToMany(Compra::class, 'compra_pago')
            ->withPivot('monto');
    }

    // NUEVAS RELACIONES con Movimientos Financieros
    public function movimientosOrigen()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cuenta_origen_id');
    }

    public function movimientosDestino()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cuenta_destino_id');
    }
}
