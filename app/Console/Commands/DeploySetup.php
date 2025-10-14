<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class DeploySetup extends Command
{
    protected $signature = 'deploy:setup';
    protected $description = 'Configura el entorno de producción después de un despliegue';

    public function handle()
    {
        $this->info('Iniciando configuración de despliegue...');

        // 1. Crear carpetas si no existen
        $directories = [
            storage_path('app/public/productos'),
            storage_path('app/public/barcodes'),
        ];

        foreach ($directories as $dir) {
            if (!File::exists($dir)) {
                File::makeDirectory($dir, 0755, true);
                $this->info("Carpeta creada: $dir");
            }
        }

        // 2. Ejecutar storage:link si no existe
        if (!File::exists(public_path('storage'))) {
            $this->call('storage:link');
            $this->info('storage:link ejecutado.');
        } else {
            $this->info('storage:link ya existe.');
        }

        // 3. Limpiar caches
        $this->call('cache:clear');
        $this->call('config:clear');
        $this->call('route:clear');
        $this->call('view:clear');
        $this->info('Caches limpiados.');

        $this->info('Configuración de despliegue completada.');
    }
}
