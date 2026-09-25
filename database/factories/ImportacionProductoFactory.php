<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\ImportacionProducto;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ImportacionProducto>
 */
class ImportacionProductoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'almacen_id' => Almacen::factory(),
            'nombre_archivo' => 'productos.xlsx',
            'hash_archivo' => hash('sha256', fake()->unique()->uuid()),
            'estado' => 'completada',
        ];
    }

    public function revertida(): static
    {
        return $this->state(fn (array $attributes) => ['estado' => 'revertida']);
    }

    public function fallida(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'fallida',
            'mensaje_error' => 'Error de prueba',
        ]);
    }
}
