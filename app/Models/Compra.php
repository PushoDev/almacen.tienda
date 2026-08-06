<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'proveedor_id',
        'cuenta_id',
        'cliente_id',
        'fecha_compra',
        'total_compra',
        'tipo_compra',
    ];

    // Relación con el usuario que registró la compra (nullable — compras
    // anteriores a 2026-08-06 no tienen este dato, ver migración add_user_id_to_compras_table)
    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Relación con proveedor
    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class);
    }

    // Relación con cuenta (la cuenta principal de la compra)
    public function cuenta()
    {
        return $this->belongsTo(Cuenta::class);
    }

    // Relación con cliente (si aplica)
    public function cliente()
    {
        return $this->belongsTo(Cliente::class);
    }

    // ❌ ELIMINAR esta relación duplicada
    // public function cuentas()
    // {
    //     return $this->belongsToMany(Cuenta::class, 'compra_pago')
    //         ->withPivot('monto');
    // }

    // Relación con productos
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'compra_producto')
            ->withPivot('cantidad', 'precio', 'almacen_id'); // ✅ Agregar almacen_id si existe
    }

    // Relación con todos los pagos de la compra
    public function pagos()
    {
        return $this->hasMany(CompraPago::class, 'compra_id');
    }

    // ✅ NUEVA: Relación con clientes que participaron en el pago
    public function clientesPagadores()
    {
        return $this->belongsToMany(Cliente::class, 'compra_pago', 'compra_id', 'cliente_id')
            ->wherePivot('tipo_pago', 'cliente')
            ->withPivot('monto', 'tipo_pago')
            ->withTimestamps();
    }

    // ✅ NUEVA: Relación con cuentas que participaron en el pago
    public function cuentasPagadoras()
    {
        return $this->belongsToMany(Cuenta::class, 'compra_pago', 'compra_id', 'cuenta_id')
            ->wherePivot('tipo_pago', 'cuenta')
            ->withPivot('monto', 'tipo_pago')
            ->withTimestamps();
    }
}
