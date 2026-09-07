<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CompraEdicion extends Model
{
    protected $table = 'compra_ediciones';

    protected $fillable = [
        'compra_id',
        'user_id',
        'total_anterior',
        'total_nuevo',
        'motivo',
    ];

    protected $casts = [
        'total_anterior' => 'double',
        'total_nuevo' => 'double',
    ];

    public function compra(): BelongsTo
    {
        return $this->belongsTo(Compra::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
