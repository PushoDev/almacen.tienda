<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MovimientoFinanciero extends Model
{
    use HasFactory;

    protected $table = 'movimientos_financieros';

    protected $fillable = [
        'tipo_movimiento_id',
        'cuenta_origen_id',
        'cuenta_destino_id',
        'monto',
        'moneda',
        'tasa_cambio_aplicada',
        'descripcion',
        'fecha_operacion',
        'estado',
    ];

    protected $casts = [
        'fecha_operacion' => 'datetime',
        'monto' => 'double',
        'tasa_cambio_aplicada' => 'double',
    ];
    
    // --- Relaciones ---

    // El tipo de movimiento (Ingreso, Gasto, Transferencia)
    public function tipoMovimiento()
    {
        return $this->belongsTo(TipoMovimientoFinanciero::class, 'tipo_movimiento_id');
    }

    // Cuenta de donde sale el dinero
    public function cuentaOrigen()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_origen_id');
    }
    
    // Cuenta donde entra el dinero
    public function cuentaDestino()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_destino_id');
    }
}