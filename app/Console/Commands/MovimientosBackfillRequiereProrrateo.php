<?php

namespace App\Console\Commands;

use App\Models\Movimiento;
use Illuminate\Console\Command;

/**
 * Backfill de `requiere_prorrateo` para movimientos creados antes de que existiera la columna
 * (Fase 4 del hilo de costo-promedio-ponderado, 2026-08-25). `MovimientosController::store()`
 * ya la calcula para movimientos nuevos, pero los que ya existían en la base de datos real
 * (52 al momento de escribir esto) quedaron todos en `false` por defecto de la migración,
 * aunque varios sí cumplan la regla (el destino no es un almacén asignado al usuario que creó
 * el movimiento).
 *
 * Este proyecto pasa a producción con datos reales — el cliente pidió explícitamente incorporar
 * el historial existente, no solo los movimientos nuevos a partir de hoy.
 *
 * Regla (misma que MovimientosController::store()):
 * - Vendedor: condicional — true solo si el destino no es un almacén que tiene asignado.
 * - Admin/moderador: siempre true, sin condición — no depende de si tienen algún almacén
 *   asignado en user_almacens. Un admin que despacha un contenedor completo hacia otro punto de
 *   venta también debe poder decidir el prorrateo, siempre.
 *
 * LIMITACIÓN CONOCIDA (solo aplica al caso vendedor): la regla depende de qué almacenes tiene
 * asignados HOY (`user_almacens`), no de cuáles tenía asignados en el momento en que creó cada
 * movimiento — no existe un registro histórico de esa asignación. Es una aproximación de mejor
 * esfuerzo, igual que el resto de los backfills de este proyecto (ver
 * project_dashboard_resumen_financiero, project_movimientos_editar_y_recibido_completo_fix).
 *
 * Idempotente: solo actualiza filas donde el valor calculado difiere del guardado — correr dos
 * veces seguidas no cambia nada la segunda vez.
 */
class MovimientosBackfillRequiereProrrateo extends Command
{
    protected $signature = 'movimientos:backfill-requiere-prorrateo {--dry-run : Solo mostrar cuáles cambiarían, sin escribir}';

    protected $description = 'Calcula requiere_prorrateo para movimientos creados antes de que existiera esta columna (Fase 4, 2026-08-25)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $movimientos = Movimiento::with('usuario.almacenes')
            ->orderBy('id')
            ->get();

        $this->info("Revisando {$movimientos->count()} movimientos...");

        $cambiados = 0;

        foreach ($movimientos as $movimiento) {
            $requiere = $movimiento->usuario->role === 'vendedor'
                ? !$movimiento->usuario->almacenes->pluck('id')->contains($movimiento->almacen_destino_id)
                : true;

            if ($requiere === (bool) $movimiento->requiere_prorrateo) {
                continue; // ya está correcto, nada que tocar
            }

            $cambiados++;

            if ($dryRun) {
                $this->line("  🔷 Movimiento #{$movimiento->id} ({$movimiento->usuario->role}) — requiere_prorrateo pasaría de "
                    . ($movimiento->requiere_prorrateo ? 'true' : 'false') . ' a ' . ($requiere ? 'true' : 'false'));
                continue;
            }

            $movimiento->update(['requiere_prorrateo' => $requiere]);
            $this->info("  ✅ Movimiento #{$movimiento->id} ({$movimiento->usuario->role}) actualizado a requiere_prorrateo=" . ($requiere ? 'true' : 'false'));
        }

        $this->info("Completado. {$cambiados} de {$movimientos->count()} movimientos " . ($dryRun ? 'cambiarían.' : 'actualizados.'));

        return self::SUCCESS;
    }
}
