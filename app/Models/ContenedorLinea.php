<?php

namespace App\Models;

use Database\Factories\ContenedorLineaFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Unidades de una línea de compra (`compra_producto`) que suben a un contenedor.
 */
class ContenedorLinea extends Model
{
    /** @use HasFactory<ContenedorLineaFactory> */
    use HasFactory;

    protected $fillable = [
        'contenedor_id',
        'compra_producto_id',
        'cantidad',
    ];

    protected $casts = [
        'cantidad' => 'integer',
    ];

    public function contenedor(): BelongsTo
    {
        return $this->belongsTo(Contenedor::class);
    }

    public function compraProducto(): BelongsTo
    {
        return $this->belongsTo(CompraProducto::class);
    }
}
