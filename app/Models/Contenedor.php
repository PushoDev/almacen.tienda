<?php

namespace App\Models;

use Database\Factories\ContenedorFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Contenedor que sale de Panamá hacia el Mariel con parte de lo que espera en el casillero.
 * Mientras está `abierto` se le asignan unidades y se le anotan cargos a mano (ver
 * App\Services\ContenedorService y docs/plan-casillero-de-compras.md, Fase 2).
 */
class Contenedor extends Model
{
    /** @use HasFactory<ContenedorFactory> */
    use HasFactory;

    public const ESTADO_ABIERTO = 'abierto';

    public const ESTADO_CANCELADO = 'cancelado';

    protected $table = 'contenedores';

    protected $fillable = [
        'user_id',
        'nombre',
        'notas',
        'fecha_salida',
        'estado',
    ];

    protected $casts = [
        'fecha_salida' => 'date',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function lineas(): HasMany
    {
        return $this->hasMany(ContenedorLinea::class);
    }

    /** Cargos del contenedor (transporte marítimo y otros), activos y anulados. */
    public function cargos(): HasMany
    {
        return $this->hasMany(CasilleroCargo::class);
    }

    public function estaAbierto(): bool
    {
        return $this->estado === self::ESTADO_ABIERTO;
    }
}
