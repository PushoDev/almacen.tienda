<?php

namespace App\Models;

use Database\Factories\TelegramVinculoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un Telegram (chat) vinculado a un usuario. Un usuario puede tener varios: los responsables de turno
 * de una misma cuenta de punto de venta vinculan cada uno el suyo con el mismo código.
 */
class TelegramVinculo extends Model
{
    /** @use HasFactory<TelegramVinculoFactory> */
    use HasFactory;

    protected $fillable = ['user_id', 'chat_id', 'nombre', 'vinculado_en'];

    protected function casts(): array
    {
        return [
            'vinculado_en' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
