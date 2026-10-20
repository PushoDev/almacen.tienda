<?php

namespace Database\Factories;

use App\Models\Contenedor;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contenedor>
 */
class ContenedorFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->admin(),
            'nombre' => 'Contenedor '.fake()->unique()->numerify('####'),
            'notas' => null,
            'fecha_salida' => null,
            'estado' => Contenedor::ESTADO_ABIERTO,
        ];
    }

    public function cancelado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => Contenedor::ESTADO_CANCELADO,
        ]);
    }
}
