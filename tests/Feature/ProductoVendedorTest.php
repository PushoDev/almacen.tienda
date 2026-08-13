<?php

use App\Models\Almacen;
use App\Models\Producto;
use App\Models\PrecioHistorial;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// ─── Update masivo: aplicar el mismo precio a varios almacenes a la vez ────

test('un admin puede aplicar el mismo precio a varios almacenes a la vez', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();
    $almacenC = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacenA->id, $almacenB->id, $almacenC->id],
        'precio_venta' => 25.50,
        'comision'     => 2,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success'      => true,
        'new_price'    => 25.50,
        'new_profit'   => 15.50,
        'new_comision' => 2,
    ]);

    foreach ([$almacenA, $almacenB, $almacenC] as $almacen) {
        $this->assertDatabaseHas('producto_vendedors', [
            'producto_id'  => $producto->id,
            'almacen_id'   => $almacen->id,
            'precio_venta' => 25.50,
            'comision'     => 2,
        ]);
    }

    expect(PrecioHistorial::where('producto_id', $producto->id)->count())->toBe(3);
});

test('el update masivo funciona sin comisión (opcional)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen  = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 30,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true, 'new_comision' => null]);

    $this->assertDatabaseHas('producto_vendedors', [
        'producto_id'  => $producto->id,
        'almacen_id'   => $almacen->id,
        'precio_venta' => 30,
    ]);
});

test('el update masivo solo registra historial en los almacenes cuyo precio realmente cambió', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();

    // almacenA ya tiene ese mismo precio asignado, almacenB no tiene precio todavía.
    DB::table('producto_vendedors')->insert([
        'producto_id'  => $producto->id,
        'almacen_id'   => $almacenA->id,
        'precio_venta' => 20,
        'venta_ganancia' => 10,
        'created_at'   => now(),
        'updated_at'   => now(),
    ]);

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacenA->id, $almacenB->id],
        'precio_venta' => 20,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();

    expect(PrecioHistorial::where('producto_id', $producto->id)->where('almacen_id', $almacenA->id)->count())->toBe(0);
    expect(PrecioHistorial::where('producto_id', $producto->id)->where('almacen_id', $almacenB->id)->count())->toBe(1);
});

test('el update masivo rechaza una contraseña incorrecta, y no se crea nada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen  = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 30,
        'password_confirmacion' => 'password-incorrecta',
    ]);

    $response->assertStatus(422);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
    expect(PrecioHistorial::where('producto_id', $producto->id)->count())->toBe(0);
});

test('un moderador no puede usar el update masivo (403), y no se crea nada', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $producto = Producto::factory()->create();
    $almacen  = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('un vendedor no puede usar el update masivo por bypass directo de URL (403), y no se crea nada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create();
    $almacen  = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('el update masivo exige al menos un almacén', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ]);

    $response->assertStatus(302); // redirect de validación (no es request Inertia/JSON en este test)
});

test('el update masivo rechaza un precio de venta inválido', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen  = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 0,
        'password_confirmacion' => 'password',
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('el update masivo exige contraseña', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen  = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id'  => $producto->id,
        'almacen_ids'  => [$almacen->id],
        'precio_venta' => 15,
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});
