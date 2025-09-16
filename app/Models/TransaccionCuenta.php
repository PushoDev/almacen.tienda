<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TransaccionCuenta extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'cuenta_origen_id',
        'cuenta_destino_id',
        'monto',
        'tipo',
        'comentario',
    ];

    // Relaciones para el registro de transacciones.
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cuentaOrigen()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_origen_id');
    }

    public function cuentaDestino()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_destino_id');
    }
}
