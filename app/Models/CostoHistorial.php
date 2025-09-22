<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CostoHistorial extends Model
{
    protected $fillable = [
        'product_id',
        'old_cost_usd',
        'new_cost_usd',
        'cost_distribution_id',
        'comentario',
    ];

    public function product()
    {
        return $this->belongsTo(Producto::class, 'product_id');
    }

    public function distribution()
    {
        return $this->belongsTo(CostDistribution::class, 'cost_distribution_id');
    }
}
