<?php

use App\Models\Compra;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Models\User;

test('el detalle de un proveedor trae saldo anterior/posterior de sus compras y transacciones', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 140]);

    $compra = Compra::factory()->create([
        'proveedor_id' => $proveedor->id,
        'tipo_compra' => 'deuda_proveedor',
        'receptor_saldo_anterior' => 200,
        'receptor_saldo_posterior' => 140,
    ]);

    $ingreso = MovimientoFinanciero::factory()->ingreso()->create([
        'cuenta_destino_id' => null,
        'proveedor_destino_id' => $proveedor->id,
        'monto' => 60,
        'moneda' => 'USD',
        'saldo_anterior_destino' => 140,
        'saldo_posterior_destino' => 200,
        'moneda_destino' => 'USD',
    ]);

    $response = $this->get(route('proveedores.show', $proveedor->id), ['X-Inertia' => 'true']);
    $response->assertOk();

    $compraProps = collect($response->json('props.compras'))->firstWhere('id', $compra->id);
    expect((float) $compraProps['receptor_saldo_anterior'])->toBe(200.0);
    expect((float) $compraProps['receptor_saldo_posterior'])->toBe(140.0);
    expect($compraProps['detalle'])->not->toBeNull();
    expect($compraProps['detalle']['movimientos_saldo'])->toHaveCount(1);

    $transaccionProps = collect($response->json('props.transacciones'))->firstWhere('id', $ingreso->id);
    expect((float) $transaccionProps['saldo_anterior_destino'])->toBe(140.0);
    expect((float) $transaccionProps['saldo_posterior_destino'])->toBe(200.0);
    expect($transaccionProps['detalle'])->not->toBeNull();
    expect($transaccionProps['detalle']['destino']['tipo'])->toBe('proveedor');
    expect((float) $transaccionProps['detalle']['destino']['saldo_anterior'])->toBe(140.0);
});

// ==========================================================================
// EDITAR/ELIMINAR — admin-only (middleware admin.only), CREAR — abierto a
// cualquier rol autenticado. Mismo patrón replicado desde CuentaTest.php.
// ==========================================================================

test('un admin puede acceder al formulario de editar proveedor', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create();

    $response = $this->get(route('proveedores.edit', $proveedor->id), ['X-Inertia' => 'true']);

    $response->assertOk();
});

test('un moderador NO puede acceder al formulario de editar proveedor (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $proveedor = Proveedor::factory()->create();

    $response = $this->get(route('proveedores.edit', $proveedor->id), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un vendedor NO puede acceder al formulario de editar proveedor (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $proveedor = Proveedor::factory()->create();

    $response = $this->get(route('proveedores.edit', $proveedor->id), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un admin puede actualizar un proveedor', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create();

    $response = $this->put(route('proveedores.update', $proveedor->id), [
        'nombre_proveedor' => 'Proveedor Renombrado',
        'telefono_proveedor' => $proveedor->telefono_proveedor,
        'localidad_proveedor' => $proveedor->localidad_proveedor,
        'saldo_proveedor' => $proveedor->saldo_proveedor,
    ], ['X-Inertia' => 'true']);

    $response->assertRedirect(route('proveedores.index'));
    expect($proveedor->fresh()->nombre_proveedor)->toBe('Proveedor Renombrado');
});

test('un moderador NO puede actualizar un proveedor (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $proveedor = Proveedor::factory()->create();

    $response = $this->put(route('proveedores.update', $proveedor->id), [
        'nombre_proveedor' => 'Intento Moderador',
        'telefono_proveedor' => $proveedor->telefono_proveedor,
        'localidad_proveedor' => $proveedor->localidad_proveedor,
        'saldo_proveedor' => $proveedor->saldo_proveedor,
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect($proveedor->fresh()->nombre_proveedor)->not->toBe('Intento Moderador');
});

test('un vendedor NO puede actualizar un proveedor (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $proveedor = Proveedor::factory()->create();

    $response = $this->put(route('proveedores.update', $proveedor->id), [
        'nombre_proveedor' => 'Intento Vendedor',
        'telefono_proveedor' => $proveedor->telefono_proveedor,
        'localidad_proveedor' => $proveedor->localidad_proveedor,
        'saldo_proveedor' => $proveedor->saldo_proveedor,
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect($proveedor->fresh()->nombre_proveedor)->not->toBe('Intento Vendedor');
});

test('un moderador NO puede eliminar un proveedor (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect(Proveedor::find($proveedor->id))->not->toBeNull();
});

test('un vendedor NO puede eliminar un proveedor (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect(Proveedor::find($proveedor->id))->not->toBeNull();
});

test('un moderador SÍ puede crear un proveedor', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $response = $this->post(route('proveedores.store'), [
        'nombre_proveedor' => 'Proveedor Moderador '.uniqid(),
        'telefono_proveedor' => '5550'.rand(1000, 9999),
        'localidad_proveedor' => 'La Habana',
    ]);

    $response->assertRedirect(route('proveedores.index'));
});

test('un vendedor SÍ puede crear un proveedor', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $response = $this->post(route('proveedores.store'), [
        'nombre_proveedor' => 'Proveedor Vendedor '.uniqid(),
        'telefono_proveedor' => '5551'.rand(1000, 9999),
        'localidad_proveedor' => 'La Habana',
    ]);

    $response->assertRedirect(route('proveedores.index'));
});

// ==========================================================================
// ELIMINAR — bloqueado por saldo pendiente o por compras asociadas, ni
// siquiera un admin puede saltarse esto (mismo criterio que Clientes/Cuentas,
// más el hallazgo propio de Proveedores: compras.proveedor_id es cascade).
// ==========================================================================

test('un admin puede eliminar un proveedor en $0.00 sin compras asociadas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertRedirect(route('proveedores.index'));
    expect(Proveedor::find($proveedor->id))->toBeNull();
});

test('ni un admin puede eliminar un proveedor con saldo pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertSessionHasErrors('proveedor');
    expect(Proveedor::find($proveedor->id))->not->toBeNull();
});

test('ni un admin puede eliminar un proveedor en $0.00 que tiene compras asociadas (evita el cascade de compras.proveedor_id)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);
    Compra::factory()->create(['proveedor_id' => $proveedor->id]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertSessionHasErrors('proveedor');
    expect(Proveedor::find($proveedor->id))->not->toBeNull();
    expect(Compra::where('proveedor_id', $proveedor->id)->count())->toBe(1);
});

test('un proveedor en $0.00 sin compras pero con movimientos financieros asociados no se puede eliminar (red de seguridad de la FK)', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 2,
        'proveedor_destino_id' => $proveedor->id,
        'monto' => 80,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'descripcion' => 'Ingreso de prueba',
        'fecha_operacion' => now(),
        'estado' => 'completado',
    ]);

    $response = $this->delete(route('proveedores.destroy', $proveedor->id), [], ['X-Inertia' => 'true']);

    $response->assertSessionHasErrors('proveedor');
    expect(Proveedor::find($proveedor->id))->not->toBeNull();
});
