<?php

namespace Database\Factories;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductoCodigoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'producto_id' => Producto::factory(),
            'codigo_barras' => fake()->unique()->ean13(),
            'cantidad' => fake()->numberBetween(0, 100),
            'es_default' => false,
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => [
            'es_default' => true,
        ]);
    }
}
