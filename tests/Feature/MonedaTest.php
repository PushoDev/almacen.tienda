<?php

use App\Models\HistorialTasaCambio;
use App\Models\MetodoPago;
use App\Models\Moneda;
use App\Models\User;
use App\Models\ViaPago;

/**
 * Campos de métodos de pago que exige el formulario de Monedas: los dos métodos y una vía de transferencia.
 *
 * @return array{metodos_pago: array<int, string>, vias_pago: array<int, string>}
 */
function datosDePagoDeMoneda(array $metodos = ['transferencia', 'efectivo'], array $vias = ['zelle']): array
{
    return ['metodos_pago' => $metodos, 'vias_pago' => $vias];
}

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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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
        ...datosDePagoDeMoneda(),
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

// ==========================================================================
// MÉTODOS Y VÍAS DE PAGO — qué admite cada moneda (2026-09-26)
// ==========================================================================

function nuevaMonedaPost(array $extra = []): array
{
    return [
        'codigo_moneda' => 'MXN',
        'nombre_moneda' => 'Peso Mexicano '.uniqid(),
        'simbolo_moneda' => 'MXN',
        'tasa_cambio' => 18.5,
        'estado' => true,
        'principal' => false,
    ] + $extra;
}

test('el catálogo trae los dos métodos y las catorce vías: las diez que ya usaba el cobro más TropiPay, Western Union, MoneyGram y Google Pay', function () {
    expect(MetodoPago::orderBy('orden')->pluck('slug')->all())->toBe(['transferencia', 'efectivo']);
    expect(ViaPago::count())->toBe(14);
    expect(ViaPago::where('ambito', 'cuba')->orderBy('orden')->pluck('slug')->all())->toBe(['enzona', 'transfermovil']);
});

test('una moneda nace con los dos métodos y las vías de su ámbito: CUP con las cubanas, las demás con las internacionales', function () {
    $cup = Moneda::factory()->create(['codigo_moneda' => 'CUP']);
    $usd = Moneda::factory()->create(['codigo_moneda' => 'USD']);

    expect($cup->metodosPago()->pluck('slug')->sort()->values()->all())->toBe(['efectivo', 'transferencia']);
    expect($cup->viasPago()->pluck('slug')->all())->toBe(['enzona', 'transfermovil']);
    expect($usd->viasPago()->pluck('slug')->all())->toBe(['zelle', 'cashapp', 'square', 'visa', 'mastercard', 'stripe', 'paypal', 'qvapay', 'tropipay', 'westernunion', 'moneygram', 'googlepay']);
});

test('store() guarda los métodos y las vías que se eligieron en el formulario', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->post(route('monedas.store'), nuevaMonedaPost(datosDePagoDeMoneda(['transferencia', 'efectivo'], ['zelle', 'paypal'])))
        ->assertRedirect(route('monedas.index'));

    $moneda = Moneda::where('codigo_moneda', 'MXN')->sole();
    expect($moneda->metodosPago()->pluck('slug')->sort()->values()->all())->toBe(['efectivo', 'transferencia']);
    expect($moneda->viasPago()->pluck('slug')->sort()->values()->all())->toBe(['paypal', 'zelle']); // no las 8 por defecto
});

test('una moneda puede admitir un solo método: solo efectivo no lleva vías, aunque lleguen', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->post(route('monedas.store'), nuevaMonedaPost(datosDePagoDeMoneda(['efectivo'], ['zelle'])))
        ->assertRedirect(route('monedas.index'));

    $moneda = Moneda::where('codigo_moneda', 'MXN')->sole();
    expect($moneda->metodosPago()->pluck('slug')->all())->toBe(['efectivo']);
    expect($moneda->viasPago()->count())->toBe(0); // sin transferencia no hay vías que guardar
});

test('store() rechaza una moneda sin métodos, con un método o una vía que no existen, o con transferencia y sin vías', function (array $datos, string $campo) {
    $this->actingAs(User::factory()->admin()->create());

    $this->post(route('monedas.store'), nuevaMonedaPost($datos))->assertSessionHasErrors($campo);

    expect(Moneda::where('codigo_moneda', 'MXN')->exists())->toBeFalse();
})->with([
    'sin ningún método' => [['metodos_pago' => [], 'vias_pago' => []], 'metodos_pago'],
    'método que no existe' => [['metodos_pago' => ['cheque'], 'vias_pago' => []], 'metodos_pago.0'],
    'vía que no existe' => [['metodos_pago' => ['transferencia'], 'vias_pago' => ['bitcoin']], 'vias_pago.0'],
    'transferencia sin ninguna vía' => [['metodos_pago' => ['transferencia', 'efectivo'], 'vias_pago' => []], 'vias_pago'],
]);

test('update() cambia lo que admite la moneda: de EnZona y Transfermóvil a solo Transfermóvil y efectivo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'tasa_cambio' => 1]);

    $this->put(route('monedas.update', $cup), [
        'codigo_moneda' => 'CUP',
        'nombre_moneda' => $cup->nombre_moneda,
        'simbolo_moneda' => $cup->simbolo_moneda,
        'tasa_cambio' => 1,
        'estado' => true,
        'principal' => false,
        ...datosDePagoDeMoneda(['transferencia', 'efectivo'], ['transfermovil']),
    ])->assertRedirect(route('monedas.index'));

    expect($cup->viasPago()->pluck('slug')->all())->toBe(['transfermovil']);
});

test('update() quita la transferencia y con ella todas sus vías', function () {
    $this->actingAs(User::factory()->admin()->create());
    $usd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'tasa_cambio' => 1]);

    $this->put(route('monedas.update', $usd), [
        'codigo_moneda' => 'USD',
        'nombre_moneda' => $usd->nombre_moneda,
        'simbolo_moneda' => $usd->simbolo_moneda,
        'tasa_cambio' => 1,
        'estado' => true,
        'principal' => false,
        ...datosDePagoDeMoneda(['efectivo'], ['zelle']),
    ])->assertRedirect(route('monedas.index'));

    expect($usd->metodosPago()->pluck('slug')->all())->toBe(['efectivo']);
    expect($usd->viasPago()->count())->toBe(0);
});

test('edit() entrega el catálogo con logos y lo que admite hoy la moneda; show() entrega el resumen', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cup = Moneda::factory()->create(['codigo_moneda' => 'CUP']);

    $this->get(route('monedas.edit', $cup))->assertInertia(fn ($page) => $page
        ->where('metodosPagoActuales.metodos', fn ($m) => collect($m)->sort()->values()->all() === ['efectivo', 'transferencia'])
        ->where('metodosPagoActuales.vias', ['enzona', 'transfermovil'])
        ->has('catalogoMetodosPago.metodos', 2)
        ->has('catalogoMetodosPago.vias', 14)
        ->where('catalogoMetodosPago.vias', fn ($vias) => collect($vias)->firstWhere('slug', 'enzona')['imagen_url'] !== null));

    $this->get(route('monedas.show', $cup))->assertInertia(fn ($page) => $page
        ->where('moneda.metodos_pago_resumen', function ($resumen) {
            $porMetodo = collect($resumen)->keyBy('slug');

            return collect($porMetodo['transferencia']['vias'])->pluck('slug')->all() === ['enzona', 'transfermovil']
                && $porMetodo['efectivo']['vias'] === []; // el efectivo no lleva vía
        }));
});

test('cada método y cada vía con imagen apunta a un archivo que existe (EnZona, Transfermóvil, PayPal, Stripe, QvaPay y TropiPay propios; las demás reutilizan card_interacionales)', function () {
    foreach (MetodoPago::whereNotNull('imagen')->get() as $metodo) {
        expect(file_exists(public_path('projects/metodos_pago/'.$metodo->imagen.'.webp')))->toBeTrue("falta el logo del método {$metodo->slug}");
    }

    $vias = ViaPago::whereNotNull('imagen')->get()->keyBy('slug');
    expect($vias->keys()->sort()->values()->all())->toBe(['cashapp', 'enzona', 'mastercard', 'paypal', 'qvapay', 'square', 'stripe', 'transfermovil', 'tropipay', 'visa', 'zelle']);

    foreach ($vias as $via) {
        $ruta = str_contains($via->imagen, '/') ? $via->imagen : 'metodos_pago/'.$via->imagen;
        expect(file_exists(public_path("projects/{$ruta}.webp")))->toBeTrue("falta el logo de la vía {$via->slug}");
        expect($via->imagenUrl())->toEndWith("projects/{$ruta}.webp");
    }
});

test('Western Union, MoneyGram y Google Pay están en el catálogo sin imagen y sin asignar a ninguna moneda, listas para cuando tengan logo', function () {
    // La migración no las asigna a ninguna moneda existente (se activan por moneda en su edición); las
    // monedas NUEVAS sí las reciben con las demás vías internacionales (ver el test de valores por defecto).
    $pendientes = ViaPago::whereIn('slug', ['westernunion', 'moneygram', 'googlepay'])->get();

    expect($pendientes)->toHaveCount(3);
    foreach ($pendientes as $via) {
        expect($via->imagen)->toBeNull()
            ->and($via->imagenUrl())->toBeNull() // el CRUD muestra un ícono
            ->and($via->monedas()->count())->toBe(0);
    }
});

test('una vía sin imagen asignada toma sola el logo public/projects/metodos_pago/{slug}.webp en cuanto existe el archivo', function () {
    $via = ViaPago::factory()->create(['slug' => 'via-de-prueba-'.uniqid(), 'imagen' => null]);
    $archivo = public_path("projects/metodos_pago/{$via->slug}.webp");
    expect($via->imagenUrl())->toBeNull();

    file_put_contents($archivo, 'x');

    try {
        expect($via->imagenUrl())->toEndWith("projects/metodos_pago/{$via->slug}.webp");
    } finally {
        @unlink($archivo);
    }
});
