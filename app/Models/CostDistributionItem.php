<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostDistributionItem extends Model
{
    protected $fillable = [
        'cost_distribution_id',
        'product_id',
        'quantity',
        'distributed_amount_usd',
        'old_cost_usd',
        'new_cost_usd',
    ];

    public function distribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }

    public function product()
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }
}
