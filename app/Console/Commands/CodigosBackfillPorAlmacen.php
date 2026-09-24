<?php

namespace App\Console\Commands;

use App\Models\AlmacenProducto;
use App\Models\AlmacenProductoCodigo;
use App\Models\ProductoCodigo;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Llena `almacen_producto_codigos` (reparto de los códigos de barras por almacén) para el stock
 * que ya existe. `producto_codigos.cantidad` es el total del producto en todos los almacenes, así
 * que el reparto por almacén hay que reconstruirlo:
 *
 * - Producto con un solo código: todo el stock de cada almacén es de ese código (sin ambigüedad).
 * - Producto con 2+ códigos: mejor esfuerzo. Primero se respeta lo que dicen las compras aprobadas
 *   (cada línea guarda almacén y código); lo que falte se reparte con el código que más
 *   unidades tiene sin ubicar, empezando por el almacén con más stock. Es una aproximación: los
 *   traslados no guardaban qué código se movió. Se muestra el resultado de cada uno para revisarlo.
 *
 * Solo llena los almacenes que todavía no tienen reparto: correrlo dos veces no cambia nada.
 */
class CodigosBackfillPorAlmacen extends Command
{
    protected $signature = 'codigos:backfill-por-almacen {--dry-run : Solo mostrar qué repartiría, sin escribir}';

    protected $description = 'Reparte por almacén las unidades de cada código de barras (almacen_producto_codigos) a partir del stock actual';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $productoIds = AlmacenProducto::where('cantidad', '>', 0)->distinct()->orderBy('producto_id')->pluck('producto_id');
        $this->info("Revisando {$productoIds->count()} productos con stock...");

        $filasNuevas = 0;
        $productosConVariosCodigos = 0;
        $sinCodigos = [];

        foreach ($productoIds as $productoId) {
            $codigos = ProductoCodigo::where('producto_id', $productoId)->orderByDesc('es_default')->orderBy('id')->get();

            if ($codigos->isEmpty()) {
                $sinCodigos[] = $productoId;

                continue;
            }

            $reparto = $this->repartir((int) $productoId, $codigos);

            if ($reparto === []) {
                continue;
            }

            if ($codigos->count() > 1) {
                $productosConVariosCodigos++;
                $this->line("  🔷 Producto #{$productoId} ({$codigos->count()} códigos):");
                foreach ($reparto as $almacenId => $porCodigo) {
                    $detalle = collect($porCodigo)->map(fn (int $cantidad, int $codigoId) => $codigos->firstWhere('id', $codigoId)->codigo_barras." x{$cantidad}")->implode(', ');
                    $this->line("       almacén #{$almacenId}: {$detalle}");
                }
            }

            foreach ($reparto as $porCodigo) {
                $filasNuevas += count($porCodigo);
            }

            if ($dryRun) {
                continue;
            }

            DB::transaction(function () use ($reparto) {
                foreach ($reparto as $almacenId => $porCodigo) {
                    foreach ($porCodigo as $codigoId => $cantidad) {
                        AlmacenProductoCodigo::updateOrCreate(
                            ['almacen_id' => $almacenId, 'producto_codigo_id' => $codigoId],
                            ['cantidad' => $cantidad],
                        );
                    }
                }
            });
        }

        if ($sinCodigos !== []) {
            $this->warn('Productos con stock y SIN ningún código de barras (no se reparte, el POS los trata como antes): #'.implode(', #', $sinCodigos));
        }

        $this->info("Completado. {$filasNuevas} fila(s) de reparto ".($dryRun ? 'se crearían' : 'creadas').", {$productosConVariosCodigos} producto(s) con 2+ códigos para revisar.");

        $this->reportarDesajustes();

        return self::SUCCESS;
    }

    /**
     * Reparto de un producto en los almacenes que todavía no tienen: [almacén => [código => cantidad]].
     *
     * @param  Collection<int, ProductoCodigo>  $codigos  el default primero
     * @return array<int, array<int, int>>
     */
    private function repartir(int $productoId, $codigos): array
    {
        $stock = AlmacenProducto::where('producto_id', $productoId)
            ->where('cantidad', '>', 0)
            ->orderByDesc('cantidad')
            ->orderBy('almacen_id')
            ->pluck('cantidad', 'almacen_id')
            ->map(fn ($cantidad) => (int) $cantidad)
            ->all();

        $yaRepartidos = AlmacenProductoCodigo::whereIn('producto_codigo_id', $codigos->pluck('id'))->get()->groupBy('almacen_id');
        $pendientes = array_diff_key($stock, $yaRepartidos->all());

        if ($pendientes === []) {
            return [];
        }

        $defaultId = (int) $codigos->first()->id;

        if ($codigos->count() === 1) {
            return array_map(fn (int $cantidad) => [$defaultId => $cantidad], $pendientes);
        }

        // Unidades de cada código que todavía no están ubicadas en ningún almacén.
        $disponible = $codigos->pluck('cantidad', 'id')->map(fn ($cantidad) => max(0, (int) $cantidad))->all();
        foreach ($yaRepartidos as $filas) {
            foreach ($filas as $fila) {
                $disponible[$fila->producto_codigo_id] = max(0, $disponible[$fila->producto_codigo_id] - $fila->cantidad);
            }
        }

        $pistas = $this->pistasDeCompras($productoId, $codigos, $defaultId);
        $reparto = [];
        $falta = $pendientes;

        // 1) Lo que dicen las compras aprobadas: ese código llegó a ese almacén.
        foreach ($falta as $almacenId => $necesita) {
            foreach ($pistas[$almacenId] ?? [] as $codigoId => $comprado) {
                $toma = min($necesita, $comprado, $disponible[$codigoId] ?? 0);
                if ($toma > 0) {
                    $reparto[$almacenId][$codigoId] = ($reparto[$almacenId][$codigoId] ?? 0) + $toma;
                    $disponible[$codigoId] -= $toma;
                    $necesita -= $toma;
                }
            }
            $falta[$almacenId] = $necesita;
        }

        // 2) Lo demás: el código con más unidades sin ubicar; si ya no quedan, el código por defecto.
        foreach ($falta as $almacenId => $necesita) {
            arsort($disponible);
            foreach ($disponible as $codigoId => $libres) {
                if ($necesita <= 0) {
                    break;
                }
                $toma = min($necesita, $libres);
                if ($toma > 0) {
                    $reparto[$almacenId][$codigoId] = ($reparto[$almacenId][$codigoId] ?? 0) + $toma;
                    $disponible[$codigoId] -= $toma;
                    $necesita -= $toma;
                }
            }
            if ($necesita > 0) {
                $reparto[$almacenId][$defaultId] = ($reparto[$almacenId][$defaultId] ?? 0) + $necesita;
            }
        }

        return $reparto;
    }

    /**
     * Unidades compradas por almacén y código en compras aprobadas: [almacén => [código => cantidad]],
     * el código más comprado primero. Una línea sin código de barras cuenta para el código por defecto.
     *
     * @param  Collection<int, ProductoCodigo>  $codigos
     * @return array<int, array<int, int>>
     */
    private function pistasDeCompras(int $productoId, $codigos, int $defaultId): array
    {
        $idPorBarras = $codigos->pluck('id', 'codigo_barras')->all();

        $lineas = DB::table('compra_producto as cp')
            ->join('compras as c', 'c.id', '=', 'cp.compra_id')
            ->where('cp.producto_id', $productoId)
            ->where('c.estado', 'aprobada')
            ->whereNotNull('cp.almacen_id')
            ->get(['cp.almacen_id', 'cp.codigo_barras', 'cp.cantidad']);

        $pistas = [];
        foreach ($lineas as $linea) {
            $barras = trim((string) $linea->codigo_barras);
            $codigoId = $barras === '' ? $defaultId : ($idPorBarras[$barras] ?? null);

            if ($codigoId !== null) {
                $pistas[$linea->almacen_id][$codigoId] = ($pistas[$linea->almacen_id][$codigoId] ?? 0) + (int) $linea->cantidad;
            }
        }

        foreach ($pistas as $almacenId => $porCodigo) {
            arsort($porCodigo);
            $pistas[$almacenId] = $porCodigo;
        }

        return $pistas;
    }

    /**
     * Combinaciones producto+almacén donde el reparto no suma el stock real (esas siguen
     * comportándose como antes en el POS).
     */
    private function reportarDesajustes(): void
    {
        $desajustes = DB::table('almacen_producto as ap')
            ->join('producto_codigos as pc', 'pc.producto_id', '=', 'ap.producto_id')
            ->leftJoin('almacen_producto_codigos as apc', function ($join) {
                $join->on('apc.producto_codigo_id', '=', 'pc.id')->on('apc.almacen_id', '=', 'ap.almacen_id');
            })
            ->where('ap.cantidad', '>', 0)
            ->groupBy('ap.producto_id', 'ap.almacen_id', 'ap.cantidad')
            ->havingRaw('COALESCE(SUM(apc.cantidad), 0) <> ap.cantidad')
            ->select('ap.producto_id', 'ap.almacen_id', 'ap.cantidad')
            ->selectRaw('COALESCE(SUM(apc.cantidad), 0) as repartido')
            ->get();

        $this->info('Combinaciones producto+almacén cuyo reparto no suma el stock: '.$desajustes->count().($this->option('dry-run') ? ' (antes de escribir; los que aún no se repartieron cuentan aquí).' : '.'));

        foreach ($desajustes->take(15) as $fila) {
            $this->line("  producto #{$fila->producto_id}, almacén #{$fila->almacen_id}: stock {$fila->cantidad}, repartido {$fila->repartido}");
        }
    }
}
