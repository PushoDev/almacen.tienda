<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostDistributionItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'cost_distribution_id',
        'product_id',
        'distributed_amount_usd',
        'old_cost_usd',
        'new_cost_usd',
    ];

    public function costDistribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }

    public function product()
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }
}
