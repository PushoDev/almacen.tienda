<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportacionProductoFila extends Model
{
    use HasFactory;

    protected $table = 'importaciones_producto_filas';

    protected $fillable = [
        'importacion_id',
        'fila',
        'nombre_producto',
        'producto_id',
        'producto_nuevo',
        'producto_codigo_id',
        'cantidad',
        'precio_compra',
        'resultado',
        'motivo',
        'lote_id',
        'lote_codigo',
    ];

    protected function casts(): array
    {
        return [
            'fila' => 'integer',
            'producto_nuevo' => 'boolean',
            'cantidad' => 'integer',
            'precio_compra' => 'decimal:2',
        ];
    }

    public function importacion(): BelongsTo
    {
        return $this->belongsTo(ImportacionProducto::class, 'importacion_id');
    }

    public function producto(): BelongsTo
    {
        return $this->belongsTo(Producto::class);
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(LoteStock::class, 'lote_id');
    }
}
