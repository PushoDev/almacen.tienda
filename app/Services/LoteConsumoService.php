<?php

namespace App\Services;

use App\Models\LoteStock;
use App\Models\Producto;
use Illuminate\Support\Collection;

/**
 * Motor de consumo de `lotes_stock` compartido por Ventas y Movimientos — antes de esto,
 * `lotes_stock.cantidad` era un log solo-aditivo (nunca se decrementaba en una salida), lo que
 * dejaba `Producto::costoEnAlmacen()` promediando sobre cantidades fantasma en cuanto un almacén
 * tenía 2+ lotes a precios distintos y alguna salida de por medio (confirmado con datos reales
 * el 2026-09-20).
 *
 * Regla de consumo: FIFO por defecto (lote más viejo primero, por `created_at`), salvo que se
 * pida un lote puntual (`$loteId`) — para cuando el vendedor/operador elige a mano de cuál
 * tanda vender/trasladar.
 */
class LoteConsumoService
{
    /**
     * Consume `$cantidad` unidades del producto en ese almacén. Decrementa `cantidad_disponible`
     * de cada lote tocado (puede abarcar más de uno si el pedido cruza el remanente de uno) y
     * devuelve el desglose consumido.
     *
     * Si los lotes registrados no alcanzan a cubrir `$cantidad` (producto viejo sin lotes, o
     * datos desincronizados) la parte que falta se reporta con `lote: null` al costo global de
     * la ficha — nunca bloquea la operación: `lotes_stock` es trazabilidad de costo, la fuente
     * de verdad del stock disponible sigue siendo `AlmacenProducto`, ya validada por el llamador
     * antes de llegar acá.
     *
     * @return Collection<int, array{lote: ?LoteStock, cantidad: int, costo_unitario: float}>
     */
    public function consumir(int $productoId, int $almacenId, int $cantidad, ?int $loteId = null): Collection
    {
        if ($cantidad <= 0) {
            return collect();
        }

        $query = LoteStock::where('producto_id', $productoId)
            ->where('almacen_id', $almacenId)
            ->where('cantidad_disponible', '>', 0);

        if ($loteId !== null) {
            $query->where('id', $loteId);
        }

        $lotes = $query->orderBy('created_at')->orderBy('id')->lockForUpdate()->get();

        $restante = $cantidad;
        $consumido = collect();

        foreach ($lotes as $lote) {
            if ($restante <= 0) {
                break;
            }

            $aTomar = min($restante, $lote->cantidad_disponible);
            $lote->decrement('cantidad_disponible', $aTomar);

            $consumido->push([
                'lote' => $lote,
                'cantidad' => $aTomar,
                'costo_unitario' => (float) $lote->precio_costo,
            ]);

            $restante -= $aTomar;
        }

        if ($restante > 0) {
            $producto = Producto::find($productoId);

            $consumido->push([
                'lote' => null,
                'cantidad' => $restante,
                'costo_unitario' => $producto ? (float) $producto->precio_compra_producto : 0.0,
            ]);
        }

        return $consumido;
    }

    /**
     * Costo unitario ponderado de un desglose de consumo (ver consumir()) — para la ganancia
     * real de una venta, o el costo con el que nace un lote nuevo en el almacén destino de un
     * traslado cuando el origen se consumió de más de un lote.
     *
     * @param  Collection<int, array{lote: ?LoteStock, cantidad: int, costo_unitario: float}>  $consumido
     */
    public function costoPromedio(Collection $consumido): float
    {
        $cantidadTotal = $consumido->sum('cantidad');

        if ($cantidadTotal <= 0) {
            return 0.0;
        }

        $costoTotal = $consumido->sum(fn (array $c) => $c['cantidad'] * $c['costo_unitario']);

        return round($costoTotal / $cantidadTotal, 2);
    }
}
