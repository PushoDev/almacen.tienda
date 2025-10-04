<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoFinanciero extends Model
{
    use HasFactory;

    protected $table = 'movimientos_financieros';

    protected $fillable = [
        'tipo_movimiento_id',
        'cuenta_origen_id',
        'cliente_origen_id',
        'cuenta_destino_id',
        'cliente_destino_id',
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

    // -------------------------
    // --- Relaciones Comunes ---
    // -------------------------

    // El tipo de movimiento (Ingreso, Gasto, Transferencia)
    public function tipoMovimiento(): BelongsTo
    {
        return $this->belongsTo(TipoMovimientoFinanciero::class, 'tipo_movimiento_id');
    }

    // ----------------------------
    // --- Relaciones de Cuentas ---
    // ----------------------------

    // Cuenta de donde sale el dinero
    public function cuentaOrigen(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_origen_id');
    }

    // Cuenta donde entra el dinero
    public function cuentaDestino(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_destino_id');
    }

    // ----------------------------
    // --- Relaciones de Clientes ---
    // ----------------------------

    /**
     * Cliente de donde sale el dinero (cuando es un Gasto o Transferencia desde Cliente).
     */
    public function clienteOrigen(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_origen_id');
    }

    /**
     * Cliente donde entra el dinero (cuando es un Ingreso o Transferencia a Cliente).
     */
    public function clienteDestino(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'cliente_destino_id');
    }
}
