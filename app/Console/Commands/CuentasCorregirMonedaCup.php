<?php

namespace App\Console\Commands;

use App\Models\Cuenta;
use App\Models\Moneda;
use Illuminate\Console\Command;

/**
 * Corrige cuentas cuyo `moneda_id` no corresponde a su `tipo` (efectivo/tarjeta), para el caso
 * de las 2 monedas "CUP" que este sistema maneja a propósito (2026-08-25, confirmado por el
 * cliente): CUP efectivo (id real: "Peso Cubano MN", tasa de cambio en efectivo) y CUP tarjeta
 * ("TARJETA DE MONEDA NACIONAL", tasa de transferencia — distinta, real spread de ~10 puntos
 * verificado en datos reales: 675 vs 685). Ver [[reference_moneda_cup_duplicada]].
 *
 * Encontrado analizando /logistica: 4 cuentas tipo 'tarjeta' apuntaban a la moneda CUP-efectivo
 * en vez de CUP-tarjeta — se valoraban con la tasa equivocada en cualquier cálculo que use
 * saldo_cuenta / tasa_cambio (Resumen de Cuentas, Capital Financiero, Comparación Mensual...).
 *
 * Resuelve las 2 monedas por `nombre_moneda` exacto (único en el sistema, `MonedaController`
 * valida `unique:monedas,nombre_moneda`), no por `codigo_moneda` (ambas comparten "CUP") ni por
 * id numérico hardcodeado (más frágil entre entornos).
 *
 * Corrige en ambas direcciones por si acaso (aunque hoy solo hay mal-asignación en un sentido,
 * confirmado en datos reales) — reasignar solo lo que esté mal, nunca tocar saldo_cuenta.
 *
 * Idempotente: solo actualiza cuentas cuyo moneda_id no coincide con lo que su tipo debería
 * tener — correr dos veces seguidas no cambia nada la segunda vez.
 */
class CuentasCorregirMonedaCup extends Command
{
    protected $signature = 'cuentas:corregir-moneda-cup {--dry-run : Solo mostrar cuáles cambiarían, sin escribir}';

    protected $description = 'Corrige cuentas CUP tipo tarjeta/efectivo apuntando a la moneda_id equivocada (2026-08-25)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $monedaEfectivo = Moneda::where('codigo_moneda', 'CUP')->where('nombre_moneda', 'Peso Cubano MN')->first();
        $monedaTarjeta = Moneda::where('codigo_moneda', 'CUP')->where('nombre_moneda', 'TARJETA DE MONEDA NACIONAL')->first();

        if (! $monedaEfectivo || ! $monedaTarjeta) {
            $this->error('No se encontraron las 2 monedas CUP esperadas ("Peso Cubano MN" / "TARJETA DE MONEDA NACIONAL"). Nada que corregir.');

            return self::FAILURE;
        }

        $this->info("CUP efectivo: moneda_id={$monedaEfectivo->id} (tasa {$monedaEfectivo->tasa_cambio}) | CUP tarjeta: moneda_id={$monedaTarjeta->id} (tasa {$monedaTarjeta->tasa_cambio})");

        $malTarjeta = Cuenta::where('moneda_id', $monedaEfectivo->id)->where('tipo', 'tarjeta')->get();
        $malEfectivo = Cuenta::where('moneda_id', $monedaTarjeta->id)->where('tipo', 'efectivo')->get();

        $cambiados = 0;

        foreach ($malTarjeta as $cuenta) {
            $cambiados++;
            $linea = "  🔷 #{$cuenta->id} {$cuenta->nombre_cuenta} (tarjeta) — moneda_id {$monedaEfectivo->id} (675) → {$monedaTarjeta->id} (685)";
            if ($dryRun) {
                $this->line($linea);

                continue;
            }
            $cuenta->update(['moneda_id' => $monedaTarjeta->id]);
            $this->info(str_replace('🔷', '✅', $linea));
        }

        foreach ($malEfectivo as $cuenta) {
            $cambiados++;
            $linea = "  🔷 #{$cuenta->id} {$cuenta->nombre_cuenta} (efectivo) — moneda_id {$monedaTarjeta->id} (685) → {$monedaEfectivo->id} (675)";
            if ($dryRun) {
                $this->line($linea);

                continue;
            }
            $cuenta->update(['moneda_id' => $monedaEfectivo->id]);
            $this->info(str_replace('🔷', '✅', $linea));
        }

        $this->info("Completado. {$cambiados} cuenta(s) ".($dryRun ? 'cambiarían.' : 'corregidas.'));

        return self::SUCCESS;
    }
}
