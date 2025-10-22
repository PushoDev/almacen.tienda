<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    use HasFactory;

    protected $fillable = [
        'proveedor_id',
        'cuenta_id',
        'cliente_id',
        'fecha_compra',
        'total_compra',
        'tipo_compra',
    ];

    // Relación con proveedor
    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class);
    }

    // Relación con cuenta
    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class);
    }

    // Relación con cliente
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // Relación con cuentas a través de compra_pago
    public function cuentas()
    {
        return $this->belongsToMany(Cuenta::class, 'compra_pago')
            ->withPivot('monto');
    }

    // Relación con productos
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'compra_producto')
            ->withPivot('cantidad', 'precio');
    }

    // Relación con pagos - CORREGIDA para usar el nombre correcto de la tabla
    public function pagos()
    {
        return $this->hasMany(CompraPago::class, 'compra_id');
    }
}
