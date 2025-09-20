<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Movimiento extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'almacen_origen_id',
        'almacen_destino_id',
        'user_id',
        'usuario_aprobacion_id',
        'tipo_movimiento',
        'estado',
        'observaciones',
        'guia_transporte',
        'transportista',
        'fecha_aprobacion',
        'fecha_envio',
        'fecha_recepcion'
    ];

    protected $casts = [
        'fecha_aprobacion' => 'datetime',
        'fecha_envio' => 'datetime',
        'fecha_recepcion' => 'datetime',
    ];

    public function almacenOrigen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function usuarioAprobacion(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_aprobacion_id');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(MovimientoDetalle::class);
    }

    public function seguimientos(): HasMany
    {
        return $this->hasMany(MovimientoSeguimiento::class);
    }
}
