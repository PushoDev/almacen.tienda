<?php

// app/Models/ProductoVendedor.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductoVendedor extends Pivot
{
    use HasFactory;

    protected $table = 'producto_vendedors';

    public $timestamps = true;

    // 🚨 CLAVE PRIMARIA MODIFICADA: Añadimos 'almacen_id'
    protected $primaryKey = ['producto_id', 'user_id', 'almacen_id'];

    public $incrementing = false;

    // 🚨 AGREGAMOS 'almacen_id' a los campos asignables masivamente
    protected $fillable = [
        'producto_id',
        'user_id',
        'almacen_id',
        'precio_venta',
        'venta_ganancia',
        'precio_admin',
        'ganancia_admin',
    ];

    protected $casts = [
        'precio_venta' => 'decimal:2',
        'venta_ganancia' => 'decimal:2',
        'precio_admin' => 'decimal:2',
        'ganancia_admin' => 'decimal:2',
    ];

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    // Relación con Vendedor (User)
    public function vendedor()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // 💡 NUEVA RELACIÓN: Con Almacen
    public function almacen()
    {
        return $this->belongsTo(Almacen::class, 'almacen_id');
    }
}
