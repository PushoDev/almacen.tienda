<?php

namespace Database\Factories;

use App\Models\Categoria;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductoFactory extends Factory
{
    public function definition(): array
    {
        return [
            'nombre_producto' => fake()->words(3, true),
            'descripcion_producto' => fake()->optional()->sentence(),
            'marca_producto' => fake()->optional()->company(),
            'modelo_producto' => fake()->optional()->bothify('??-####'),
            'capacidad_producto' => fake()->optional()->randomElement(['1L', '2L', '500ml', '10kg', '20cm']),
            'color_producto' => fake()->optional()->safeColorName(),
            'codigo_producto' => fake()->unique()->ean13(),
            'categoria_id' => Categoria::factory(),
            'precio_compra_producto' => fake()->randomFloat(2, 1, 1000),
            'imagen_producto' => 'productos/producto-default.png',
            'activo' => true,
        ];
    }

    public function inactivo(): static
    {
        return $this->state(fn (array $attributes) => [
            'activo' => false,
        ]);
    }

    public function conPrecio(decimal $precio): static
    {
        return $this->state(fn (array $attributes) => [
            'precio_compra_producto' => $precio,
        ]);
    }
}
