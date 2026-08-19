<?php

namespace App\Console\Commands;

use App\Models\HistorialComparacionMensual;
use App\Services\DashboardStatsService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Backfill único, no reutilizable: corrige el "ancla" (saldo_inicio_mes) de
 * agosto 2026 para que "Saldo Acumulado" incluya el movimiento real del 1 al
 * 18 de agosto, que quedó fuera cuando Fase 4a capturó el ancla a mitad de
 * mes (ver docs/arreglos-pendientes/dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md).
 * No borra ni recrea filas de historial_comparacion_mensuals, solo corrige
 * saldo_inicio_mes y recalcula monto_actual/diferencia con el mismo método
 * que ya usa el rollover mensual normal.
 *
 * Idempotente: recalcula desde cero contra las tablas fuente cada vez que se
 * corre (no suma incrementalmente), así que correrlo dos veces no duplica
 * nada — solo redondea a "ahora" el rango reconstruido.
 */
class ReconstruirMovimientoAgosto2026 extends Command
{
    protected $signature = 'dashboard:reconstruir-movimiento-agosto-2026';

    protected $description = 'Backfill único: corrige el ancla de Comparación Mensual de agosto 2026 con el movimiento real de cuentas del 1 de agosto en adelante';

    public function handle(DashboardStatsService $dashboardStatsService): int
    {
        $desde = Carbon::parse('2026-08-01 00:00:00');
        $hasta = now();
        $mesComparado = Carbon::parse('2026-08-01')->toDateString();

        $this->info("Reconstruyendo movimiento de cuentas: {$desde} a {$hasta}");

        $movimientoReconstruido = $dashboardStatsService->reconstruirMovimientoCuentas($desde, $hasta);

        $totalesPorMoneda = DB::table('cuentas as c')
            ->join('monedas as m', 'c.moneda_id', '=', 'm.id')
            ->selectRaw('m.codigo_moneda as moneda, SUM(c.saldo_cuenta) as total')
            ->groupBy('moneda')
            ->pluck('total', 'moneda');

        $filas = HistorialComparacionMensual::whereNull('user_id')
            ->where('mes_comparado', $mesComparado)
            ->where('moneda_codigo', '!=', 'INVENTARIO')
            ->get();

        foreach ($filas as $fila) {
            $codigo = $fila->moneda_codigo;
            $movimiento = $movimientoReconstruido[$codigo] ?? 0.0;
            $valorEnVivo = (float) ($totalesPorMoneda[$codigo] ?? 0.0);
            $anclaAnterior = (float) $fila->saldo_inicio_mes;
            $anclaNueva = round($valorEnVivo - $movimiento, 2);

            $fila->update(['saldo_inicio_mes' => $anclaNueva]);

            $this->line("  {$codigo}: movimiento reconstruido = " . number_format($movimiento, 2)
                . " | ancla {$anclaAnterior} -> {$anclaNueva}");
        }

        $dashboardStatsService->actualizarComparacionMensual(null);

        $this->info('Comparación mensual recalculada con el ancla corregida.');

        return self::SUCCESS;
    }
}
