<?php

namespace Database\Factories;

use App\Models\Cuenta;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * NOTA: `tipo_movimiento_id` es FK contra `tipos_movimiento_financiero`, catálogo
 * sin seeder en el proyecto (convención de la app: 1=Gasto, 2=Ingreso, 3=Transferencia).
 * Los tests deben insertar esas 3 filas antes de usar esta factory
 * (ver helper `crearTiposMovimientoFinanciero()` en tests/Feature/CierreCajaTest.php).
 *
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\MovimientoFinanciero>
 */
class MovimientoFinancieroFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'tipo_movimiento_id' => 1, // Gasto
            'cuenta_origen_id' => Cuenta::factory(),
            'monto' => fake()->randomFloat(2, 1, 1000),
            'moneda' => 'USD',
            'tasa_cambio_aplicada' => 1,
            'descripcion' => fake()->sentence(),
            'fecha_operacion' => now(),
            'estado' => 'completado',
        ];
    }

    public function gasto(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_movimiento_id' => 1,
        ]);
    }

    public function ingreso(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_movimiento_id' => 2,
            'cuenta_origen_id' => null,
            'cuenta_destino_id' => Cuenta::factory(),
        ]);
    }

    public function transferencia(): static
    {
        return $this->state(fn (array $attributes) => [
            'tipo_movimiento_id' => 3,
            'cuenta_origen_id' => Cuenta::factory(),
            'cuenta_destino_id' => Cuenta::factory(),
        ]);
    }
}
