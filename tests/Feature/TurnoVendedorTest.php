<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\TurnoVendedor;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

test('vendedor puede capturar su turno', function () {
    $user = User::factory()->vendedor()->create();
    $this->actingAs($user);

    $response = $this->post(route('turno-vendedor.store'), [
        'nombre_vendedor' => 'Juan Pérez',
    ]);

    $response->assertRedirect();
    expect(TurnoVendedor::where('user_id', $user->id)->where('nombre_vendedor', 'Juan Pérez')->exists())->toBeTrue();
});

test('capturar turno requiere nombre_vendedor', function () {
    $user = User::factory()->vendedor()->create();
    $this->actingAs($user);

    $response = $this->post(route('turno-vendedor.store'), []);

    $response->assertSessionHasErrors('nombre_vendedor');
});

test('capturar un segundo turno el mismo día agrega una fila nueva, no reemplaza la anterior', function () {
    $user = User::factory()->vendedor()->create();
    $this->actingAs($user);

    $this->post(route('turno-vendedor.store'), ['nombre_vendedor' => 'María']);
    $this->post(route('turno-vendedor.store'), ['nombre_vendedor' => 'Pedro']);

    expect(TurnoVendedor::where('user_id', $user->id)->count())->toBe(2);
    expect($user->fresh()->turnoActivo()->nombre_vendedor)->toBe('Pedro');
});

test('admin nunca requiere captura de turno', function () {
    $admin = User::factory()->admin()->create();

    expect($admin->requiereCapturaTurno())->toBeFalse();
});

test('vendedor sin turno capturado hoy requiere captura', function () {
    $user = User::factory()->vendedor()->create();

    expect($user->requiereCapturaTurno())->toBeTrue();

    TurnoVendedor::factory()->for($user)->create(['iniciado_en' => now()]);

    expect($user->fresh()->requiereCapturaTurno())->toBeFalse();
});

test('un turno capturado ayer ya no cuenta hoy — requiere captura de nuevo', function () {
    $user = User::factory()->vendedor()->create();
    TurnoVendedor::factory()->for($user)->create(['iniciado_en' => Carbon::yesterday()]);

    expect($user->requiereCapturaTurno())->toBeTrue();
});

test('moderador sin turno no puede crear un gasto (escritura bloqueada)', function () {
    crearTiposMovimientoFinanciero();
    $moneda = crearMonedaUsd();
    $user = User::factory()->moderador()->create();
    $cuenta = crearCuentaEnMoneda($moneda, 1000, $user);
    $this->actingAs($user);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 10,
        'moneda' => 'USD',
        'comentario' => 'Test',
    ]);

    $response->assertStatus(403);
});

test('moderador con turno capturado hoy sí puede crear un gasto', function () {
    crearTiposMovimientoFinanciero();
    $moneda = crearMonedaUsd();
    $user = User::factory()->moderador()->create();
    $cuenta = crearCuentaEnMoneda($moneda, 1000, $user);
    TurnoVendedor::factory()->for($user)->create(['iniciado_en' => now()]);
    $this->actingAs($user);

    $response = $this->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta',
        'origen_id' => $cuenta->id,
        'monto' => 10,
        'moneda' => 'USD',
        'comentario' => 'Test',
    ]);

    $response->assertSessionDoesntHaveErrors();
});

test('vendedor sin turno igual puede navegar (GET no se bloquea)', function () {
    $user = User::factory()->vendedor()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});

test('vendedor sin turno igual puede cerrar sesión', function () {
    $user = User::factory()->vendedor()->create();
    $this->actingAs($user);

    $response = $this->post(route('logout'));

    $response->assertRedirect();
});

test('la venta creada por un vendedor con turno activo guarda el turno_vendedor_id', function () {
    $user = User::factory()->vendedor()->create();
    $turno = TurnoVendedor::factory()->for($user)->create(['iniciado_en' => now()]);
    $this->actingAs($user);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $user->almacenes()->attach($almacen->id);
    $monedaUsd = crearMonedaUsd();
    $cuenta = crearCuentaEnMoneda($monedaUsd, 1000, $user);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $codigo = ProductoCodigo::factory()->default()->create([
        'producto_id' => $producto->id,
        'cantidad' => 100,
    ]);
    AlmacenProducto::create([
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 100,
    ]);
    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => 20,
        'venta_ganancia' => 10,
        'comision' => 2,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $payload = [
        'almacen_id' => $almacen->id,
        'cliente_id' => null,
        'moneda_cobro_id' => null,
        'items' => [[
            'producto_id' => $producto->id,
            'producto_codigo_id' => $codigo->id,
            'cantidad' => 1,
            'precio_venta' => 20,
            'subtotal' => 20,
        ]],
        'total' => 20,
        'moneda_principal_id' => $monedaUsd->id,
        'tasa_cambio_principal' => 1,
        'pagos' => [[
            'metodo' => 'efectivo',
            'moneda_id' => $monedaUsd->id,
            'monto' => 20,
            'tasa_cambio' => 1,
            'monto_equivalente' => 20,
            'cuenta_id' => $cuenta->id,
        ]],
    ];

    $response = $this->postJson(route('ventas.procesar'), $payload);

    $response->assertOk();
    $venta = Venta::latest('id')->first();
    expect($venta->turno_vendedor_id)->toBe($turno->id);
});
