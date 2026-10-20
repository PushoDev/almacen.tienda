<?php

namespace App\Models;

use Database\Factories\CasilleroCargoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Cargo a mano (p. ej. la estadía en Panamá) sobre una o varias compras del casillero. El monto lo
 * escribe el usuario; se paga con un Gasto desde una cuenta en el momento de anotarlo (ver
 * App\Services\CasilleroService).
 */
class CasilleroCargo extends Model
{
    /** @use HasFactory<CasilleroCargoFactory> */
    use HasFactory;

    public const ESTADO_ACTIVO = 'activo';

    public const ESTADO_ANULADO = 'anulado';

    protected $fillable = [
        'user_id',
        'concepto',
        'nota',
        'moneda',
        'monto',
        'tasa_cambio',
        'monto_usd',
        'cuenta_id',
        'movimiento_financiero_id',
        'fecha',
        'estado',
        'motivo_anulacion',
    ];

    protected $casts = [
        'monto' => 'double',
        'tasa_cambio' => 'double',
        'monto_usd' => 'double',
        'fecha' => 'date',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function cuenta(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class);
    }

    public function movimientoFinanciero(): BelongsTo
    {
        return $this->belongsTo(MovimientoFinanciero::class);
    }

    public function compras(): BelongsToMany
    {
        return $this->belongsToMany(Compra::class, 'casillero_cargo_compra')->withTimestamps();
    }

    public function estaActivo(): bool
    {
        return $this->estado === self::ESTADO_ACTIVO;
    }
}
