<?php

namespace Database\Factories;

use App\Models\Cuenta;
use App\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

class PagoVentaFactory extends Factory
{
    public function definition(): array
    {
        $monto = fake()->randomFloat(2, 10, 5000);

        return [
            'venta_id' => Venta::factory(),
            'tipo_pago' => fake()->randomElement(['efectivo', 'transferencia']),
            'tipo_moneda' => fake()->randomElement(['USD', 'EUR', 'MLC', 'CUP']),
            'cuenta_id' => Cuenta::factory(),
            'monto' => $monto,
            'tasa_cambio_aplicada' => fake()->randomFloat(4, 1, 500),
            'monto_equivalente' => $monto,
        ];
    }

    public function efectivo(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_pago' => 'efectivo',
        ]);
    }

    public function transferencia(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_pago' => 'transferencia',
        ]);
    }
}
