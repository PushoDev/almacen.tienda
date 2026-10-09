<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferenciaPendienteSeguimiento extends Model
{
    protected $table = 'transferencia_pendiente_seguimientos';

    protected $fillable = [
        'transferencia_pendiente_id',
        'estado',
        'observaciones',
        'user_id',
    ];

    public function transferenciaPendiente(): BelongsTo
    {
        return $this->belongsTo(TransferenciaPendiente::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
