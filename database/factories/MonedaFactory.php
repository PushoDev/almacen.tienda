<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class MonedaFactory extends Factory
{
    public function definition(): array
    {
        $codigo = fake()->unique()->randomElement(['USD', 'EUR', 'CUP', 'MLC', 'GBP']);

        return [
            'codigo_moneda' => $codigo,
            'nombre_moneda' => fake()->unique()->word(),
            'simbolo_moneda' => $codigo,
            'tasa_cambio' => fake()->randomFloat(6, 0.5, 500),
            'commission' => fake()->randomFloat(4, 0, 5),
            'estado' => true,
            'principal' => false,
        ];
    }

    public function inactiva(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => false,
        ]);
    }

    public function principal(): static
    {
        return $this->state(fn (array $attributes) => [
            'principal' => true,
        ]);
    }
}
