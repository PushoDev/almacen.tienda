<?php

use App\Models\Cliente;
use App\Models\Proveedor;
use App\Models\Remesa;
use App\Models\User;

// crearMonedaUsd() y crearCuentaEnMoneda() están declaradas globalmente en tests/Pest.php.

function crearRemesaDePrueba(array $overrides = []): Remesa
{
    return Remesa::create(array_merge([
        'entrada_tipo' => 'cuenta',
        'entrada_monto' => 100,
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 0,
        'entrada_saldo_posterior' => 100,
        'salida_tipo' => 'cuenta',
        'salida_monto' => 90,
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 500,
        'salida_saldo_posterior' => 410,
        'notas' => 'Remesa de prueba',
        'fecha_operacion' => now(),
    ], $overrides));
}

// ==========================================================================
// CUENTAS — historial de remesas (entrada/salida/mensajero)
// ==========================================================================

test('el historial de Cuentas incluye una remesa como entrada, salida y mensajero, con signo correcto', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaUsd = crearMonedaUsd();
    $cuentaEntrada = crearCuentaEnMoneda($monedaUsd, saldo: 100);
    $cuentaSalida = crearCuentaEnMoneda($monedaUsd, saldo: 410);
    $cuentaMensajero = crearCuentaEnMoneda($monedaUsd, saldo: 180);

    $remesa = crearRemesaDePrueba([
        'user_id' => $admin->id,
        'entrada_cuenta_id' => $cuentaEntrada->id,
        'salida_cuenta_id' => $cuentaSalida->id,
        'mensajero_cuenta_id' => $cuentaMensajero->id,
        'mensajero_monto' => 20,
        'mensajero_moneda' => 'USD',
        'mensajero_saldo_anterior' => 200,
        'mensajero_saldo_posterior' => 180,
    ]);

    $responseEntrada = $this->get(route('cuentas.show', $cuentaEntrada->id), ['X-Inertia' => 'true']);
    $itemEntrada = collect($responseEntrada->json('props.historialRemesas.data'))->firstWhere('referencia_id', $remesa->id);
    expect($itemEntrada['tipo'])->toBe('Remesa (Entrada)');
    expect((float) $itemEntrada['monto'])->toBe(100.0);
    expect($itemEntrada['detalle']['movimientos_saldo'])->toHaveCount(3);

    $responseSalida = $this->get(route('cuentas.show', $cuentaSalida->id), ['X-Inertia' => 'true']);
    $itemSalida = collect($responseSalida->json('props.historialRemesas.data'))->firstWhere('referencia_id', $remesa->id);
    expect($itemSalida['tipo'])->toBe('Remesa (Salida)');
    expect((float) $itemSalida['monto'])->toBe(-90.0);

    $responseMensajero = $this->get(route('cuentas.show', $cuentaMensajero->id), ['X-Inertia' => 'true']);
    $itemMensajero = collect($responseMensajero->json('props.historialRemesas.data'))->firstWhere('referencia_id', $remesa->id);
    expect($itemMensajero['tipo'])->toBe('Remesa (Mensajero)');
    expect((float) $itemMensajero['monto'])->toBe(-20.0);
});

test('el historial de remesas en Cuentas se oculta para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 100, propietario: $vendedor);

    crearRemesaDePrueba(['user_id' => $admin->id, 'entrada_cuenta_id' => $cuenta->id]);

    $this->actingAs($vendedor);
    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);

    $response->assertOk();
    expect(collect($response->json('props.historialRemesas.data')))->toBeEmpty();
});

// ==========================================================================
// CLIENTES — remesas como entrada/salida
// ==========================================================================

test('el detalle de un cliente incluye las remesas donde participó como entrada o salida', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMonedaUsd();
    $clienteEntrada = Cliente::factory()->create(['deuda_pago_cliente' => 100]);
    $clienteSalida = Cliente::factory()->create(['deuda_pago_cliente' => 50]);

    $remesaEntrada = crearRemesaDePrueba([
        'user_id' => $admin->id,
        'entrada_tipo' => 'cliente',
        'entrada_cliente_id' => $clienteEntrada->id,
        'entrada_moneda' => 'USD',
    ]);
    $remesaSalida = crearRemesaDePrueba([
        'user_id' => $admin->id,
        'salida_tipo' => 'cliente',
        'salida_cliente_id' => $clienteSalida->id,
        'salida_moneda' => 'USD',
    ]);

    $responseEntrada = $this->get(route('clientes.show', $clienteEntrada->id), ['X-Inertia' => 'true']);
    $itemEntrada = collect($responseEntrada->json('props.cliente.remesas_como_entrada'))->firstWhere('id', $remesaEntrada->id);
    expect($itemEntrada)->not->toBeNull();
    expect($itemEntrada['detalle']['movimientos_saldo'][0]['nombre'])->toBe($clienteEntrada->nombre_cliente);

    $responseSalida = $this->get(route('clientes.show', $clienteSalida->id), ['X-Inertia' => 'true']);
    $itemSalida = collect($responseSalida->json('props.cliente.remesas_como_salida'))->firstWhere('id', $remesaSalida->id);
    expect($itemSalida)->not->toBeNull();
    expect($itemSalida['detalle']['movimientos_saldo'][1]['nombre'])->toBe($clienteSalida->nombre_cliente);
});

test('las remesas de un cliente se ocultan para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    crearMonedaUsd();
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 100]);
    crearRemesaDePrueba(['user_id' => $admin->id, 'entrada_tipo' => 'cliente', 'entrada_cliente_id' => $cliente->id]);

    $this->actingAs($vendedor);
    $response = $this->get(route('clientes.show', $cliente->id), ['X-Inertia' => 'true']);

    $response->assertOk();
    expect(collect($response->json('props.cliente.remesas_como_entrada')))->toBeEmpty();
    expect(collect($response->json('props.cliente.remesas_como_salida')))->toBeEmpty();
});

// ==========================================================================
// PROVEEDORES — remesas como entrada/salida
// ==========================================================================

test('el detalle de un proveedor incluye las remesas donde participó como entrada o salida', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearMonedaUsd();
    $proveedorEntrada = Proveedor::factory()->create(['saldo_proveedor' => 100]);
    $proveedorSalida = Proveedor::factory()->create(['saldo_proveedor' => 50]);

    $remesaEntrada = crearRemesaDePrueba([
        'user_id' => $admin->id,
        'entrada_tipo' => 'proveedor',
        'entrada_proveedor_id' => $proveedorEntrada->id,
        'entrada_moneda' => 'USD',
    ]);
    crearRemesaDePrueba([
        'user_id' => $admin->id,
        'salida_tipo' => 'proveedor',
        'salida_proveedor_id' => $proveedorSalida->id,
        'salida_moneda' => 'USD',
    ]);

    $response = $this->get(route('proveedores.show', $proveedorEntrada->id), ['X-Inertia' => 'true']);
    $item = collect($response->json('props.remesas'))->firstWhere('id', $remesaEntrada->id);
    expect($item)->not->toBeNull();
    expect($item['detalle']['movimientos_saldo'][0]['nombre'])->toBe($proveedorEntrada->nombre_proveedor);
});

test('las remesas de un proveedor se ocultan para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    crearMonedaUsd();
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 100]);
    crearRemesaDePrueba(['user_id' => $admin->id, 'entrada_tipo' => 'proveedor', 'entrada_proveedor_id' => $proveedor->id]);

    $this->actingAs($vendedor);
    $response = $this->get(route('proveedores.show', $proveedor->id), ['X-Inertia' => 'true']);

    $response->assertOk();
    expect(collect($response->json('props.remesas')))->toBeEmpty();
});
