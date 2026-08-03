<?php

use App\Models\MovimientoFinanciero;
use App\Models\User;
use App\Models\Venta;

// crearTiposMovimientoFinanciero() está declarada globalmente en tests/Pest.php.

test('el reporte combina Venta, Gasto e Ingreso en un solo listado, ordenado por fecha real', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $ventaVieja = Venta::factory()->create([
        'total' => 100,
        'created_at' => now()->subDays(3),
    ]);

    $gasto = MovimientoFinanciero::factory()->gasto()->create([
        'monto' => 50,
        'moneda' => 'CUP',
        'descripcion' => 'Pago de electricidad',
        'fecha_operacion' => now()->subDays(2),
    ]);

    $ingreso = MovimientoFinanciero::factory()->ingreso()->create([
        'monto' => 300,
        'moneda' => 'USD',
        'descripcion' => 'Ingreso a cuenta: Caja Principal',
        'fecha_operacion' => now()->subDay(),
    ]);

    $ventaReciente = Venta::factory()->create([
        'total' => 200,
        'created_at' => now(),
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $response->assertOk();

    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(4);
    // Orden esperado por fecha descendente, mezclando los 3 tipos: venta reciente,
    // ingreso (1 día atrás), gasto (2 días atrás), venta vieja (3 días atrás) —
    // no "todas las ventas primero" ni agrupado por tipo.
    expect($operaciones->pluck('tipo')->all())->toBe(['Venta', 'Ingreso', 'Gasto', 'Venta']);

    $filaIngreso = $operaciones->get(1);
    expect($filaIngreso['monto'])->toEqual(300.0);
    expect($filaIngreso['moneda'])->toBe('USD');
    expect($filaIngreso['descripcion'])->toBe('Ingreso a cuenta: Caja Principal');
    expect($filaIngreso['referencia'])->toBe("Ingreso #{$ingreso->id}");
    expect($filaIngreso['detalle_venta'])->toBeNull();

    $filaGasto = $operaciones->get(2);
    expect($filaGasto['monto'])->toEqual(50.0);
    expect($filaGasto['moneda'])->toBe('CUP');
    expect($filaGasto['referencia'])->toBe("Gasto #{$gasto->id}");
    expect($filaGasto['detalle_venta'])->toBeNull();

    $filaVentaReciente = $operaciones->get(0);
    expect($filaVentaReciente['id'])->toBe($ventaReciente->id);
    expect($filaVentaReciente['moneda'])->toBe('USD');
    expect($filaVentaReciente['detalle_venta'])->not->toBeNull();
});

test('el filtro por usuario en el reporte aplica a Venta, Gasto e Ingreso', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $vendedorA = User::factory()->vendedor()->create();
    $vendedorB = User::factory()->vendedor()->create();

    Venta::factory()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorA->id]);
    MovimientoFinanciero::factory()->ingreso()->create(['user_id' => $vendedorA->id]);

    Venta::factory()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->gasto()->create(['user_id' => $vendedorB->id]);
    MovimientoFinanciero::factory()->ingreso()->create(['user_id' => $vendedorB->id]);

    $response = $this->get(route('reportes.rastreo_operaciones', ['user_id' => $vendedorA->id]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(3);
    expect($operaciones->pluck('user_id')->unique()->all())->toBe([$vendedorA->id]);
});

test('el filtro por rango de fechas en el reporte aplica a Venta, Gasto e Ingreso', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    Venta::factory()->create(['created_at' => '2026-06-15']);
    MovimientoFinanciero::factory()->gasto()->create(['fecha_operacion' => '2026-06-15']);
    MovimientoFinanciero::factory()->ingreso()->create(['fecha_operacion' => '2026-06-15']);

    Venta::factory()->create(['created_at' => '2026-07-30']);
    MovimientoFinanciero::factory()->gasto()->create(['fecha_operacion' => '2026-07-30']);
    MovimientoFinanciero::factory()->ingreso()->create(['fecha_operacion' => '2026-07-30']);

    $response = $this->get(route('reportes.rastreo_operaciones', ['start_date' => '2026-07-01']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(3);
    expect($operaciones->pluck('tipo')->sort()->values()->all())->toBe(['Gasto', 'Ingreso', 'Venta']);
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
