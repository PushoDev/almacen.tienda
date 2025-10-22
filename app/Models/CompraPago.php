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
        'tipo_pago'
    ];

    /**
     * Especificar el nombre de la tabla exacto que existe en producción
     */
    protected $table = 'compra_pago'; // Asegurar que use el nombre correcto

    /**
     * Relaciones
     */
    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class);
    }

    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }
}
