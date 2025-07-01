<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Almacen;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

use Illuminate\Support\Facades\DB;

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
            'role' => 'admin',
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

        // Insertar categorías
        DB::table('categorias')->insert([
            [
                'nombre_categoria' => 'Cocina',
                'descripcion_categoria' => 'Equipos de Cocina, cafeteras, hornillas, hornos, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'Refrigeración',
                'descripcion_categoria' => 'Refrigeración, Neveras',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'Audiovisuales',
                'descripcion_categoria' => 'Smartv, Cajitas, Equipos audiovisuales',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
