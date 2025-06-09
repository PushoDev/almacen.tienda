<?php

// app/Models/ProductoVendedor.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;

class ProductoVendedor extends Pivot
{
    use HasFactory;

    protected $table = 'producto_vendedors'; // Nombre de la tabla
    public $timestamps = true; // Usa timestamps (created_at, updated_at)

    // Clave primaria compuesta (no autoincremental)
    protected $primaryKey = ['producto_id', 'user_id'];
    public $incrementing = false; // Desactiva el autoincremento

    // Campos asignables masivamente
    protected $fillable = [
        'producto_id',
        'user_id',
        'precio_venta',
        'venta_ganancia'
    ];

    // Casts para tipos de datos
    protected $casts = [
        'precio_venta' => 'decimal:2',
        'venta_ganancia' => 'decimal:2',
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
}
