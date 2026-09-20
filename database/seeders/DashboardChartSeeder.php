<?php

namespace Database\Seeders;

use App\Models\Compra;
use App\Models\User;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DashboardChartSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        // Obtener el primer usuario para las ventas
        $user = User::first() ?? User::factory()->create();

        // Generar datos para los últimos 90 días
        for ($i = 90; $i > 0; $i--) {
            $date = Carbon::now()->subDays($i);

            // Crear 1-3 compras por día (aleatoriamente)
            $comprasCount = rand(0, 3);
            for ($j = 0; $j < $comprasCount; $j++) {
                Compra::factory()->create([
                    'fecha_compra' => $date,
                    'total_compra' => rand(1000, 5000),
                ]);
            }

            // Crear 2-5 ventas por día
            $ventasCount = rand(2, 5);
            for ($j = 0; $j < $ventasCount; $j++) {
                Venta::factory()->create([
                    'created_at' => $date,
                    'user_id' => $user->id,
                    'total' => rand(500, 3000),
                ]);
            }
        }

        if ($this->command) {
            $this->command->info('✅ Datos de prueba para el gráfico insertados correctamente!');
        }
    }
}
