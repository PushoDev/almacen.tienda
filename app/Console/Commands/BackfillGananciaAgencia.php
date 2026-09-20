<?php

namespace App\Console\Commands;

use App\Services\DashboardStatsService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Backfill único: rellena `ventas.ganancia_neta` y
 * `movimientos_financieros.ganancia_perdida_cambiaria` para operaciones
 * completadas ANTES de que estas columnas existieran (2026-08-19), para que
 * la tarjeta "Ganancia Real de la Agencia" del dashboard no arranque en 0.00
 * a pesar de haber actividad real ese mes.
 *
 * Ventas: 100% reconstruible sin ambigüedad — total_ganancia/total_comision/
 * ganancia_perdida_cambiaria ya existían y estaban correctos, solo faltaba
 * combinarlos en la columna nueva.
 *
 * Transferencias: reconstruible con la tasa oficial histórica real (ver
 * DashboardStatsService::tasaOficialHistorica()), no con la tasa actual —
 * ese fue el error que ya se evitó en la Fase 4a-bis (dashboard:reconstruir-
 * movimiento-agosto-2026). Resuelve la tasa por moneda_id de la cuenta
 * involucrada, no por código de moneda, porque el sistema tiene 2 monedas
 * distintas codificadas "CUP".
 *
 * Idempotente: solo toca filas donde el campo nuevo sigue en NULL.
 */
class BackfillGananciaAgencia extends Command
{
    protected $signature = 'dashboard:backfill-ganancia-agencia';

    protected $description = 'Backfill único: calcula ganancia_neta (Ventas) y ganancia_perdida_cambiaria (Transferencias) para operaciones anteriores a 2026-08-19';

    public function handle(DashboardStatsService $dashboardStatsService): int
    {
        $ventasActualizadas = DB::table('ventas')
            ->where('estado', 'completada')
            ->whereNull('ganancia_neta')
            ->update([
                'ganancia_neta' => DB::raw('total_ganancia - total_comision + ganancia_perdida_cambiaria'),
            ]);

        $this->info("Ventas: {$ventasActualizadas} fila(s) con ganancia_neta calculada.");

        $transferencias = DB::table('movimientos_financieros')
            ->where('tipo_movimiento_id', 3)
            ->whereNull('ganancia_perdida_cambiaria')
            ->get();

        $cuentasCache = [];
        $obtenerMonedaIdCuenta = function (?int $cuentaId) use (&$cuentasCache) {
            if (! $cuentaId) {
                return null;
            }
            if (! array_key_exists($cuentaId, $cuentasCache)) {
                $cuentasCache[$cuentaId] = DB::table('cuentas')->where('id', $cuentaId)->value('moneda_id');
            }

            return $cuentasCache[$cuentaId];
        };

        $actualizadas = 0;
        foreach ($transferencias as $t) {
            $momento = Carbon::parse($t->fecha_operacion);

            if ($t->moneda_origen === $t->moneda_destino) {
                DB::table('movimientos_financieros')->where('id', $t->id)->update([
                    'tasa_oficial_en_momento' => 1.0,
                    'ganancia_perdida_cambiaria' => 0.0,
                ]);
                $actualizadas++;

                continue;
            }

            $monedaOrigenId = $obtenerMonedaIdCuenta($t->cuenta_origen_id);
            $monedaDestinoId = $obtenerMonedaIdCuenta($t->cuenta_destino_id);

            $tasaOrigenOficial = ($t->cuenta_origen_id && $t->moneda_origen !== 'USD' && $monedaOrigenId)
                ? $dashboardStatsService->tasaOficialHistorica($monedaOrigenId, $momento)
                : 1.0;
            $tasaDestinoOficial = ($t->cuenta_destino_id && $monedaDestinoId)
                ? $dashboardStatsService->tasaOficialHistorica($monedaDestinoId, $momento)
                : 1.0;

            $montoOrigen = (float) $t->monto;
            // El monto realmente acreditado al destino no queda guardado como campo
            // propio — se reconstruye del delta de saldo del movimiento (mismo
            // criterio ya verificado en Fase 4a-bis como la fuente correcta).
            $montoDestinoReal = (float) $t->saldo_posterior_destino - (float) $t->saldo_anterior_destino;

            $montoEnUsdOficial = $tasaOrigenOficial > 0 ? $montoOrigen / $tasaOrigenOficial : $montoOrigen;
            $montoDestinoOficial = round($montoEnUsdOficial * $tasaDestinoOficial, 2);

            $tasaUsdMonedaDestino = $t->moneda_destino === 'USD' ? 1.0 : $tasaDestinoOficial;
            $gananciaPerdida = $tasaUsdMonedaDestino > 0
                ? round(($montoDestinoOficial - $montoDestinoReal) / $tasaUsdMonedaDestino, 2)
                : 0.0;

            DB::table('movimientos_financieros')->where('id', $t->id)->update([
                'tasa_oficial_en_momento' => $t->moneda_origen !== 'USD' ? $tasaOrigenOficial : $tasaDestinoOficial,
                'ganancia_perdida_cambiaria' => $gananciaPerdida,
            ]);

            if (abs($gananciaPerdida) > 0.005) {
                $this->line("  Transferencia #{$t->id} ({$momento}): tasa aplicada={$t->tasa_cambio_aplicada}, oficial reconstruida={$tasaOrigenOficial}/{$tasaDestinoOficial} -> ganancia_perdida={$gananciaPerdida}");
            }

            $actualizadas++;
        }

        $this->info("Transferencias: {$actualizadas} fila(s) con ganancia_perdida_cambiaria calculada.");

        return self::SUCCESS;
    }
}
