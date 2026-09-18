<?php

use App\Models\HistorialTasaCambio;
use App\Models\Moneda;
use App\Models\User;

// ==========================================================================
// CATÁLOGO DE INSIGNIAS — monedas.imagen (independiente de cuentas.imagen)
// ==========================================================================

test('store() guarda una insignia de moneda válida', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $response = $this->post(route('monedas.store'), [
        'codigo_moneda' => 'MXN',
        'nombre_moneda' => 'Peso Mexicano '.uniqid(),
        'simbolo_moneda' => 'MXN',
        'imagen' => 'mxn',
        'tasa_cambio' => 18.5,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    $response->assertRedirect(route('monedas.index'));
    $this->assertDatabaseHas('monedas', ['codigo_moneda' => 'MXN', 'imagen' => 'mxn']);
});

test('store() rechaza una insignia de moneda que no existe en el catálogo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $response = $this->post(route('monedas.store'), [
        'codigo_moneda' => 'GBP',
        'nombre_moneda' => 'Libra Esterlina '.uniqid(),
        'simbolo_moneda' => 'GBP',
        'imagen' => 'insignia-inventada',
        'tasa_cambio' => 1.2,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    $response->assertSessionHasErrors('imagen');
});

test('store() no exige imagen — una moneda puede quedar sin insignia asignada', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $nombre = 'Moneda Sin Insignia '.uniqid();

    $response = $this->post(route('monedas.store'), [
        'codigo_moneda' => 'BRL',
        'nombre_moneda' => $nombre,
        'simbolo_moneda' => 'BRL',
        'tasa_cambio' => 5.4,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    $response->assertRedirect(route('monedas.index'));
    $this->assertDatabaseHas('monedas', ['nombre_moneda' => $nombre, 'imagen' => null]);
});

test('store() no exige commission — la columna tiene default 0 en la migración', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $nombre = 'Moneda Sin Comision '.uniqid();

    $response = $this->post(route('monedas.store'), [
        'codigo_moneda' => 'EUR',
        'nombre_moneda' => $nombre,
        'simbolo_moneda' => 'EUR',
        'tasa_cambio' => 0.95,
        'estado' => true,
        'principal' => false,
    ]);

    $response->assertRedirect(route('monedas.index'));
    $this->assertDatabaseHas('monedas', ['nombre_moneda' => $nombre, 'commission' => 0]);
});

test('update() cambia la insignia asignada a una moneda existente', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['tasa_cambio' => 1]);

    $response = $this->put(route('monedas.update', $moneda), [
        'codigo_moneda' => $moneda->codigo_moneda,
        'nombre_moneda' => $moneda->nombre_moneda,
        'simbolo_moneda' => $moneda->simbolo_moneda,
        'imagen' => 'brl',
        'tasa_cambio' => $moneda->tasa_cambio,
        'commission' => $moneda->commission,
        'estado' => true,
        'principal' => false,
    ]);

    $response->assertRedirect(route('monedas.index'));
    $this->assertDatabaseHas('monedas', ['id' => $moneda->id, 'imagen' => 'brl']);
});

// ==========================================================================
// HISTORIAL DE CAMBIO DE TASA — impacto financiero (sin cobertura hasta ahora)
// ==========================================================================

test('update() registra un HistorialTasaCambio cuando la tasa realmente cambia', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = Moneda::factory()->create(['tasa_cambio' => 100]);

    $this->put(route('monedas.update', $moneda), [
        'codigo_moneda' => $moneda->codigo_moneda,
        'nombre_moneda' => $moneda->nombre_moneda,
        'simbolo_moneda' => $moneda->simbolo_moneda,
        'tasa_cambio' => 200,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    expect(HistorialTasaCambio::count())->toBe(1);

    $historial = HistorialTasaCambio::first();
    expect($historial->moneda_id)->toBe($moneda->id);
    expect($historial->user_id)->toBe($admin->id);
    expect((float) $historial->tasa_anterior)->toEqual(100.0);
    expect((float) $historial->tasa_nueva)->toEqual(200.0);
    expect((float) $historial->diferencia_tasa)->toEqual(100.0);
    expect((float) $historial->porcentaje_cambio)->toEqual(100.0);
});

test('update() no registra ningún HistorialTasaCambio cuando la tasa no cambia', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = Moneda::factory()->create(['tasa_cambio' => 100, 'nombre_moneda' => 'Original']);

    $this->put(route('monedas.update', $moneda), [
        'codigo_moneda' => $moneda->codigo_moneda,
        'nombre_moneda' => 'Nombre Cambiado',
        'simbolo_moneda' => $moneda->simbolo_moneda,
        'tasa_cambio' => 100,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    expect(HistorialTasaCambio::count())->toBe(0);
    $this->assertDatabaseHas('monedas', ['id' => $moneda->id, 'nombre_moneda' => 'Nombre Cambiado']);
});

test('update() calcula el impacto financiero sobre el capital total de las cuentas en esa moneda', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = Moneda::factory()->create(['tasa_cambio' => 100]);
    crearCuentaEnMoneda($moneda, 1000);

    $this->put(route('monedas.update', $moneda), [
        'codigo_moneda' => $moneda->codigo_moneda,
        'nombre_moneda' => $moneda->nombre_moneda,
        'simbolo_moneda' => $moneda->simbolo_moneda,
        'tasa_cambio' => 200,
        'commission' => 0,
        'estado' => true,
        'principal' => false,
    ]);

    // Capital antes: 1000/100 = 10 (equivalente USD). Capital después: 1000/200 = 5.
    // Impacto: 5 - 10 = -5 (la cuenta "pierde" poder de compra al depreciarse su moneda).
    $historial = HistorialTasaCambio::first();
    expect((float) $historial->impacto_financiero)->toEqual(-5.0);
    expect((float) $historial->impacto_porcentaje)->toEqual(-50.0);
    expect($historial->numero_cuentas_afectadas)->toBe(1);
});

test('create() y edit() exponen el catálogo de insignias de moneda, incluyendo MXN y BRL aunque no existan todavía como registros', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $responseCreate = $this->get(route('monedas.create'));
    $responseCreate->assertInertia(fn ($page) => $page
        ->has('catalogoImagenes', 5)
        ->where('catalogoImagenes.0.slug', 'usd')
        ->where('catalogoImagenes.3.slug', 'mxn')
        ->where('catalogoImagenes.4.slug', 'brl')
    );

    $moneda = Moneda::factory()->create(['imagen' => 'usd']);

    $responseEdit = $this->get(route('monedas.edit', $moneda));
    $responseEdit->assertInertia(fn ($page) => $page
        ->has('catalogoImagenes', 5)
        ->where('moneda.imagen', 'usd')
    );
});

// ==========================================================================
// ACCESO — admin.only (routes/crud/monedas.php). Antes solo 'auth'+'verified',
// cualquier rol autenticado podía cambiar tasa de cambio o borrar una moneda
// por bypass directo de URL, aunque el sidebar ya lo ocultaba a todos menos admin.
// ==========================================================================

test('un admin puede acceder al listado de Monedas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $response = $this->get(route('monedas.index'), ['X-Inertia' => 'true']);

    $response->assertOk();
});

test('un moderador no puede acceder al listado de Monedas (403)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $response = $this->get(route('monedas.index'), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un vendedor no puede acceder al listado de Monedas (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $response = $this->get(route('monedas.index'), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un vendedor no puede cambiar la tasa de cambio por bypass directo de URL (403), y no se modifica nada', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $moneda = Moneda::factory()->create(['tasa_cambio' => 675]);

    $response = $this->put(route('monedas.update', $moneda), [
        'codigo_moneda' => $moneda->codigo_moneda,
        'nombre_moneda' => $moneda->nombre_moneda,
        'simbolo_moneda' => $moneda->simbolo_moneda,
        'tasa_cambio' => 999,
        'commission' => 0,
        'estado' => true,
        'principal' => $moneda->principal,
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect($moneda->fresh()->tasa_cambio)->toEqual(675.0);
});

test('un vendedor no puede eliminar una moneda por bypass directo de URL (403), y no se borra', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $moneda = Moneda::factory()->create(['principal' => false]);

    $response = $this->delete(route('monedas.destroy', $moneda), [], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    $this->assertDatabaseHas('monedas', ['id' => $moneda->id]);
});
