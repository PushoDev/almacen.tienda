<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class MovimientoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'almacen_origen_id' => Almacen::factory(),
            'almacen_destino_id' => Almacen::factory(),
            'user_id' => User::factory(),
            'tipo_movimiento' => fake()->randomElement(['traslado', 'ajuste', 'devolucion']),
            'estado' => 'pendiente',
            'observaciones' => fake()->optional()->sentence(),
        ];
    }

    public function traslado(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_movimiento' => 'traslado',
        ]);
    }

    public function aprobado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'aprobado',
        ]);
    }

    public function enTransito(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'en_transito',
            'guia_transporte' => fake()->bothify('GUA-####'),
            'transportista' => fake()->name(),
        ]);
    }

    public function recibidoCompleto(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'recibido_completo',
        ]);
    }
}
