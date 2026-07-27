<?php

namespace Database\Factories;

use App\Models\Producto;
use App\Models\Venta;
use Illuminate\Database\Eloquent\Factories\Factory;

class VentaDetalleFactory extends Factory
{
    public function definition(): array
    {
        $cantidad = fake()->numberBetween(1, 10);
        $precioVenta = fake()->randomFloat(2, 5, 2000);
        $costoUnitario = fake()->randomFloat(2, 1, 1500);

        return [
            'venta_id' => Venta::factory(),
            'producto_id' => Producto::factory(),
            'cantidad' => $cantidad,
            'precio_venta' => $precioVenta,
            'subtotal' => $cantidad * $precioVenta,
            'costo_unitario' => $costoUnitario,
            'ganancia' => ($precioVenta - $costoUnitario) * $cantidad,
            'comision_unitaria' => 0,
        ];
    }
}
