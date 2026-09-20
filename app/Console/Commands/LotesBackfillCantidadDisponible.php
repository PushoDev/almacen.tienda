<?php

namespace App\Console\Commands;

use App\Models\AlmacenProducto;
use App\Models\LoteStock;
use Illuminate\Console\Command;

/**
 * Backfill de `lotes_stock.cantidad_disponible` para lotes creados antes de que existiera esta
 * columna (2026-09-20, ver LoteConsumoService). La migración que la agregó la inicializó igual a
 * `cantidad` para todas las filas existentes — correcto solo para los almacenes donde nunca hubo
 * una salida parcial desde entonces. Este comando reconcilia contra el stock real de hoy
 * (`almacen_producto.cantidad`) para los que sí la tuvieron.
 *
 * Regla (aproximación de mejor esfuerzo, igual que el resto de los backfills de este proyecto —
 * no hay forma de reconstruir con certeza qué unidad salió de cuál lote en el pasado): por cada
 * (producto_id, almacen_id) con lotes, si la suma de `cantidad_disponible` supera el stock real,
 * se consume FIFO retroactivo (el lote más viejo primero) hasta que la suma coincida. Nunca se
 * incrementa por encima de la `cantidad` original de cada lote — solo se corrige hacia abajo.
 *
 * Idempotente: correr dos veces seguidas no cambia nada la segunda vez.
 */
class LotesBackfillCantidadDisponible extends Command
{
    protected $signature = 'lotes:backfill-cantidad-disponible {--dry-run : Solo mostrar qué cambiaría, sin escribir}';

    protected $description = 'Reconcilia lotes_stock.cantidad_disponible contra el stock real (almacen_producto) para lotes creados antes de 2026-09-20';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $grupos = LoteStock::select('producto_id', 'almacen_id')
            ->distinct()
            ->orderBy('producto_id')
            ->orderBy('almacen_id')
            ->get();

        $this->info("Revisando {$grupos->count()} combinaciones producto+almacén con lotes...");

        $gruposCorregidos = 0;
        $lotesCorregidos = 0;

        foreach ($grupos as $grupo) {
            $lotes = LoteStock::where('producto_id', $grupo->producto_id)
                ->where('almacen_id', $grupo->almacen_id)
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            $stockReal = (int) (AlmacenProducto::where('producto_id', $grupo->producto_id)
                ->where('almacen_id', $grupo->almacen_id)
                ->value('cantidad') ?? 0);

            $sumaActual = (int) $lotes->sum('cantidad_disponible');
            $exceso = $sumaActual - $stockReal;

            if ($exceso <= 0) {
                continue; // ya coincide, o el stock real supera lo registrado en lotes (nada que corregir acá)
            }

            $gruposCorregidos++;
            $restanteAQuitar = $exceso;

            foreach ($lotes as $lote) {
                if ($restanteAQuitar <= 0) {
                    break;
                }

                $aQuitar = min($restanteAQuitar, $lote->cantidad_disponible);
                if ($aQuitar <= 0) {
                    continue;
                }

                $nuevaDisponible = $lote->cantidad_disponible - $aQuitar;
                $lotesCorregidos++;

                if ($dryRun) {
                    $this->line("  🔷 Lote #{$lote->id} ({$lote->codigo}, producto #{$grupo->producto_id}, almacén #{$grupo->almacen_id}) — cantidad_disponible pasaría de {$lote->cantidad_disponible} a {$nuevaDisponible}");
                } else {
                    $lote->update(['cantidad_disponible' => $nuevaDisponible]);
                    $this->info("  ✅ Lote #{$lote->id} ({$lote->codigo}) actualizado a cantidad_disponible={$nuevaDisponible}");
                }

                $restanteAQuitar -= $aQuitar;
            }
        }

        $this->info("Completado. {$gruposCorregidos} combinaciones producto+almacén, {$lotesCorregidos} lote(s) ".($dryRun ? 'cambiarían.' : 'corregidos.'));

        return self::SUCCESS;
    }
}
