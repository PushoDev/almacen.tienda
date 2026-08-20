<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostDistributionCompra extends Model
{
    protected $fillable = [
        'cost_distribution_id',
        'compra_id',
    ];

    public function distribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }

    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compra_id');
    }
}
