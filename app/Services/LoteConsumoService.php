<?php

namespace App\Services;

use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\VentaDetalle;
use Illuminate\Support\Collection;

/**
 * Motor de consumo de `lotes_stock` compartido por Ventas y Movimientos — antes de esto,
 * `lotes_stock.cantidad` era un log solo-aditivo (nunca se decrementaba en una salida), lo que
 * dejaba `Producto::costoEnAlmacen()` promediando sobre cantidades fantasma en cuanto un almacén
 * tenía 2+ lotes a precios distintos y alguna salida de por medio (confirmado con datos reales
 * el 2026-09-20).
 *
 * Regla de consumo: FIFO por defecto (lote más viejo primero, por `created_at`). Si se pide un
 * lote puntual (`$loteId`, cuando el vendedor elige de cuál tanda vender) ese sale primero y, si
 * no alcanza, se sigue con el FIFO de los demás: nunca limita la cantidad al tamaño del lote.
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

        $lotes = LoteStock::where('producto_id', $productoId)
            ->where('almacen_id', $almacenId)
            ->where('cantidad_disponible', '>', 0)
            ->orderBy('created_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        // El lote elegido es una preferencia, no un límite: sale primero y, si no alcanza, sigue el
        // FIFO con los demás. Un lote que no es de este producto y almacén (o ya sin stock) se
        // ignora en vez de mandar toda la salida "sin lote".
        $preferido = $loteId !== null ? $lotes->firstWhere('id', $loteId) : null;

        if ($preferido) {
            $lotes = $lotes->reject(fn (LoteStock $lote) => $lote->id === $preferido->id)->prepend($preferido)->values();
        }

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
     * Devuelve al inventario por lote las unidades de una línea de venta que se revierte
     * (anulación, devolución o rechazo de una venta especial): cada parte vuelve al lote de donde
     * salió (o al lote resultante si ese lote se fusionó después). Lo que no tiene lote de origen
     * — una parte "sin lote" al costo de la ficha, o una venta anterior al registro por lote —
     * entra a un lote nuevo `DEV-{venta}-{línea}` al costo al que se vendió, para que el stock
     * devuelto no quede fuera de `lotes_stock` (valor del inventario y costo de la próxima venta).
     *
     * Requiere `$detalle->loteConsumos` (cargado o cargable).
     */
    public function devolver(VentaDetalle $detalle, int $almacenId): void
    {
        $devuelto = 0;
        $lotesCreados = 0;

        foreach ($detalle->loteConsumos as $consumo) {
            $lote = $consumo->lote_stock_id ? LoteStock::find($consumo->lote_stock_id) : null;

            if ($lote) {
                $lote->loteVigente()->increment('cantidad_disponible', $consumo->cantidad);
            } else {
                $this->crearLoteDevolucion($detalle, $almacenId, (int) $consumo->cantidad, (float) $consumo->costo_unitario, ++$lotesCreados);
            }

            $devuelto += (int) $consumo->cantidad;
        }

        $sinDesglose = (int) $detalle->cantidad - $devuelto;

        if ($sinDesglose > 0) {
            $this->crearLoteDevolucion($detalle, $almacenId, $sinDesglose, (float) $detalle->costo_unitario, ++$lotesCreados);
        }
    }

    private function crearLoteDevolucion(VentaDetalle $detalle, int $almacenId, int $cantidad, float $costo, int $numero): void
    {
        LoteStock::create([
            'codigo' => sprintf('DEV-%d-%d%s', $detalle->venta_id, $detalle->id, $numero > 1 ? '-'.$numero : ''),
            'producto_id' => $detalle->producto_id,
            'almacen_id' => $almacenId,
            'cantidad' => $cantidad,
            'cantidad_disponible' => $cantidad,
            'precio_costo' => $costo,
        ]);
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
