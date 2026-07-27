<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CategoriaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_categoria' => fake()->unique()->word(),
            'descripcion_categoria' => fake()->sentence(),
            'activar_categoria' => true,
        ];
    }

    public function inactiva(): static
    {
        return $this->state(fn (array $attributes) => [
            'activar_categoria' => false,
        ]);
    }
}
