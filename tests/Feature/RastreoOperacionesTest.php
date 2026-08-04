<?php

use App\Models\Cuenta;
use App\Models\DestinatarioVenta;
use App\Models\MovimientoFinanciero;
use App\Models\User;
use App\Models\Venta;

// crearTiposMovimientoFinanciero() está declarada globalmente en tests/Pest.php.

test('el reporte combina Venta, Gasto, Ingreso y Transferencia en un solo listado, ordenado por fecha real', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $ventaVieja = Venta::factory()->create([
        'total' => 100,
        'created_at' => now()->subDays(4),
    ]);

    $gasto = MovimientoFinanciero::factory()->gasto()->create([
        'monto' => 50,
        'moneda' => 'CUP',
        'descripcion' => 'Pago de electricidad',
        'fecha_operacion' => now()->subDays(3),
    ]);

    $ingreso = MovimientoFinanciero::factory()->ingreso()->create([
        'monto' => 300,
        'moneda' => 'USD',
        'descripcion' => 'Ingreso a cuenta: Caja Principal',
        'fecha_operacion' => now()->subDays(2),
    ]);

    $transferencia = MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
        'monto' => 120,
        'moneda' => 'USD',
        'descripcion' => 'Transferencia entre cuentas',
        'fecha_operacion' => now()->subDay(),
    ]);

    $ventaReciente = Venta::factory()->create([
        'total' => 200,
        'created_at' => now(),
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $response->assertOk();

    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(5);
    // Orden esperado por fecha descendente, mezclando los 4 tipos: venta reciente,
    // transferencia (1 día atrás), ingreso (2 días atrás), gasto (3 días atrás),
    // venta vieja (4 días atrás) — no "todas las ventas primero" ni agrupado por tipo.
    expect($operaciones->pluck('tipo')->all())->toBe(['Venta', 'Transferencia', 'Ingreso', 'Gasto', 'Venta']);

    $filaTransferencia = $operaciones->get(1);
    expect($filaTransferencia['monto'])->toEqual(120.0);
    expect($filaTransferencia['moneda'])->toBe('USD');
    expect($filaTransferencia['descripcion'])->toBe('Transferencia entre cuentas');
    expect($filaTransferencia['referencia'])->toBe("Transferencia #{$transferencia->id}");
    expect($filaTransferencia['detalle_venta'])->toBeNull();

    $filaIngreso = $operaciones->get(2);
    expect($filaIngreso['monto'])->toEqual(300.0);
    expect($filaIngreso['moneda'])->toBe('USD');
    expect($filaIngreso['descripcion'])->toBe('Ingreso a cuenta: Caja Principal');
    expect($filaIngreso['referencia'])->toBe("Ingreso #{$ingreso->id}");
    expect($filaIngreso['detalle_venta'])->toBeNull();

    $filaGasto = $operaciones->get(3);
    expect($filaGasto['monto'])->toEqual(50.0);
    expect($filaGasto['moneda'])->toBe('CUP');
    expect($filaGasto['referencia'])->toBe("Gasto #{$gasto->id}");
    expect($filaGasto['detalle_venta'])->toBeNull();

    $filaVentaReciente = $operaciones->get(0);
    expect($filaVentaReciente['id'])->toBe($ventaReciente->id);
    expect($filaVentaReciente['moneda'])->toBe('USD');
    expect($filaVentaReciente['detalle_venta'])->not->toBeNull();
});

test('el filtro por usuario en el reporte aplica a Venta, Gasto, Ingreso y Transferencia', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $vendedorA = User::factory()->vendedor()->create();
    $vendedorB = User::factory()->vendedor()->create();

    $cuentaUsd = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->ingreso()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->transferencia()->create([
        'user_id' => $vendedorA->id,
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    Venta::factory()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->ingreso()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->transferencia()->create([
        'user_id' => $vendedorB->id,
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones', ['user_id' => $vendedorA->id]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(4);
    expect($operaciones->pluck('user_id')->unique()->all())->toBe([$vendedorA->id]);
});

test('el filtro por fecha (un solo día) en el reporte aplica a Venta, Gasto, Ingreso y Transferencia', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaUsd = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->create(['created_at' => '2026-06-15']);
    MovimientoFinanciero::factory()->gasto()->create(['fecha_operacion' => '2026-06-15']);
    MovimientoFinanciero::factory()->ingreso()->create(['fecha_operacion' => '2026-06-15']);
    MovimientoFinanciero::factory()->transferencia()->create([
        'fecha_operacion' => '2026-06-15',
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    Venta::factory()->create(['created_at' => '2026-07-30']);
    MovimientoFinanciero::factory()->gasto()->create(['fecha_operacion' => '2026-07-30']);
    MovimientoFinanciero::factory()->ingreso()->create(['fecha_operacion' => '2026-07-30']);
    MovimientoFinanciero::factory()->transferencia()->create([
        'fecha_operacion' => '2026-07-30',
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones', ['fecha' => '2026-07-30']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(4);
    expect($operaciones->pluck('tipo')->sort()->values()->all())->toBe(['Gasto', 'Ingreso', 'Transferencia', 'Venta']);
});

test('el filtro por tipo de operación aísla un solo tipo del listado mezclado', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaUsd = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->create();
    MovimientoFinanciero::factory()->gasto()->create();
    MovimientoFinanciero::factory()->ingreso()->create();
    MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones', ['tipo' => 'Transferencia']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(1);
    expect($operaciones->first()['tipo'])->toBe('Transferencia');
});

test('el buscador encuentra un Gasto por el nombre de la cuenta origen', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaBuscada = crearCuentaEnMoneda(crearMonedaUsd(), 1000);
    Cuenta::where('id', $cuentaBuscada->id)->update(['nombre_cuenta' => 'Caja Fuerte Central']);

    $gasto = MovimientoFinanciero::factory()->gasto()->create([
        'cuenta_origen_id' => $cuentaBuscada->id,
        'descripcion' => 'Pago de electricidad',
    ]);

    MovimientoFinanciero::factory()->gasto()->create([
        'descripcion' => 'Otro gasto sin relación',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones', ['buscar' => 'Caja Fuerte']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(1);
    expect($operaciones->first()['id'])->toBe($gasto->id);
});

test('el buscador encuentra una Venta por el nombre del destinatario', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $ventaBuscada = Venta::factory()->create();
    DestinatarioVenta::create([
        'venta_id' => $ventaBuscada->id,
        'nombre' => 'Ramoncito',
        'apellidos' => 'Perez Lopez',
    ]);

    Venta::factory()->create();

    $response = $this->get(route('reportes.rastreo_operaciones', ['buscar' => 'Ramoncito']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(1);
    expect($operaciones->first()['id'])->toBe($ventaBuscada->id);
});

test('el detalle colapsable de un Gasto trae la cuenta origen y sus saldos antes/después', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $gasto = MovimientoFinanciero::factory()->gasto()->create([
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'saldo_anterior_origen' => 1000,
        'saldo_posterior_origen' => 920,
        'moneda_origen' => 'USD',
        'descripcion' => 'Compra de insumos',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $gasto->id);

    expect($fila['detalle_venta'])->toBeNull();
    expect($fila['detalle_movimiento'])->not->toBeNull();
    expect($fila['detalle_movimiento']['origen']['tipo'])->toBe('cuenta');
    expect($fila['detalle_movimiento']['origen']['nombre'])->toBe($cuenta->nombre_cuenta);
    expect($fila['detalle_movimiento']['origen']['saldo_anterior'])->toEqual(1000.0);
    expect($fila['detalle_movimiento']['origen']['saldo_posterior'])->toEqual(920.0);
    expect($fila['detalle_movimiento']['destino'])->toBeNull();
});

test('el detalle colapsable de un Ingreso trae la cuenta destino y sus saldos antes/después', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $ingreso = MovimientoFinanciero::factory()->ingreso()->create([
        'cuenta_destino_id' => $cuenta->id,
        'monto' => 150,
        'moneda' => 'USD',
        'saldo_anterior_destino' => 500,
        'saldo_posterior_destino' => 650,
        'moneda_destino' => 'USD',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $ingreso->id);

    expect($fila['detalle_movimiento']['destino']['tipo'])->toBe('cuenta');
    expect($fila['detalle_movimiento']['destino']['nombre'])->toBe($cuenta->nombre_cuenta);
    expect($fila['detalle_movimiento']['destino']['saldo_anterior'])->toEqual(500.0);
    expect($fila['detalle_movimiento']['destino']['saldo_posterior'])->toEqual(650.0);
    expect($fila['detalle_movimiento']['origen'])->toBeNull();
});

test('el detalle colapsable de una Transferencia trae origen y destino a la vez, sin tasa cuando la moneda no cambia', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaOrigen = crearCuentaEnMoneda(crearMonedaUsd());
    $cuentaDestino = crearCuentaEnMoneda(crearMonedaUsd());

    $transferencia = MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $cuentaOrigen->id,
        'cuenta_destino_id' => $cuentaDestino->id,
        'monto' => 100,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 400,
        'moneda_origen' => 'USD',
        'saldo_anterior_destino' => 200,
        'saldo_posterior_destino' => 300,
        'moneda_destino' => 'USD',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $transferencia->id);

    expect($fila['detalle_movimiento']['origen']['nombre'])->toBe($cuentaOrigen->nombre_cuenta);
    expect($fila['detalle_movimiento']['origen']['saldo_posterior'])->toEqual(400.0);
    expect($fila['detalle_movimiento']['destino']['nombre'])->toBe($cuentaDestino->nombre_cuenta);
    expect($fila['detalle_movimiento']['destino']['saldo_posterior'])->toEqual(300.0);
    expect($fila['detalle_movimiento']['info_general']['tasa_cambio_aplicada'])->toBeNull();
    expect($fila['detalle_movimiento']['info_general']['monto_destino'])->toBeNull();
});

test('un vendedor solo ve sus propias operaciones, incluso si intenta pedir user_id de otro por query string', function () {
    $vendedorA = User::factory()->vendedor()->create();
    $vendedorB = User::factory()->vendedor()->create();
    $this->actingAs($vendedorA);

    crearTiposMovimientoFinanciero();

    $cuentaUsd = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorA->id]);

    Venta::factory()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->transferencia()->create([
        'user_id' => $vendedorB->id,
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);

    // Intenta forzar ver las operaciones de vendedorB por query string — el backend debe
    // ignorarlo y quedarse con el propio id del usuario autenticado.
    $response = $this->get(route('reportes.rastreo_operaciones', ['user_id' => $vendedorB->id]), ['X-Inertia' => 'true']);
    $response->assertOk();

    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(2);
    expect($operaciones->pluck('user_id')->unique()->all())->toBe([$vendedorA->id]);
    expect($response->json('props.usuarios'))->toBe([]);
});

test('un admin sigue viendo las operaciones de todos los usuarios sin restricción', function () {
    $admin = User::factory()->admin()->create();
    $vendedorA = User::factory()->vendedor()->create();
    $vendedorB = User::factory()->vendedor()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    Venta::factory()->create(['user_id' => $vendedorA->id]);
    Venta::factory()->create(['user_id' => $vendedorB->id]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(2);
    expect($operaciones->pluck('user_id')->unique()->sort()->values()->all())
        ->toBe(collect([$vendedorA->id, $vendedorB->id])->sort()->values()->all());
    expect($response->json('props.usuarios'))->not->toBeEmpty();
});

test('el resumen financiero de una Venta oculta ganancia/margen a roles sin puedeVerCosto, pero muestra montos de transacción', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    crearTiposMovimientoFinanciero();

    Venta::factory()->create([
        'user_id' => $vendedor->id,
        'total' => 500,
        'total_ganancia' => 120,
        'total_comision' => 30,
        'ganancia_perdida_cambiaria' => 5,
        'ganancia_real_total' => 125,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $resumen = collect($response->json('props.operaciones.data'))->first()['detalle_venta']['resumen_financiero'];

    // Margen/ganancia: oculto para un rol sin puedeVerCosto.
    expect($resumen['ganancia_operacional'])->toBeNull();
    expect($resumen['ganancia_agencia'])->toBeNull();
    expect($resumen['ganancia_perdida_cambiaria'])->toBeNull();
    expect($resumen['ganancia_real_total'])->toBeNull();
    // Montos de la transacción en sí (no son costo/margen interno): siguen visibles.
    expect($resumen['total_venta'])->toEqual(500.0);
    expect($resumen['comision_pv_usd'])->toEqual(30.0);
});

test('el resumen financiero de una Venta muestra ganancia/margen completo a admin/moderador', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    Venta::factory()->create([
        'total' => 500,
        'total_ganancia' => 120,
        'ganancia_perdida_cambiaria' => 5,
        'ganancia_real_total' => 125,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $resumen = collect($response->json('props.operaciones.data'))->first()['detalle_venta']['resumen_financiero'];

    expect($resumen['ganancia_operacional'])->toEqual(120.0);
    expect($resumen['ganancia_perdida_cambiaria'])->toEqual(5.0);
    expect($resumen['ganancia_real_total'])->toEqual(125.0);
});

test('el detalle colapsable de una Transferencia muestra la tasa de cambio cuando origen y destino usan monedas distintas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaOrigen = crearCuentaEnMoneda(crearMonedaUsd());
    $cuentaDestino = crearCuentaEnMoneda(crearMoneda('CUP', 380));

    $transferencia = MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $cuentaOrigen->id,
        'cuenta_destino_id' => $cuentaDestino->id,
        'monto' => 100,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 380,
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 400,
        'moneda_origen' => 'USD',
        'saldo_anterior_destino' => 1000,
        'saldo_posterior_destino' => 39000,
        'moneda_destino' => 'CUP',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $transferencia->id);

    expect($fila['detalle_movimiento']['info_general']['tasa_cambio_aplicada'])->toEqual(380.0);
    // 39000 CUP - 1000 CUP = 38000 CUP realmente acreditados en el destino — no los
    // "100" del monto origen (esos están en USD, el otro lado de la conversión).
    expect($fila['detalle_movimiento']['info_general']['monto_destino'])->toEqual(38000.0);
});
