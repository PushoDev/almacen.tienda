<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ClienteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_cliente' => fake()->unique()->name(),
            'tipo_cliente' => fake()->randomElement(['fisico', 'asociado']),
            'deuda_pago_cliente' => 0,
            'telefono_cliente' => fake()->unique()->phoneNumber(),
            'direccion_cliente' => fake()->optional()->address(),
            'ciudad_cliente' => fake()->optional()->city(),
        ];
    }

    public function asociado(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_cliente' => 'asociado',
        ]);
    }

    public function conDeuda(): static
    {
        return $this->state(fn (array $attributes) => [
            'deuda_pago_cliente' => fake()->randomFloat(2, 100, 5000),
        ]);
    }
}
