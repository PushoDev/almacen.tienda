<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class MoveImagesToPublic extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'images:migrate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Mueve las imágenes de storage/app/public a public/ para eliminar dependencia de symlinks';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Iniciando migración de imágenes...');

        $directories = ['productos', 'barcodes'];
        $storagePath = storage_path('app/public');
        $publicPath = public_path();

        foreach ($directories as $dir) {
            $sourceDir = $storagePath . '/' . $dir;
            $targetDir = $publicPath . '/' . $dir;

            if (!File::exists($sourceDir)) {
                $this->warn("El directorio origen no existe: {$sourceDir}");
                continue;
            }

            if (!File::exists($targetDir)) {
                File::makeDirectory($targetDir, 0755, true);
                $this->info("Directorio creado: {$targetDir}");
            }

            $files = File::allFiles($sourceDir);
            $count = 0;

            foreach ($files as $file) {
                // Nombre del archivo
                $filename = $file->getFilename();
                $targetFile = $targetDir . '/' . $filename;

                // Si el archivo ya existe en destino, preguntar o saltar (aquí saltamos para evitar sobrescribir nuevos)
                if (File::exists($targetFile)) {
                    $this->warn("El archivo ya existe en destino (saltando): {$filename}");
                    continue;
                }

                // Mover archivo
                File::move($file->getPathname(), $targetFile);
                $this->line("Movido: {$filename}");
                $count++;
            }

            $this->info("Se movieron {$count} archivos en '{$dir}'.");

            // Opcional: Eliminar directorio vacío en storage
            if (count(File::allFiles($sourceDir)) === 0) {
                File::deleteDirectory($sourceDir);
                $this->info("Directorio origen vacío eliminado: {$sourceDir}");
            }
        }

        $this->info('Migración completada exitosamente.');

        return Command::SUCCESS;
    }
}
