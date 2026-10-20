<?php

namespace Database\Factories;

use App\Models\Contenedor;
use App\Models\ContenedorLinea;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * La línea de compra (`compra_producto_id`) la pasa quien la usa: no hay factory de esa tabla.
 *
 * @extends Factory<ContenedorLinea>
 */
class ContenedorLineaFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contenedor_id' => Contenedor::factory(),
            'cantidad' => 1,
        ];
    }
}
