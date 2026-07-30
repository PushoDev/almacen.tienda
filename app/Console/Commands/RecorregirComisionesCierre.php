<?php

namespace App\Console\Commands;

use App\Models\CierreCaja;
use App\Models\VentaDetalle;
use Illuminate\Console\Command;

class RecorregirComisionesCierre extends Command
{
    protected $signature = 'cierres:recorregir-comisiones {--dry-run : Solo mostrar cambios sin escribir}';
    protected $description = 'Corrige las comisiones en productos_resumen usando venta_ids del JSON almacenado';

    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $cierres = CierreCaja::orderBy('id')->get();
        $total = $cierres->count();
        $actualizados = 0;

        $this->info("Procesando {$total} cierres...");

        foreach ($cierres as $cierre) {
            $detalles = $cierre->detalles;
            if (empty($detalles) || !is_array($detalles)) continue;

            $modificado = false;

            $ventaIds = [];
            foreach ($detalles as $monedaData) {
                if (!empty($monedaData['items_ventas'])) {
                    foreach ($monedaData['items_ventas'] as $iv) {
                        $ventaIds[(int) $iv['venta_id']] = true;
                    }
                }
            }

            if (empty($ventaIds)) continue;

            $ventaIds = array_keys($ventaIds);

            foreach ($detalles as &$monedaData) {
                if (empty($monedaData['productos_resumen'])) continue;

                foreach ($monedaData['productos_resumen'] as $key => &$prod) {
                    $productoId = (int) $prod['id'];
                    $almacenId = (int) ($prod['almacen_id'] ?? 0);

                    $correcta = (float) VentaDetalle::whereIn('venta_id', $ventaIds)
                        ->where('producto_id', $productoId)
                        ->whereHas('venta', fn($q) => $q->where('almacen_id', $almacenId))
                        ->selectRaw('COALESCE(SUM(comision_unitaria * cantidad), 0) as total')
                        ->value('total');

                    $correcta = round($correcta, 2);
                    $vieja = round((float) ($prod['comision'] ?? 0), 2);

                    if (abs($correcta - $vieja) > 0.005) {
                        $this->line("  Cierre #{$cierre->id} | Prod {$key}: {$vieja} → {$correcta} USD");
                        $prod['comision'] = $correcta;
                        $modificado = true;
                    }
                }
            }

            if ($modificado) {
                $actualizados++;
                if (!$dryRun) {
                    $cierre->detalles = $detalles;
                    $cierre->save();
                    $this->info("  ✅ Cierre #{$cierre->id} actualizado");
                } else {
                    $this->info("  🔷 Cierre #{$cierre->id} requiere correccion");
                }
            }
        }

        $this->info("Completado. {$actualizados} de {$total} cierres " . ($dryRun ? 'requieren correccion.' : 'actualizados.'));
    }
}
