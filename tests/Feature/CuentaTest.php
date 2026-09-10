<?php

use App\Models\AjusteSaldoCuenta;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\Cuenta;
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
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertOk();
});

test('un vendedor puede ver el detalle de una cuenta que tiene asignada', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertOk();
});

test('un vendedor NO puede ver el detalle de una cuenta que no tiene asignada (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.show', $cuenta->id));

    $response->assertStatus(403);
});

// ==========================================================================
// EDITAR/ELIMINAR — admin-only (middleware check.cuenta.permission), CREAR —
// abierto a cualquier rol autenticado. Cubre lo que la UI de Cuentas replica
// del patrón ya usado en Clientes/Index.tsx.
// ==========================================================================

test('un admin puede acceder al formulario de editar cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.edit', $cuenta->id));

    $response->assertOk();
});

test('un moderador NO puede acceder al formulario de editar cuenta (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->get(route('cuentas.edit', $cuenta->id));

    $response->assertStatus(403);
});

test('un vendedor NO puede acceder al formulario de editar cuenta (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $response = $this->get(route('cuentas.edit', $cuenta->id));

    $response->assertStatus(403);
});

test('un admin puede actualizar una cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => 'Cuenta Renombrada',
        'tipo' => 'efectivo',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    expect($cuenta->fresh()->nombre_cuenta)->toBe('Cuenta Renombrada');
});

test('un moderador NO puede actualizar una cuenta (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => 'Intento Moderador',
        'tipo' => 'efectivo',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertStatus(403);
    expect($cuenta->fresh()->nombre_cuenta)->not->toBe('Intento Moderador');
});

test('un vendedor NO puede actualizar una cuenta (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, propietario: $vendedor);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => 'Intento Vendedor',
        'tipo' => 'efectivo',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertStatus(403);
    expect($cuenta->fresh()->nombre_cuenta)->not->toBe('Intento Vendedor');
});

// ==========================================================================
// AJUSTE DE SALDO — cambiar saldo_cuenta requiere admin + contraseña + motivo
// ==========================================================================

test('admin cambia el saldo con contraseña correcta y motivo: se actualiza y se audita en ajustes_saldo_cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'efectivo',
        'saldo_cuenta' => 450,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'security_password' => 'password',
        'motivo_ajuste_saldo' => 'Corrección por error de digitación',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    expect($cuenta->fresh()->saldo_cuenta)->toBe(450.0);

    $ajuste = AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->first();
    expect($ajuste)->not->toBeNull();
    expect($ajuste->user_id)->toBe($admin->id);
    expect($ajuste->saldo_anterior)->toBe(300.0);
    expect($ajuste->saldo_nuevo)->toBe(450.0);
    expect($ajuste->motivo)->toBe('Corrección por error de digitación');
});

test('admin intenta cambiar el saldo con contraseña incorrecta: rechazado, saldo no cambia, no se crea ajuste', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'efectivo',
        'saldo_cuenta' => 450,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'security_password' => 'contraseña-incorrecta',
        'motivo_ajuste_saldo' => 'Corrección por error de digitación',
    ]);

    $response->assertSessionHasErrors('security_password');
    expect($cuenta->fresh()->saldo_cuenta)->toBe(300.0);
    expect(AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->count())->toBe(0);
});

test('admin intenta cambiar el saldo sin escribir un motivo: falla validación', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'efectivo',
        'saldo_cuenta' => 450,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'security_password' => 'password',
    ]);

    $response->assertSessionHasErrors('motivo_ajuste_saldo');
    expect($cuenta->fresh()->saldo_cuenta)->toBe(300.0);
    expect(AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->count())->toBe(0);
});

test('moderador intenta cambiar el saldo: bloqueado (403) por el middleware check.cuenta.permission, nunca llega al controlador', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'efectivo',
        'saldo_cuenta' => 450,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertStatus(403);
    expect($cuenta->fresh()->saldo_cuenta)->toBe(300.0);
    expect(AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->count())->toBe(0);
});

test('vendedor intenta cambiar el saldo de su propia cuenta asignada: igual bloqueado (403), el middleware no distingue dueño', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300, propietario: $vendedor);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'efectivo',
        'saldo_cuenta' => 450,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertStatus(403);
    expect($cuenta->fresh()->saldo_cuenta)->toBe(300.0);
    expect(AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->count())->toBe(0);
});

test('admin actualiza la cuenta sin tocar el saldo: no pide contraseña ni motivo, no crea ajuste', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($moneda, saldo: 300);

    $response = $this->put(route('cuentas.update', $cuenta->id), [
        'nombre_cuenta' => 'Cuenta Renombrada Sin Tocar Saldo',
        'tipo' => 'efectivo',
        'saldo_cuenta' => 300,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    expect($cuenta->fresh()->nombre_cuenta)->toBe('Cuenta Renombrada Sin Tocar Saldo');
    expect($cuenta->fresh()->saldo_cuenta)->toBe(300.0);
    expect(AjusteSaldoCuenta::where('cuenta_id', $cuenta->id)->count())->toBe(0);
});

// ==========================================================================
// ESTADO FINANCIERO — saldo negativo se interpreta como deuda (index)
// ==========================================================================

test('el resumen de Cuentas clasifica con_fondo/en_deuda/neutro según el signo del saldo, con en_deuda como valor absoluto', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    crearCuentaEnMoneda($moneda, saldo: 200);
    crearCuentaEnMoneda($moneda, saldo: 100);
    crearCuentaEnMoneda($moneda, saldo: -50);
    crearCuentaEnMoneda($moneda, saldo: 0);

    $response = $this->get(route('cuentas.index'), ['X-Inertia' => 'true']);

    $estadoFinanciero = $response->json('props.resumen.estado_financiero');

    expect($estadoFinanciero['con_fondo']['cantidad'])->toBe(2);
    expect((float) $estadoFinanciero['con_fondo']['saldo'])->toBe(300.0);
    expect($estadoFinanciero['en_deuda']['cantidad'])->toBe(1);
    expect((float) $estadoFinanciero['en_deuda']['saldo'])->toBe(50.0);
    expect($estadoFinanciero['neutro']['cantidad'])->toBe(1);
});

test('un admin puede eliminar una cuenta en $0.00', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 0);

    $response = $this->delete(route('cuentas.destroy', $cuenta->id));

    $response->assertRedirect(route('cuentas.index'));
    expect(Cuenta::find($cuenta->id))->toBeNull();
});

test('ni un admin puede eliminar una cuenta con saldo pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 500);

    $response = $this->delete(route('cuentas.destroy', $cuenta->id));

    $response->assertSessionHasErrors('cuenta');
    expect(Cuenta::find($cuenta->id))->not->toBeNull();
});

test('una cuenta en $0.00 con movimientos financieros asociados no se puede eliminar (red de seguridad de la FK)', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 0);

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
        'saldo_anterior_origen' => 80,
        'saldo_posterior_origen' => 0,
        'moneda_origen' => 'USD',
    ]);

    $response = $this->delete(route('cuentas.destroy', $cuenta->id));

    $response->assertSessionHasErrors('cuenta');
    expect(Cuenta::find($cuenta->id))->not->toBeNull();
});

test('un moderador NO puede eliminar una cuenta (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $response = $this->delete(route('cuentas.destroy', $cuenta->id));

    $response->assertStatus(403);
    expect(Cuenta::find($cuenta->id))->not->toBeNull();
});

test('un vendedor NO puede eliminar una cuenta (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $response = $this->delete(route('cuentas.destroy', $cuenta->id));

    $response->assertStatus(403);
    expect(Cuenta::find($cuenta->id))->not->toBeNull();
});

test('un moderador SÍ puede crear una cuenta', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $moneda = crearMonedaUsd();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => 'Cuenta Moderador '.uniqid(),
        'tipo' => 'efectivo',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
});

test('un vendedor SÍ puede crear una cuenta', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $moneda = crearMonedaUsd();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => 'Cuenta Vendedor '.uniqid(),
        'tipo' => 'efectivo',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
});

// ==========================================================================
// CATÁLOGO DE TARJETAS ("Atendido por" / bancos — feature Cuentas → tarjetas)
// ==========================================================================

test('store() guarda un slug de banco válido en imagen', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $nombre = 'Cuenta BANDEC '.uniqid();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => $nombre,
        'tipo' => 'tarjeta',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'imagen' => 'bandec',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    $this->assertDatabaseHas('cuentas', ['nombre_cuenta' => $nombre, 'imagen' => 'bandec']);
});

test('store() rechaza un slug de banco que no existe en el catálogo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => 'Cuenta Banco Falso '.uniqid(),
        'tipo' => 'tarjeta',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'imagen' => 'banco-inventado',
    ]);

    $response->assertSessionHasErrors('imagen');
});

test('store() no exige imagen — una cuenta tarjeta puede quedar sin banco asignado', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $nombre = 'Cuenta Sin Banco '.uniqid();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => $nombre,
        'tipo' => 'tarjeta',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    $this->assertDatabaseHas('cuentas', ['nombre_cuenta' => $nombre, 'imagen' => null]);
});

test('update() cambia el banco asignado a una cuenta existente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta a editar '.uniqid(),
        'tipo' => 'tarjeta',
        'saldo_cuenta' => 0,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
    ]);

    $response = $this->put(route('cuentas.update', $cuenta), [
        'nombre_cuenta' => $cuenta->nombre_cuenta,
        'tipo' => 'tarjeta',
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'imagen' => 'visa',
    ]);

    $response->assertRedirect(route('cuentas.index'));
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'imagen' => 'visa']);
});

test('create() y edit() exponen el catálogo de tarjetas agrupado en internas/externas/efectivo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $responseCreate = $this->get(route('cuentas.create'));
    $responseCreate->assertInertia(fn ($page) => $page
        ->has('catalogoTarjetas.interna', 5)
        ->has('catalogoTarjetas.externa', 14)
        ->has('catalogoTarjetas.efectivo', 3)
        ->where('catalogoTarjetas.interna.0.slug', 'bandec')
        ->where('catalogoTarjetas.externa.0.slug', 'visa')
        ->where('catalogoTarjetas.efectivo.0.slug', 'usd')
    );

    $moneda = crearMonedaUsd();
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta catalogo edit '.uniqid(),
        'tipo' => 'tarjeta',
        'saldo_cuenta' => 0,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'imagen' => 'zelle',
    ]);

    $responseEdit = $this->get(route('cuentas.edit', $cuenta));
    $responseEdit->assertInertia(fn ($page) => $page
        ->has('catalogoTarjetas.externa', 14)
        ->where('cuenta.imagen', 'zelle')
    );
});

test('una cuenta tipo efectivo puede guardar una insignia de moneda del catálogo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $moneda = crearMonedaUsd();

    $response = $this->post(route('cuentas.store'), [
        'nombre_cuenta' => 'Caja Efectivo USD '.uniqid(),
        'tipo' => 'efectivo',
        'saldo_cuenta' => 0,
        'moneda_id' => $moneda->id,
        'tipo_cuenta' => 'permanentes',
        'estado' => 'activa',
        'imagen' => 'usd',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cuentas', ['tipo' => 'efectivo', 'imagen' => 'usd']);
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
    expect((float) $item['saldo_anterior'])->toBe(500.0);
    expect((float) $item['saldo_posterior'])->toBe(420.0);

    expect($item['detalle'])->not->toBeNull();
    expect($item['detalle']['origen']['nombre'])->toBe($cuenta->nombre_cuenta);
    expect((float) $item['detalle']['origen']['saldo_anterior'])->toBe(500.0);
    expect($item['detalle']['destino'])->toBeNull();
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
        'saldo_anterior' => 0,
        'saldo_posterior' => 150,
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

    $item = collect($response->json('props.historialVentas.data'))->firstWhere('fuente', 'venta_pago');
    expect((float) $item['saldo_anterior'])->toBe(0.0);
    expect((float) $item['saldo_posterior'])->toBe(150.0);

    expect($item['detalle'])->not->toBeNull();
    expect($item['detalle']['pagos'])->toHaveCount(1);
    expect((float) $item['detalle']['pagos'][0]['monto_original'])->toBe(150.0);
    expect($item['detalle'])->toHaveKey('productos');
});

test('un pago de venta sin snapshot de saldo (venta anterior al fix) igual trae detalle completo', function () {
    // La mayoría de los datos reales del sistema son de antes de que Fase 1/2 de
    // saldo_anterior/posterior existiera — sin este caso cubierto, esas filas se ven
    // atrapadas sin poder desplegarse en Cuentas/Show.tsx (bug real encontrado 2026-09-03:
    // el frontend gateaba "es colapsable" solo por saldo, no por si había detalle rico).
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $venta = Venta::factory()->completada()->create();
    PagoVenta::factory()->create([
        'venta_id' => $venta->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 60,
        // sin saldo_anterior/saldo_posterior — null por default de la factory
    ]);

    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $item = collect($response->json('props.historialVentas.data'))->firstWhere('fuente', 'venta_pago');

    expect($item['saldo_anterior'])->toBeNull();
    expect($item['detalle'])->not->toBeNull();
    expect($item['detalle']['pagos'])->toHaveCount(1);
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
        'comision_saldo_anterior' => 1000,
        'comision_saldo_posterior' => 500,
    ]);

    Venta::factory()->completada()->create([
        'gestor_cuenta_id' => $cuenta->id,
        'es_venta_gestor' => true,
        'gestor_monto' => 300,
        'gestor_saldo_anterior' => 800,
        'gestor_saldo_posterior' => 500,
    ]);

    Venta::factory()->completada()->create([
        'mensajero_cuenta_id' => $cuenta->id,
        'mensajero_tipo' => 'externo',
        'mensajero_monto' => 100,
        'mensajero_monto_original' => 900,
        'mensajero_monto_final_cup' => 950,
        'mensajero_saldo_anterior' => 2000,
        'mensajero_saldo_posterior' => 1050,
    ]);

    $response = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historial = collect($response->json('props.historialVentas.data'));

    $comisionPV = $historial->firstWhere('fuente', 'venta_comision');
    $comisionGestor = $historial->firstWhere('fuente', 'venta_gestor');
    $mensajeria = $historial->firstWhere('fuente', 'venta_mensajero');

    expect((float) $comisionPV['monto'])->toBe(-500.0); // 20 * 25
    expect((float) $comisionGestor['monto'])->toBe(-300.0);
    expect((float) $mensajeria['monto'])->toBe(-950.0); // usa el CUP final, no el original

    expect((float) $comisionPV['saldo_anterior'])->toBe(1000.0);
    expect((float) $comisionPV['saldo_posterior'])->toBe(500.0);
    expect((float) $comisionGestor['saldo_anterior'])->toBe(800.0);
    expect((float) $comisionGestor['saldo_posterior'])->toBe(500.0);
    expect((float) $mensajeria['saldo_anterior'])->toBe(2000.0);
    expect((float) $mensajeria['saldo_posterior'])->toBe(1050.0);
});

test('el historial incluye pagos de compra para admin, pero se ocultan para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();

    crearTurnoActivo($vendedor);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $compra = Compra::factory()->create();
    CompraPago::create([
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 75,
        'tipo_pago' => 'cuenta',
        'saldo_anterior' => 200,
        'saldo_posterior' => 125,
    ]);

    $this->actingAs($admin);
    $responseAdmin = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialCompraAdmin = collect($responseAdmin->json('props.historialCompras.data'));

    $this->actingAs($vendedor);
    $responseVendedor = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialCompraVendedor = collect($responseVendedor->json('props.historialCompras.data'));

    expect($historialCompraAdmin->contains('referencia_id', $compra->id))->toBeTrue();
    expect($historialCompraVendedor)->toBeEmpty();

    $item = $historialCompraAdmin->firstWhere('referencia_id', $compra->id);
    expect((float) $item['saldo_anterior'])->toBe(200.0);
    expect((float) $item['saldo_posterior'])->toBe(125.0);

    expect($item['detalle'])->not->toBeNull();
    expect($item['detalle']['pagos'])->toHaveCount(1);
    expect((float) $item['detalle']['pagos'][0]['monto'])->toBe(75.0);
    expect($item['detalle']['pagos'][0]['origen'])->toBe($cuenta->nombre_cuenta);
});

test('el historial incluye ajustes manuales de saldo para admin, pero se ocultan para vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();

    crearTurnoActivo($vendedor);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), propietario: $vendedor);

    $ajuste = AjusteSaldoCuenta::create([
        'cuenta_id' => $cuenta->id,
        'user_id' => $admin->id,
        'saldo_anterior' => 300,
        'saldo_nuevo' => 450,
        'motivo' => 'Corrección por error de digitación',
    ]);

    $this->actingAs($admin);
    $responseAdmin = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialAjustesAdmin = collect($responseAdmin->json('props.historialAjustes.data'));

    $this->actingAs($vendedor);
    $responseVendedor = $this->get(route('cuentas.show', $cuenta->id), ['X-Inertia' => 'true']);
    $historialAjustesVendedor = collect($responseVendedor->json('props.historialAjustes.data'));

    expect($historialAjustesAdmin->contains('referencia_id', $ajuste->id))->toBeTrue();
    expect($historialAjustesVendedor)->toBeEmpty();

    $item = $historialAjustesAdmin->firstWhere('referencia_id', $ajuste->id);
    expect((float) $item['saldo_anterior'])->toBe(300.0);
    expect((float) $item['saldo_posterior'])->toBe(450.0);
    expect((float) $item['monto'])->toBe(150.0);
    expect($item['descripcion'])->toBe('Corrección por error de digitación');
    expect($item['usuario'])->toBe($admin->name);
    expect($item['fuente'])->toBe('ajuste_saldo');
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
    $clienteBuscado = Cliente::factory()->create(['nombre_cliente' => 'YALIANNIS BARROSO']);
    $clienteOtro = Cliente::factory()->create(['nombre_cliente' => 'OTRO CLIENTE']);

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
