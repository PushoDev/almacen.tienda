<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\AlmacenProductoCodigo;
use App\Models\ProductoCodigo;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AlmacenProductoCodigo>
 */
class AlmacenProductoCodigoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'almacen_id' => Almacen::factory(),
            'producto_codigo_id' => ProductoCodigo::factory(),
            'cantidad' => fake()->numberBetween(0, 100),
        ];
    }
}
