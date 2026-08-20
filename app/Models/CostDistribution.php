<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostDistribution extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_id',
        'account_id',
        'amount_cup',
        'amount_usd',
        'remaining_amount_usd',
        'remaining_amount_cup',
        'exchange_rate',
        'details',
    ];

    // Relación con la compra
    public function purchase()
    {
        return $this->belongsTo(Compra::class, 'purchase_id');
    }

    // Relación con la cuenta
    public function account()
    {
        return $this->belongsTo(Cuenta::class, 'account_id');
    }

    // Relación con los items de la distribución
    public function items()
    {
        return $this->hasMany(CostDistributionItem::class);
    }

    // Relación con las cuentas que financiaron esta distribución (una o varias)
    public function cuentas()
    {
        return $this->hasMany(CostDistributionCuenta::class);
    }

    // Relación con las compras cubiertas por esta distribución (una o varias, "lote")
    public function compras()
    {
        return $this->hasMany(CostDistributionCompra::class);
    }
}
