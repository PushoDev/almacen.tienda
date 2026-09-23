<?php

namespace App\Services;

use App\Models\LoteStock;
use Illuminate\Support\Facades\DB;

/**
 * Valor de costo del inventario a partir del costo real por lote (`lotes_stock`), no del costo
 * estático de la ficha (`productos.precio_compra_producto`), que queda desactualizado cuando un
 * prorrateo de Distribución de Costos sube el costo de un lote sin tocar la ficha global (caso
 * real: movimiento #209, ver docs/arreglos-pendientes/resumen-cambios-2026-09-20.md).
 *
 * Única fuente para Productos, Dashboard/Logística, el reporte "Valor del Inventario" y la
 * exportación a Excel — antes cada una calculaba por su cuenta y daban totales distintos.
 *
 * Combinaciones producto+almacén sin ningún lote con stock (catálogo viejo sin backfill, o borde
 * no cubierto) caen al costo de la ficha — mismo fallback que Producto::costoEnAlmacen().
 */
class ValorInventarioService
{
    /**
     * Costo real ponderado por producto, en bulk para un lote de IDs (evita N+1 de llamar
     * Producto::costoEnAlmacen() por fila). Sin almacén, pondera sobre los lotes de TODOS los
     * almacenes del producto.
     *
     * @param  array<int, int>  $productoIds
     * @return array<int, float> producto_id => costo ponderado. Un producto ausente del
     *                           resultado no tiene ningún lote — el caller debe caer al
     *                           costo estático de la ficha (precio_compra_producto).
     */
    public function costosPonderadosPorProducto(array $productoIds, ?int $almacenId = null): array
    {
        if (empty($productoIds)) {
            return [];
        }

        $query = LoteStock::whereIn('producto_id', $productoIds)
            ->where('cantidad_disponible', '>', 0);

        if ($almacenId !== null) {
            $query->where('almacen_id', $almacenId);
        }

        return $query
            ->selectRaw('producto_id, SUM(cantidad_disponible * precio_costo) as costo_total, SUM(cantidad_disponible) as cantidad_total')
            ->groupBy('producto_id')
            ->get()
            ->mapWithKeys(fn ($fila) => [$fila->producto_id => round($fila->costo_total / $fila->cantidad_total, 2)])
            ->all();
    }

    /**
     * Valor real del inventario completo (todos los productos, todos los almacenes).
     *
     * El stock real (`almacen_producto.cantidad`) manda: es lo que se vende y lo que muestra la
     * tabla de Productos. Los lotes solo aportan el costo — ver `valorDeStockReal()`.
     */
    public function valorTotal(): float
    {
        return round($this->valorDeStockReal(), 2);
    }

    /**
     * Stock por producto+almacén con su costo real unitario y valor — una fila por cada
     * combinación con cantidad > 0. Base del reporte "Valor del Inventario".
     *
     * @return array<int, array{producto_id: int, nombre_producto: string, almacen_id: int, nombre_almacen: string, cantidad: int, costo_unitario: float, valor_total_costo: float}>
     */
    public function filasPorProductoAlmacen(): array
    {
        $costos = $this->costosPorProductoAlmacen();

        return DB::table('almacen_producto')
            ->join('productos', 'productos.id', '=', 'almacen_producto.producto_id')
            ->join('almacens', 'almacens.id', '=', 'almacen_producto.almacen_id')
            ->where('almacen_producto.cantidad', '>', 0)
            ->select(
                'almacen_producto.producto_id',
                'productos.nombre_producto',
                'productos.precio_compra_producto',
                'almacen_producto.almacen_id',
                'almacens.nombre_almacen',
                'almacen_producto.cantidad',
            )
            ->orderBy('productos.nombre_producto')
            ->orderBy('almacens.nombre_almacen')
            ->get()
            ->map(function ($fila) use ($costos) {
                $clave = $fila->producto_id.'-'.$fila->almacen_id;
                // Valor con la misma regla que valorTotal() (stock real manda, los lotes aportan el
                // costo), para que el total del reporte coincida al centavo con el widget.
                $valor = $this->valorDeCombinacion($costos[$clave] ?? null, (int) $fila->cantidad, (float) $fila->precio_compra_producto);
                $costoUnitario = $valor / (int) $fila->cantidad;

                return [
                    'producto_id' => (int) $fila->producto_id,
                    'nombre_producto' => $fila->nombre_producto,
                    'almacen_id' => (int) $fila->almacen_id,
                    'nombre_almacen' => $fila->nombre_almacen,
                    'cantidad' => (int) $fila->cantidad,
                    'costo_unitario' => round($costoUnitario, 2),
                    'valor_total_costo' => round($valor, 2),
                ];
            })
            ->all();
    }

    /**
     * Productos en stock bajo (cantidad total en todos los almacenes menor al umbral) con el
     * valor real de su stock. `$incluirSinStock` = true cuenta también los de cantidad 0, como
     * el filtro "stock bajo" de Productos (Producto::getStockBajoAttribute()); false = solo
     * 0 < cantidad < umbral, como el resumen del Dashboard.
     *
     * @return array{cantidad: int, valor: float}
     */
    public function resumenStockBajo(int $umbral, bool $incluirSinStock): array
    {
        $cantidades = DB::table('productos')
            ->leftJoin('almacen_producto', 'almacen_producto.producto_id', '=', 'productos.id')
            ->select('productos.id', DB::raw('COALESCE(SUM(almacen_producto.cantidad), 0) as cantidad_total'))
            ->groupBy('productos.id')
            ->havingRaw('COALESCE(SUM(almacen_producto.cantidad), 0) < ?', [$umbral])
            ->when(! $incluirSinStock, fn ($q) => $q->havingRaw('COALESCE(SUM(almacen_producto.cantidad), 0) > 0'))
            ->pluck('cantidad_total', 'productos.id');

        return [
            'cantidad' => $cantidades->count(),
            'valor' => $this->valorDeProductos($cantidades->keys()->all()),
        ];
    }

    /**
     * Valor real del stock de un conjunto de productos (todos sus almacenes).
     *
     * @param  array<int, int>  $productoIds
     */
    public function valorDeProductos(array $productoIds): float
    {
        if (empty($productoIds)) {
            return 0.0;
        }

        return round($this->valorDeStockReal($productoIds), 2);
    }

    /**
     * Valor del stock real de cada combinación producto+almacén con `cantidad > 0`, sumado.
     *
     * Antes se sumaban directo las unidades de los lotes (`cantidad_disponible`), y cuando un
     * lote declaraba más o menos unidades que el stock real (lotes sin reconciliar tras el
     * despliegue de `lotes_stock`) el total se inflaba o se desinflaba respecto a la tabla de
     * Productos, que siempre multiplica por el stock real. Regla por combinación:
     *  - sin lotes con stock: stock × costo de la ficha;
     *  - lotes que cubren el stock o más: stock × costo promedio de esos lotes;
     *  - lotes que cubren menos: lo que cubren a su costo + las unidades sin lote al costo de la ficha
     *    (mismo criterio que `lotes:backfill-ajustes-legado`).
     *
     * @param  array<int, int>|null  $productoIds  limitar a estos productos; null = todos
     */
    private function valorDeStockReal(?array $productoIds = null): float
    {
        $lotesPorCombinacion = DB::table('lotes_stock')
            ->where('cantidad_disponible', '>', 0)
            ->groupBy('producto_id', 'almacen_id')
            ->selectRaw('producto_id, almacen_id, SUM(cantidad_disponible) as unidades, SUM(cantidad_disponible * precio_costo) as valor');

        return (float) DB::table('almacen_producto as ap')
            ->join('productos as p', 'p.id', '=', 'ap.producto_id')
            ->leftJoinSub($lotesPorCombinacion, 'lc', fn ($join) => $join
                ->on('lc.producto_id', '=', 'ap.producto_id')
                ->on('lc.almacen_id', '=', 'ap.almacen_id'))
            ->where('ap.cantidad', '>', 0)
            ->when($productoIds !== null, fn ($query) => $query->whereIn('ap.producto_id', $productoIds))
            ->sum(DB::raw(
                'CASE
                    WHEN lc.unidades IS NULL THEN ap.cantidad * p.precio_compra_producto
                    WHEN lc.unidades >= ap.cantidad THEN ap.cantidad * lc.valor / lc.unidades
                    ELSE lc.valor + (ap.cantidad - lc.unidades) * p.precio_compra_producto
                END'
            ));
    }

    /**
     * Valor de una combinación producto+almacén con `$cantidad` unidades de stock real, dadas sus
     * filas de `costosPorProductoAlmacen()` (`null` si no tiene lotes con stock). Misma regla que
     * `valorDeStockReal()`, para que el reporte y el Excel coincidan con el total.
     *
     * @param  array{costo: float, valor: float, unidades: int}|null  $lotes
     */
    public function valorDeCombinacion(?array $lotes, int $cantidad, float $costoFicha): float
    {
        if ($lotes === null || $lotes['unidades'] <= 0) {
            return $costoFicha * $cantidad;
        }

        if ($lotes['unidades'] >= $cantidad) {
            return $lotes['valor'] * $cantidad / $lotes['unidades'];
        }

        return $lotes['valor'] + ($cantidad - $lotes['unidades']) * $costoFicha;
    }

    /**
     * Costo ponderado y valor real por combinación producto+almacén con lotes.
     *
     * @return array<string, array{costo: float, valor: float, unidades: int}> clave "producto_id-almacen_id"
     */
    public function costosPorProductoAlmacen(?int $almacenId = null): array
    {
        return DB::table('lotes_stock')
            ->where('cantidad_disponible', '>', 0)
            ->when($almacenId !== null, fn ($q) => $q->where('almacen_id', $almacenId))
            ->selectRaw('producto_id, almacen_id, SUM(cantidad_disponible * precio_costo) as costo_total, SUM(cantidad_disponible) as cantidad_total')
            ->groupBy('producto_id', 'almacen_id')
            ->get()
            ->mapWithKeys(fn ($fila) => [
                $fila->producto_id.'-'.$fila->almacen_id => [
                    'costo' => round($fila->costo_total / $fila->cantidad_total, 2),
                    'valor' => (float) $fila->costo_total,
                    'unidades' => (int) $fila->cantidad_total,
                ],
            ])
            ->all();
    }
}
