<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class TurnoVendedorFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'nombre_vendedor' => fake()->firstName().' '.fake()->lastName(),
            'iniciado_en' => now(),
        ];
    }
}
