<?php

namespace Database\Factories;

use App\Models\ImportacionProducto;
use App\Models\ImportacionProductoFila;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ImportacionProductoFila>
 */
class ImportacionProductoFilaFactory extends Factory
{
    public function definition(): array
    {
        return [
            'importacion_id' => ImportacionProducto::factory(),
            'fila' => 2,
            'nombre_producto' => fake()->words(2, true),
            'cantidad' => 1,
            'precio_compra' => 10,
            'resultado' => 'importada',
        ];
    }

    public function soloCatalogo(): static
    {
        return $this->state(fn (array $attributes) => ['resultado' => 'solo_catalogo', 'cantidad' => 0]);
    }

    public function omitida(string $motivo = 'Motivo de prueba'): static
    {
        return $this->state(fn (array $attributes) => ['resultado' => 'omitida', 'motivo' => $motivo]);
    }
}
