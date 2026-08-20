<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostDistributionCuenta extends Model
{
    protected $fillable = [
        'cost_distribution_id',
        'cuenta_id',
        'monto_cup',
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
