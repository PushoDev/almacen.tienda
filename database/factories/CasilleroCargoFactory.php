<?php

namespace Database\Factories;

use App\Models\CasilleroCargo;
use App\Models\Cuenta;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CasilleroCargo>
 */
class CasilleroCargoFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $monto = fake()->randomFloat(2, 1, 500);

        return [
            'user_id' => User::factory()->admin(),
            'concepto' => 'Estadía en Panamá',
            'nota' => null,
            'moneda' => 'USD',
            'monto' => $monto,
            'tasa_cambio' => 1,
            'monto_usd' => $monto,
            'cuenta_id' => Cuenta::factory(),
            'movimiento_financiero_id' => null,
            'fecha' => now()->toDateString(),
            'estado' => CasilleroCargo::ESTADO_ACTIVO,
        ];
    }

    public function anulado(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => CasilleroCargo::ESTADO_ANULADO,
            'motivo_anulacion' => 'Anulado en la prueba',
        ]);
    }
}
