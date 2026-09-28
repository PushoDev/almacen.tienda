<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:database';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Genera un backup comprimido de la base de datos, lo envía a Telegram y Google Drive, y rota las copias locales';

    public function handle(DatabaseBackupService $service): int
    {
        $resultado = $service->ejecutar();

        foreach ($resultado as $destino => $exito) {
            $exito ? $this->info("{$destino}: OK") : $this->error("{$destino}: falló");
        }

        return in_array(false, $resultado, true) ? self::FAILURE : self::SUCCESS;
    }
}
