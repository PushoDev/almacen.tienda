<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompraPago extends Model
{

    protected $fillable = [
        'compra_id',
        'cuenta_id',
        'cliente_id',
        'monto',
    ];

    /**
     * Relaciones
     */

    public function compra()
    {
        return $this->belongsTo(\App\Models\Compra::class);
    }

    public function cuenta()
    {
        return $this->belongsTo(\App\Models\Cuenta::class);
    }

    public function cliente()
    {
        return $this->belongsTo(\App\Models\Cliente::class);
    }
}
