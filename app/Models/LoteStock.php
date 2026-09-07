<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoteStock extends Model
{
    protected $table = 'lotes_stock';

    protected $fillable = [
        'codigo',
        'compra_producto_id',
        'producto_id',
        'almacen_id',
        'cantidad',
        'precio_costo',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_costo' => 'decimal:2',
    ];

    public function compraProducto(): BelongsTo
    {
        return $this->belongsTo(CompraProducto::class, 'compra_producto_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    /**
     * Código legible autogenerado al crear el lote (compra + número de línea dentro de esa
     * compra, ej. "LOTE-42-001") — determinístico y sin necesidad de una segunda consulta.
     * Sigue siendo una columna real y editable después, no un valor calculado en cada lectura.
     */
    public static function generarCodigo(int $compraId, int $numeroLinea): string
    {
        return sprintf('LOTE-%d-%03d', $compraId, $numeroLinea);
    }
}
