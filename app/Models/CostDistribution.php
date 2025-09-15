<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostDistribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id',
        'amount_cup',
        'amount_usd',
        'exchange_rate',
        'account_id',
        'details',
    ];

    public function purchase()
    {
        return $this->belongsTo(Compra::class, 'purchase_id');
    }

    public function account()
    {
        return $this->belongsTo(Cuenta::class, 'account_id');
    }

    public function items()
    {
        return $this->hasMany(CostDistributionItem::class, 'cost_distribution_id');
    }
}
