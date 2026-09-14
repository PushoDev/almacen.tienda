<?php

use App\Models\MovimientoFinanciero;
use App\Models\Remesa;
use App\Models\User;

// crearMoneda(), crearCuentaEnMoneda(), crearTiposMovimientoFinanciero() y
// crearTurnoActivo() están declaradas globalmente en tests/Pest.php.

// ==========================================================================
// GASTO / INGRESO / TRANSFERENCIA — TransaccionController::anular()
// ==========================================================================

test('anular un gasto revierte el saldo de la cuenta origen', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'descripcion' => 'Gasto de prueba',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $response = $this->post(route('transacciones.anular', $movimiento->id), [
        'motivo_anulacion' => 'error_monto',
    ]);

    $response->assertRedirect(route('transacciones.show', $movimiento->id));
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
    $this->assertDatabaseHas('movimientos_financieros', [
        'id' => $movimiento->id,
        'estado' => 'cancelado',
        'motivo_anulacion' => 'error_monto',
    ]);
});

test('anular un ingreso revierte el saldo de la cuenta destino', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 170);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 2,
        'cuenta_destino_id' => $cuenta->id,
        'monto' => 100,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'descripcion' => 'Ingreso de prueba',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_destino' => 70,
        'saldo_posterior_destino' => 170,
        'moneda_destino' => 'USD',
    ]);

    $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'duplicado']);

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 70]);
    $this->assertDatabaseHas('movimientos_financieros', ['id' => $movimiento->id, 'estado' => 'cancelado']);
});

test('anular una transferencia revierte origen y destino aunque hayan ocurrido operaciones después', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $origen = crearCuentaEnMoneda($moneda, saldo: 420); // 500 - 80, luego se restó otros 20 en otra operación
    $destino = crearCuentaEnMoneda($moneda, saldo: 130); // 30 + 80, luego se sumaron otros 20

    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 3,
        'cuenta_origen_id' => $origen->id,
        'cuenta_destino_id' => $destino->id,
        'monto' => 80,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'descripcion' => 'Transferencia de prueba',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
        'saldo_anterior_destino' => 30,
        'saldo_posterior_destino' => 110,
        'moneda_destino' => 'USD',
    ]);

    // Simula una operación posterior no relacionada que movió el destino de 110 a 130.
    $destino->update(['saldo_cuenta' => 130]);

    $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'error_entidad']);

    // Origen: 420 + 80 = 500 (vuelve exacto porque nada más lo tocó).
    $this->assertDatabaseHas('cuentas', ['id' => $origen->id, 'saldo_cuenta' => 500]);
    // Destino: 130 - 80 = 50 (compone con la operación posterior en vez de resetear a 30).
    $this->assertDatabaseHas('cuentas', ['id' => $destino->id, 'saldo_cuenta' => 50]);
});

test('no se puede anular dos veces la misma operación', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'fecha_operacion' => now(),
        'estado' => 'cancelado',
        'motivo_anulacion' => 'duplicado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $response = $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'error_monto']);

    $response->assertSessionHasErrors('estado');
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 420]);
});

test('motivo "otros" exige un detalle', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $response = $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'otros']);

    $response->assertSessionHasErrors('detalle_anulacion');
});

test('un vendedor puede anular un gasto sobre su propia cuenta asignada', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420, propietario: $vendedor);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $vendedor->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $response = $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'error_monto']);

    $response->assertRedirect(route('transacciones.show', $movimiento->id));
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 500]);
});

test('un vendedor no puede anular un gasto sobre una cuenta que no tiene asignada', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $vendedor->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $this->actingAs($vendedor);
    $response = $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'error_monto']);

    $response->assertForbidden();
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 420]);
});

// ==========================================================================
// REMESA — RemesaController::anular()
// ==========================================================================

test('anular una remesa revierte las 3 patas: entrada, salida y mensajero', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($moneda, saldo: 1100);
    $salida = crearCuentaEnMoneda($moneda, saldo: 8720);
    $mensajero = crearCuentaEnMoneda($moneda, saldo: 180);

    $remesa = Remesa::create([
        'user_id' => $admin->id,
        'entrada_tipo' => 'cuenta',
        'entrada_cuenta_id' => $entrada->id,
        'entrada_monto' => 1000,
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 100,
        'entrada_saldo_posterior' => 1100,
        'salida_tipo' => 'cuenta',
        'salida_cuenta_id' => $salida->id,
        'salida_monto' => 950,
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 9670,
        'salida_saldo_posterior' => 8720,
        'mensajero_cuenta_id' => $mensajero->id,
        'mensajero_monto' => 20,
        'mensajero_moneda' => 'USD',
        'mensajero_saldo_anterior' => 200,
        'mensajero_saldo_posterior' => 180,
        'fecha_operacion' => now(),
    ]);

    $response = $this->post(route('transacciones.remesa.anular', $remesa->id), ['motivo_anulacion' => 'duplicado']);

    $response->assertRedirect(route('transacciones.remesa.show', $remesa->id));
    $this->assertDatabaseHas('cuentas', ['id' => $entrada->id, 'saldo_cuenta' => 100]);
    $this->assertDatabaseHas('cuentas', ['id' => $salida->id, 'saldo_cuenta' => 9670]);
    $this->assertDatabaseHas('cuentas', ['id' => $mensajero->id, 'saldo_cuenta' => 200]);
    $this->assertDatabaseHas('remesas', ['id' => $remesa->id, 'estado' => 'anulada', 'motivo_anulacion' => 'duplicado']);
});

test('un vendedor no puede anular una remesa', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    $moneda = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($moneda, saldo: 1100);
    $salida = crearCuentaEnMoneda($moneda, saldo: 8720);

    $remesa = Remesa::create([
        'user_id' => $admin->id,
        'entrada_tipo' => 'cuenta',
        'entrada_cuenta_id' => $entrada->id,
        'entrada_monto' => 1000,
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 100,
        'entrada_saldo_posterior' => 1100,
        'salida_tipo' => 'cuenta',
        'salida_cuenta_id' => $salida->id,
        'salida_monto' => 950,
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 9670,
        'salida_saldo_posterior' => 8720,
        'fecha_operacion' => now(),
    ]);

    $this->actingAs($vendedor);
    $response = $this->post(route('transacciones.remesa.anular', $remesa->id), ['motivo_anulacion' => 'duplicado'], ['X-Inertia' => 'true']);

    $response->assertForbidden();
    $this->assertDatabaseHas('remesas', ['id' => $remesa->id, 'estado' => 'completado']);
});
