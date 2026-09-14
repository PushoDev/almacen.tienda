<?php

use App\Models\Cliente;
use App\Models\Proveedor;
use App\Models\Remesa;
use App\Models\User;

// crearMoneda(), crearCuentaEnMoneda() y crearTurnoActivo() están declaradas
// globalmente en tests/Pest.php (compartidas entre archivos).

test('un admin registra una remesa cuenta→cuenta sin mensajero, montos independientes', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 100);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 1000,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 950,
        'notas' => 'Remesa de prueba',
    ]);

    $remesa = Remesa::first();
    $response->assertRedirect(route('transacciones.remesa.show', $remesa->id));
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('cuentas', ['id' => $entrada->id, 'saldo_cuenta' => 1100]);
    $this->assertDatabaseHas('cuentas', ['id' => $salida->id, 'saldo_cuenta' => -450]);
    $this->assertDatabaseHas('remesas', [
        'entrada_tipo' => 'cuenta',
        'entrada_cuenta_id' => $entrada->id,
        'entrada_monto' => 1000,
        'salida_tipo' => 'cuenta',
        'salida_cuenta_id' => $salida->id,
        'salida_monto' => 950,
        'mensajero_cuenta_id' => null,
        'notas' => 'Remesa de prueba',
    ]);
});

test('una remesa con mensajero descuenta también la cuenta del mensajero', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 0);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $mensajero = crearCuentaEnMoneda($monedaUsd, saldo: 200);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 1000,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 950,
        'mensajero_cuenta_id' => $mensajero->id,
        'mensajero_monto' => 20,
    ]);

    $remesa = Remesa::first();
    $response->assertRedirect(route('transacciones.remesa.show', $remesa->id));
    $this->assertDatabaseHas('cuentas', ['id' => $mensajero->id, 'saldo_cuenta' => 180]);

    expect((float) $remesa->mensajero_monto)->toBe(20.0)
        ->and((float) $remesa->mensajero_saldo_anterior)->toBe(200.0)
        ->and((float) $remesa->mensajero_saldo_posterior)->toBe(180.0)
        ->and($remesa->mensajero_moneda)->toBe('USD');
});

test('una remesa con entrada cliente y salida proveedor afecta deuda_pago_cliente y saldo_proveedor', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMonedaUsd();
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 100]);
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 50]);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cliente',
        'entrada_id' => $cliente->id,
        'entrada_monto' => 300,
        'salida_tipo' => 'proveedor',
        'salida_id' => $proveedor->id,
        'salida_monto' => 280,
    ]);

    $remesa = Remesa::first();
    $response->assertRedirect(route('transacciones.remesa.show', $remesa->id));
    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 400]);
    $this->assertDatabaseHas('proveedors', ['id' => $proveedor->id, 'saldo_proveedor' => -230]);
    $this->assertDatabaseHas('remesas', [
        'entrada_tipo' => 'cliente',
        'entrada_cliente_id' => $cliente->id,
        'entrada_moneda' => 'USD',
        'salida_tipo' => 'proveedor',
        'salida_proveedor_id' => $proveedor->id,
        'salida_moneda' => 'USD',
    ]);
});

test('un moderador con turno activo registra una remesa y queda guardado el turno_vendedor_id', function () {
    $moderador = User::factory()->moderador()->create();
    $turno = crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 0);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 100,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 90,
    ]);

    $remesa = Remesa::first();
    $response->assertRedirect(route('transacciones.remesa.show', $remesa->id));
    $this->assertDatabaseHas('remesas', ['turno_vendedor_id' => $turno->id]);
});

test('un vendedor no puede registrar una remesa', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 0);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 100,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 90,
    ], ['X-Inertia' => 'true']);

    $response->assertForbidden();
    $this->assertDatabaseCount('remesas', 0);
});

test('el detalle de una remesa muestra entrada, salida y mensajero con sus saldos', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 100);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $mensajero = crearCuentaEnMoneda($monedaUsd, saldo: 200);

    $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 1000,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 950,
        'mensajero_cuenta_id' => $mensajero->id,
        'mensajero_monto' => 20,
    ]);

    $remesa = Remesa::first();

    $response = $this->get(route('transacciones.remesa.show', $remesa->id));

    $response->assertInertia(fn ($page) => $page
        ->component('Transacciones/RemesaShow')
        ->where('detallesEntrada.monto_operacion', 1000)
        ->where('detallesEntrada.saldo_posterior', 1100)
        ->where('detallesSalida.monto_operacion', -950)
        ->where('detallesSalida.saldo_posterior', -450)
        ->where('detallesMensajero.monto_operacion', -20)
        ->where('detallesMensajero.saldo_posterior', 180)
    );
});

test('un vendedor no puede ver el detalle de una remesa', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 0);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 100,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 90,
    ]);

    $remesa = Remesa::first();

    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $response = $this->get(route('transacciones.remesa.show', $remesa->id), ['X-Inertia' => 'true']);

    $response->assertForbidden();
});

test('mensajero_monto sin mensajero_cuenta_id falla la validación', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($monedaUsd, saldo: 0);
    $salida = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 100,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 90,
        'mensajero_monto' => 20,
    ]);

    $response->assertSessionHasErrors('mensajero_cuenta_id');
    $this->assertDatabaseCount('remesas', 0);
});
