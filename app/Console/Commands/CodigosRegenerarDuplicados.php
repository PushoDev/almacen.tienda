<?php

namespace App\Console\Commands;

use App\Models\Producto;
use App\Models\ProductoCodigo;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Repara los `producto_codigos.codigo_barras` que quedaron duplicados entre fichas distintas —
 * confirmado 2026-09-28: `ProductoCodigo::generarCodigoBarras()` recortaba la parte fija a 14
 * caracteres sin reservar dígitos al azar, así que dos fichas del mismo producto (mismo nombre/
 * marca/modelo/capacidad — el caso típico de la duplicación de fichas por precio, ver
 * CompraController::store()) con una capacidad de 5+ dígitos generaban el código IDÉNTICO
 * siempre, no a veces. Ya corregido en el generador (reserva 4 dígitos al azar + revisa que no
 * exista); este comando solo repara los códigos que ya quedaron repetidos antes del fix.
 *
 * Conserva el código de la ficha más antigua de cada grupo (la que se creó primero) y genera uno
 * nuevo y único para las demás, con su propia imagen de barcode.
 */
class CodigosRegenerarDuplicados extends Command
{
    protected $signature = 'codigos:regenerar-duplicados {--dry-run : Solo mostrar qué cambiaría, sin escribir}';

    protected $description = 'Genera un código de barras nuevo y único para cada ficha que comparte codigo_barras con otra';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $gruposDuplicados = DB::table('producto_codigos')
            ->select('codigo_barras')
            ->groupBy('codigo_barras')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('codigo_barras');

        if ($gruposDuplicados->isEmpty()) {
            $this->info('No hay códigos de barras duplicados entre fichas.');

            return self::SUCCESS;
        }

        $this->info("Encontrados {$gruposDuplicados->count()} código(s) repetidos entre fichas distintas.");

        $regenerados = 0;

        foreach ($gruposDuplicados as $codigoRepetido) {
            $filas = ProductoCodigo::where('codigo_barras', $codigoRepetido)->orderBy('id')->get();
            $conservar = $filas->shift(); // la más antigua (id más bajo) no se toca

            $this->line("  🔁 \"{$codigoRepetido}\": conserva ficha #{$conservar->producto_id} (código #{$conservar->id}), regenera ".$filas->count().' más.');

            foreach ($filas as $fila) {
                $producto = Producto::find($fila->producto_id);

                if (! $producto) {
                    $this->warn("     código #{$fila->id}: la ficha #{$fila->producto_id} ya no existe, se omite.");

                    continue;
                }

                do {
                    $nuevoCodigo = ProductoCodigo::generarCodigoBarras($producto);
                } while (ProductoCodigo::where('codigo_barras', $nuevoCodigo)->exists());

                $this->line("     ficha #{$fila->producto_id} (código #{$fila->id}): {$codigoRepetido} → {$nuevoCodigo}");
                $regenerados++;

                if ($dryRun) {
                    continue;
                }

                $imagen = null;
                try {
                    $imagen = ProductoCodigo::generarImagenBarcode($nuevoCodigo);
                } catch (\Exception $e) {
                    logger()->warning('No se pudo generar barcode para '.$nuevoCodigo.': '.$e->getMessage());
                }

                $fila->update(['codigo_barras' => $nuevoCodigo, 'imagen_barcode' => $imagen]);
            }
        }

        $this->info("Completado. {$regenerados} código(s) ".($dryRun ? 'se regenerarían' : 'regenerados').'.');

        return self::SUCCESS;
    }
}
