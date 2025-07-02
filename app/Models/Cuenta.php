<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cuenta extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'cuentas';


    // Propiedades que pueden ser asignadas masivamente
    protected $fillable = [
        'nombre_cuenta',
        'saldo_cuenta',
        'tipo_moneda',
        'deuda',
        'tipo_cuenta',
        'notas_cuenta',
    ];

    // Casts para manejar tipos de datos específicos
    protected $casts = [
        'saldo_cuenta' => 'double',
        'deuda' => 'double',
        'tipo_cuenta' => 'string',
        'tipo_moneda' => 'string',
    ];

    // Relación con compras (opcional)
    public function compras()
    {
        return $this->belongsToMany(Compra::class, 'compra_pago')
            ->withPivot('monto');
    }
}
