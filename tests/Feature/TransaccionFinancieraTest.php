<?php

use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Models\User;

// crearMoneda(), crearCuentaEnMoneda() y crearTiposMovimientoFinanciero()
// están declaradas globalmente en tests/Pest.php (compartidas entre archivos).

// ==========================================================================
// cuentasPropias() — admin/moderador deben ver SIEMPRE todas las cuentas (acceso
// global, sin filas en user_cuentas); un vendedor solo las suyas asignadas. Antes
// del fix, formData()/index() decidían con un `if role === 'vendedor'` copiado en
// cada controlador — un olvido en cualquiera dejaba al admin sin ninguna cuenta.
// ==========================================================================

test('formData() de Ingreso entrega todas las cuentas a un admin, aunque no tenga ninguna asignada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearCuentaEnMoneda(crearMonedaUsd());
    crearCuentaEnMoneda(crearMonedaUsd());

    $this->getJson(route('transacciones.ingreso.data'))
        ->assertOk()
        ->assertJsonCount(2, 'cuentasDestino');
});

test('formData() de Transferencia entrega todas las cuentas a un moderador, aunque no tenga ninguna asignada', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    crearCuentaEnMoneda(crearMonedaUsd());
    crearCuentaEnMoneda(crearMonedaUsd());

    $this->getJson(route('transacciones.transferencia.data'))
        ->assertOk()
        ->assertJsonCount(2, 'cuentasOrigen')
        ->assertJsonCount(2, 'cuentasDestino');
});

test('index() de Transacciones entrega todas las cuentas de origen a un admin, sin filtrar por tipo_titular', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $cuenta->update(['tipo_titular' => 'externa']); // a un vendedor esta se le ocultaría

    $this->get(route('transacciones'))->assertInertia(fn ($page) => $page
        ->has('cuentasOrigen', 1)
        ->where('cuentasOrigen.0.id', $cuenta->id));
});

test('index() de Distribución de Costos entrega todas las cuentas a un moderador, sin filtrar por tipo_titular', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $cuenta->update(['tipo_titular' => 'externa']);

    $this->get(route('distribucion-costos.index'))->assertInertia(fn ($page) => $page
        ->has('cuentas', 1)
        ->where('cuentas.0.id', $cuenta->id));
});

test('un vendedor solo ve en formData() de Ingreso sus cuentas de acceso completo, con el logo del banco, y no las de cobro', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $propia = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);
    $propia->update(['imagen' => 'visa']);
    $cuentaCobro = crearCuentaEnMoneda(crearMonedaUsd());
    $vendedor->cuentas()->attach($cuentaCobro->id, ['acceso' => Cuenta::ACCESO_COBRO]);
    crearCuentaEnMoneda(crearMonedaUsd()); // no asignada, no debe salir

    $this->getJson(route('transacciones.ingreso.data'))
        ->assertOk()
        ->assertJsonCount(1, 'cuentasDestino')
        ->assertJsonPath('cuentasDestino.0.id', $propia->id)
        ->assertJsonStructure(['cuentasDestino' => [['banco' => ['slug', 'nombre', 'imagen_url']]]]);
});

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
    crearTurnoActivo($vendedor);
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
    crearTurnoActivo($vendedor);
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
    crearTurnoActivo($vendedor);
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

test('un vendedor no puede gastar desde una cuenta personal asignada con acceso de solo cobro', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $cuenta->update(['tipo_titular' => 'personal']);
    $vendedor->cuentas()->attach($cuenta->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('un vendedor sí puede gastar desde una cuenta personal asignada con acceso completo explícito', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $cuenta->update(['tipo_titular' => 'personal']);
    $vendedor->cuentas()->attach($cuenta->id, ['acceso' => Cuenta::ACCESO_COMPLETO]);

    $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ])->assertRedirect();

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 450]);
});

test('la pantalla de Transacciones no lista al vendedor sus cuentas de cobro ni las externas, y manda el logo del banco', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $completa = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $completa->update(['tipo_titular' => 'personal', 'imagen' => 'visa']);
    $cobro = crearCuentaEnMoneda($monedaUsd, saldo: 900);
    $cobro->update(['tipo_titular' => 'personal']);
    $externa = crearCuentaEnMoneda($monedaUsd, saldo: 700);
    $externa->update(['tipo_titular' => 'externa']);
    $vendedor->cuentas()->attach($completa->id, ['acceso' => Cuenta::ACCESO_COMPLETO]);
    $vendedor->cuentas()->attach($cobro->id, ['acceso' => Cuenta::ACCESO_COBRO]);
    $vendedor->cuentas()->attach($externa->id, ['acceso' => Cuenta::ACCESO_COMPLETO]);

    $this->get(route('transacciones'))->assertInertia(fn ($page) => $page
        ->has('cuentasOrigen', 1)
        ->where('cuentasOrigen.0.id', $completa->id)
        ->has('cuentasOrigen.0.banco.imagen_url')
    );
});

test('la pantalla de Transacciones entrega todas las cuentas de origen a un admin, con banco en null si no tienen logo', function () {
    $this->actingAs(User::factory()->admin()->create());

    $monedaUsd = crearMoneda('USD', 1, true);
    crearCuentaEnMoneda($monedaUsd);
    crearCuentaEnMoneda($monedaUsd);

    $this->get(route('transacciones'))->assertInertia(fn ($page) => $page
        ->has('cuentasOrigen', 2)
        ->where('cuentasOrigen.0.banco', null)
    );
});

test('un vendedor no puede gastar desde un cliente: no tiene acceso a clientes en Gastos', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    crearMoneda('USD', 1, true);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 200]);

    $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cliente',
        'origen_id' => $cliente->id,
        'monto' => 50,
        'moneda' => 'USD',
    ])->assertSessionHasErrors('origen_tipo');

    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 200]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('la pantalla de Transacciones no entrega clientes al vendedor pero sí al admin', function () {
    Cliente::factory()->count(2)->create();

    $this->actingAs(User::factory()->vendedor()->create());
    $this->get(route('transacciones'))->assertInertia(fn ($page) => $page->has('clientes', 0));

    $this->actingAs(User::factory()->admin()->create());
    $this->get(route('transacciones'))->assertInertia(fn ($page) => $page->has('clientes', 2));
});

test('un moderador puede gastar desde cualquier cuenta aunque no la tenga asignada', function () {
    crearTiposMovimientoFinanciero();
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
    ])->assertRedirect();

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
    crearTurnoActivo($vendedor);
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

test('un vendedor no puede ingresar a una cuenta asignada con acceso de solo cobro', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 100);
    $vendedor->cuentas()->attach($cuenta->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    $response = $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cuenta',
        'destino_id' => $cuenta->id,
        'monto' => 30,
        'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 100]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('un vendedor no puede ingresar a un cliente: no tiene acceso a clientes en Ingresos', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    crearMoneda('USD', 1, true);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 20]);

    $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cliente',
        'destino_id' => $cliente->id,
        'monto' => 30,
        'moneda' => 'USD',
    ])->assertSessionHasErrors('destino_tipo');

    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 20]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('un vendedor no puede ingresar a un proveedor: no tiene acceso a proveedores en Ingresos', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    crearMoneda('USD', 1, true);
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'proveedor',
        'destino_id' => $proveedor->id,
        'monto' => 75,
        'moneda' => 'USD',
    ])->assertSessionHasErrors('destino_tipo');

    $this->assertDatabaseHas('proveedors', ['id' => $proveedor->id, 'saldo_proveedor' => 0]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('formData() de Ingreso no entrega clientes ni proveedores al vendedor pero sí al admin', function () {
    Cliente::factory()->count(2)->create();
    Proveedor::factory()->count(3)->create();

    $this->actingAs(User::factory()->vendedor()->create());
    $this->getJson(route('transacciones.ingreso.data'))->assertOk()->assertJsonCount(0, 'clientes')->assertJsonCount(0, 'proveedores');

    $this->actingAs(User::factory()->admin()->create());
    $this->getJson(route('transacciones.ingreso.data'))->assertOk()->assertJsonCount(2, 'clientes')->assertJsonCount(3, 'proveedores');
});

test('un vendedor sí puede ingresar a una cuenta asignada con acceso completo', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 100, propietario: $vendedor);

    $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cuenta',
        'destino_id' => $cuenta->id,
        'monto' => 30,
        'moneda' => 'USD',
    ])->assertRedirect();

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 130]);
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
    crearTurnoActivo($vendedor);
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

test('un vendedor que transfiere a una cuenta de otro vendedor no la acredita al instante: el dinero sale del origen y queda en tránsito', function () {
    crearTiposMovimientoFinanciero();
    $vendedorA = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedorA);
    $vendedorB = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedorB);
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

    $response->assertRedirect(route('transacciones.envios.index'));
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 450]); // el dinero ya salió
    $this->assertDatabaseHas('cuentas', ['id' => $destinoDeOtro->id, 'saldo_cuenta' => 0]); // y todavía no llegó
    $this->assertDatabaseHas('transferencias_pendientes', [
        'user_id' => $vendedorA->id, 'cuenta_origen_id' => $origen->id, 'cuenta_destino_id' => $destinoDeOtro->id,
        'monto' => 50, 'estado' => 'en_transito',
    ]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('un vendedor no puede transferir desde una cuenta personal asignada con acceso de solo cobro', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $origen->update(['tipo_titular' => 'personal']);
    $vendedor->cuentas()->attach($origen->id, ['acceso' => Cuenta::ACCESO_COBRO]);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 0, propietario: $vendedor);

    $response = $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 50, 'moneda' => 'USD',
    ]);

    $response->assertSessionHasErrors('message');
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 500]);
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 0]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('un vendedor sí puede transferir desde una cuenta completa a una de sus cuentas de cobro', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $origen->update(['tipo_titular' => 'personal']);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 10);
    $vendedor->cuentas()->attach($destino->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 50, 'moneda' => 'USD',
    ])->assertRedirect();

    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 450]);
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 60]);
});

test('formData() de Transferencia da al vendedor de origen solo sus cuentas personales completas y de destino todas las del sistema, con saldo solo en las suyas completas', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $completa = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $completa->update(['tipo_titular' => 'personal', 'imagen' => 'visa']);
    $externa = crearCuentaEnMoneda($monedaUsd, saldo: 700, propietario: $vendedor);
    $externa->update(['tipo_titular' => 'externa']);
    $cobro = crearCuentaEnMoneda($monedaUsd, saldo: 900);
    $cobro->update(['tipo_titular' => 'personal']);
    $vendedor->cuentas()->attach($cobro->id, ['acceso' => Cuenta::ACCESO_COBRO]);
    $deOtro = crearCuentaEnMoneda($monedaUsd, saldo: 100, propietario: User::factory()->vendedor()->create(['name' => 'Otro Vendedor']));

    $respuesta = $this->getJson(route('transacciones.transferencia.data'))->assertOk();

    // Origen: solo la completa y personal. Destino: TODAS las cuentas del sistema (4).
    $respuesta->assertJsonCount(1, 'cuentasOrigen')
        ->assertJsonPath('cuentasOrigen.0.id', $completa->id)
        ->assertJsonStructure(['cuentasOrigen' => [['banco' => ['slug', 'nombre', 'imagen_url']]]])
        ->assertJsonCount(4, 'cuentasDestino');

    $destinos = collect($respuesta->json('cuentasDestino'))->keyBy('id');
    expect((float) $destinos[$completa->id]['saldo_cuenta'])->toBe(500.0);
    expect((float) $destinos[$externa->id]['saldo_cuenta'])->toBe(700.0);
    // Sin saldo: la suya de cobro y la de otra persona
    expect($destinos[$cobro->id]['saldo_cuenta'])->toBeNull();
    expect($destinos[$deOtro->id]['saldo_cuenta'])->toBeNull();
    // `propia` decide si la transferencia es inmediata o queda pendiente; `responsables` dice a quién se envía
    expect($destinos[$completa->id]['propia'])->toBeTrue();
    expect($destinos[$cobro->id]['propia'])->toBeTrue();
    expect($destinos[$deOtro->id]['propia'])->toBeFalse();
    expect($destinos[$deOtro->id]['responsables'])->toBe(['Otro Vendedor']);
});

test('un vendedor transfiere solo entre cuentas: se rechaza un cliente de origen y un cliente o proveedor de destino', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuenta->update(['tipo_titular' => 'personal']);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 100]);
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cliente', 'origen_id' => $cliente->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $cuenta->id,
        'monto' => 10, 'moneda' => 'USD',
    ])->assertSessionHasErrors('origen_tipo');

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $cuenta->id,
        'destino_tipo' => 'cliente', 'destino_id' => $cliente->id,
        'monto' => 10, 'moneda' => 'USD',
    ])->assertSessionHasErrors('destino_tipo');

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $cuenta->id,
        'destino_tipo' => 'proveedor', 'destino_id' => $proveedor->id,
        'monto' => 10, 'moneda' => 'USD',
    ])->assertSessionHasErrors('destino_tipo');

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 100]);
    $this->assertDatabaseHas('proveedors', ['id' => $proveedor->id, 'saldo_proveedor' => 0]);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('formData() de Transferencia no entrega clientes ni proveedores al vendedor pero sí al admin', function () {
    Cliente::factory()->count(2)->create();
    Proveedor::factory()->count(3)->create();

    $this->actingAs(User::factory()->vendedor()->create());
    $this->getJson(route('transacciones.transferencia.data'))->assertOk()->assertJsonCount(0, 'clientes')->assertJsonCount(0, 'proveedores');

    $this->actingAs(User::factory()->admin()->create());
    $this->getJson(route('transacciones.transferencia.data'))->assertOk()->assertJsonCount(2, 'clientes')->assertJsonCount(3, 'proveedores');
});

test('formData() de Transferencia entrega a un admin todas las cuentas con su saldo', function () {
    $this->actingAs(User::factory()->admin()->create());

    $monedaUsd = crearMonedaUsd();
    crearCuentaEnMoneda($monedaUsd, saldo: 250);
    crearCuentaEnMoneda($monedaUsd, saldo: 300);

    $respuesta = $this->getJson(route('transacciones.transferencia.data'))->assertOk();

    $respuesta->assertJsonCount(2, 'cuentasOrigen')->assertJsonCount(2, 'cuentasDestino');
    expect(collect($respuesta->json('cuentasDestino'))->pluck('saldo_cuenta')->map(fn ($saldo) => (float) $saldo)->sort()->values()->all())->toBe([250.0, 300.0]);
});

// ==========================================================================
// ATENDIDO POR / TURNOS
// ==========================================================================

test('un gasto creado por un vendedor con turno activo guarda el turno_vendedor_id', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    $turno = crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuenta->update(['tipo_titular' => 'personal']);

    $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
        'comentario' => 'Compra de insumos',
    ]);

    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'turno_vendedor_id' => $turno->id,
    ]);
});

test('un ingreso creado por un moderador con turno activo guarda el turno_vendedor_id', function () {
    crearTiposMovimientoFinanciero();
    $moderador = User::factory()->moderador()->create();
    $turno = crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $monedaUsd = crearMoneda('USD', 1, true);
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500);

    $this->post(route('transacciones.ingresar'), [
        'destino_tipo' => 'cuenta',
        'destino_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
        'comentario' => 'Ingreso extra',
    ]);

    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 2,
        'cuenta_destino_id' => $cuenta->id,
        'turno_vendedor_id' => $turno->id,
    ]);
});

test('una transferencia creada por admin (sin turno) guarda turno_vendedor_id null', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $destino = crearCuentaEnMoneda($monedaUsd, saldo: 0);

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta',
        'destino_id' => $destino->id,
        'monto' => 50,
        'moneda' => 'USD',
    ]);

    $this->assertDatabaseHas('movimientos_financieros', [
        'tipo_movimiento_id' => 3,
        'cuenta_origen_id' => $origen->id,
        'turno_vendedor_id' => null,
    ]);
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

test('show() de una transferencia entre monedas distintas muestra lo que realmente recibió el destino', function () {
    crearTiposMovimientoFinanciero();
    $this->actingAs(User::factory()->admin()->create());

    $usd = crearMoneda('USD', 1, true);
    $cup = crearMoneda('CUP', 500);
    $origen = crearCuentaEnMoneda($usd, saldo: 100);
    $destino = crearCuentaEnMoneda($cup, saldo: 1000);

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 10, 'moneda' => 'USD',
    ])->assertRedirect();

    $this->get(route('transacciones.show', MovimientoFinanciero::firstOrFail()))->assertInertia(fn ($page) => $page
        ->where('detallesOrigen.monto_operacion', -10)
        ->where('detallesDestino.moneda', 'CUP')
        ->where('detallesDestino.monto_operacion', 5000)
        ->where('detallesDestino.saldo_posterior', 6000)
    );
});
