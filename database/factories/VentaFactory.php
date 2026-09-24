<?php

namespace Database\Factories;

use App\Models\Almacen;
use App\Models\Cliente;
use App\Models\Moneda;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class VentaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'almacen_id' => Almacen::factory(),
            'total' => fake()->randomFloat(2, 10, 5000),
            'total_ganancia' => fake()->randomFloat(2, 1, 1000),
            'total_comision' => 0,
            'estado' => 'pendiente',
            'es_venta_especial' => false,
            'decision_notificada' => false,
            'ganancia_perdida_cambiaria' => 0,
            'ganancia_real_total' => 0,
            'monto_diferencia_cambiaria' => 0,
        ];
    }

    public function completada(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'completada',
        ]);
    }

    public function cancelada(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'cancelada',
            'motivo_anulacion' => fake()->sentence(),
        ]);
    }

    public function devuelta(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'devuelta',
            'motivo_anulacion' => fake()->sentence(),
        ]);
    }

    public function especial(): static
    {
        return $this->state(fn (array $attributes) => [
            'estado' => 'solicitud_especial',
            'es_venta_especial' => true,
            'nota_venta_especial' => fake()->sentence(),
            'tipo_venta_especial' => 'descuento',
        ]);
    }

    /**
     * Venta especial con algún precio por debajo del costo: solo un admin puede decidirla.
     */
    public function especialBajoCosto(): static
    {
        return $this->especial()->state(fn (array $attributes) => [
            'tipo_venta_especial' => 'bajo_costo',
        ]);
    }

    public function conCliente(): static
    {
        return $this->state(fn (array $attributes) => [
            'cliente_id' => Cliente::factory(),
        ]);
    }

    public function conMoneda(Moneda $moneda): static
    {
        return $this->state(fn (array $attributes) => [
            'moneda_id' => $moneda->id,
            'moneda_cobro_id' => $moneda->id,
            'tasa_cambio_principal' => $moneda->tasa_cambio,
        ]);
    }
}
