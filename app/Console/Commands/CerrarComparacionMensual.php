<?php

namespace App\Console\Commands;

use App\Services\DashboardStatsService;
use Illuminate\Console\Command;

class CerrarComparacionMensual extends Command
{
    protected $signature = 'comparacion:cerrar-mes';

    protected $description = 'Cierra el snapshot de comparación mensual del dashboard (Mes Anterior / Saldo Acumulado) por moneda';

    public function handle(DashboardStatsService $dashboardStatsService): int
    {
        $resultado = $dashboardStatsService->actualizarComparacionMensual(null);

        $this->info('Comparación mensual actualizada para '.count($resultado).' moneda(s): '.implode(', ', array_column($resultado, 'moneda')));

        return self::SUCCESS;
    }
}
