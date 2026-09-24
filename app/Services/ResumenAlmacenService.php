<?php

namespace App\Services;

use App\Models\Almacen;
use App\Models\Movimiento;
use App\Models\Producto;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Resumen de UN almacén para la tarjeta "Resumen por Almacén" de Logística: valor a costo y a
 * venta, cobertura de precios, estado del stock, lo que se puede fusionar y las series para los
 * gráficos (ventas por día, categorías).
 *
 * El valor a costo sale de la misma regla que el Valor Total de Productos
 * (`ValorInventarioService::valorDeCombinacion()`), así que la suma de todos los almacenes coincide
 * con ese total. El valor a venta solo cuenta los productos que ya tienen precio en este almacén, y
 * el margen los compara contra el costo de ESOS mismos productos (no del almacén completo).
 */
class ResumenAlmacenService
{
    /** Menos de estas unidades de un producto en el almacén = stock bajo (mismo 5 de Producto::getStockBajoAttribute()). */
    private const UMBRAL_STOCK_BAJO = 5;

    /** Días máximos de historial de ventas que se devuelven para el gráfico. */
    private const DIAS_HISTORIAL_VENTAS = 90;

    /** Categorías que se muestran por separado en el gráfico; el resto se agrupa en "Otras". */
    private const CATEGORIAS_VISIBLES = 7;

    public function __construct(
        private ValorInventarioService $valorInventario,
        private FichasHermanasService $fichasHermanas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function resumen(Almacen $almacen): array
    {
        $filas = $this->filasDelAlmacen($almacen->id);
        $conStock = $filas->filter(fn (object $fila) => $fila->cantidad > 0)->values();
        $conPrecio = $conStock->filter(fn (object $fila) => $fila->con_precio);
        $sinPrecio = $conStock->reject(fn (object $fila) => $fila->con_precio);

        $valorCosto = $conStock->sum('valor_costo');
        $valorVenta = $conPrecio->sum(fn (object $fila) => $fila->precio_venta * $fila->cantidad);
        $costoConPrecio = $conPrecio->sum('valor_costo');
        $margen = $valorVenta - $costoConPrecio;
        $stockBajo = $conStock->filter(fn (object $fila) => $fila->cantidad < self::UMBRAL_STOCK_BAJO);
        $ventasPorDia = $this->ventasPorDia($almacen->id);

        return [
            'almacen' => ['id' => $almacen->id, 'nombre' => $almacen->nombre_almacen],
            'kpis' => [
                'productos' => $conStock->count(),
                'unidades' => (int) $conStock->sum('cantidad'),
                'valor_costo' => round($valorCosto, 2),
                'valor_venta' => round($valorVenta, 2),
                'costo_con_precio' => round($costoConPrecio, 2),
                'margen' => round($margen, 2),
                'margen_porcentaje' => $valorVenta > 0 ? round($margen / $valorVenta * 100, 1) : null,
            ],
            'precios' => [
                'con_precio' => $conPrecio->count(),
                'sin_precio' => $sinPrecio->count(),
                'unidades_sin_precio' => (int) $sinPrecio->sum('cantidad'),
                'costo_sin_precio' => round($sinPrecio->sum('valor_costo'), 2),
            ],
            'estado' => [
                'stock_bajo' => [
                    'productos' => $stockBajo->count(),
                    'unidades' => (int) $stockBajo->sum('cantidad'),
                ],
                'sin_stock' => $filas->count() - $conStock->count(),
                'en_transito' => [
                    'unidades' => (int) $filas->sum('en_transito'),
                    'movimientos_abiertos' => $this->movimientosAbiertos($almacen->id),
                ],
            ],
            'fusionables' => [
                'productos_con_varios_costos' => $this->productosConVariosCostos($almacen->id),
                'grupos_de_fichas_repetidas' => $this->gruposDeFichasRepetidas($conStock),
            ],
            'categorias' => $this->categorias($conStock),
            'ventas_por_dia' => $ventasPorDia,
            'ventas_resumen' => [
                'venta' => round(collect($ventasPorDia)->sum('venta'), 2),
                'ganancia' => round(collect($ventasPorDia)->sum('ganancia'), 2),
                'dias' => count($ventasPorDia),
            ],
        ];
    }

    /**
     * Una fila por producto asignado al almacén (con o sin stock), con su valor a costo real.
     *
     * @return Collection<int, object{producto_id: int, cantidad: int, en_transito: int, categoria: string, precio_venta: float, con_precio: bool, valor_costo: float}>
     */
    private function filasDelAlmacen(int $almacenId): Collection
    {
        $costos = $this->valorInventario->costosPorProductoAlmacen($almacenId);

        return DB::table('almacen_producto as ap')
            ->join('productos as p', 'p.id', '=', 'ap.producto_id')
            ->leftJoin('categorias as c', 'c.id', '=', 'p.categoria_id')
            ->leftJoin('producto_vendedors as pv', function ($join) {
                $join->on('pv.producto_id', '=', 'ap.producto_id')
                    ->on('pv.almacen_id', '=', 'ap.almacen_id');
            })
            ->where('ap.almacen_id', $almacenId)
            ->select(
                'ap.producto_id',
                'ap.cantidad',
                'ap.cantidad_en_transito',
                'p.precio_compra_producto',
                'c.nombre_categoria',
                'pv.precio_venta',
            )
            ->get()
            ->unique('producto_id')
            ->map(function (object $fila) use ($costos, $almacenId) {
                $cantidad = (int) $fila->cantidad;
                $precioVenta = (float) ($fila->precio_venta ?? 0);

                return (object) [
                    'producto_id' => (int) $fila->producto_id,
                    'cantidad' => $cantidad,
                    'en_transito' => (int) $fila->cantidad_en_transito,
                    'categoria' => $fila->nombre_categoria ?? 'Sin categoría',
                    'precio_venta' => $precioVenta,
                    'con_precio' => $precioVenta > 0,
                    'valor_costo' => $cantidad > 0
                        ? $this->valorInventario->valorDeCombinacion(
                            $costos[$fila->producto_id.'-'.$almacenId] ?? null,
                            $cantidad,
                            (float) $fila->precio_compra_producto,
                        )
                        : 0.0,
                ];
            })
            ->values();
    }

    /**
     * Movimientos de stock sin cerrar que entran o salen de este almacén.
     */
    private function movimientosAbiertos(int $almacenId): int
    {
        return Movimiento::query()
            ->whereIn('estado', ['pendiente_confirmacion', 'en_transito'])
            ->where(fn ($query) => $query
                ->where('almacen_origen_id', $almacenId)
                ->orWhere('almacen_destino_id', $almacenId))
            ->count();
    }

    /**
     * Productos que en este almacén tienen 2+ lotes con stock a costos distintos (candidatos a "Fusionar lotes").
     */
    private function productosConVariosCostos(int $almacenId): int
    {
        return DB::table('lotes_stock')
            ->where('almacen_id', $almacenId)
            ->where('cantidad_disponible', '>', 0)
            ->groupBy('producto_id')
            ->havingRaw('COUNT(DISTINCT precio_costo) > 1')
            ->select('producto_id')
            ->get()
            ->count();
    }

    /**
     * Cuántos productos aparecen repetidos (mismas fichas hermanas) con stock en este almacén.
     *
     * @param  Collection<int, object>  $conStock
     */
    private function gruposDeFichasRepetidas(Collection $conStock): int
    {
        return Producto::whereIn('id', $conStock->pluck('producto_id'))
            ->get()
            ->countBy(fn (Producto $producto) => $this->fichasHermanas->clave($producto))
            ->filter(fn (int $veces) => $veces > 1)
            ->count();
    }

    /**
     * Costo del almacén por categoría: las más grandes por separado y el resto como "Otras".
     *
     * @param  Collection<int, object>  $conStock
     * @return array<int, array{categoria: string, costo: float, unidades: int}>
     */
    private function categorias(Collection $conStock): array
    {
        $porCategoria = $conStock
            ->groupBy('categoria')
            ->map(fn (Collection $grupo, string $categoria) => [
                'categoria' => $categoria,
                'costo' => round($grupo->sum('valor_costo'), 2),
                'unidades' => (int) $grupo->sum('cantidad'),
            ])
            ->sortByDesc('costo')
            ->values();

        $visibles = $porCategoria->take(self::CATEGORIAS_VISIBLES);
        $resto = $porCategoria->slice(self::CATEGORIAS_VISIBLES);

        if ($resto->isNotEmpty()) {
            $visibles->push([
                'categoria' => 'Otras',
                'costo' => round($resto->sum('costo'), 2),
                'unidades' => (int) $resto->sum('unidades'),
            ]);
        }

        return $visibles->all();
    }

    /**
     * Ventas completadas por día: lo vendido, su costo y la ganancia bruta (venta − costo). Sin huecos
     * entre la primera venta y hoy (los días sin ventas van en 0) para que el gráfico de área sea continuo.
     *
     * @return array<int, array{fecha: string, venta: float, costo: float, ganancia: float}>
     */
    private function ventasPorDia(int $almacenId): array
    {
        $hoy = now()->startOfDay();
        $desde = $hoy->copy()->subDays(self::DIAS_HISTORIAL_VENTAS - 1);

        $dias = DB::table('ventas as v')
            ->join('venta_detalles as d', 'd.venta_id', '=', 'v.id')
            ->where('v.almacen_id', $almacenId)
            ->where('v.estado', 'completada')
            ->where('v.created_at', '>=', $desde)
            ->groupBy(DB::raw('DATE(v.created_at)'))
            ->orderBy(DB::raw('DATE(v.created_at)'))
            ->selectRaw('DATE(v.created_at) as fecha, SUM(d.subtotal) as venta, SUM(d.costo_unitario * d.cantidad) as costo')
            ->get()
            ->keyBy('fecha');

        if ($dias->isEmpty()) {
            return [];
        }

        $serie = [];
        for ($dia = Carbon::parse($dias->keys()->first())->startOfDay(); $dia->lte($hoy); $dia->addDay()) {
            $fecha = $dia->toDateString();
            $venta = (float) ($dias[$fecha]->venta ?? 0);
            $costo = (float) ($dias[$fecha]->costo ?? 0);

            $serie[] = [
                'fecha' => $fecha,
                'venta' => round($venta, 2),
                'costo' => round($costo, 2),
                'ganancia' => round($venta - $costo, 2),
            ];
        }

        return $serie;
    }
}
