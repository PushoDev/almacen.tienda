<?php

use App\Models\Producto;
use App\Models\User;

function payloadProducto(Producto $producto, float $precioCosto, ?string $password = null): array
{
    $payload = [
        'nombre_producto' => $producto->nombre_producto,
        'categoria_id' => $producto->categoria_id,
        'precio_compra_producto' => $precioCosto,
    ];

    if ($password !== null) {
        $payload['password_confirmacion'] = $password;
    }

    return $payload;
}

test('un admin puede cambiar el precio de costo con su contraseña correcta', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-admin'));

    $response->assertSessionDoesntHaveErrors();
    expect($producto->fresh()->precio_compra_producto)->toEqual('15.00');
});

test('un admin con la contraseña incorrecta no puede cambiar el precio de costo', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-equivocada'));

    $response->assertSessionHasErrors('password_confirmacion');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un moderador ya no puede cambiar el precio de costo', function () {
    $moderador = User::factory()->moderador()->create(['password' => bcrypt('clave-mod')]);
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-mod'));

    $response->assertSessionHas('error');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un vendedor no puede cambiar el precio de costo', function () {
    $vendedor = User::factory()->vendedor()->create(['password' => bcrypt('clave-vend')]);
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-vend'));

    $response->assertSessionHas('error');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un moderador puede seguir editando otros campos del producto sin tocar el precio de costo', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10, 'nombre_producto' => 'Original']);

    $response = $this->put(route('productos.update', $producto), array_merge(payloadProducto($producto, 10, null), ['nombre_producto' => 'Actualizado']));

    $response->assertSessionDoesntHaveErrors();
    expect($producto->fresh()->nombre_producto)->toBe('Actualizado');
});

// ==========================================================================
// FICHAS HERMANAS — mismo nombre+marca+modelo+capacidad+categoría, costo distinto
// (cada compra crea siempre una ficha nueva desde 2026-09-18, ver CompraController).
// ==========================================================================

test('show() incluye las fichas hermanas del mismo producto a otro costo, ordenadas por precio, sin incluirse a sí misma', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $atributos = [
        'nombre_producto' => 'Producto Hermano',
        'marca_producto' => 'MarcaX',
        'modelo_producto' => 'ModeloY',
        'capacidad_producto' => '128GB',
    ];

    $principal = Producto::factory()->create($atributos + ['categoria_id' => Producto::factory()->create()->categoria_id, 'precio_compra_producto' => 20]);
    $hermanoCaro = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 30]);
    $hermanoBarato = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 15]);
    // Mismo nombre pero distinta marca — no es hermano, no debe aparecer.
    Producto::factory()->create(['nombre_producto' => 'Producto Hermano', 'marca_producto' => 'Otra', 'categoria_id' => $principal->categoria_id]);

    $response = $this->get(route('productos.show', $principal));

    $response->assertInertia(fn ($page) => $page
        ->has('fichas_hermanas', 2)
        ->where('fichas_hermanas.0.id', $hermanoBarato->id)
        ->where('fichas_hermanas.0.precio_compra_producto', 15)
        ->where('fichas_hermanas.1.id', $hermanoCaro->id)
        ->where('fichas_hermanas.1.precio_compra_producto', 30)
    );
});

test('show() no incluye fichas_hermanas cuando el producto no tiene ninguna', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['nombre_producto' => 'Producto Único']);

    $response = $this->get(route('productos.show', $producto));

    $response->assertInertia(fn ($page) => $page->has('fichas_hermanas', 0));
});

test('edit() también incluye las fichas hermanas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $atributos = [
        'nombre_producto' => 'Producto Hermano Edit',
        'marca_producto' => 'MarcaX',
        'modelo_producto' => 'ModeloY',
        'capacidad_producto' => '128GB',
    ];

    $principal = Producto::factory()->create($atributos + ['categoria_id' => Producto::factory()->create()->categoria_id, 'precio_compra_producto' => 20]);
    $hermano = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 25]);

    $response = $this->get(route('productos.edit', $principal));

    $response->assertInertia(fn ($page) => $page
        ->has('fichas_hermanas', 1)
        ->where('fichas_hermanas.0.id', $hermano->id)
    );
});
