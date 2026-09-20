<?php

namespace App\Console\Commands;

use App\Models\Producto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class RegenerateBarcodes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'barcodes:regenerate {--force : Sobrescribir imágenes existentes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Regenera las imágenes de códigos de barras para todos los productos';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando regeneración de códigos de barras...');

        $force = $this->option('force');
        $query = Producto::query();
        $total = $query->count();

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $successCount = 0;
        $errorCount = 0;
        $skippedCount = 0;

        $query->chunk(100, function ($productos) use ($bar, $force, &$successCount, &$errorCount, &$skippedCount) {
            foreach ($productos as $producto) {
                try {
                    // Si no forzamos y la imagen ya existe, saltar
                    if (! $force && $producto->barcodeImageExists()) {
                        $skippedCount++;
                        $bar->advance();

                        continue;
                    }

                    // Regenerar
                    if ($producto->regenerarBarcodeImage()) {
                        $successCount++;
                    } else {
                        $errorCount++;
                        $this->error("Error regenerando barcode para producto ID: {$producto->id}");
                    }
                } catch (\Exception $e) {
                    $errorCount++;
                    Log::error("Error regenerando barcode ID {$producto->id}: ".$e->getMessage());
                }

                $bar->advance();
            }
        });

        $bar->finish();
        $this->newLine();

        $this->info('Proceso finalizado.');
        $this->table(
            ['Resultado', 'Cantidad'],
            [
                ['Regenerados exitosamente', $successCount],
                ['Omitidos (ya existían)', $skippedCount],
                ['Errores', $errorCount],
            ]
        );

        if ($skippedCount > 0) {
            $this->comment("Nota: Se omitieron {$skippedCount} productos porque ya tenían imagen. Usa --force para regenerar todos.");
        }

        return Command::SUCCESS;
    }
}
