<?php

namespace App\Services;

use App\Models\LoteStock;
use Illuminate\Support\Collection;

/**
 * Precio base y comisión con los que el POS vende una línea, según el lote de referencia
 * (2026-09-26). El lote de referencia es el que el usuario eligió en el selector — por defecto el
 * más antiguo, que es el que sale primero en el consumo FIFO (LoteConsumoService).
 *
 * - Precio base: el precio efectivo del lote (su precio propio o, si no tiene, el del producto en
 *   el almacén). Un precio propio de lote es el precio base de esa línea: NO cambia la comisión
 *   (el excedente sobre el precio del almacén ya no se suma al vendedor).
 * - Comisión: la propia del lote elegido; si no la tiene, la del primer lote (FIFO) que sí la
 *   tenga; si ninguno la tiene, la del producto en el almacén.
 *
 * Trabaja sobre los lotes con stock del producto en el almacén, ya cargados y en orden FIFO: el
 * POS los carga una vez por almacén y el servidor los carga por línea, y así el navegador y el
 * servidor deciden con las mismas reglas.
 */
class PrecioLoteService
{
    /**
     * Lote que fija el precio base y la comisión de la línea: el elegido si es de esta lista
     * (mismo producto y almacén, con stock) y, si no, el más antiguo. Un lote ajeno se ignora en
     * vez de romper la venta.
     *
     * @param  Collection<int, LoteStock>  $lotesActivos  con stock, más viejo primero
     */
    public function loteDeReferencia(Collection $lotesActivos, ?int $loteId = null): ?LoteStock
    {
        if ($loteId !== null) {
            $elegido = $lotesActivos->firstWhere('id', $loteId);

            if ($elegido) {
                return $elegido;
            }
        }

        return $lotesActivos->first();
    }

    /**
     * @param  Collection<int, LoteStock>  $lotesActivos  con stock, más viejo primero
     */
    public function comisionDelLote(Collection $lotesActivos, ?LoteStock $lote, float $comisionAlmacen): float
    {
        if ($lote?->comision !== null) {
            return (float) $lote->comision;
        }

        $conComision = $lotesActivos->first(fn (LoteStock $otro) => $otro->comision !== null);

        return $conComision ? (float) $conComision->comision : $comisionAlmacen;
    }

    /**
     * @param  Collection<int, LoteStock>  $lotesActivos  con stock, más viejo primero
     * @return array{lote: ?LoteStock, precio_base: ?float, comision: float}
     */
    public function referencia(Collection $lotesActivos, ?float $precioAlmacen, float $comisionAlmacen, ?int $loteId = null): array
    {
        $lote = $this->loteDeReferencia($lotesActivos, $loteId);

        return [
            'lote' => $lote,
            'precio_base' => $this->precioEfectivo($lote, $precioAlmacen),
            'comision' => $this->comisionDelLote($lotesActivos, $lote, $comisionAlmacen),
        ];
    }

    /**
     * Lotes que recibe el POS para un producto: cada uno con el precio y la comisión con los que
     * vendería si se elige. El selector solo se muestra con 2+ lotes; con uno o ninguno el POS usa
     * igualmente sus valores (o los del almacén si no hay lotes).
     *
     * @param  Collection<int, LoteStock>  $lotesActivos  con stock, más viejo primero
     * @return array<int, array{id: int, codigo: string, cantidad: int, precio_venta: ?float, comision: float}>
     */
    public function lotesParaPos(Collection $lotesActivos, ?float $precioAlmacen, float $comisionAlmacen): array
    {
        return $lotesActivos->map(fn (LoteStock $lote) => [
            'id' => $lote->id,
            'codigo' => $lote->codigo,
            'cantidad' => $lote->cantidad_disponible,
            'precio_venta' => $this->precioEfectivo($lote, $precioAlmacen),
            'comision' => $this->comisionDelLote($lotesActivos, $lote, $comisionAlmacen),
        ])->values()->all();
    }

    private function precioEfectivo(?LoteStock $lote, ?float $precioAlmacen): ?float
    {
        if ($lote?->precio_venta !== null) {
            return (float) $lote->precio_venta;
        }

        return $precioAlmacen;
    }
}
