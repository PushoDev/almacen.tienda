<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostDistributionCuenta extends Model
{
    protected $fillable = [
        'cost_distribution_id',
        'cuenta_id',
        // Monto en la moneda propia de la cuenta (CUP o USD) — la moneda real se sabe vía
        // cuenta_id → cuenta.moneda, esta columna ya no asume CUP.
        'monto',
    ];

    public function distribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }

    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_id');
    }
}
