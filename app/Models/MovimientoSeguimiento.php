<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MovimientoSeguimiento extends Model
{
    use HasFactory;

    protected $fillable = [
        'movimiento_id',
        'estado',
        'observaciones',
        'user_id',
        'ubicacion',
        'evidencia'
    ];

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
