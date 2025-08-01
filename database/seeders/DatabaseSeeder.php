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
            ['nombre_almacen' => 'ALMACEN CONSERVA'],
            [
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 5423017',
                'correo_almacen' => 'conservasindistro@glorieta.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Mariel',
                'notas_almacen' => 'Este es el almacén predeterminado para roturas u otras funciones.',
            ]
        );

        // Tasa de Cambio Inicial
        DB::table('tasa_cambios')->insert([
            'tasa' => 325.0,
            'fecha_actualizacion' => now(),
        ]);
        // Tasa de Cambio para MLC Temporales
        DB::table('tasamlc_temp')->insert([
            'tasa_mlc' => 1.50,
            'fecha_actualizacion' => now(),
        ]);

        // Insertar categorías
        DB::table('categorias')->insert([
            [
                'nombre_categoria' => 'COCINA',
                'descripcion_categoria' => 'Equipos de Cocina, cafeteras, hornillas, hornos, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'REFRIGERACION',
                'descripcion_categoria' => 'Refrigeración, Neveras',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'AUDIOVISUALES',
                'descripcion_categoria' => 'Smartv, Cajitas, Equipos audiovisuales',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'CICLOMOTORES',
                'descripcion_categoria' => 'Bicicletas, Motorinas, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'ACCESORIOS',
                'descripcion_categoria' => 'Mochilas, Adornos para el hogar',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'MISCELANEAS',
                'descripcion_categoria' => 'Split, Plantas, Motores, Turbinas, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'TELEFONOS/TABLETS',
                'descripcion_categoria' => 'Celulares, Tablets, Memorias SD/USB, Laptop, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
