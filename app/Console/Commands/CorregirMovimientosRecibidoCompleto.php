<?php

namespace App\Console\Commands;

use App\Models\Movimiento;
use App\Models\MovimientoSeguimiento;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Corrige movimientos marcados 'recibido_completo' que en realidad no lo eran.
 *
 * MovimientosController::recibir() decidía el estado comparando la SUMA total
 * (totalRecibido == totalSolicitado) en vez de cada línea por separado — un
 * movimiento con 2+ productos donde a uno le faltó una cantidad y a otro le
 * sobró la misma cantidad se cancelaban en el total y quedaba "completo" sin
 * que ninguna línea hubiera llegado exacta (caso real: movimiento #52, ver
 * memoria/hilo de la sesión 2026-08-22). Ya corregido en recibir() para
 * movimientos nuevos — este comando corrige los que ya existían con la
 * clasificación vieja, para correr una sola vez al desplegar el fix.
 *
 * Idempotente: solo toca movimientos que hoy están 'recibido_completo' Y
 * tienen al menos una línea con cantidad_recibida != cantidad_despachada —
 * después de corregirlos una vez, ya no vuelven a calificar en una segunda
 * corrida.
 */
class CorregirMovimientosRecibidoCompleto extends Command
{
    protected $signature = 'movimientos:corregir-recibido-completo {--dry-run : Solo mostrar cuáles se corregirían, sin escribir}';

    protected $description = "Corrige a 'recibido_parcial' los movimientos marcados 'recibido_completo' que tienen una línea con más recepción y otra con menos que se cancelaban en el total";

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $movimientos = Movimiento::where('estado', 'recibido_completo')
            ->with('detalles')
            ->orderBy('id')
            ->get();

        $this->info("Revisando {$movimientos->count()} movimientos 'recibido_completo'...");

        $corregidos = 0;

        foreach ($movimientos as $movimiento) {
            $tieneDiscrepancia = $movimiento->detalles->contains(
                fn ($detalle) => (int) $detalle->cantidad_recibida !== (int) $detalle->cantidad_despachada
            );

            if (! $tieneDiscrepancia) {
                continue;
            }

            $detalleTexto = $movimiento->detalles
                ->map(fn ($d) => "{$d->producto_id}: despachada={$d->cantidad_despachada} recibida={$d->cantidad_recibida}")
                ->implode(' | ');

            $corregidos++;

            if ($dryRun) {
                $this->line("  🔷 Movimiento #{$movimiento->id} requiere corrección — {$detalleTexto}");

                continue;
            }

            DB::transaction(function () use ($movimiento) {
                $movimiento->update(['estado' => 'recibido_parcial']);

                MovimientoSeguimiento::create([
                    'movimiento_id' => $movimiento->id,
                    'estado' => 'recibido_parcial',
                    'observaciones' => 'Corrección automática: quedó como recibido_completo por un bug ya corregido en recibir() '
                        .'(comparaba solo la suma total, no cada línea) — al menos un producto no recibió exactamente lo despachado.',
                    'user_id' => $movimiento->user_id,
                ]);
            });

            $this->info("  ✅ Movimiento #{$movimiento->id} corregido a recibido_parcial — {$detalleTexto}");
        }

        $this->info("Completado. {$corregidos} de {$movimientos->count()} movimientos ".($dryRun ? 'requieren corrección.' : 'corregidos.'));

        return self::SUCCESS;
    }
}
