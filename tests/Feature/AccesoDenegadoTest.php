<?php

use App\Http\Middleware\EnsureUserIsAdmin;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// ==========================================================================
// Middlewares de rol — sin permiso: al inicio con aviso; sin sesión: al login
// ==========================================================================

test('un vendedor que abre un reporte va al inicio con el aviso de acceso denegado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    $this->actingAs($vendedor)->get(route('reportes.ventas_por_periodo'))
        ->assertRedirect(route('dashboard'))
        ->assertSessionHas('error', 'No tienes permiso para acceder a esa sección.');
});

test('un moderador sí entra a los reportes que permite el middleware admin', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);

    $this->actingAs($moderador)->get(route('reportes.ventas_por_periodo'))->assertOk();
});

test('un moderador que abre una sección solo de admin va al inicio con el aviso', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);

    $this->actingAs($moderador)->get(route('monedas.index'))
        ->assertRedirect(route('dashboard'))
        ->assertSessionHas('error');
});

test('las peticiones JSON sin permiso siguen recibiendo 403 y no una redirección', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);

    $this->actingAs($vendedor)->getJson(route('reportes.ventas_por_periodo'))
        ->assertForbidden()
        ->assertJson(['message' => 'Forbidden']);
});

test('sin sesión, el middleware de rol manda al login y no a una ruta inexistente', function () {
    $respuesta = (new EnsureUserIsAdmin)->handle(Request::create('/reportes/ventas-por-periodo'), fn () => response('ok'));

    expect($respuesta->getTargetUrl())->toBe(route('login'));
});

test('los middlewares moderator y vendor también redirigen al inicio con el aviso', function () {
    Route::middleware(['web', 'auth', 'moderator'])->get('/_prueba/solo-moderador', fn () => 'ok');
    Route::middleware(['web', 'auth', 'vendor'])->get('/_prueba/solo-vendedor', fn () => 'ok');
    $vendedor = User::factory()->vendedor()->create();
    $moderador = User::factory()->moderador()->create();

    $this->actingAs($vendedor)->get('/_prueba/solo-moderador')
        ->assertRedirect(route('dashboard'))->assertSessionHas('error');
    $this->actingAs($moderador)->get('/_prueba/solo-vendedor')
        ->assertRedirect(route('dashboard'))->assertSessionHas('error');
});

// ==========================================================================
// Páginas de error — fuera de local/testing se renderizan con la página con la mascota
// ==========================================================================

test('en producción un 404 se muestra con la página de error de la aplicación', function () {
    $this->app->detectEnvironment(fn () => 'production');
    $this->actingAs(User::factory()->admin()->create());

    $this->get('/esta-pagina-no-existe')->assertNotFound()->assertInertia(fn ($page) => $page
        ->component('errors/Error')
        ->where('status', 404)
        ->where('authenticated', true));
});

test('en producción un 403 y un 500 usan la misma página de error', function () {
    $this->app->detectEnvironment(fn () => 'production');
    Route::middleware('web')->get('/_prueba/prohibido', fn () => abort(403));
    Route::middleware('web')->get('/_prueba/roto', fn () => throw new RuntimeException('falla de prueba'));

    $this->get('/_prueba/prohibido')->assertForbidden()->assertInertia(fn ($page) => $page
        ->component('errors/Error')->where('status', 403)->where('authenticated', false));
    $this->get('/_prueba/roto')->assertStatus(500)->assertInertia(fn ($page) => $page
        ->component('errors/Error')->where('status', 500));
});

test('en el entorno de pruebas los errores no usan la página de la aplicación (se ve el error real)', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->get('/esta-pagina-no-existe')->assertNotFound();
    expect(app()->environment('testing'))->toBeTrue();
});
