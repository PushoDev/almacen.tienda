<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class ProveedorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_proveedor' => fake()->unique()->company(),
            'telefono_proveedor' => fake()->unique()->phoneNumber(),
            'saldo_proveedor' => fake()->randomFloat(8, 0, 10000),
            'correo_proveedor' => fake()->unique()->companyEmail(),
            'localidad_proveedor' => fake()->city(),
            'notas_proveedor' => fake()->optional()->sentence(),
        ];
    }

    public function conSaldo(): static
    {
        return $this->state(fn (array $attributes) => [
            'saldo_proveedor' => fake()->randomFloat(8, 100, 5000),
        ]);
    }
}
