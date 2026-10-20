<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CompraProducto extends Model
{
    protected $table = 'compra_producto';

    protected $fillable = [
        'compra_id',
        'producto_id',
        'cantidad',
        'precio',
        'almacen_id', // ¡Agregar esta línea!
    ];

    /** Unidades de esta línea asignadas a contenedores (Casillero de Compras, Fase 2). */
    public function lineasContenedor(): HasMany
    {
        return $this->hasMany(ContenedorLinea::class);
    }

    // Relación con Compra
    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    // Relación con Producto
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    // Relación con Almacen
    public function almacen()
    {
        return $this->belongsTo(Almacen::class);
    }
}
