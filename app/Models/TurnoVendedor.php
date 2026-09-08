<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TurnoVendedor extends Model
{
    use HasFactory;

    protected $table = 'turnos_vendedor';

    protected $fillable = [
        'user_id',
        'nombre_vendedor',
        'iniciado_en',
    ];

    protected function casts(): array
    {
        return [
            'iniciado_en' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
