<?php

namespace Database\Factories;

use App\Models\Cuenta;
use App\Models\Proveedor;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompraFactory extends Factory
{
    public function definition(): array
    {
        return [
            'proveedor_id' => Proveedor::factory(),
            'cuenta_id' => Cuenta::factory(),
            'fecha_compra' => fake()->date(),
            'total_compra' => fake()->randomFloat(2, 100, 10000),
            'tipo_compra' => fake()->randomElement(['contado', 'credito', 'contado_internacional']),
        ];
    }

    public function credito(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_compra' => 'credito',
        ]);
    }
}
