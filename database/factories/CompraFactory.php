<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\Cuenta;
use Illuminate\Database\Eloquent\Factories\Factory;

class CompraFactory extends Factory
{
    public function definition(): array
    {
        return [
            // El proveedor de una compra es un cliente
            'cliente_id' => Cliente::factory(),
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
