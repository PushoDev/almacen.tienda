<?php

use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Models\User;

// crearMoneda(), crearCuentaEnMoneda() y crearTiposMovimientoFinanciero()
// están declaradas globalmente en tests/Pest.php (compartidas entre archivos).

// ==========================================================================
// GASTO
// ==========================================================================

test('un gasto desde una cuenta resta el saldo y registra el movimiento (tipo 1)', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
        'comentario' => 'Compra de insumos',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 450]);
    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);
});

test('un gasto desde un cliente resta su deuda_pago_cliente', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMoneda('USD', 1, true);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 200]);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cliente',
        'origen_id' => $cliente->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 150]);
});

test('un gasto rechaza si la moneda de la cuenta no coincide con la moneda de la transacción', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMoneda('CUP', 400);
    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500); // cuenta en USD

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'CUP', // no coincide con la cuenta
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]); // sin cambios
    $this->assertDatabaseCount('movimientos_financieros', 0);
});

test('un vendedor no puede gastar desde una cuenta que no tiene asignada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500); // no asignada

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
});

test('un vendedor no puede gastar desde una cuenta asignada pero de tipo_titular externa', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuenta->update(['tipo_titular' => 'externa']);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
});

test('un vendedor sí puede gastar desde su cuenta personal asignada', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuenta->update(['tipo_titular' => 'personal']);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 450]);
});

// ==========================================================================
// INGRESO
// ==========================================================================

test('un ingreso a una cuenta suma el saldo y registra el movimiento (tipo 2)', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 100);

    $response = $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cuenta',
        'destino_id' => $cuenta->id,
        'monto' => 30,
        'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 130]);
    $this->assertDatabaseHas('movimientos_financieros', ['tipo_movimiento_id' => 2, 'cuenta_destino_id' => $cuenta->id, 'monto' => 30]);
});

test('un ingreso a un cliente suma su deuda_pago_cliente', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMoneda('USD', 1, true);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 20]);

    $response = $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cliente',
        'destino_id' => $cliente->id,
        'monto' => 30,
        'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 50]);
});

test('un ingreso a un proveedor suma su saldo_proveedor', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMoneda('USD', 1, true);
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $response = $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'proveedor',
        'destino_id' => $proveedor->id,
        'monto' => 75,
        'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('proveedors', ['id' => $proveedor->id, 'saldo_proveedor' => 75]);
});

test('un vendedor no puede ingresar a una cuenta que no tiene asignada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 100); // no asignada

    $response = $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cuenta',
        'destino_id' => $cuenta->id,
        'monto' => 30,
        'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 100]);
});

// ==========================================================================
// TRANSFERENCIA
// ==========================================================================

test('una transferencia entre cuentas en la misma moneda mueve el monto exacto en ambas', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 100);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 80, 'moneda' => 'USD',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 420]);
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 180]);
    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 3, 'cuenta_origen_id' => $origen->id, 'cuenta_destino_id' => $destino->id, 'monto' => 80,
    ]);
});

test('una transferencia entre monedas distintas convierte el monto con la tasa de la cuenta origen', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    // 350 CUP = 1 USD
    $monedaCup = crearMoneda('CUP', 350);
    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaCup, saldo: 100000);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 0);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 350, 'moneda' => 'CUP',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 99650]);
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 1]); // 350 / 350 = 1 USD
    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 3, 'monto' => 350, 'tasa_cambio_aplicada' => 350,
    ]);
});

test('una transferencia con tasa personalizada usa esa tasa en vez de la tasa registrada de la moneda', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    // Tasa registrada: 400 CUP = 1 USD. Se transfiere usando una tasa personalizada de 300.
    $monedaCup = crearMoneda('CUP', 400);
    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaCup, saldo: 100000);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 0);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 300, 'moneda' => 'CUP', 'tasa_cambio_aplicada' => 300,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 1]); // 300 / 300 (custom) = 1 USD, no 300/400
    $this->assertDatabaseHas('movimientos_financieros', ['tipo_movimiento_id' => 3, 'tasa_cambio_aplicada' => 300]);
    // La tasa personalizada (300) le da al destino MÁS USD que la oficial (400) hubiera
    // dado (1.00 vs 0.75) — la agencia entregó de más, así que es una PÉRDIDA (negativo).
    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 3,
        'tasa_oficial_en_momento' => 400,
        'ganancia_perdida_cambiaria' => -0.25,
    ]);
});

test('no se puede transferir de una cuenta a sí misma', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $cuenta->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $cuenta->id,
        'monto' => 50, 'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('destino_id');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
});

test('un vendedor no puede transferir desde una cuenta que no tiene asignada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500); // no asignada
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 0, propietario: $vendedor);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 50, 'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 500]);
});

test('un vendedor no puede transferir a una cuenta asignada a otro vendedor', function () {
    crearTiposMovimientoFinanciero();
    $vendedorA = User::factory()->vendedor()->create();
    $vendedorB = User::factory()->vendedor()->create();
    $this->actingAs($vendedorA);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedorA);
    $origen->update(['tipo_titular' => 'personal']);
    $destinoDeOtro = crearCuentaEnMoneda($monedaUsd, saldo: 0, propietario: $vendedorB); // asignada a OTRO vendedor, no a A

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destinoDeOtro->id,
        'monto' => 50, 'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 500]);
    $this->assertDatabaseHas('cuentas', ['id' => $destinoDeOtro->id, 'saldo_cuenta' => 0]);
});

// ==========================================================================
// SHOW
// ==========================================================================

test('show() muestra el detalle de un movimiento financiero existente', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $movimiento = MovimientoFinanciero::factory()->gasto()->create(['user_id' => $admin->id]);

    $response = $this->get(route('transacciones.show', $movimiento));

    $response->assertOk();
});
