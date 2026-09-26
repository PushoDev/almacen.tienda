<?php

namespace Database\Factories;

use App\Models\ViaPago;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ViaPago>
 */
class ViaPagoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'nombre' => fake()->words(2, true),
            'imagen' => null,
            'ambito' => 'internacional',
            'orden' => fake()->numberBetween(1, 10),
            'activo' => true,
        ];
    }
}
