<?php

use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\MovimientoFinanciero;
use App\Models\PagoVenta;
use App\Models\User;
use App\Models\Venta;

// crearMoneda(), crearCuentaEnMoneda() y crearTiposMovimientoFinanciero()
// están declaradas globalmente en tests/Pest.php (compartidas entre archivos).

// ==========================================================================
// ACCESO — Fase 3 (vendedor solo ve sus propias cuentas)
// ==========================================================================

test('un admin puede ver el detalle de cualquier cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertOk();
});

test('un moderador puede ver el detalle de cualquier cuenta', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertOk();
});

test('un vendedor puede ver el detalle de una cuenta que tiene asignada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertOk();
});

test('un vendedor NO puede ver el detalle de una cuenta que no tiene asignada (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertStatus(403);
});

// ==========================================================================
// HISTORIAL — Fase 2 (unifica movimientos_financieros + pagos/comisiones de
// venta + pagos de compra, ninguno de los cuales vive en una sola tabla)
// ==========================================================================

test('el historial incluye un gasto (movimiento_financiero) con signo negativo', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);

    MovimientoFinanciero::create([
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

    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);

    $response->assertOk();
    $item = collect($response->json('props.historialTransacciones.data'))->firstWhere('fuente', 'movimiento_financiero');

    expect($item)->not->toBeNull();
    expect((float) $item['monto'])->toBe(-80.0);
    expect($item['moneda'])->toBe('USD');
});

test('el historial incluye un pago de venta completada, pero no de una venta pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $ventaCompletada = Venta::factory()->completada()->create();
    PagoVenta::factory()->create([
        'venta_id' => $ventaCompletada->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 150,
    ]);

    $ventaPendiente = Venta::factory()->create(); // estado 'pendiente' por defecto
    PagoVenta::factory()->create([
        'venta_id' => $ventaPendiente->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 999,
    ]);

    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);

    $montos = collect($response->json('props.historialVentas.data'))
        ->where('fuente', 'venta_pago')
        ->pluck('monto')
        ->map(fn ($m) => (float) $m);

    expect($montos)->toContain(150.0);
    expect($montos)->not->toContain(999.0);
});

test('el historial incluye comisión de vendedor, comisión de gestor y mensajería como salidas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    Venta::factory()->completada()->create([
        'comision_cuenta_id' => $cuenta->id,
        'es_venta_gestor' => false,
        'total_comision' => 20,
        'comision_tasa' => 25,
    ]);

    Venta::factory()->completada()->create([
        'gestor_cuenta_id' => $cuenta->id,
        'es_venta_gestor' => true,
        'gestor_monto' => 300,
    ]);

    Venta::factory()->completada()->create([
        'mensajero_cuenta_id' => $cuenta->id,
        'mensajero_tipo' => 'externo',
        'mensajero_monto' => 100,
        'mensajero_monto_original' => 900,
        'mensajero_monto_final_cup' => 950,
    ]);

    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historial = collect($response->json('props.historialVentas.data'));

    $comisionPV = $historial->firstWhere('fuente', 'venta_comision');
    $comisionGestor = $historial->firstWhere('fuente', 'venta_gestor');
    $mensajeria = $historial->firstWhere('fuente', 'venta_mensajero');

    expect((float) $comisionPV['monto'])->toBe(-500.0); // 20 * 25
    expect((float) $comisionGestor['monto'])->toBe(-300.0);
    expect((float) $mensajeria['monto'])->toBe(-950.0); // usa el CUP final, no el original
});

test('el historial incluye pagos de compra para admin, pero se ocultan para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $compra = Compra::factory()->create();
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 75,
        'tipo_pago' => 'cuenta',
    ]);

    $this->actingAs($admin);
    $responseAdmin = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialCompraAdmin = collect($responseAdmin->json('props.historialCompras.data'));

    $this->actingAs($vendedor);
    $responseVendedor = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialCompraVendedor = collect($responseVendedor->json('props.historialCompras.data'));

    expect($historialCompraAdmin->contains('referencia_id', $compra->id))->toBeTrue();
    expect($historialCompraVendedor)->toBeEmpty();
});

// ==========================================================================
// FILTROS de la Card "Ventas" — regresión de un bug real de orden de bindings
// ==========================================================================
// `obtenerHistorialVentas()` arma un UNION ALL y lo embebe como subquery cruda
// (`DB::raw()`) dentro de una query externa para poder paginar/filtrar sobre
// el resultado ya unido. Agregar un ->where() sobre esa query externa DESPUÉS
// de mergeBindings() colocaba el binding del filtro en la posición equivocada
// (el bucket 'where' se compila antes que 'union', aunque en el texto SQL el
// placeholder del filtro va al final) — el filtro por tipo devolvía filas de
// un tipo distinto al seleccionado. Fix: addBinding(getBindings(), 'where').

test('el filtro por tipo en Ventas devuelve solo filas de ese tipo (no de otro)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $ventaConPago = Venta::factory()->completada()->create();
    PagoVenta::factory()->create(['venta_id' => $ventaConPago->id, 'cuenta_id' => $cuenta->id, 'monto' => 150]);

    Venta::factory()->completada()->create([
        'comision_cuenta_id' => $cuenta->id,
        'es_venta_gestor' => false,
        'total_comision' => 20,
        'comision_tasa' => 25,
    ]);

    $response = $this->get(route('cuentas.show', ['cuenta' => $cuenta->id, 'tipo_ventas' => 'venta_comision']), ['X-Inertia' => 'true']);
    $historial = collect($response->json('props.historialVentas.data'));

    expect($historial)->not->toBeEmpty();
    expect($historial->pluck('fuente')->unique()->all())->toBe(['venta_comision']);
});

test('la búsqueda y el rango de fechas en Ventas filtran correctamente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $clienteBuscado = \App\Models\Cliente::factory()->create(['nombre_cliente' => 'YALIANNIS BARROSO']);
    $clienteOtro = \App\Models\Cliente::factory()->create(['nombre_cliente' => 'OTRO CLIENTE']);

    $ventaBuscada = Venta::factory()->completada()->create(['cliente_id' => $clienteBuscado->id, 'created_at' => '2026-07-30']);
    PagoVenta::factory()->create(['venta_id' => $ventaBuscada->id, 'cuenta_id' => $cuenta->id, 'monto' => 100]);
    // update() de Eloquent sobreescribe updated_at con now() aunque se pase explícito
    // (HasTimestamps::updateTimestamps) — hay que usar el query builder para que se fije.
    Venta::where('id', $ventaBuscada->id)->update(['updated_at' => '2026-07-30 12:00:00']);

    $ventaOtra = Venta::factory()->completada()->create(['cliente_id' => $clienteOtro->id]);
    PagoVenta::factory()->create(['venta_id' => $ventaOtra->id, 'cuenta_id' => $cuenta->id, 'monto' => 200]);
    Venta::where('id', $ventaOtra->id)->update(['updated_at' => '2026-06-15 12:00:00']);

    $response = $this->get(route('cuentas.show', ['cuenta' => $cuenta->id, 'q_ventas' => 'YALIANNIS']), ['X-Inertia' => 'true']);
    $historial = collect($response->json('props.historialVentas.data'));
    expect($historial->pluck('contraparte')->all())->toBe(['YALIANNIS BARROSO']);

    $responseFecha = $this->get(route('cuentas.show', ['cuenta' => $cuenta->id, 'desde_ventas' => '2026-07-01']), ['X-Inertia' => 'true']);
    $historialFecha = collect($responseFecha->json('props.historialVentas.data'));
    expect($historialFecha->pluck('contraparte')->all())->toBe(['YALIANNIS BARROSO']);
});
