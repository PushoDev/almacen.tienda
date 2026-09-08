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
        'user_id',
        'turno_vendedor_id',
        'tipo_movimiento_id',
        'cuenta_origen_id',
        'cliente_origen_id',
        'cuenta_destino_id',
        'cliente_destino_id',
        'proveedor_destino_id',
        'monto',
        'moneda',
        'tasa_cambio_aplicada',
        'tasa_oficial_en_momento',
        'ganancia_perdida_cambiaria',
        'descripcion',
        'fecha_operacion',
        'estado',
        'saldo_anterior_origen',
        'saldo_posterior_origen',
        'moneda_origen',
        'saldo_anterior_destino',
        'saldo_posterior_destino',
        'moneda_destino',
    ];

    protected $casts = [
        'fecha_operacion' => 'datetime',
        'monto' => 'double',
        'tasa_cambio_aplicada' => 'double',
        'tasa_oficial_en_momento' => 'double',
        'ganancia_perdida_cambiaria' => 'double',
        'saldo_anterior_origen' => 'double',
        'saldo_posterior_origen' => 'double',
        'saldo_anterior_destino' => 'double',
        'saldo_posterior_destino' => 'double',
    ];

    // -------------------------
    // --- Relaciones con Usuario ---
    // -------------------------

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function turnoVendedor(): BelongsTo
    {
        return $this->belongsTo(TurnoVendedor::class);
    }

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

    /**
     * Proveedor el cual recivira monto para pagos
     */
    public function proveedorDestino(): BelongsTo
    {
        return $this->belongsTo(Proveedor::class, 'proveedor_destino_id');
    }

    // -------------------------
    // --- Métodos Auxiliares ---
    // -------------------------

    /**
     * Verifica si este movimiento tiene datos de saldos guardados
     */
    public function tieneDatosSaldos(): bool
    {
        return $this->saldo_anterior_origen !== null ||
            $this->saldo_anterior_destino !== null;
    }

    /**
     * Obtiene el nombre descriptivo de la entidad origen
     */
    public function getNombreOrigenAttribute(): ?string
    {
        if ($this->cuentaOrigen) {
            return $this->cuentaOrigen->nombre_cuenta;
        }
        if ($this->clienteOrigen) {
            return $this->clienteOrigen->nombre_cliente;
        }

        return null;
    }

    /**
     * Obtiene el nombre descriptivo de la entidad destino
     */
    public function getNombreDestinoAttribute(): ?string
    {
        if ($this->cuentaDestino) {
            return $this->cuentaDestino->nombre_cuenta;
        }
        if ($this->clienteDestino) {
            return $this->clienteDestino->nombre_cliente;
        }
        if ($this->proveedorDestino) {
            return $this->proveedorDestino->nombre_proveedor;
        }

        return null;
    }
}
