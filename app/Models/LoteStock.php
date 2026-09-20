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
        'movimiento_id',
        'lote_origen_id',
        'producto_id',
        'almacen_id',
        'cantidad',
        'cantidad_disponible',
        'precio_costo',
        'precio_venta',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'cantidad_disponible' => 'integer',
        'precio_costo' => 'decimal:2',
        'precio_venta' => 'decimal:2',
    ];

    protected static function boot()
    {
        parent::boot();

        // Red de seguridad: si algo crea un lote sin fijar cantidad_disponible explícitamente
        // (factories de test, scripts puntuales, código nuevo que se olvide), arranca igual a
        // cantidad — nunca null, que costoEnAlmacen()/LoteConsumoService tratan como "sin stock".
        static::creating(function (self $lote) {
            if (is_null($lote->cantidad_disponible)) {
                $lote->cantidad_disponible = $lote->cantidad;
            }
        });
    }

    public function compraProducto(): BelongsTo
    {
        return $this->belongsTo(CompraProducto::class, 'compra_producto_id');
    }

    public function movimiento(): BelongsTo
    {
        return $this->belongsTo(Movimiento::class);
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
     * Lote del que salió éste (cuando un Movimiento consume de un lote de origen y crea uno
     * nuevo en el destino). Null para un lote de origen (creado directo por una compra o por
     * una corrección manual) o para datos de antes de que esta columna existiera.
     */
    public function loteOrigen(): BelongsTo
    {
        return $this->belongsTo(self::class, 'lote_origen_id');
    }

    /**
     * Lotes que descienden directamente de éste (un traslado posterior que consumió de acá).
     */
    public function lotesDescendientes()
    {
        return $this->hasMany(self::class, 'lote_origen_id');
    }

    /**
     * IDs de este lote y de todos sus descendientes (directos e indirectos) — usado por
     * Distribución de Costos para saber qué lotes prorratear cuando una compra se reparte:
     * ahora que Compras puede reusar una ficha de catálogo existente, ya no alcanza con
     * "todos los lotes de este producto_id" (podrían venir de otra compra distinta).
     *
     * @return array<int>
     */
    public function idsConDescendientes(): array
    {
        $ids = [$this->id];
        $pendientes = [$this->id];

        while (! empty($pendientes)) {
            $hijos = self::whereIn('lote_origen_id', $pendientes)->pluck('id')->all();
            $pendientes = array_diff($hijos, $ids);
            $ids = array_merge($ids, $pendientes);
        }

        return $ids;
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

    public static function generarCodigoMovimiento(int $movimientoId, int $numeroLinea): string
    {
        return sprintf('LOTE-MOV-%d-%03d', $movimientoId, $numeroLinea);
    }

    /**
     * Código para el lote que se crea cuando un admin corrige el costo de un producto en un
     * almacén que todavía no tenía ningún lote (ver ProductoController::corregirCostoEnAlmacen()).
     * Determinístico por producto+almacén: solo se genera la primera vez, porque una vez creado
     * ese lote las correcciones siguientes actualizan su `precio_costo` en vez de crear otro.
     */
    public static function generarCodigoAjuste(int $productoId, int $almacenId): string
    {
        return sprintf('AJUSTE-%d-%d', $productoId, $almacenId);
    }

    /**
     * Código para el lote que crea `lotes:backfill-ajustes-legado` — stock real
     * (`almacen_producto.cantidad`) que supera la suma de lotes conocidos en ese almacén,
     * típicamente inventario de antes de 2026-09-07 (cuando `lotes_stock` no existía) que
     * convive con un lote nuevo y sí rastreado (ej. de un traslado reciente). Prefijo distinto
     * de `generarCodigoAjuste()` (la corrección manual desde Edit.tsx) para que nunca choquen
     * en la columna `codigo` (única) aunque ambos sean determinísticos por producto+almacén.
     */
    public static function generarCodigoAjusteLegado(int $productoId, int $almacenId): string
    {
        return sprintf('AJUSTE-LEGADO-%d-%d', $productoId, $almacenId);
    }
}
