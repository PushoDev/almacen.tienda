<?php

use App\Models\Cuenta;
use App\Models\User;

// ==========================================================================
// ACCESO A CUENTAS — `user_cuentas.acceso`: completo (ve el saldo y opera) o cobro (solo recibe pagos)
// ==========================================================================

function datosEmpleado(array $extra = []): array
{
    return array_merge([
        'name' => 'Vendedor Prueba',
        'email' => 'vendedor.prueba@example.com',
        'password' => 'password123',
        'role' => 'vendedor',
    ], $extra);
}

test('al crear un vendedor cada cuenta se guarda con su nivel de acceso', function () {
    $this->actingAs(User::factory()->admin()->create());
    $moneda = crearMonedaUsd();
    $propia = crearCuentaEnMoneda($moneda);
    $compartida = crearCuentaEnMoneda($moneda);

    $this->post(route('empleados.store'), datosEmpleado([
        'cuentas' => [
            ['id' => $propia->id, 'acceso' => Cuenta::ACCESO_COMPLETO],
            ['id' => $compartida->id, 'acceso' => Cuenta::ACCESO_COBRO],
        ],
    ]))->assertRedirect(route('empleados.index'));

    $vendedor = User::where('email', 'vendedor.prueba@example.com')->firstOrFail();

    expect($vendedor->cuentas->pluck('pivot.acceso', 'id')->all())->toBe([
        $propia->id => Cuenta::ACCESO_COMPLETO,
        $compartida->id => Cuenta::ACCESO_COBRO,
    ]);
});

test('al editar un vendedor se puede cambiar el nivel de acceso de una cuenta ya asignada', function () {
    $this->actingAs(User::factory()->admin()->create());
    $vendedor = User::factory()->vendedor()->create();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 1000, $vendedor);

    expect($vendedor->cuentas()->first()->pivot->acceso)->toBe(Cuenta::ACCESO_COMPLETO);

    $this->put(route('empleados.update', $vendedor->id), [
        'name' => $vendedor->name,
        'email' => $vendedor->email,
        'password' => '',
        'role' => 'vendedor',
        'cuentas' => [['id' => $cuenta->id, 'acceso' => Cuenta::ACCESO_COBRO]],
    ])->assertRedirect(route('empleados.index'));

    expect($vendedor->cuentas()->first()->pivot->acceso)->toBe(Cuenta::ACCESO_COBRO);
});

test('cuentasCompletas devuelve solo las cuentas de acceso completo', function () {
    $vendedor = User::factory()->vendedor()->create();
    $moneda = crearMonedaUsd();
    $completa = crearCuentaEnMoneda($moneda, 1000, $vendedor);
    $cobro = crearCuentaEnMoneda($moneda);
    $vendedor->cuentas()->attach($cobro->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    expect($vendedor->cuentas()->count())->toBe(2)
        ->and($vendedor->cuentasCompletas()->pluck('cuentas.id')->all())->toBe([$completa->id]);
});

test('una cuenta asignada sin indicar el acceso queda como completo', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearCuentaEnMoneda(crearMonedaUsd(), 1000, $vendedor);

    expect($vendedor->cuentas()->first()->pivot->acceso)->toBe(Cuenta::ACCESO_COMPLETO);
});

test('rechaza un nivel de acceso que no existe', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $this->post(route('empleados.store'), datosEmpleado([
        'cuentas' => [['id' => $cuenta->id, 'acceso' => 'total']],
    ]))->assertSessionHasErrors('cuentas.0.acceso');

    expect(User::where('email', 'vendedor.prueba@example.com')->exists())->toBeFalse();
});

test('rechaza una cuenta repetida en la asignación', function () {
    $this->actingAs(User::factory()->admin()->create());
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());

    $this->post(route('empleados.store'), datosEmpleado([
        'cuentas' => [
            ['id' => $cuenta->id, 'acceso' => Cuenta::ACCESO_COMPLETO],
            ['id' => $cuenta->id, 'acceso' => Cuenta::ACCESO_COBRO],
        ],
    ]))->assertSessionHasErrors('cuentas.1.id');
});

test('un admin o moderador no guarda cuentas asignadas', function () {
    $this->actingAs(User::factory()->admin()->create());
    $vendedor = User::factory()->vendedor()->create();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 1000, $vendedor);

    $this->put(route('empleados.update', $vendedor->id), [
        'name' => $vendedor->name,
        'email' => $vendedor->email,
        'password' => '',
        'role' => 'moderador',
        'cuentas' => [['id' => $cuenta->id, 'acceso' => Cuenta::ACCESO_COBRO]],
    ])->assertRedirect(route('empleados.index'));

    expect($vendedor->cuentas()->count())->toBe(0);
});

// ==========================================================================
// PERMISOS — solo el admin gestiona empleados
// ==========================================================================

test('un vendedor o moderador no puede gestionar empleados ni cambiar su propio rol', function (string $rol) {
    $usuario = User::factory()->{$rol}()->create();
    crearTurnoActivo($usuario);
    $this->actingAs($usuario);

    $this->get(route('empleados.index'))->assertRedirect(route('dashboard'));
    $this->post(route('empleados.store'), datosEmpleado())->assertRedirect(route('dashboard'));
    $this->put(route('empleados.update', $usuario->id), [
        'name' => $usuario->name,
        'email' => $usuario->email,
        'password' => '',
        'role' => 'admin',
    ])->assertRedirect(route('dashboard'));
    $this->delete(route('empleados.destroy', $usuario->id))->assertRedirect(route('dashboard'));

    expect($usuario->fresh()->role)->toBe($rol);
})->with(['vendedor', 'moderador']);

test('un admin sí puede ver el listado de empleados', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->get(route('empleados.index'))->assertOk();
});

// ==========================================================================
// PANTALLAS Crear/Editar — datos de las tarjetas de cuentas
// ==========================================================================

test('crear y editar empleado reciben las cuentas con lo necesario para las tarjetas y sin saldo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $vendedor = User::factory()->vendedor()->create();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), 1234.56, $vendedor);
    $cuenta->update(['tipo' => 'tarjeta', 'tipo_titular' => 'personal', 'imagen' => 'zelle']);

    foreach ([route('empleados.create'), route('empleados.edit', $vendedor->id)] as $url) {
        $this->get($url)->assertInertia(fn ($page) => $page
            ->has('cuentas', 1)
            ->where('cuentas.0.id', $cuenta->id)
            ->where('cuentas.0.moneda', 'USD')
            ->where('cuentas.0.tipo', 'tarjeta')
            ->where('cuentas.0.tipo_titular', 'personal')
            ->where('cuentas.0.banco.slug', 'zelle')
            ->missing('cuentas.0.saldo_cuenta')
            ->has('tiposCuenta', 2));
    }
});

test('editar empleado entrega el nivel de acceso de cada cuenta asignada', function () {
    $this->actingAs(User::factory()->admin()->create());
    $vendedor = User::factory()->vendedor()->create();
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd());
    $vendedor->cuentas()->attach($cuenta->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    $this->get(route('empleados.edit', $vendedor->id))->assertInertia(fn ($page) => $page
        ->where('empleado.cuentas.0.pivot.acceso', Cuenta::ACCESO_COBRO));
});
