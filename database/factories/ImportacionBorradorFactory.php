<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\ImportacionBorrador;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ImportacionBorrador>
 */
class ImportacionBorradorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'almacen_id' => Almacen::factory(),
            'nombre_archivo' => 'productos.xlsx',
            'hash_archivo' => hash('sha256', fake()->unique()->uuid()),
            'filas' => [
                ['nombre_producto' => 'Producto de borrador', 'categoria' => 'Cocina', 'marca' => '', 'modelo' => '', 'capacidad' => '', 'color' => '', 'precio_compra' => '10', 'cantidad' => '3', 'codigo_barras' => ''],
            ],
        ];
    }
}
