<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\CasilleroCargo;
use App\Models\Categoria;
use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\LoteStock;
use App\Models\MovimientoFinanciero;
use App\Models\Producto;
use App\Models\User;

// ─── Casillero de Compras, Fase 1 ────────────────────────────────────────────

function casilleroCuentaUsd(float $saldo = 100)
{
    return crearCuentaEnMoneda(crearMonedaUsd(), $saldo);
}

/**
 * @param  array<string, mixed>  $atributos
 */
function casilleroCompra(array $atributos = []): Compra
{
    // cuenta_id null: la factory crearía una Moneda única por compra y agotaría los valores de faker.
    return Compra::factory()->casillero()->create($atributos + ['total_compra' => 120, 'cuenta_id' => null]);
}

/**
 * Registra por HTTP una compra del casillero (sin almacén de destino) pagada en efectivo.
 *
 * @return array{compra: Compra, cuenta: Cuenta}
 */
function casilleroRegistrarCompraPorHttp(float $saldo = 120): array
{
    $cuenta = casilleroCuentaUsd($saldo);
    $categoria = Categoria::factory()->create();

    test()->post(route('comprar.store'), [
        'flujo' => 'casillero',
        'compra' => 'pago_cash',
        'proveedor' => 'Milexus',
        'fecha' => '2026-10-19',
        'productos' => [[
            'producto' => 'PANEL SOLAR',
            'categoria' => $categoria->nombre_categoria,
            'cantidad' => 12,
            'precio' => 10,
        ]],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 120]],
    ])->assertSessionHasNoErrors();

    return ['compra' => Compra::firstOrFail(), 'cuenta' => $cuenta];
}

// ─── Acceso: solo el administrador ───────────────────────────────────────────

test('el administrador ve el casillero; el moderador y el vendedor no', function () {
    $this->actingAs(User::factory()->admin()->create())
        ->get(route('casillero.index'), ['X-Inertia' => 'true'])
        ->assertOk();

    foreach (['moderador', 'vendedor'] as $rol) {
        $this->actingAs(User::factory()->{$rol}()->create())
            ->get(route('casillero.index'), ['X-Inertia' => 'true'])
            ->assertForbidden();
    }
});

test('el moderador y el vendedor no pueden anotar cargos, anular ni marcar la llegada por URL directa', function () {
    $compra = casilleroCompra();
    $cuenta = casilleroCuentaUsd();
    $cargo = CasilleroCargo::factory()->create(['cuenta_id' => $cuenta->id]);

    foreach (['moderador', 'vendedor'] as $rol) {
        $this->actingAs(User::factory()->{$rol}()->create());

        $this->postJson(route('casillero.cargos.store'), [
            'compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuenta->id,
        ])->assertForbidden();
        $this->postJson(route('casillero.cargos.anular', $cargo), ['motivo' => 'x'])->assertForbidden();
        $this->postJson(route('casillero.compras.llegada-panama', $compra), ['fecha' => '2026-10-18'])->assertForbidden();
    }

    expect(CasilleroCargo::count())->toBe(1)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0)
        ->and($compra->fresh()->llegada_panama_at)->toBeNull();
});

// ─── Listado ─────────────────────────────────────────────────────────────────

test('el listado trae solo las compras que esperan en el casillero, con sus productos y cargos activos', function () {
    $this->actingAs(User::factory()->admin()->create());

    $enCasillero = casilleroCompra(['total_compra' => 120]);
    casilleroCompra(['total_compra' => 300, 'etapa' => 'contenedor']);
    Compra::factory()->create(['estado' => 'pendiente', 'cuenta_id' => null]);
    Compra::factory()->create(['estado' => 'aprobada', 'cuenta_id' => null]);
    casilleroCompra(['estado' => 'anulada']);

    $producto = Producto::factory()->create();
    $enCasillero->productos()->attach($producto->id, ['cantidad' => 12, 'precio' => 10, 'almacen_id' => null]);
    $cuenta = casilleroCuentaUsd();
    $activo = CasilleroCargo::factory()->create(['monto' => 12, 'monto_usd' => 12, 'cuenta_id' => $cuenta->id]);
    $anulado = CasilleroCargo::factory()->anulado()->create(['monto' => 50, 'monto_usd' => 50, 'cuenta_id' => $cuenta->id]);
    $enCasillero->cargosCasillero()->attach([$activo->id, $anulado->id]);

    $props = $this->get(route('casillero.index'), ['X-Inertia' => 'true'])->assertOk()->json('props');

    expect($props['compras'])->toHaveCount(1)
        ->and($props['compras'][0]['id'])->toBe($enCasillero->id)
        ->and($props['compras'][0]['productos'][0]['cantidad'])->toBe(12)
        ->and($props['compras'][0]['cargos'])->toHaveCount(1)
        ->and($props['compras'][0]['cargos_usd'])->toBe(12)
        ->and($props['resumen'])->toMatchArray(['compras' => 1, 'valor_mercancia_usd' => 120, 'cargos_usd' => 12]);
});

// ─── Registrar una compra del casillero ──────────────────────────────────────

test('una compra del casillero se registra pagada, pendiente y sin tocar el stock ni elegir almacén', function () {
    $this->actingAs(User::factory()->admin()->create());

    ['compra' => $compra, 'cuenta' => $cuenta] = casilleroRegistrarCompraPorHttp();

    expect($compra->flujo)->toBe('casillero')
        ->and($compra->etapa)->toBe('casillero')
        ->and($compra->estado)->toBe('pendiente')
        ->and((float) $compra->total_compra)->toBe(120.0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(0.0)
        ->and($compra->productos()->first()->pivot->almacen_id)->toBeNull()
        ->and(AlmacenProducto::count())->toBe(0)
        ->and(LoteStock::count())->toBe(0)
        ->and(Compra::enCasillero()->pluck('id')->all())->toBe([$compra->id]);
});

test('el detalle de una compra del casillero, recién registrada y al abrirla, trae su estado y un almacén por definir', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cuenta = casilleroCuentaUsd(120);
    $categoria = Categoria::factory()->create();

    $respuesta = $this->post(route('comprar.store'), [
        'flujo' => 'casillero',
        'compra' => 'pago_cash',
        'proveedor' => 'Milexus',
        'fecha' => '2026-10-19',
        'productos' => [['producto' => 'PANEL SOLAR', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 12, 'precio' => 10]],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 120]],
    ], ['X-Inertia' => 'true'])->assertOk();

    $compra = Compra::firstOrFail();
    $almacenDeLaLinea = $respuesta->json('props.productos.0.almacen');

    expect($almacenDeLaLinea)->toBe(['id' => null, 'nombre_almacen' => 'Se elige al llegar'])
        ->and($respuesta->json('props.compra'))->toMatchArray(['flujo' => 'casillero', 'etapa' => 'casillero', 'estado' => 'pendiente']);

    $detalle = $this->get(route('comprar.show', $compra), ['X-Inertia' => 'true'])->assertOk();

    expect($detalle->json('props.productos.0.almacen'))->toBe(['id' => null, 'nombre_almacen' => 'Se elige al llegar'])
        ->and($detalle->json('props.compra.flujo'))->toBe('casillero');
});

test('registrar una compra del casillero es solo del administrador', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);
    $cuenta = casilleroCuentaUsd();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'flujo' => 'casillero',
        'compra' => 'pago_cash',
        'proveedor' => 'Milexus',
        'fecha' => '2026-10-19',
        'productos' => [['producto' => 'X', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10]],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 10]],
    ])->assertForbidden();

    expect(Compra::count())->toBe(0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);
});

test('el flujo clásico sigue exigiendo almacén en cada línea', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cuenta = casilleroCuentaUsd();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Milexus',
        'fecha' => '2026-10-19',
        'productos' => [['producto' => 'X', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10]],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 10]],
    ])->assertSessionHasErrors('productos.0.almacen_id');

    expect(Compra::count())->toBe(0)
        ->and(Compra::factory()->create(['cuenta_id' => null])->fresh()->flujo)->toBe('clasico');
});

// ─── Cargos a mano ───────────────────────────────────────────────────────────

test('un cargo sobre dos compras se paga con un Gasto desde la cuenta USD y queda enlazado a ambas', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = casilleroCuentaUsd(100);
    $a = casilleroCompra();
    $b = casilleroCompra(['total_compra' => 300]);

    $this->post(route('casillero.cargos.store'), [
        'compra_ids' => [$a->id, $b->id],
        'concepto' => 'Estadía en Panamá',
        'nota' => 'Semana del 12',
        'monto' => 12,
        'cuenta_id' => $cuenta->id,
        'fecha' => '2026-10-18',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $cargo = CasilleroCargo::with(['compras', 'movimientoFinanciero'])->firstOrFail();

    expect($cargo->concepto)->toBe('Estadía en Panamá')
        ->and($cargo->monto_usd)->toBe(12.0)
        ->and($cargo->estado)->toBe('activo')
        ->and($cargo->fecha->toDateString())->toBe('2026-10-18')
        ->and($cargo->compras->pluck('id')->sort()->values()->all())->toBe([$a->id, $b->id])
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(88.0)
        ->and($cargo->movimientoFinanciero)->toMatchArray([
            'tipo_movimiento_id' => 1,
            'estado' => 'completado',
            'cuenta_origen_id' => $cuenta->id,
            'moneda' => 'USD',
            'saldo_anterior_origen' => 100.0,
            'saldo_posterior_origen' => 88.0,
        ]);
});

test('un cargo se rechaza sin tocar nada si la compra no está en el casillero, la cuenta no es USD o no alcanza el saldo', function (string $caso) {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = casilleroCuentaUsd(100);
    $compra = casilleroCompra();

    $datos = ['compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuenta->id];

    match ($caso) {
        'compra clásica' => $datos['compra_ids'] = [Compra::factory()->create(['estado' => 'pendiente', 'cuenta_id' => null])->id],
        'compra ya aprobada' => $datos['compra_ids'] = [casilleroCompra(['estado' => 'aprobada'])->id],
        'compra en contenedor' => $datos['compra_ids'] = [casilleroCompra(['etapa' => 'contenedor'])->id],
        'cuenta CUP' => $datos['cuenta_id'] = crearCuentaEnMoneda(crearMoneda('CUP', 24), 5000)->id,
        'saldo insuficiente' => $datos['monto'] = 100.01,
    };

    $this->post(route('casillero.cargos.store'), $datos)->assertSessionHasErrors('error');

    expect(CasilleroCargo::count())->toBe(0)
        ->and(MovimientoFinanciero::count())->toBe(0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);
})->with(['compra clásica', 'compra ya aprobada', 'compra en contenedor', 'cuenta CUP', 'saldo insuficiente']);

test('un cargo exige al menos una compra, un concepto y un monto mayor que cero', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cuenta = casilleroCuentaUsd();
    $compra = casilleroCompra();

    $this->post(route('casillero.cargos.store'), ['concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuenta->id])
        ->assertSessionHasErrors('compra_ids');
    $this->post(route('casillero.cargos.store'), ['compra_ids' => [$compra->id], 'monto' => 12, 'cuenta_id' => $cuenta->id])
        ->assertSessionHasErrors('concepto');
    $this->post(route('casillero.cargos.store'), ['compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 0, 'cuenta_id' => $cuenta->id])
        ->assertSessionHasErrors('monto');

    expect(CasilleroCargo::count())->toBe(0);
});

test('anular un cargo devuelve el dinero a la cuenta, cancela el Gasto y no se puede repetir', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = casilleroCuentaUsd(100);
    $compra = casilleroCompra();

    $this->post(route('casillero.cargos.store'), [
        'compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuenta->id,
    ])->assertSessionHasNoErrors();
    $cargo = CasilleroCargo::firstOrFail();

    $this->post(route('casillero.cargos.anular', $cargo), ['motivo' => 'Monto mal escrito'])
        ->assertSessionHasNoErrors()->assertSessionHas('success');

    expect($cargo->fresh()->estado)->toBe('anulado')
        ->and($cargo->fresh()->motivo_anulacion)->toBe('Monto mal escrito')
        ->and($cargo->movimientoFinanciero->fresh()->estado)->toBe('cancelado')
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);

    $this->post(route('casillero.cargos.anular', $cargo), ['motivo' => 'otra vez'])->assertSessionHasErrors('error');

    expect((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);
});

test('un cargo no se anula si alguna de sus compras ya salió del casillero', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = casilleroCuentaUsd(100);
    $compra = casilleroCompra();

    $this->post(route('casillero.cargos.store'), [
        'compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuenta->id,
    ])->assertSessionHasNoErrors();
    $compra->update(['etapa' => 'contenedor']);

    $this->post(route('casillero.cargos.anular', CasilleroCargo::firstOrFail()), ['motivo' => 'x'])
        ->assertSessionHasErrors('error');

    expect(CasilleroCargo::firstOrFail()->estado)->toBe('activo')
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(88.0);
});

// ─── Llegada a Panamá ────────────────────────────────────────────────────────

test('se anota el día en que la compra llegó a Panamá, solo mientras esté en el casillero', function () {
    $this->actingAs(User::factory()->admin()->create());
    $enCasillero = casilleroCompra();
    $clasica = Compra::factory()->create(['estado' => 'pendiente', 'cuenta_id' => null]);

    $this->post(route('casillero.compras.llegada-panama', $enCasillero), ['fecha' => '2026-10-18'])
        ->assertSessionHasNoErrors();
    $this->post(route('casillero.compras.llegada-panama', $clasica), ['fecha' => '2026-10-18'])
        ->assertSessionHasErrors('error');
    $this->post(route('casillero.compras.llegada-panama', $enCasillero), [])->assertSessionHasErrors('fecha');

    expect($enCasillero->fresh()->llegada_panama_at->toDateString())->toBe('2026-10-18')
        ->and($clasica->fresh()->llegada_panama_at)->toBeNull();
});

// ─── La compra del casillero no usa el flujo clásico de aprobar/editar ───────

test('una compra del casillero no se aprueba ni se edita: no crea stock ni lotes ni toca el dinero', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['compra' => $compra, 'cuenta' => $cuenta] = casilleroRegistrarCompraPorHttp();
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.aprobar', $compra))->assertSessionHasErrors('error');
    $this->post(route('comprar.actualizar', $compra), [
        'nota' => 'cambio',
        'productos' => [['almacen_id' => $almacen->id, 'producto' => 'OTRO', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 5]],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 5]],
    ])->assertSessionHasErrors('error');

    expect($compra->fresh()->estado)->toBe('pendiente')
        ->and((float) $compra->fresh()->total_compra)->toBe(120.0)
        ->and(AlmacenProducto::count())->toBe(0)
        ->and(LoteStock::count())->toBe(0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(0.0);
});

test('una compra del casillero con cargos activos no se anula hasta anular sus cargos; después revierte el pago', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    ['compra' => $compra, 'cuenta' => $cuenta] = casilleroRegistrarCompraPorHttp(saldo: 120);
    $cuentaCargos = casilleroCuentaUsd(50);

    $this->post(route('casillero.cargos.store'), [
        'compra_ids' => [$compra->id], 'concepto' => 'Estadía', 'monto' => 12, 'cuenta_id' => $cuentaCargos->id,
    ])->assertSessionHasNoErrors();

    $this->post(route('comprar.anular', $compra), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'Error'])
        ->assertSessionHasErrors('error');
    expect($compra->fresh()->estado)->toBe('pendiente');

    $this->post(route('casillero.cargos.anular', CasilleroCargo::firstOrFail()), ['motivo' => 'Error'])->assertSessionHasNoErrors();
    $this->post(route('comprar.anular', $compra), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'Error'])
        ->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('anulada')
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(120.0)
        ->and((float) $cuentaCargos->fresh()->saldo_cuenta)->toBe(50.0);
});
