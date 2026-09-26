<?php

use App\Models\Almacen;
use App\Models\CierreCaja;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Support\Facades\DB;

// crearTiposMovimientoFinanciero(), crearMonedaUsd() y crearCuentaEnMoneda()
// están declaradas globalmente en tests/Pest.php (compartidas entre archivos).

function crearVentaCompletadaConPago(User $user, Almacen $almacen, Moneda $moneda, float $total, ?Cuenta $cuenta = null, ?Cliente $cliente = null): Venta
{
    $venta = Venta::factory()->completada()->create([
        'user_id' => $user->id,
        'almacen_id' => $almacen->id,
        'moneda_id' => $moneda->id,
        'total' => $total,
    ]);

    $venta->pagos()->create([
        'tipo_pago' => 'efectivo',
        'moneda_id' => $moneda->id,
        'cuenta_id' => $cuenta?->id,
        'cliente_id' => $cliente?->id,
        'monto' => $total,
        'tasa_cambio_aplicada' => 1,
        'monto_equivalente' => $total,
    ]);

    return $venta;
}

function payloadStoreCierre(array $overrides = []): array
{
    return array_merge([
        'saldo_inicial' => 0,
        'total_gastos' => 0,
        'total_devoluciones' => 0,
        'saldo_contado' => 0,
        'observaciones' => '',
        'arqueo_detalles' => [],
        'confirmacion_transferencias' => [],
    ], $overrides);
}

// ==========================================================================
// SALDO ESPERADO — fuente de verdad calculada en el backend (obtenerDetallesCierre)
// ==========================================================================

test('el saldo esperado suma los pagos de venta que fueron a una cuenta', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);

    crearVentaCompletadaConPago($vendedor, $almacen, $monedaUsd, total: 100, cuenta: $cuenta);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre(['saldo_contado' => 100]));
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => 100,
        'diferencia' => 0,
    ]);
});

test('el saldo esperado NO incluye pagos de venta que fueron a deuda de cliente', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $cliente = Cliente::factory()->create();

    crearVentaCompletadaConPago($vendedor, $almacen, $monedaUsd, total: 100, cliente: $cliente);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => 0,
    ]);
});

test('un gasto resta del saldo esperado del turno, sin importar el total_gastos enviado por el cliente', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);

    DB::table('movimientos_financieros')->insert([
        'user_id' => $vendedor->id,
        'tipo_movimiento_id' => 1, // Gasto
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 30,
        'moneda' => 'USD',
        'descripcion' => 'Compra de insumos',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // El frontend manda total_gastos=999 (dato no confiable); el backend debe ignorarlo
    // para saldo_esperado y calcularlo solo desde el movimiento financiero real.
    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre(['total_gastos' => 999]));
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => -30,
    ]);
});

test('un ingreso extra suma al saldo esperado del turno', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);

    DB::table('movimientos_financieros')->insert([
        'user_id' => $vendedor->id,
        'tipo_movimiento_id' => 2, // Ingreso
        'cuenta_destino_id' => $cuenta->id,
        'monto' => 50,
        'moneda' => 'USD',
        'descripcion' => 'Ingreso extra',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => 50,
    ]);
});

test('una transferencia saliente hacia una cuenta externa resta del saldo esperado', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    // La cuenta origen debe estar asignada al vendedor (user_cuentas) para que
    // el controlador considere que la transferencia afecta su saldo.
    $cuentaOrigen = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuentaExterna = crearCuentaEnMoneda($monedaUsd, saldo: 0); // no asignada al vendedor

    DB::table('movimientos_financieros')->insert([
        'user_id' => $vendedor->id,
        'tipo_movimiento_id' => 3, // Transferencia
        'cuenta_origen_id' => $cuentaOrigen->id,
        'cuenta_destino_id' => $cuentaExterna->id,
        'monto' => 40,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => 1,
        'descripcion' => 'Transferencia a proveedor',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => -40,
    ]);
});

test('una comisión de gestor resta del saldo esperado y se registra en comisiones_gestor', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $cuentaGestor = crearCuentaEnMoneda($monedaUsd, saldo: 1000);

    Venta::factory()->completada()->create([
        'user_id' => $vendedor->id,
        'almacen_id' => $almacen->id,
        'moneda_id' => $monedaUsd->id,
        'total' => 100,
        'es_venta_gestor' => true,
        'gestor_cuenta_id' => $cuentaGestor->id,
        'gestor_monto' => 20,
        'tasa_aplicada_gestor' => 1,
    ]);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => -20,
        'comisiones_gestor' => 20,
    ]);
});

test('las comisiones en CUP del cierre no cuentan las que se pagaron desde una cuenta USD', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    $cuentaUsd = crearCuentaEnMoneda($monedaUsd, saldo: 500);
    $cuentaCup = crearCuentaEnMoneda($monedaCup, saldo: 5000);

    foreach ([[$cuentaCup, 365], [$cuentaUsd, 1]] as [$cuenta, $tasa]) {
        Venta::factory()->completada()->create([
            'user_id' => $vendedor->id,
            'almacen_id' => $almacen->id,
            'moneda_id' => $monedaUsd->id,
            'total' => 100,
            'es_venta_gestor' => false,
            'total_comision' => 10,
            'comision_cuenta_id' => $cuenta->id,
            'comision_tasa' => $tasa,
        ]);
    }

    $this->get(route('ventas.cierres.create'))->assertInertia(function ($page) {
        $page->where('calculos.comisiones_pv_cup', fn ($cup) => (float) $cup === 3650.0) // solo la de la cuenta CUP
            ->where('calculos.comision_pv_total', fn ($usd) => (float) $usd === 20.0);    // el total en USD cuenta las dos
    });
});

test('el mensajero se excluye del saldo esperado (pass-through) pero se reporta aparte', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);

    // Total cobrado = 100 de producto + 15 de mensajero, todo a la misma cuenta.
    $venta = Venta::factory()->completada()->create([
        'user_id' => $vendedor->id,
        'almacen_id' => $almacen->id,
        'moneda_id' => $monedaUsd->id,
        'total' => 115,
        'mensajero_monto' => 15,
        'mensajero_tipo' => 'externo',
        'mensajero_cuenta_id' => $cuenta->id,
    ]);
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo',
        'moneda_id' => $monedaUsd->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 115,
        'tasa_cambio_aplicada' => 1,
        'monto_equivalente' => 115,
    ]);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $this->assertDatabaseHas('cierre_cajas', [
        'user_id' => $vendedor->id,
        'saldo_esperado' => 100, // 115 cobrados - 15 de mensajero (pass-through)
        'mensajero_total_usd' => 15,
        'mensajero_count' => 1,
    ]);
});

// ==========================================================================
// SNAPSHOTS — cuentas y clientes al momento del cierre
// ==========================================================================

test('store() persiste un snapshot con el saldo actual de las cuentas del vendedor', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, saldo: 250, propietario: $vendedor);
    $cuentaAjena = crearCuentaEnMoneda($monedaUsd, saldo: 999); // no asignada al vendedor

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $cierre = CierreCaja::where('user_id', $vendedor->id)->first();
    $idsEnSnapshot = collect($cierre->snapshot_cuentas)->pluck('id')->all();

    expect($idsEnSnapshot)->toContain($cuenta->id);
    expect($idsEnSnapshot)->not->toContain($cuentaAjena->id);

    $saldoGuardado = collect($cierre->snapshot_cuentas)->firstWhere('id', $cuenta->id)['saldo'];
    expect((float) $saldoGuardado)->toBe(250.0);
});

test('store() persiste un snapshot con la deuda actual de los clientes', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 80]);

    $response = $this->post(route('ventas.cierres.store'), payloadStoreCierre());
    $response->assertRedirect(route('ventas.cierres'));

    $cierre = CierreCaja::where('user_id', $vendedor->id)->first();
    $deudaGuardada = collect($cierre->snapshot_clientes)->firstWhere('id', $cliente->id)['deuda'];

    expect((float) $deudaGuardada)->toBe(80.0);
});

// ==========================================================================
// APROBAR
// ==========================================================================

test('aprobar() cambia el estado a aprobado y registra al revisor', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cierre = CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'pendiente',
        'fecha_cierre' => now(),
    ]);

    $response = $this->post(route('ventas.cierres.aprobar', $cierre->id));
    $response->assertRedirect();

    $this->assertDatabaseHas('cierre_cajas', [
        'id' => $cierre->id,
        'estado' => 'aprobado',
        'revisor_id' => $admin->id,
    ]);
});

// ==========================================================================
// ACCESO POR ROL
// ==========================================================================

test('un vendedor no puede ver el cierre de otro vendedor (403)', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $cierre = CierreCaja::create([
        'user_id' => $dueño->id,
        'estado' => 'aprobado',
        'fecha_cierre' => now(),
    ]);

    $response = $this->get(route('ventas.cierres.show', $cierre->id));

    $response->assertStatus(403);
});

test('un admin sí puede ver el cierre de cualquier vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cierre = CierreCaja::create([
        'user_id' => $dueño->id,
        'estado' => 'aprobado',
        'fecha_cierre' => now(),
    ]);

    $response = $this->get(route('ventas.cierres.show', $cierre->id));

    $response->assertOk();
});

test('index() solo muestra al vendedor sus propios cierres, pero el admin ve todos', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $otroVendedor = User::factory()->vendedor()->create();

    crearTurnoActivo($otroVendedor);
    $cierrePropio = CierreCaja::create(['user_id' => $vendedor->id, 'estado' => 'aprobado', 'fecha_cierre' => now()]);
    $cierreAjeno = CierreCaja::create(['user_id' => $otroVendedor->id, 'estado' => 'aprobado', 'fecha_cierre' => now()]);

    $this->actingAs($vendedor);
    $responseVendedor = $this->get(route('ventas.cierres'), ['X-Inertia' => 'true']);
    $idsVendedor = collect($responseVendedor->json('props.cierres.data'))->pluck('id')->all();

    expect($idsVendedor)->toContain($cierrePropio->id);
    expect($idsVendedor)->not->toContain($cierreAjeno->id);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $responseAdmin = $this->get(route('ventas.cierres'), ['X-Inertia' => 'true']);
    $idsAdmin = collect($responseAdmin->json('props.cierres.data'))->pluck('id')->all();

    expect($idsAdmin)->toContain($cierrePropio->id);
    expect($idsAdmin)->toContain($cierreAjeno->id);
});

// ==========================================================================
// VENTAS DEVUELTAS — sección propia, separada de las anuladas
// ==========================================================================

function crearVentaConEstadoYSubtotal(User $user, Almacen $almacen, string $estado, float $subtotal, string $motivo): Venta
{
    $producto = Producto::factory()->create();
    $codigo = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id]);

    $venta = Venta::factory()->create([
        'user_id' => $user->id, 'almacen_id' => $almacen->id, 'estado' => $estado,
        'motivo_anulacion' => $motivo, 'detalle_anulacion' => null,
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 1, 'precio_venta' => $subtotal, 'subtotal' => $subtotal,
        'costo_unitario' => 1, 'ganancia' => $subtotal - 1, 'comision_unitaria' => 0,
    ]);

    return $venta;
}

test('el cierre nuevo cuenta las ventas devueltas del turno aparte de las anuladas', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    $devuelta = crearVentaConEstadoYSubtotal($vendedor, $almacen, 'devuelta', 100, 'solicitud_cliente');
    crearVentaConEstadoYSubtotal($vendedor, $almacen, 'cancelada', 40, 'error_precio');

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.ventas_devueltas_count', 1)
        ->where('calculos.ventas_devueltas_total_usd', 100)
        ->where('calculos.ventas_devueltas_detalles.0.venta_id', $devuelta->id)
        ->where('calculos.ventas_devueltas_detalles.0.motivo', 'solicitud_cliente')
        ->where('calculos.ventas_anuladas_count', 1)
        ->where('calculos.ventas_anuladas_total_usd', 40));
});

test('una venta devuelta de otro vendedor no aparece en el cierre del turno', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $otro = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    crearVentaConEstadoYSubtotal($otro, $almacen, 'devuelta', 100, 'otros');

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page->where('calculos.ventas_devueltas_count', 0));
});

test('un cierre guardado muestra las ventas devueltas del período', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    $devuelta = crearVentaConEstadoYSubtotal($vendedor, $almacen, 'devuelta', 75, 'producto_defectuoso');
    $cierre = CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_apertura' => now()->subHour(),
        'fecha_cierre' => now()->addMinute(),
    ]);

    $this->get(route('ventas.cierres.show', $cierre->id))->assertInertia(fn ($page) => $page
        ->where('ventas_devueltas_count', 1)
        ->where('ventas_devueltas_total_usd', 75)
        ->where('ventas_devueltas_detalles.0.venta_id', $devuelta->id)
        ->where('ventas_devueltas_detalles.0.motivo', 'producto_defectuoso'));
});
