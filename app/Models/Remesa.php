<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Remesa extends Model
{
    protected $fillable = [
        'user_id',
        'turno_vendedor_id',
        'entrada_tipo',
        'entrada_cuenta_id',
        'entrada_cliente_id',
        'entrada_proveedor_id',
        'entrada_monto',
        'entrada_moneda',
        'entrada_saldo_anterior',
        'entrada_saldo_posterior',
        'salida_tipo',
        'salida_cuenta_id',
        'salida_cliente_id',
        'salida_proveedor_id',
        'salida_monto',
        'salida_moneda',
        'salida_saldo_anterior',
        'salida_saldo_posterior',
        'mensajero_cuenta_id',
        'mensajero_monto',
        'mensajero_moneda',
        'mensajero_saldo_anterior',
        'mensajero_saldo_posterior',
        'notas',
        'fecha_operacion',
        'estado',
        'motivo_anulacion',
        'detalle_anulacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_operacion' => 'datetime',
            'entrada_monto' => 'decimal:2',
            'entrada_saldo_anterior' => 'decimal:2',
            'entrada_saldo_posterior' => 'decimal:2',
            'salida_monto' => 'decimal:2',
            'salida_saldo_anterior' => 'decimal:2',
            'salida_saldo_posterior' => 'decimal:2',
            'mensajero_monto' => 'decimal:2',
            'mensajero_saldo_anterior' => 'decimal:2',
            'mensajero_saldo_posterior' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function turnoVendedor(): BelongsTo
    {
        return $this->belongsTo(TurnoVendedor::class);
    }

    public function entradaCuenta(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'entrada_cuenta_id');
    }

    public function entradaCliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'entrada_cliente_id');
    }

    public function entradaProveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'entrada_proveedor_id');
    }

    public function salidaCuenta(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'salida_cuenta_id');
    }

    public function salidaCliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class, 'salida_cliente_id');
    }

    public function salidaProveedor(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'salida_proveedor_id');
    }

    public function mensajeroCuenta(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'mensajero_cuenta_id');
    }

    /**
     * Nombre descriptivo de la entidad de entrada, según su tipo.
     */
    public function getNombreEntradaAttribute(): ?string
    {
        return match ($this->entrada_tipo) {
            'cuenta' => $this->entradaCuenta?->nombre_cuenta,
            'cliente' => $this->entradaCliente?->nombre_cliente,
            'proveedor' => $this->entradaProveedor?->nombre_proveedor,
            default => null,
        };
    }

    /**
     * Nombre descriptivo de la entidad de salida, según su tipo.
     */
    public function getNombreSalidaAttribute(): ?string
    {
        return match ($this->salida_tipo) {
            'cuenta' => $this->salidaCuenta?->nombre_cuenta,
            'cliente' => $this->salidaCliente?->nombre_cliente,
            'proveedor' => $this->salidaProveedor?->nombre_proveedor,
            default => null,
        };
    }
}
