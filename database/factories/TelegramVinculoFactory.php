<?php

namespace Database\Factories;

use App\Models\TelegramVinculo;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TelegramVinculo>
 */
class TelegramVinculoFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'chat_id' => (string) fake()->unique()->numberBetween(100000000, 999999999),
            'nombre' => fake()->firstName(),
            'vinculado_en' => now(),
        ];
    }
}
