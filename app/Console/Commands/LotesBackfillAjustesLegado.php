<?php

namespace App\Console\Commands;

use App\Models\AlmacenProducto;
use App\Models\LoteStock;
use App\Models\Producto;
use Illuminate\Console\Command;

/**
 * Crea un lote de ajuste para el stock real que no tiene ningún lote que lo respalde —
 * típicamente inventario de antes de 2026-09-07 (cuando `lotes_stock` no existía) que convive
 * en el mismo almacén con un lote nuevo y sí rastreado (ej. de un traslado reciente).
 *
 * Sin esto, `Producto::costoEnAlmacen()`/`lotesActivosEnAlmacen()` solo ven el lote nuevo — el
 * costo mostrado en Show.tsx/Edit.tsx termina presentándose como si aplicara a TODA la
 * disponibilidad del almacén, cuando en realidad solo cubre una parte (caso real: OLLA ARROCERA
 * en Manzanillo Almacén, 78 unidades reales pero solo 50 con lote propio — ver conversación
 * 2026-09-20, movimiento #209).
 *
 * El costo del lote de ajuste creado es el costo global de la ficha (`precio_compra_producto`)
 * — mejor aproximación disponible para stock sin trazabilidad, mismo criterio que
 * `Producto::costoEnAlmacen()` ya usa como fallback. No es un dato exacto del pasado, es una
 * aproximación — igual que el resto de los backfills de este proyecto.
 *
 * Idempotente: una vez creado el lote de ajuste para un producto+almacén, la suma de lotes ya
 * cubre el stock real y no se vuelve a crear nada ahí en corridas futuras.
 */
class LotesBackfillAjustesLegado extends Command
{
    protected $signature = 'lotes:backfill-ajustes-legado {--dry-run : Solo mostrar qué lotes se crearían, sin escribir}';

    protected $description = 'Crea lotes de ajuste para el stock real que no tiene ningún lote que lo respalde (inventario de antes de 2026-09-07)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $sumasPorCombo = LoteStock::selectRaw('producto_id, almacen_id, SUM(cantidad_disponible) as total')
            ->groupBy('producto_id', 'almacen_id')
            ->get()
            ->keyBy(fn ($fila) => $fila->producto_id.'-'.$fila->almacen_id);

        $stocks = AlmacenProducto::where('cantidad', '>', 0)->get();

        $this->info("Revisando {$stocks->count()} combinaciones producto+almacén con stock real...");

        $creados = 0;

        foreach ($stocks as $stock) {
            $clave = $stock->producto_id.'-'.$stock->almacen_id;
            $totalConLote = (int) ($sumasPorCombo[$clave]->total ?? 0);
            $diferencia = $stock->cantidad - $totalConLote;

            if ($diferencia <= 0) {
                continue; // el stock real ya está totalmente cubierto por lotes conocidos
            }

            $producto = Producto::find($stock->producto_id);
            if (! $producto) {
                continue; // producto huérfano, no debería pasar pero por seguridad
            }

            $creados++;
            $codigo = LoteStock::generarCodigoAjusteLegado($stock->producto_id, $stock->almacen_id);

            if ($dryRun) {
                $this->line(
                    "  🔷 {$producto->nombre_producto} (producto #{$stock->producto_id}, almacén #{$stock->almacen_id}) — ".
                    "se crearía lote {$codigo} con {$diferencia} uds. a \${$producto->precio_compra_producto} (costo global de la ficha)"
                );

                continue;
            }

            // LoteConsumoService consume FIFO por `created_at` — si este lote naciera con la
            // fecha de hoy, el sistema lo trataría como el MÁS NUEVO (cuando en realidad
            // representa la mercancía más VIEJA, de antes de que lotes_stock existiera).
            // Se fecha con `Producto.created_at` — mejor aproximación de cuándo entró ese stock
            // al sistema — para que un consumo futuro lo agote primero, como corresponde.
            $lote = new LoteStock([
                'codigo' => $codigo,
                'compra_producto_id' => null,
                'movimiento_id' => null,
                'lote_origen_id' => null,
                'producto_id' => $stock->producto_id,
                'almacen_id' => $stock->almacen_id,
                'cantidad' => $diferencia,
                'cantidad_disponible' => $diferencia,
                'precio_costo' => $producto->precio_compra_producto,
            ]);
            $lote->created_at = $producto->created_at ?? now();
            $lote->updated_at = now();
            $lote->save();

            $this->info(
                "  ✅ {$producto->nombre_producto} (producto #{$stock->producto_id}, almacén #{$stock->almacen_id}) — ".
                "lote {$codigo} creado con {$diferencia} uds. a \${$producto->precio_compra_producto}"
            );
        }

        $this->info("Completado. {$creados} lote(s) de ajuste ".($dryRun ? 'se crearían.' : 'creados.'));

        return self::SUCCESS;
    }
}
