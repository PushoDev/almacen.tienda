<?php

namespace Database\Factories;

use App\Models\Moneda;
use Illuminate\Database\Eloquent\Factories\Factory;

class CuentaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_cuenta' => fake()->unique()->word() . ' ' . strtoupper(fake()->lexify('???')),
            'tipo' => fake()->randomElement(['caja', 'banco', 'tarjeta', 'efectivo', 'otro']),
            'saldo_cuenta' => fake()->randomFloat(2, 0, 100000),
            'tipo_moneda' => fake()->randomElement(['USD', 'EUR', 'MLC', 'CUP']),
            'moneda_id' => Moneda::factory(),
            'deuda' => 0,
            'tipo_cuenta' => fake()->randomElement(['permanentes', 'temporales', 'deudas']),
            'estado' => 'activa',
            'notas_cuenta' => fake()->optional()->sentence(),
        ];
    }

    public function inactiva(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'inactiva',
        ]);
    }

    public function conDeuda(): static
    {
        return $this->state(fn (array $attributes) => [
            'deuda' => fake()->randomFloat(2, 100, 10000),
        ]);
    }
}
