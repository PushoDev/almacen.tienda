<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Almacen;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Luis Alberto',
            'email' => 'pushodevs@example.com',
            'password' => Hash::make('guisa290**'),
        ]);

        // Crear el almacén predeterminado
        Almacen::firstOrCreate(
            ['nombre_almacen' => 'Almacén de Conservas'],
            [
                'telefono_almacen' => '+53 5 5423017',
                'correo_almacen' => 'conservasindistro@glorieta.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Mariel',
                'notas_almacen' => 'Este es el almacén predeterminado para productos sin compra asociada.',
            ]
        );
    }
}
