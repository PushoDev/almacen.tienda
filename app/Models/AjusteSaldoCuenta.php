<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AjusteSaldoCuenta extends Model
{
    use HasFactory;

    protected $table = 'ajustes_saldo_cuenta';

    protected $fillable = [
        'cuenta_id',
        'user_id',
        'saldo_anterior',
        'saldo_nuevo',
        'motivo',
    ];

    protected $casts = [
        'saldo_anterior' => 'double',
        'saldo_nuevo' => 'double',
    ];

    public function cuenta(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
