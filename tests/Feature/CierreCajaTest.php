<?php

use App\Models\Almacen;
use App\Models\CierreCaja;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\Remesa;
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

function crearRemesaDirecta(User $autor, Cuenta $entrada, Cuenta $salida, float $montoEntrada, float $montoSalida, string $estado = 'completado'): Remesa
{
    return Remesa::create([
        'user_id' => $autor->id,
        'entrada_tipo' => 'cuenta', 'entrada_cuenta_id' => $entrada->id, 'entrada_monto' => $montoEntrada, 'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 0, 'entrada_saldo_posterior' => $montoEntrada,
        'salida_tipo' => 'cuenta', 'salida_cuenta_id' => $salida->id, 'salida_monto' => $montoSalida, 'salida_moneda' => 'USD',
        'salida_saldo_anterior' => $montoSalida, 'salida_saldo_posterior' => 0,
        'fecha_operacion' => now(), 'estado' => $estado,
    ]);
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

// ==========================================================================
// VENTAS SIN COMISIÓN (de la agencia) — visibilidad en el Cierre
// ==========================================================================

function crearVentaCompletadaSinComision(User $user, Almacen $almacen, float $total, float $costo): Venta
{
    $producto = Producto::factory()->create();
    $codigo = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id]);

    $venta = Venta::factory()->completada()->create([
        'user_id' => $user->id, 'almacen_id' => $almacen->id, 'es_venta_sin_comision' => true, 'total' => $total,
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 1, 'precio_venta' => $total, 'subtotal' => $total,
        'costo_unitario' => $costo, 'ganancia' => $total - $costo, 'comision_unitaria' => 0,
    ]);

    return $venta;
}

test('el cierre del turno en curso cuenta y totaliza las ventas sin comisión', function () {
    $vendedor = User::factory()->admin()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    $venta = crearVentaCompletadaSinComision($vendedor, $almacen, total: 75, costo: 50);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.ventas_sin_comision_count', 1)
        ->where('calculos.ventas_sin_comision_total_usd', 75)
        ->where('calculos.ventas_sin_comision_costo_usd', 50)
        ->where('calculos.ventas_sin_comision_impacto_usd', 25)
        ->where('calculos.ventas_sin_comision_detalles.0.venta_id', $venta->id));
});

test('el cierre en curso entrega el logo de la cuenta y la insignia de la moneda de cada pago', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $monedaUsd->update(['imagen' => 'usd']);
    $cuenta = crearCuentaEnMoneda($monedaUsd, propietario: $vendedor);
    $cuenta->update(['imagen' => 'zelle']);

    crearVentaCompletadaConPago($vendedor, $almacen, $monedaUsd, total: 100, cuenta: $cuenta);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.detalles.0.moneda_imagen_url', asset('projects/monedas/usd.webp'))
        ->where('calculos.detalles.0.items_ventas.0.banco.slug', 'zelle')
        ->where('calculos.detalles.0.items_ventas.0.moneda_imagen_url', asset('projects/monedas/usd.webp'))
        ->where('calculos.detalles.0.operaciones_detalle.0.banco.slug', 'zelle'));
});

test('los gastos, ingresos y transferencias del turno traen el logo de sus cuentas', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $monedaUsd = crearMonedaUsd();
    $monedaUsd->update(['imagen' => 'usd']);
    $cuentaPropia = crearCuentaEnMoneda($monedaUsd, saldo: 500, propietario: $vendedor);
    $cuentaPropia->update(['imagen' => 'zelle']);
    $cuentaSinLogo = crearCuentaEnMoneda($monedaUsd, saldo: 0);

    $base = ['user_id' => $vendedor->id, 'monto' => 10, 'moneda' => 'USD', 'fecha_operacion' => now(), 'estado' => 'completado', 'created_at' => now(), 'updated_at' => now()];
    DB::table('movimientos_financieros')->insert($base + ['tipo_movimiento_id' => 1, 'cuenta_origen_id' => $cuentaPropia->id, 'descripcion' => 'Gasto']);
    DB::table('movimientos_financieros')->insert($base + ['tipo_movimiento_id' => 2, 'cuenta_destino_id' => $cuentaPropia->id, 'descripcion' => 'Ingreso']);
    DB::table('movimientos_financieros')->insert($base + ['tipo_movimiento_id' => 3, 'cuenta_origen_id' => $cuentaPropia->id, 'cuenta_destino_id' => $cuentaSinLogo->id, 'tasa_cambio_aplicada' => 1, 'descripcion' => 'Transferencia']);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.detalles.0.items_gastos.0.banco.slug', 'zelle')
        ->where('calculos.detalles.0.items_gastos.0.moneda_imagen_url', asset('projects/monedas/usd.webp'))
        ->where('calculos.detalles.0.items_ingresos.0.banco.slug', 'zelle')
        ->where('calculos.detalles.0.items_transferencias_salientes.0.banco_origen.slug', 'zelle')
        ->where('calculos.detalles.0.items_transferencias_salientes.0.banco_destino', null));
});

test('el cierre de un admin lista las operaciones múltiples del turno con su resumen y deja fuera las anuladas del total', function () {
    $admin = User::factory()->admin()->create();
    $otroAdmin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $usd = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($usd, saldo: 100);
    $entrada->update(['imagen' => 'zelle']);
    $salida = crearCuentaEnMoneda($usd, saldo: 500);
    $mensajero = crearCuentaEnMoneda($usd, saldo: 50);

    $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta', 'entrada_id' => $entrada->id, 'entrada_monto' => 1000,
        'salida_tipo' => 'cuenta', 'salida_id' => $salida->id, 'salida_monto' => 950,
        'mensajero_cuenta_id' => $mensajero->id, 'mensajero_monto' => 20,
        'notas' => 'Remesa de la mañana',
    ]);
    $anulada = crearRemesaDirecta($otroAdmin, $entrada, $salida, 300, 290, 'anulada');

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.operaciones_multiples.visible', true)
        ->has('calculos.operaciones_multiples.items', 2)
        ->where('calculos.operaciones_multiples.items.1.notas', 'Remesa de la mañana')
        ->where('calculos.operaciones_multiples.items.1.es_propio', true)
        ->where('calculos.operaciones_multiples.items.1.entrada.banco.slug', 'zelle')
        ->where('calculos.operaciones_multiples.items.1.mensajero.monto', 20)
        ->where('calculos.operaciones_multiples.items.0.id', $anulada->id)
        ->where('calculos.operaciones_multiples.items.0.es_propio', false)
        ->where('calculos.operaciones_multiples.items.0.anulada', true)
        ->where('calculos.operaciones_multiples.resumen.total', 1)
        ->where('calculos.operaciones_multiples.resumen.entradas', [['moneda' => 'USD', 'monto' => 1000]])
        ->where('calculos.operaciones_multiples.resumen.salidas', [['moneda' => 'USD', 'monto' => 970]]));
});

test('la comparativa con el cierre anterior trae el logo de cada cuenta y marca la diferencia', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $usd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($usd, saldo: 80, propietario: $vendedor);
    $cuenta->update(['imagen' => 'zelle']);

    CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_cierre' => now()->subDay(),
        'snapshot_cuentas' => [['id' => $cuenta->id, 'nombre' => $cuenta->nombre_cuenta, 'tipo' => 'banco', 'moneda' => 'USD', 'saldo' => 100]],
    ]);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('tiene_cierre_anterior', true)
        ->where('comparativa_cuentas.0.banco.slug', 'zelle')
        ->where('comparativa_cuentas.0.saldo_anterior', 100)
        ->where('comparativa_cuentas.0.saldo_actual', 80)
        ->where('comparativa_cuentas.0.diferencia', -20)
        ->where('comparativa_cuentas.0.estado', 'bajo'));
});

test('un residuo de redondeo en coma flotante no cuenta como cambio en la comparativa', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $usd = crearMonedaUsd();
    // 0.1 + 0.2 - 0.3 = 5.55e-17 en coma flotante: sin redondear marcaba "subió" y se mostraba como +$0.00.
    $cuenta = crearCuentaEnMoneda($usd, saldo: 0.1 + 0.2, propietario: $vendedor);
    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 0.1 + 0.2]);

    CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_cierre' => now()->subDay(),
        'snapshot_cuentas' => [['id' => $cuenta->id, 'nombre' => $cuenta->nombre_cuenta, 'tipo' => 'banco', 'moneda' => 'USD', 'saldo' => 0.3]],
        'snapshot_clientes' => [['id' => $cliente->id, 'nombre' => $cliente->nombre_cliente, 'deuda' => 0.3]],
    ]);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('comparativa_cuentas.0.diferencia', 0)
        ->where('comparativa_cuentas.0.estado', 'igual')
        ->where('comparativa_clientes', fn ($clientes) => collect($clientes)->firstWhere('id', $cliente->id)['estado'] === 'igual'));
});

test('la comparativa marca como nueva la cuenta que no estaba en el cierre anterior', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $usd = crearMonedaUsd();
    $conocida = crearCuentaEnMoneda($usd, saldo: 100, propietario: $vendedor);
    $nueva = crearCuentaEnMoneda($usd, saldo: 250, propietario: $vendedor);

    CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_cierre' => now()->subDay(),
        'snapshot_cuentas' => [['id' => $conocida->id, 'nombre' => $conocida->nombre_cuenta, 'tipo' => 'banco', 'moneda' => 'USD', 'saldo' => 100]],
    ]);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('comparativa_cuentas', fn ($cuentas) => collect($cuentas)->firstWhere('id', $conocida->id)['es_nueva'] === false
            && collect($cuentas)->firstWhere('id', $nueva->id)['es_nueva'] === true));

    // Sin cierre anterior nadie es "nueva": todo es el saldo inicial.
    CierreCaja::query()->delete();
    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('comparativa_cuentas', fn ($cuentas) => collect($cuentas)->every(fn ($c) => $c['es_nueva'] === false)));
});

test('el vendedor compara solo sus cuentas completas y de las de cobro ve únicamente lo cobrado en el turno', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->puntoVenta()->create();
    $usd = crearMonedaUsd();

    $completa = crearCuentaEnMoneda($usd, saldo: 500, propietario: $vendedor);
    $cobro = crearCuentaEnMoneda($usd, saldo: 7777);
    $vendedor->cuentas()->attach($cobro->id, ['acceso' => 'cobro']);
    $cobro->update(['imagen' => 'zelle']);

    crearVentaCompletadaConPago($vendedor, $almacen, $usd, total: 60, cuenta: $cobro);
    crearVentaCompletadaConPago($vendedor, $almacen, $usd, total: 40, cuenta: $cobro);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->has('comparativa_cuentas', 1)
        ->where('comparativa_cuentas.0.id', $completa->id)
        ->has('comparativa_cuentas_cobro', 1)
        ->where('comparativa_cuentas_cobro.0.id', $cobro->id)
        ->where('comparativa_cuentas_cobro.0.operado_turno', 100)
        ->where('comparativa_cuentas_cobro.0.banco.slug', 'zelle')
        ->missing('comparativa_cuentas_cobro.0.saldo_actual')
        ->missing('comparativa_cuentas_cobro.0.saldo_anterior'));
});

test('el cierre de un admin compara todas las cuentas y no tiene cuentas de cobro', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $usd = crearMonedaUsd();
    crearCuentaEnMoneda($usd, saldo: 10);
    crearCuentaEnMoneda($usd, saldo: 20);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->has('comparativa_cuentas', 2)
        ->has('comparativa_cuentas_cobro', 0));
});

test('al cerrar, el snapshot del vendedor no guarda el saldo de sus cuentas de cobro', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $usd = crearMonedaUsd();

    $completa = crearCuentaEnMoneda($usd, saldo: 500, propietario: $vendedor);
    $cobro = crearCuentaEnMoneda($usd, saldo: 7777);
    $vendedor->cuentas()->attach($cobro->id, ['acceso' => 'cobro']);

    $this->post(route('ventas.cierres.store'), payloadStoreCierre())->assertRedirect(route('ventas.cierres'));

    $snapshot = collect(CierreCaja::firstOrFail()->snapshot_cuentas);
    expect($snapshot->pluck('id')->all())->toBe([$completa->id])
        ->and($snapshot->pluck('saldo')->all())->not->toContain(7777.0);
});

test('el cierre de un vendedor no recibe las operaciones múltiples', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $usd = crearMonedaUsd();
    crearRemesaDirecta($admin, crearCuentaEnMoneda($usd), crearCuentaEnMoneda($usd), 10, 9);

    $this->actingAs($vendedor)->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.operaciones_multiples.visible', false)
        ->has('calculos.operaciones_multiples.items', 0));
});

test('un pago a una cuenta sin logo asignado llega con banco nulo', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, propietario: $vendedor);

    crearVentaCompletadaConPago($vendedor, $almacen, $monedaUsd, total: 100, cuenta: $cuenta);

    $this->get(route('ventas.cierres.create'))->assertInertia(fn ($page) => $page
        ->where('calculos.detalles.0.items_ventas.0.banco', null)
        ->where('calculos.detalles.0.items_ventas.0.moneda_imagen_url', null));
});

test('un cierre guardado muestra las ventas sin comisión del período, con costo e impacto para admin', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    $venta = crearVentaCompletadaSinComision($vendedor, $almacen, total: 40, costo: 30);
    $cierre = CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_apertura' => now()->subHour(),
        'fecha_cierre' => now()->addMinute(),
    ]);

    $this->get(route('ventas.cierres.show', $cierre->id))->assertInertia(fn ($page) => $page
        ->where('ventas_sin_comision_count', 1)
        ->where('ventas_sin_comision_total_usd', 40)
        ->where('ventas_sin_comision_costo_usd', 30)
        ->where('ventas_sin_comision_impacto_usd', 10)
        ->where('ventas_sin_comision_detalles.0.venta_id', $venta->id));
});

test('un vendedor no ve el costo ni el impacto de las ventas sin comisión en el cierre guardado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->puntoVenta()->create();
    crearMonedaUsd();

    crearVentaCompletadaSinComision($vendedor, $almacen, total: 40, costo: 30);
    $cierre = CierreCaja::create([
        'user_id' => $vendedor->id,
        'estado' => 'aprobado',
        'fecha_apertura' => now()->subHour(),
        'fecha_cierre' => now()->addMinute(),
    ]);

    $response = $this->get(route('ventas.cierres.show', $cierre->id));

    $response->assertInertia(fn ($page) => $page
        ->where('ventas_sin_comision_count', 1)
        ->where('ventas_sin_comision_total_usd', 40)
        ->missing('ventas_sin_comision_costo_usd')
        ->missing('ventas_sin_comision_impacto_usd')
        ->where('ventas_sin_comision_detalles.0', fn ($detalle) => ! isset($detalle['costo']) && ! isset($detalle['impacto'])));
});
