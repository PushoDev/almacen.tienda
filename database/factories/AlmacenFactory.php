<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class AlmacenFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_almacen' => fake()->unique()->company(),
            'tipo_almacen' => fake()->randomElement(['almacen', 'punto_venta', 'transportacion']),
            'telefono_almacen' => fake()->unique()->phoneNumber(),
            'correo_almacen' => fake()->email(),
            'provincia_almacen' => fake()->state(),
            'ciudad_almacen' => fake()->city(),
            'notas_almacen' => fake()->optional()->sentence(),
        ];
    }

    public function almacen(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_almacen' => 'almacen',
        ]);
    }

    public function puntoVenta(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_almacen' => 'punto_venta',
        ]);
    }
}
