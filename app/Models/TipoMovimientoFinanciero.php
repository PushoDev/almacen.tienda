<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TipoMovimientoFinanciero extends Model
{
    use HasFactory;

    protected $table = 'tipos_movimiento_financiero';

    protected $fillable = [
        'nombre',
        'efecto',
        'descripcion',
    ];

    // Relación: Un Tipo tiene muchos Movimientos Financieros
    public function movimientos()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'tipo_movimiento_id');
    }
}
