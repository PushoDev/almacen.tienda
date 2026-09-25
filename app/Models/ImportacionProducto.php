<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ImportacionProducto extends Model
{
    use HasFactory;

    protected $table = 'importaciones_productos';

    protected $fillable = [
        'user_id',
        'almacen_id',
        'nombre_archivo',
        'hash_archivo',
        'estado',
        'filas_procesadas',
        'productos_creados',
        'productos_actualizados',
        'productos_sin_stock',
        'filas_omitidas',
        'lotes_creados',
        'unidades_importadas',
        'mensaje_error',
        'revertida_por',
        'revertida_at',
        'motivo_reversion',
    ];

    protected function casts(): array
    {
        return [
            'filas_procesadas' => 'integer',
            'productos_creados' => 'integer',
            'productos_actualizados' => 'integer',
            'productos_sin_stock' => 'integer',
            'filas_omitidas' => 'integer',
            'lotes_creados' => 'integer',
            'unidades_importadas' => 'integer',
            'revertida_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function revertidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revertida_por');
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    public function filas(): HasMany
    {
        return $this->hasMany(ImportacionProductoFila::class, 'importacion_id');
    }
}
