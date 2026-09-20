<?php

namespace Database\Factories;

use App\Models\Moneda;
use Illuminate\Database\Eloquent\Factories\Factory;

class CuentaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_cuenta' => fake()->unique()->word().' '.strtoupper(fake()->lexify('???')),
            'tipo' => fake()->randomElement(['caja', 'banco', 'tarjeta', 'efectivo']),
            'saldo_cuenta' => fake()->randomFloat(2, 0, 100000),
            'tipo_moneda' => fake()->randomElement(['USD', 'EUR', 'MLC', 'CUP']),
            'moneda_id' => Moneda::factory(),
            // 'tipo_cuenta' solo acepta 'permanentes' desde 2026-07-28 (unificación temporales→permanentes).
            'tipo_cuenta' => 'permanentes',
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

    /**
     * El campo `deuda` fue eliminado el 2026-07-28. Desde entonces una cuenta
     * "con deuda" se representa como saldo_cuenta negativo.
     */
    public function conDeuda(): static
    {
        return $this->state(fn (array $attributes) => [
            'saldo_cuenta' => -1 * fake()->randomFloat(2, 100, 10000),
        ]);
    }
}
