<?php

use App\Models\AjusteSaldoCuenta;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\Cuenta;
use App\Models\DestinatarioVenta;
use App\Models\MovimientoFinanciero;
use App\Models\PagoVenta;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Models\TurnoVendedor;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;

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

test('detalle_venta.info_general.atendido_por muestra el nombre del turno activo al crear la venta, no el nombre de la cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $vendedor = User::factory()->vendedor()->create(['name' => 'Cuenta POS Sucursal 1']);
    $turno = TurnoVendedor::factory()->for($vendedor)->create(['nombre_vendedor' => 'María López']);

    $venta = Venta::factory()->create([
        'user_id' => $vendedor->id,
        'turno_vendedor_id' => $turno->id,
        'total' => 50,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);

    expect($fila['usuario'])->toBe('Cuenta POS Sucursal 1');
    expect($fila['detalle_venta']['info_general']['atendido_por'])->toBe('María López');
});

test('detalle_venta.info_general.atendido_por cae al nombre de la cuenta cuando la venta no tiene turno asociado (admin)', function () {
    $admin = User::factory()->admin()->create(['name' => 'Angel Sanchez']);
    $this->actingAs($admin);

    $venta = Venta::factory()->create(['user_id' => $admin->id, 'turno_vendedor_id' => null, 'total' => 50]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);

    expect($fila['detalle_venta']['info_general']['atendido_por'])->toBe('Angel Sanchez');
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

test('el buscador encuentra una Venta por el nombre de quien atendió (turno), no solo por el destinatario', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $vendedor = User::factory()->vendedor()->create();
    $turno = TurnoVendedor::factory()->for($vendedor)->create(['nombre_vendedor' => 'Yaneisy Fonseca']);

    $ventaBuscada = Venta::factory()->create(['user_id' => $vendedor->id, 'turno_vendedor_id' => $turno->id]);
    Venta::factory()->create();

    $response = $this->get(route('reportes.rastreo_operaciones', ['buscar' => 'Yaneisy']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(1);
    expect($operaciones->first()['id'])->toBe($ventaBuscada->id);
});

test('el buscador encuentra un Gasto por el nombre de quien atendió (turno)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $vendedor = User::factory()->vendedor()->create();
    $turno = TurnoVendedor::factory()->for($vendedor)->create(['nombre_vendedor' => 'Osmani Prieto']);

    $gastoBuscado = MovimientoFinanciero::factory()->gasto()->create([
        'user_id' => $vendedor->id,
        'turno_vendedor_id' => $turno->id,
    ]);
    MovimientoFinanciero::factory()->gasto()->create();

    $response = $this->get(route('reportes.rastreo_operaciones', ['buscar' => 'Osmani']), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones)->toHaveCount(1);
    expect($operaciones->first()['id'])->toBe($gastoBuscado->id);
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

test('detalle_movimiento.info_general.atendido_por muestra el nombre del turno activo al crear el movimiento', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $vendedor = User::factory()->vendedor()->create();
    $turno = TurnoVendedor::factory()->for($vendedor)->create(['nombre_vendedor' => 'Pedro Ruiz']);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $gasto = MovimientoFinanciero::factory()->gasto()->create([
        'user_id' => $vendedor->id,
        'turno_vendedor_id' => $turno->id,
        'cuenta_origen_id' => $cuenta->id,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $gasto->id);

    expect($fila['detalle_movimiento']['info_general']['atendido_por'])->toBe('Pedro Ruiz');
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

test('el detalle de productos de una Venta incluye marca, modelo, capacidad, color y código', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $producto = Producto::factory()->create([
        'nombre_producto' => 'Refrigerador Doble Puerta',
        'marca_producto' => 'Samsung',
        'modelo_producto' => 'RS-500',
        'capacidad_producto' => '500L',
        'color_producto' => 'Acero Inoxidable',
        'codigo_producto' => '7501234567890',
    ]);

    $venta = Venta::factory()->create();
    VentaDetalle::factory()->create([
        'venta_id' => $venta->id,
        'producto_id' => $producto->id,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);
    $detalleProducto = $fila['detalle_venta']['productos'][0];

    expect($detalleProducto['producto'])->toBe('Refrigerador Doble Puerta');
    expect($detalleProducto['marca'])->toBe('Samsung');
    expect($detalleProducto['modelo'])->toBe('RS-500');
    expect($detalleProducto['capacidad'])->toBe('500L');
    expect($detalleProducto['color'])->toBe('Acero Inoxidable');
    expect($detalleProducto['codigo'])->toBe('7501234567890');
});

test('el detalle colapsable de una Venta trae saldo antes/después de cada pago, comisión, gestor y mensajero', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $monedaUsd = crearMonedaUsd();
    $cuentaPago = crearCuentaEnMoneda($monedaUsd);
    $cuentaComision = crearCuentaEnMoneda(crearMoneda('CUP', 380));
    $cuentaGestor = crearCuentaEnMoneda(crearMoneda('CUP', 380));
    $cuentaMensajero = crearCuentaEnMoneda(crearMoneda('CUP', 380));

    $venta = Venta::factory()->create([
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_saldo_anterior' => 5000,
        'comision_saldo_posterior' => 4000,
        'gestor_cuenta_id' => $cuentaGestor->id,
        'gestor_saldo_anterior' => 3000,
        'gestor_saldo_posterior' => 2000,
        'mensajero_cuenta_id' => $cuentaMensajero->id,
        'mensajero_saldo_anterior' => 1800,
        'mensajero_saldo_posterior' => 0,
    ]);
    PagoVenta::create([
        'venta_id' => $venta->id,
        'tipo_pago' => 'efectivo',
        'moneda_id' => $monedaUsd->id,
        'cuenta_id' => $cuentaPago->id,
        'monto' => 50,
        'tasa_cambio_aplicada' => 1,
        'monto_equivalente' => 50,
        'saldo_anterior' => 100,
        'saldo_posterior' => 150,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);
    $movimientos = collect($fila['detalle_venta']['movimientos_saldo']);

    expect($movimientos)->toHaveCount(4);

    $pago = $movimientos->firstWhere('etiqueta', 'Pago 1');
    expect($pago['tipo'])->toBe('cuenta');
    expect($pago['nombre'])->toBe($cuentaPago->nombre_cuenta);
    expect($pago['saldo_anterior'])->toEqual(100.0);
    expect($pago['saldo_posterior'])->toEqual(150.0);

    $comision = $movimientos->firstWhere('etiqueta', 'Comisión PV');
    expect($comision['nombre'])->toBe($cuentaComision->nombre_cuenta);
    expect($comision['saldo_anterior'])->toEqual(5000.0);
    expect($comision['saldo_posterior'])->toEqual(4000.0);

    $gestor = $movimientos->firstWhere('etiqueta', 'Gestor');
    expect($gestor['nombre'])->toBe($cuentaGestor->nombre_cuenta);
    expect($gestor['saldo_anterior'])->toEqual(3000.0);
    expect($gestor['saldo_posterior'])->toEqual(2000.0);

    $mensajero = $movimientos->firstWhere('etiqueta', 'Mensajero');
    expect($mensajero['nombre'])->toBe($cuentaMensajero->nombre_cuenta);
    expect($mensajero['saldo_anterior'])->toEqual(1800.0);
    expect($mensajero['saldo_posterior'])->toEqual(0.0);
});

test('una Venta sin snapshot de saldo no manda movimientos_saldo, y detalle_venta.anulacion es null si no está cancelada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $venta = Venta::factory()->create();

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);

    expect($fila['detalle_venta']['movimientos_saldo'])->toBe([]);
    expect($fila['detalle_venta']['anulacion'])->toBeNull();
});

test('el detalle colapsable de una Venta anulada incluye motivo y detalle de anulación', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $venta = Venta::factory()->create([
        'estado' => 'cancelada',
        'motivo_anulacion' => 'error_precio',
        'detalle_anulacion' => 'Se cargó el precio equivocado, cliente pidió reembolso.',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $venta->id);

    expect($fila['detalle_venta']['anulacion'])->not->toBeNull();
    expect($fila['detalle_venta']['anulacion']['motivo'])->toBe('error_precio');
    expect($fila['detalle_venta']['anulacion']['detalle'])->toBe('Se cargó el precio equivocado, cliente pidió reembolso.');
});

test('conteoPorTipo cuenta cada tipo por separado y no se colapsa al filtrar por tipo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuentaUsd = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->count(3)->create();
    MovimientoFinanciero::factory()->gasto()->create();
    MovimientoFinanciero::factory()->ingreso()->count(2)->create();
    MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $cuentaUsd->id,
        'cuenta_destino_id' => crearCuentaEnMoneda(crearMonedaUsd())->id,
    ]);
    AjusteSaldoCuenta::create([
        'cuenta_id' => $cuentaUsd->id,
        'user_id' => $admin->id,
        'saldo_anterior' => 100,
        'saldo_nuevo' => 150,
        'motivo' => 'Corrección de prueba',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    expect($response->json('props.conteoPorTipo'))->toBe([
        'Venta' => 3,
        'Gasto' => 1,
        'Ingreso' => 2,
        'Transferencia' => 1,
        'Ajuste' => 1,
        // Admin ve la clave Compra aunque no haya ninguna — a diferencia de vendedor, que
        // no la ve en absoluto (ver test de acceso de Compra más abajo).
        'Compra' => 0,
    ]);

    // Filtrar por tipo=Venta no debe "colapsar" el conteo de los otros tipos a cero —
    // los widgets siguen siendo un resumen de todo lo que hay bajo fecha/usuario/buscar.
    $responseFiltrada = $this->get(route('reportes.rastreo_operaciones', ['tipo' => 'Venta']), ['X-Inertia' => 'true']);
    expect($responseFiltrada->json('props.conteoPorTipo'))->toBe([
        'Venta' => 3,
        'Gasto' => 1,
        'Ingreso' => 2,
        'Transferencia' => 1,
        'Ajuste' => 1,
        'Compra' => 0,
    ]);
    expect(collect($responseFiltrada->json('props.operaciones.data')))->toHaveCount(3);
});

test('el detalle colapsable de un Ajuste trae la cuenta ajustada, su saldo antes/después y el motivo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $ajuste = AjusteSaldoCuenta::create([
        'cuenta_id' => $cuenta->id,
        'user_id' => $admin->id,
        'saldo_anterior' => 300,
        'saldo_nuevo' => 450,
        'motivo' => 'Corrección por error de digitación',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $ajuste->id);

    expect($fila)->not->toBeNull();
    expect($fila['tipo'])->toBe('Ajuste');
    expect($fila['referencia'])->toBe("Ajuste #{$ajuste->id}");
    expect($fila['descripcion'])->toBe('Corrección por error de digitación');
    expect((float) $fila['monto'])->toBe(150.0);
    expect($fila['detalle_venta'])->toBeNull();
    expect($fila['detalle_compra'])->toBeNull();
    expect($fila['detalle_movimiento'])->not->toBeNull();
    expect($fila['detalle_movimiento']['origen'])->toBeNull();
    expect($fila['detalle_movimiento']['destino']['tipo'])->toBe('cuenta');
    expect($fila['detalle_movimiento']['destino']['nombre'])->toBe($cuenta->nombre_cuenta);
    expect((float) $fila['detalle_movimiento']['destino']['saldo_anterior'])->toBe(300.0);
    expect((float) $fila['detalle_movimiento']['destino']['saldo_posterior'])->toBe(450.0);
});

test('un vendedor no ve los Ajustes hechos por admin/moderador (userIdFiltro lo deja fuera)', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $ajuste = AjusteSaldoCuenta::create([
        'cuenta_id' => $cuenta->id,
        'user_id' => $admin->id,
        'saldo_anterior' => 100,
        'saldo_nuevo' => 120,
        'motivo' => 'Ajuste de admin',
    ]);

    $this->actingAs($vendedor);
    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);

    expect(collect($response->json('props.operaciones.data'))->contains('id', $ajuste->id))->toBeFalse();
    expect($response->json('props.conteoPorTipo.Ajuste'))->toBe(0);
});

test('el reporte incluye Compra en el listado combinado, con proveedor, pagos y productos en el detalle', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'Distribuidora El Sol']);
    $producto = Producto::factory()->create(['nombre_producto' => 'Panel Solar 620W']);

    $compra = Compra::factory()->create([
        'user_id' => $admin->id,
        'proveedor_id' => $proveedor->id,
        'cliente_id' => null,
        'cuenta_id' => null,
        'tipo_compra' => 'deuda_proveedor',
        'total_compra' => 1500,
        'fecha_compra' => now()->toDateString(),
    ]);
    $compra->productos()->attach($producto->id, ['cantidad' => 5, 'precio' => 300]);
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => null,
        'cliente_id' => null,
        'monto' => 1500,
        'tipo_pago' => 'deuda_proveedor',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $response->assertOk();

    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $compra->id);

    expect($fila)->not->toBeNull();
    expect($fila['tipo'])->toBe('Compra');
    expect($fila['monto'])->toEqual(1500.0);
    expect($fila['referencia'])->toBe("Compra #{$compra->id}");
    expect($fila['usuario'])->toBe($admin->name);
    expect($fila['detalle_venta'])->toBeNull();
    expect($fila['detalle_movimiento'])->toBeNull();
    expect($fila['detalle_compra'])->not->toBeNull();
    expect($fila['detalle_compra']['proveedor'])->toBe('Distribuidora El Sol');
    expect($fila['detalle_compra']['info_general']['tipo_compra'])->toBe('deuda_proveedor');
    expect($fila['detalle_compra']['productos'][0]['producto'])->toBe('Panel Solar 620W');
    expect($fila['detalle_compra']['productos'][0]['cantidad'])->toBe(5);
    expect($fila['detalle_compra']['productos'][0]['subtotal'])->toEqual(1500.0);
    expect($fila['detalle_compra']['pagos'][0]['tipo_pago'])->toBe('deuda_proveedor');
});

test('una Compra pago_cash con varios métodos de pago muestra cada uno con su cuenta/cliente de origen', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $cliente = Cliente::factory()->create(['nombre_cliente' => 'Cliente Financia Compra']);

    $compra = Compra::factory()->create([
        'user_id' => $admin->id,
        'proveedor_id' => Proveedor::factory()->create()->id,
        'cliente_id' => null,
        'cuenta_id' => $cuenta->id,
        'tipo_compra' => 'pago_cash',
        'total_compra' => 100,
    ]);
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'cliente_id' => null,
        'monto' => 60,
        'tipo_pago' => 'cuenta',
    ]);
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => null,
        'cliente_id' => $cliente->id,
        'monto' => 40,
        'tipo_pago' => 'cliente',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $compra->id);

    $pagos = collect($fila['detalle_compra']['pagos']);
    expect($pagos)->toHaveCount(2);
    expect($pagos->firstWhere('tipo_pago', 'cuenta')['origen'])->toBe($cuenta->nombre_cuenta);
    expect($pagos->firstWhere('tipo_pago', 'cuenta')['monto'])->toEqual(60.0);
    expect($pagos->firstWhere('tipo_pago', 'cliente')['origen'])->toBe('Cliente Financia Compra');
    expect($pagos->firstWhere('tipo_pago', 'cliente')['monto'])->toEqual(40.0);
});

test('el detalle colapsable de una Compra trae saldo antes/después del receptor y de cada pago', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'Proveedor Con Saldo']);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $compra = Compra::factory()->create([
        'user_id' => $admin->id,
        'proveedor_id' => $proveedor->id,
        'cliente_id' => null,
        'cuenta_id' => $cuenta->id,
        'tipo_compra' => 'pago_cash',
        'total_compra' => 100,
        'receptor_saldo_anterior' => 500,
        'receptor_saldo_posterior' => 400,
    ]);
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'cliente_id' => null,
        'monto' => 100,
        'tipo_pago' => 'cuenta',
        'saldo_anterior' => 300,
        'saldo_posterior' => 200,
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $fila = collect($response->json('props.operaciones.data'))->firstWhere('id', $compra->id);
    $movimientos = collect($fila['detalle_compra']['movimientos_saldo']);

    expect($movimientos)->toHaveCount(2);

    $receptor = $movimientos->firstWhere('etiqueta', 'Receptor');
    expect($receptor['tipo'])->toBe('proveedor');
    expect($receptor['nombre'])->toBe('Proveedor Con Saldo');
    expect($receptor['saldo_anterior'])->toEqual(500.0);
    expect($receptor['saldo_posterior'])->toEqual(400.0);

    $pago = $movimientos->firstWhere('etiqueta', 'Pago 1');
    expect($pago['nombre'])->toBe($cuenta->nombre_cuenta);
    expect($pago['saldo_anterior'])->toEqual(300.0);
    expect($pago['saldo_posterior'])->toEqual(200.0);
});

test('Compra es visible solo para admin/moderador — vendedor no la ve ni puede forzarla con ?tipo=Compra', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    crearTiposMovimientoFinanciero();

    Compra::factory()->create([
        'user_id' => $vendedor->id,
        'tipo_compra' => 'deuda_proveedor',
    ]);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $response->assertOk();

    expect(collect($response->json('props.operaciones.data')))->toHaveCount(0);
    expect($response->json('props.conteoPorTipo'))->not->toHaveKey('Compra');

    // Intento de bypass por URL directa — debe seguir sin devolver nada, no un 403 con fuga
    // de conteo ni datos parciales.
    $responseForzada = $this->get(route('reportes.rastreo_operaciones', ['tipo' => 'Compra']), ['X-Inertia' => 'true']);
    $responseForzada->assertOk();
    expect(collect($responseForzada->json('props.operaciones.data')))->toHaveCount(0);
});

test('un moderador sí ve las Compras en el reporte, igual que admin', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    crearTiposMovimientoFinanciero();

    $compra = Compra::factory()->create(['tipo_compra' => 'deuda_proveedor']);

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones->pluck('id'))->toContain($compra->id);
    expect($response->json('props.conteoPorTipo.Compra'))->toBe(1);
});

test('el buscador encuentra por número de referencia (id) sin importar el tipo, aunque no se recuerde cuál era', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    // En una BD de test recién migrada, el primer registro de cada tabla arranca en id=1 —
    // aprovechamos eso para que Venta #1 y Gasto #1 compartan el mismo número, el caso real
    // que motivó el pedido del cliente ("ni yo mismo sé qué tipo es esa operación").
    $venta = Venta::factory()->create();
    $gasto = MovimientoFinanciero::factory()->gasto()->create();
    expect($venta->id)->toBe($gasto->id);

    $response = $this->get(route('reportes.rastreo_operaciones', ['buscar' => (string) $venta->id]), ['X-Inertia' => 'true']);
    $tipos = collect($response->json('props.operaciones.data'))->pluck('tipo')->sort()->values()->all();

    expect($tipos)->toBe(['Gasto', 'Venta']);
});

test('el filtro por cliente_ids encuentra una Venta por su cliente directo y por el cliente de un pago', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $clienteDirecto = Cliente::factory()->create();
    $ventaDirecta = Venta::factory()->create(['cliente_id' => $clienteDirecto->id]);

    $clientePago = Cliente::factory()->create();
    $ventaConPago = Venta::factory()->create(['cliente_id' => null]);
    PagoVenta::factory()->create(['venta_id' => $ventaConPago->id, 'cliente_id' => $clientePago->id, 'cuenta_id' => null]);

    $ventaSinRelacion = Venta::factory()->create(['cliente_id' => null]);

    $response = $this->get(route('reportes.rastreo_operaciones', [
        'cliente_ids' => [$clienteDirecto->id, $clientePago->id],
    ]), ['X-Inertia' => 'true']);
    $ids = collect($response->json('props.operaciones.data'))->pluck('id');

    expect($ids)->toContain($ventaDirecta->id);
    expect($ids)->toContain($ventaConPago->id);
    expect($ids)->not->toContain($ventaSinRelacion->id);
});

test('el filtro por proveedor_ids nunca incluye Venta (no tiene proveedor) y sí incluye Compra', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create();
    $compra = Compra::factory()->create(['proveedor_id' => $proveedor->id, 'tipo_compra' => 'deuda_proveedor']);
    Venta::factory()->create();

    $response = $this->get(route('reportes.rastreo_operaciones', ['proveedor_ids' => [$proveedor->id]]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones->pluck('id'))->toContain($compra->id);
    expect($operaciones->pluck('tipo')->unique()->all())->not->toContain('Venta');
});

test('el filtro por cuenta_ids encuentra una Venta pagada con esa cuenta (vía pago_ventas)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $venta = Venta::factory()->create();
    PagoVenta::factory()->create(['venta_id' => $venta->id, 'cuenta_id' => $cuenta->id, 'cliente_id' => null]);

    Venta::factory()->create();

    $response = $this->get(route('reportes.rastreo_operaciones', ['cuenta_ids' => [$cuenta->id]]), ['X-Inertia' => 'true']);
    $ids = collect($response->json('props.operaciones.data'))->pluck('id');

    expect($ids)->toContain($venta->id);
});

test('las listas de clientes, proveedores y cuentas para los combobox de filtro se mandan a todos los roles', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    crearTiposMovimientoFinanciero();

    Cliente::factory()->create();
    Proveedor::factory()->create();
    crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('reportes.rastreo_operaciones'), ['X-Inertia' => 'true']);

    expect($response->json('props.clientes'))->not->toBeEmpty();
    expect($response->json('props.proveedores'))->not->toBeEmpty();
    expect($response->json('props.cuentas'))->not->toBeEmpty();
});

test('cuenta_direccion=envia excluye Venta (su cuenta siempre "recibe") y encuentra un Gasto que pagó con esa cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $venta = Venta::factory()->create();
    PagoVenta::factory()->create(['venta_id' => $venta->id, 'cuenta_id' => $cuenta->id, 'cliente_id' => null]);

    $gasto = MovimientoFinanciero::factory()->gasto()->create(['cuenta_origen_id' => $cuenta->id]);

    $response = $this->get(route('reportes.rastreo_operaciones', [
        'cuenta_ids' => [$cuenta->id],
        'cuenta_direccion' => 'envia',
    ]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    // Venta y Gasto son secuencias de id independientes — pueden coincidir en número, así
    // que hay que comparar el par (id, tipo), no el id solo.
    expect($operaciones->contains(fn ($op) => $op['id'] === $gasto->id && $op['tipo'] === 'Gasto'))->toBeTrue();
    expect($operaciones->contains(fn ($op) => $op['id'] === $venta->id && $op['tipo'] === 'Venta'))->toBeFalse();
});

test('cuenta_direccion=recibe excluye una Compra pago_cash (su cuenta siempre "envía") y encuentra la Venta que cobró con esa cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $venta = Venta::factory()->create();
    PagoVenta::factory()->create(['venta_id' => $venta->id, 'cuenta_id' => $cuenta->id, 'cliente_id' => null]);

    $compra = Compra::factory()->create(['tipo_compra' => 'pago_cash']);
    CompraPago::create(['compra_id' => $compra->id, 'cuenta_id' => $cuenta->id, 'cliente_id' => null, 'monto' => 10, 'tipo_pago' => 'cuenta']);

    $response = $this->get(route('reportes.rastreo_operaciones', [
        'cuenta_ids' => [$cuenta->id],
        'cuenta_direccion' => 'recibe',
    ]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    // Venta y Compra son secuencias de id independientes — pueden coincidir en número, así
    // que hay que comparar el par (id, tipo), no el id solo.
    expect($operaciones->contains(fn ($op) => $op['id'] === $venta->id && $op['tipo'] === 'Venta'))->toBeTrue();
    expect($operaciones->contains(fn ($op) => $op['id'] === $compra->id && $op['tipo'] === 'Compra'))->toBeFalse();
});

test('cliente_direccion=envia solo encuentra una Compra financiada por ese cliente, nunca una Venta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cliente = Cliente::factory()->create();

    $venta = Venta::factory()->create(['cliente_id' => $cliente->id]);

    $compra = Compra::factory()->create(['tipo_compra' => 'pago_cash']);
    CompraPago::create(['compra_id' => $compra->id, 'cuenta_id' => null, 'cliente_id' => $cliente->id, 'monto' => 10, 'tipo_pago' => 'cliente']);

    $response = $this->get(route('reportes.rastreo_operaciones', [
        'cliente_ids' => [$cliente->id],
        'cliente_direccion' => 'envia',
    ]), ['X-Inertia' => 'true']);
    $operaciones = collect($response->json('props.operaciones.data'));

    expect($operaciones->contains(fn ($op) => $op['id'] === $compra->id && $op['tipo'] === 'Compra'))->toBeTrue();
    expect($operaciones->pluck('tipo'))->not->toContain('Venta');
});

test('proveedor_direccion=envia siempre da cero resultados, sin importar el tipo (un proveedor nunca "envía")', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create();
    Compra::factory()->create(['proveedor_id' => $proveedor->id, 'tipo_compra' => 'deuda_proveedor']);
    MovimientoFinanciero::factory()->gasto()->create(['proveedor_destino_id' => $proveedor->id]);

    $response = $this->get(route('reportes.rastreo_operaciones', [
        'proveedor_ids' => [$proveedor->id],
        'proveedor_direccion' => 'envia',
    ]), ['X-Inertia' => 'true']);

    expect(collect($response->json('props.operaciones.data')))->toHaveCount(0);
});
