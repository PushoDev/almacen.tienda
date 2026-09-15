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
