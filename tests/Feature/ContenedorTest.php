<?php

use App\Models\CasilleroCargo;
use App\Models\Compra;
use App\Models\Contenedor;
use App\Models\ContenedorLinea;
use App\Models\Producto;
use App\Models\User;

// ─── Casillero de Compras, Fase 2: contenedores ──────────────────────────────

/**
 * Una compra del casillero con una línea por cada [cantidad, precio]. Devuelve los ids de `compra_producto`.
 *
 * @param  array<int, array{0: int, 1: float|int}>  $lineas
 * @return array{compra: Compra, lineas: array<int, int>}
 */
function contenedorCompra(array $lineas = [[12, 10], [30, 5]], array $atributos = []): array
{
    // cuenta_id null: la factory crearía una Moneda única por compra y agotaría los valores de faker.
    $compra = Compra::factory()->casillero()->create($atributos + ['total_compra' => 270, 'cuenta_id' => null]);

    foreach ($lineas as [$cantidad, $precio]) {
        $compra->productos()->attach(Producto::factory()->create()->id, ['cantidad' => $cantidad, 'precio' => $precio, 'almacen_id' => null]);
    }

    return [
        'compra' => $compra,
        'lineas' => DB::table('compra_producto')->where('compra_id', $compra->id)->orderBy('id')->pluck('id')->all(),
    ];
}

/**
 * @param  array<int, array{0: int, 1: int}>  $asignaciones  [compra_producto_id, cantidad]
 * @return array<int, array{compra_producto_id: int, cantidad: int}>
 */
function contenedorUnidades(array $asignaciones): array
{
    return array_map(fn (array $a) => ['compra_producto_id' => $a[0], 'cantidad' => $a[1]], $asignaciones);
}

// ─── Acceso: solo el administrador ───────────────────────────────────────────

test('los contenedores son solo del administrador, también por URL directa', function () {
    ['lineas' => [$linea]] = contenedorCompra([[12, 10]]);
    $contenedor = Contenedor::factory()->create();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);

    $this->actingAs(User::factory()->admin()->create())
        ->get(route('casillero.contenedores.index'), ['X-Inertia' => 'true'])->assertOk();

    foreach (['moderador', 'vendedor'] as $rol) {
        $this->actingAs(User::factory()->{$rol}()->create());

        $this->get(route('casillero.contenedores.index'), ['X-Inertia' => 'true'])->assertForbidden();
        $this->postJson(route('casillero.contenedores.store'), ['nombre' => 'X'])->assertForbidden();
        $this->putJson(route('casillero.contenedores.update', $contenedor), ['nombre' => 'Y'])->assertForbidden();
        $this->putJson(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$linea, 1]])])->assertForbidden();
        $this->postJson(route('casillero.contenedores.cargos.store', $contenedor), ['concepto' => 'x', 'monto' => 1, 'cuenta_id' => $cuenta->id])->assertForbidden();
        $this->postJson(route('casillero.contenedores.cancelar', $contenedor))->assertForbidden();
    }

    expect(Contenedor::count())->toBe(1)
        ->and(ContenedorLinea::count())->toBe(0)
        ->and(CasilleroCargo::count())->toBe(0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0)
        ->and($contenedor->fresh()->nombre)->not->toBe('Y');
});

// ─── Crear y editar ──────────────────────────────────────────────────────────

test('se crea un contenedor abierto con nombre, notas y fecha de salida; el nombre es obligatorio', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $this->post(route('casillero.contenedores.store'), [])->assertSessionHasErrors('nombre');
    $this->post(route('casillero.contenedores.store'), ['nombre' => 'MSC-001', 'notas' => 'Sale por Colón', 'fecha_salida' => '2026-10-25'])
        ->assertSessionHasNoErrors()->assertSessionHas('success');

    $contenedor = Contenedor::firstOrFail();

    expect(Contenedor::count())->toBe(1)
        ->and($contenedor->nombre)->toBe('MSC-001')
        ->and($contenedor->estado)->toBe('abierto')
        ->and($contenedor->user_id)->toBe($admin->id)
        ->and($contenedor->fecha_salida->toDateString())->toBe('2026-10-25');
});

test('un contenedor abierto se edita; uno cancelado no', function () {
    $this->actingAs(User::factory()->admin()->create());
    $abierto = Contenedor::factory()->create(['nombre' => 'Viejo']);
    $cancelado = Contenedor::factory()->cancelado()->create(['nombre' => 'Cancelado']);

    $this->put(route('casillero.contenedores.update', $abierto), ['nombre' => 'MSC-002', 'fecha_salida' => '2026-11-01'])->assertSessionHasNoErrors();
    $this->put(route('casillero.contenedores.update', $cancelado), ['nombre' => 'Nuevo'])->assertSessionHasErrors('error');

    expect($abierto->fresh()->nombre)->toBe('MSC-002')
        ->and($abierto->fresh()->fecha_salida->toDateString())->toBe('2026-11-01')
        ->and($cancelado->fresh()->nombre)->toBe('Cancelado');
});

// ─── Asignar unidades ────────────────────────────────────────────────────────

test('a un contenedor sube parte de una compra y el resto sigue esperando en el casillero', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['compra' => $compra, 'lineas' => [$x, $y]] = contenedorCompra();
    $contenedor = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 12], [$y, 10]])])
        ->assertSessionHasNoErrors()->assertSessionHas('success');

    expect(ContenedorLinea::where('contenedor_id', $contenedor->id)->pluck('cantidad', 'compra_producto_id')->all())->toBe([$x => 12, $y => 10])
        ->and($compra->fresh()->etapa)->toBe('casillero');

    $casillero = $this->get(route('casillero.index'), ['X-Inertia' => 'true'])->assertOk()->json('props');

    expect($casillero['compras'][0]['unidades_en_casillero'])->toBe(20)
        ->and($casillero['compras'][0]['valor_en_casillero'])->toBe(100)
        ->and(collect($casillero['compras'][0]['productos'])->pluck('en_casillero', 'compra_producto_id')->all())->toBe([$x => 0, $y => 20])
        ->and($casillero['resumen'])->toMatchArray(['compras' => 1, 'unidades' => 20, 'valor_mercancia_usd' => 100]);
});

test('asignar reemplaza la cantidad del contenedor, no la suma', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['lineas' => [$x]] = contenedorCompra([[12, 10]]);
    $contenedor = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 5]])])->assertSessionHasNoErrors();
    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 8]])])->assertSessionHasNoErrors();

    expect(ContenedorLinea::where('contenedor_id', $contenedor->id)->sum('cantidad'))->toBe(8)
        ->and(ContenedorLinea::count())->toBe(1);
});

test('no se pueden asignar más unidades de las que hay, contando lo que ya subió a otros contenedores', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['compra' => $compra, 'lineas' => [$x]] = contenedorCompra([[12, 10]]);
    $primero = Contenedor::factory()->create();
    $segundo = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $primero), ['lineas' => contenedorUnidades([[$x, 8]])])->assertSessionHasNoErrors();

    $this->put(route('casillero.contenedores.unidades', $segundo), ['lineas' => contenedorUnidades([[$x, 5]])])->assertSessionHasErrors('error');
    $this->put(route('casillero.contenedores.unidades', $primero), ['lineas' => contenedorUnidades([[$x, 13]])])->assertSessionHasErrors('error');
    $this->put(route('casillero.contenedores.unidades', $segundo), ['lineas' => contenedorUnidades([[$x, -1]])])->assertSessionHasErrors('lineas.0.cantidad');

    expect(ContenedorLinea::where('contenedor_id', $primero->id)->sum('cantidad'))->toBe(8)
        ->and(ContenedorLinea::where('contenedor_id', $segundo->id)->count())->toBe(0)
        ->and($compra->fresh()->etapa)->toBe('casillero');

    $this->put(route('casillero.contenedores.unidades', $segundo), ['lineas' => contenedorUnidades([[$x, 4]])])->assertSessionHasNoErrors();

    expect($compra->fresh()->etapa)->toBe('contenedor');
});

test('una compra con todas sus unidades en contenedores sale del casillero, y vuelve si se le devuelven', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['compra' => $compra, 'lineas' => [$x, $y]] = contenedorCompra();
    $contenedor = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 12], [$y, 30]])])->assertSessionHasNoErrors();

    expect($compra->fresh()->etapa)->toBe('contenedor')
        ->and($this->get(route('casillero.index'), ['X-Inertia' => 'true'])->json('props.compras'))->toBe([]);

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$y, 0]])])->assertSessionHasNoErrors();

    expect($compra->fresh()->etapa)->toBe('casillero')
        ->and(ContenedorLinea::where('contenedor_id', $contenedor->id)->pluck('compra_producto_id')->all())->toBe([$x])
        ->and($this->get(route('casillero.index'), ['X-Inertia' => 'true'])->json('props.compras.0.id'))->toBe($compra->id);
});

test('solo se asignan líneas de compras del casillero pendientes y a un contenedor abierto', function (string $caso) {
    $this->actingAs(User::factory()->admin()->create());
    ['lineas' => [$linea]] = match ($caso) {
        'compra clásica' => contenedorCompra([[12, 10]], ['flujo' => 'clasico', 'etapa' => null]),
        'compra anulada' => contenedorCompra([[12, 10]], ['estado' => 'anulada']),
        'compra aprobada' => contenedorCompra([[12, 10]], ['estado' => 'aprobada']),
        default => contenedorCompra([[12, 10]]),
    };
    $contenedor = $caso === 'contenedor cancelado' ? Contenedor::factory()->cancelado()->create() : Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$linea, 1]])])->assertSessionHasErrors('error');

    expect(ContenedorLinea::count())->toBe(0);
})->with(['compra clásica', 'compra anulada', 'compra aprobada', 'contenedor cancelado']);

// ─── Cargos del contenedor ───────────────────────────────────────────────────

test('un cargo del contenedor se paga con un Gasto desde una cuenta USD y no cuelga de ninguna compra', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);
    $contenedor = Contenedor::factory()->create(['nombre' => 'MSC-001']);

    $this->post(route('casillero.contenedores.cargos.store', $contenedor), [
        'concepto' => 'Transporte marítimo', 'monto' => 50, 'cuenta_id' => $cuenta->id, 'fecha' => '2026-10-26',
    ])->assertSessionHasNoErrors()->assertSessionHas('success');

    $cargo = CasilleroCargo::with(['compras', 'movimientoFinanciero'])->firstOrFail();

    expect($cargo->contenedor_id)->toBe($contenedor->id)
        ->and($cargo->compras)->toHaveCount(0)
        ->and($cargo->monto_usd)->toBe(50.0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(50.0)
        ->and($cargo->movimientoFinanciero)->toMatchArray(['tipo_movimiento_id' => 1, 'estado' => 'completado', 'saldo_anterior_origen' => 100.0, 'saldo_posterior_origen' => 50.0]);
});

test('un cargo del contenedor se rechaza sin tocar nada si la cuenta no es USD, no alcanza el saldo o el contenedor no está abierto', function (string $caso) {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);
    $contenedor = Contenedor::factory()->create();
    $datos = ['concepto' => 'Transporte', 'monto' => 50, 'cuenta_id' => $cuenta->id];

    match ($caso) {
        'cuenta CUP' => $datos['cuenta_id'] = crearCuentaEnMoneda(crearMoneda('CUP', 24), 5000)->id,
        'saldo insuficiente' => $datos['monto'] = 100.01,
        'contenedor cancelado' => $contenedor->update(['estado' => 'cancelado']),
    };

    $this->post(route('casillero.contenedores.cargos.store', $contenedor), $datos)->assertSessionHasErrors('error');

    expect(CasilleroCargo::count())->toBe(0)
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);
})->with(['cuenta CUP', 'saldo insuficiente', 'contenedor cancelado']);

test('anular un cargo del contenedor devuelve el dinero a la cuenta', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);
    $contenedor = Contenedor::factory()->create();

    $this->post(route('casillero.contenedores.cargos.store', $contenedor), ['concepto' => 'Transporte', 'monto' => 50, 'cuenta_id' => $cuenta->id])->assertSessionHasNoErrors();
    $cargo = CasilleroCargo::firstOrFail();

    $this->post(route('casillero.cargos.anular', $cargo), ['motivo' => 'Monto mal escrito'])->assertSessionHasNoErrors();

    expect($cargo->fresh()->estado)->toBe('anulado')
        ->and($cargo->movimientoFinanciero->fresh()->estado)->toBe('cancelado')
        ->and((float) $cuenta->fresh()->saldo_cuenta)->toBe(100.0);
});

// ─── Cancelar ────────────────────────────────────────────────────────────────

test('cancelar un contenedor devuelve sus unidades al casillero; con cargos activos no se puede hasta anularlos', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    ['compra' => $compra, 'lineas' => [$x]] = contenedorCompra([[12, 10]]);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);
    $contenedor = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 12]])])->assertSessionHasNoErrors();
    $this->post(route('casillero.contenedores.cargos.store', $contenedor), ['concepto' => 'Transporte', 'monto' => 50, 'cuenta_id' => $cuenta->id])->assertSessionHasNoErrors();

    $this->post(route('casillero.contenedores.cancelar', $contenedor))->assertSessionHasErrors('error');

    expect($contenedor->fresh()->estado)->toBe('abierto')
        ->and($compra->fresh()->etapa)->toBe('contenedor');

    $this->post(route('casillero.cargos.anular', CasilleroCargo::firstOrFail()), ['motivo' => 'x'])->assertSessionHasNoErrors();
    $this->post(route('casillero.contenedores.cancelar', $contenedor))->assertSessionHasNoErrors()->assertSessionHas('success');

    expect($contenedor->fresh()->estado)->toBe('cancelado')
        ->and(ContenedorLinea::count())->toBe(0)
        ->and($compra->fresh()->etapa)->toBe('casillero');

    $this->post(route('casillero.contenedores.cancelar', $contenedor))->assertSessionHasErrors('error');
});

// ─── Listado ─────────────────────────────────────────────────────────────────

test('el listado de contenedores trae los abiertos con sus líneas, cargos y totales, y lo que aún se puede asignar', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();
    ['compra' => $compra, 'lineas' => [$x, $y]] = contenedorCompra();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 100);
    $abierto = Contenedor::factory()->create(['nombre' => 'MSC-001']);
    Contenedor::factory()->cancelado()->create();

    $this->put(route('casillero.contenedores.unidades', $abierto), ['lineas' => contenedorUnidades([[$x, 12], [$y, 10]])])->assertSessionHasNoErrors();
    $this->post(route('casillero.contenedores.cargos.store', $abierto), ['concepto' => 'Transporte', 'monto' => 50, 'cuenta_id' => $cuenta->id])->assertSessionHasNoErrors();
    $anulado = CasilleroCargo::factory()->anulado()->create(['contenedor_id' => $abierto->id, 'monto_usd' => 999, 'cuenta_id' => $cuenta->id]);

    $props = $this->get(route('casillero.contenedores.index'), ['X-Inertia' => 'true'])->assertOk()->json('props');

    expect($props['contenedores'])->toHaveCount(1)
        ->and($props['contenedores'][0])->toMatchArray(['nombre' => 'MSC-001', 'unidades' => 22, 'valor_mercancia_usd' => 170, 'cargos_usd' => 50])
        ->and($props['contenedores'][0]['lineas'])->toHaveCount(2)
        ->and($props['contenedores'][0]['cargos'])->toHaveCount(1)
        ->and($props['disponibles'])->toHaveCount(1)
        ->and($props['disponibles'][0])->toMatchArray(['compra_producto_id' => $y, 'compra_id' => $compra->id, 'en_casillero' => 20, 'precio' => 5])
        ->and($props['resumen'])->toMatchArray(['contenedores' => 1, 'unidades' => 22, 'valor_mercancia_usd' => 170, 'cargos_usd' => 50])
        ->and($anulado->estado)->toBe('anulado');
});

// ─── La compra no se anula con unidades en un contenedor ─────────────────────

test('una compra con unidades en un contenedor no se anula hasta sacarlas', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['compra' => $compra, 'lineas' => [$x]] = contenedorCompra([[12, 10]]);
    $contenedor = Contenedor::factory()->create();

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 5]])])->assertSessionHasNoErrors();

    $this->post(route('comprar.anular', $compra), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'Error'])->assertSessionHasErrors('error');
    expect($compra->fresh()->estado)->toBe('pendiente');

    $this->put(route('casillero.contenedores.unidades', $contenedor), ['lineas' => contenedorUnidades([[$x, 0]])])->assertSessionHasNoErrors();
    $this->post(route('comprar.anular', $compra), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'Error'])->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('anulada');
});
