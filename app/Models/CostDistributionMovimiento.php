<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostDistributionMovimiento extends Model
{
    protected $fillable = [
        'cost_distribution_id',
        'movimiento_id',
    ];

    public function distribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }

    public function movimiento()
    {
        return $this->belongsTo(Movimiento::class, 'movimiento_id');
    }
}
