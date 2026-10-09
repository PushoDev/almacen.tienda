<?php

namespace Database\Factories;

use App\Models\Cuenta;
use App\Models\TransferenciaPendiente;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TransferenciaPendiente>
 */
class TransferenciaPendienteFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'cuenta_origen_id' => Cuenta::factory(),
            'cuenta_destino_id' => Cuenta::factory(),
            'monto' => 100,
            'moneda' => 'USD',
            'monto_destino' => 100,
            'moneda_destino' => 'USD',
            'saldo_anterior_origen' => 500,
            'saldo_posterior_origen' => 400,
            'estado' => TransferenciaPendiente::ESTADO_EN_TRANSITO,
        ];
    }

    public function recibido(): static
    {
        return $this->state(fn () => [
            'estado' => TransferenciaPendiente::ESTADO_RECIBIDO,
            'monto_recibido' => 100,
            'monto_acreditado' => 100,
            'fecha_confirmacion' => now(),
        ]);
    }

    public function conDiferencia(float $diferencia = 20): static
    {
        return $this->state(fn () => [
            'estado' => TransferenciaPendiente::ESTADO_RECIBIDO_PARCIAL,
            'monto_recibido' => 100 - $diferencia,
            'monto_acreditado' => 100 - $diferencia,
            'diferencia' => $diferencia,
            'fecha_confirmacion' => now(),
        ]);
    }
}
