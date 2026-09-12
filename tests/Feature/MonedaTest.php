<?php

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
