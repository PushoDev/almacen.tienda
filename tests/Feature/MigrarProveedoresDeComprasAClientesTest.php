<?php

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\Proveedor;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/**
 * Compras ya no usa `proveedors`: el proveedor de una compra es un cliente. El comando
 * `compras:migrar-proveedores-a-clientes` pasa las compras antiguas al cliente que reemplaza a cada proveedor.
 */
function compraAntiguaDeProveedor(Proveedor $proveedor, array $extra = []): Compra
{
    // `proveedor_id` ya no es asignable en masa: se escribe directo, como estaban las compras antes del cambio
    $compra = Compra::factory()->create(array_merge(['tipo_compra' => 'deuda_proveedor', 'total_compra' => 100, 'cliente_id' => null], $extra));
    DB::table('compras')->where('id', $compra->id)->update(['proveedor_id' => $proveedor->id]);

    return $compra->fresh();
}

test('--dry-run muestra el plan y no escribe nada', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ANDY']);
    $compra = compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes', ['--dry-run' => true])
        ->expectsOutputToContain('ANDY')
        ->assertSuccessful();

    expect(DB::table('compras')->where('id', $compra->id)->value('proveedor_id'))->toBe($proveedor->id)
        ->and(Cliente::count())->toBe(0);
});

test('crea un cliente por proveedor y mueve sus compras sin cambiar conteo ni total', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ANDY', 'telefono_proveedor' => '555-1', 'localidad_proveedor' => 'MAYABEQUE']);
    $otra = Proveedor::factory()->create(['nombre_proveedor' => 'ELDY']);
    compraAntiguaDeProveedor($proveedor, ['total_compra' => 100]);
    compraAntiguaDeProveedor($proveedor, ['total_compra' => 50]);
    compraAntiguaDeProveedor($otra, ['total_compra' => 25]);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertSuccessful();

    $andy = Cliente::where('nombre_cliente', 'ANDY')->firstOrFail();
    expect($andy->telefono_cliente)->toBe('555-1')
        ->and($andy->ciudad_cliente)->toBe('MAYABEQUE')
        ->and((float) $andy->deuda_pago_cliente)->toBe(0.0)
        ->and(Compra::where('cliente_id', $andy->id)->count())->toBe(2)
        ->and(DB::table('compras')->whereNotNull('proveedor_id')->count())->toBe(0)
        ->and(Compra::count())->toBe(3)
        ->and((float) Compra::sum('total_compra'))->toBe(175.0);
});

test('un proveedor sin teléfono pasa a cliente con el teléfono vacío', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'DEVOLUCIONES', 'telefono_proveedor' => null]);
    compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertSuccessful();

    expect(Cliente::where('nombre_cliente', 'DEVOLUCIONES')->value('telefono_cliente'))->toBeNull();
});

test('si ya hay un cliente con el mismo nombre se reutiliza y no se crea otro', function () {
    $cliente = Cliente::factory()->create(['nombre_cliente' => 'Medardo']);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'MEDARDO']);
    $compra = compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertSuccessful();

    expect(Cliente::count())->toBe(1)
        ->and(Compra::find($compra->id)->cliente_id)->toBe($cliente->id);
});

test('--mapa fusiona un proveedor con un cliente existente, aunque el nombre sea distinto', function () {
    $alberto = Cliente::factory()->create(['nombre_cliente' => 'ALBERTO']);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ALBERTO PROVEEDOR']);
    $compra = compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes', ['--mapa' => ["{$proveedor->id}:{$alberto->id}"]])->assertSuccessful();

    expect(Cliente::count())->toBe(1)
        ->and(Compra::find($compra->id)->cliente_id)->toBe($alberto->id);
});

test('avisa cuando un proveedor se parece a un cliente existente', function () {
    Cliente::factory()->create(['nombre_cliente' => 'ALBERTO']);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ALBERTO PROVEEDOR']);
    compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes', ['--dry-run' => true])
        ->expectsOutputToContain('se parece al cliente')
        ->assertSuccessful();
});

test('un teléfono que ya tiene otro cliente es un conflicto y no se escribe nada', function () {
    Cliente::factory()->create(['telefono_cliente' => '5551234']);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'NUEVO', 'telefono_proveedor' => '5551234']);
    $compra = compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertFailed();

    expect(DB::table('compras')->where('id', $compra->id)->value('proveedor_id'))->toBe($proveedor->id);
});

test('una compra con proveedor y cliente a la vez es un conflicto', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'DOBLE']);
    $compra = compraAntiguaDeProveedor($proveedor);
    DB::table('compras')->where('id', $compra->id)->update(['cliente_id' => Cliente::factory()->create()->id]);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertFailed();

    expect(DB::table('compras')->where('id', $compra->id)->value('proveedor_id'))->toBe($proveedor->id);
});

test('correrlo otra vez no hace nada', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ANDY']);
    compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertSuccessful();
    $this->artisan('compras:migrar-proveedores-a-clientes')->expectsOutputToContain('nada que migrar')->assertSuccessful();

    expect(Cliente::where('nombre_cliente', 'ANDY')->count())->toBe(1);
});

test('el comando no toca el saldo que el proveedor tenga en proveedors', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'MEDARDO', 'saldo_proveedor' => 46256.30]);
    compraAntiguaDeProveedor($proveedor);

    $this->artisan('compras:migrar-proveedores-a-clientes')->assertSuccessful();

    expect((float) $proveedor->fresh()->saldo_proveedor)->toBe(46256.3)
        ->and((float) Cliente::where('nombre_cliente', 'MEDARDO')->value('deuda_pago_cliente'))->toBe(0.0);
});

test('una compra que aún apunta a un proveedor sin migrar no se puede anular y no mueve ningún saldo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $compra = compraAntiguaDeProveedor($proveedor, ['estado' => 'pendiente']);
    CompraPago::create(['compra_id' => $compra->id, 'cuenta_id' => null, 'cliente_id' => null, 'monto' => 100, 'tipo_pago' => 'deuda_proveedor']);

    $this->post(route('comprar.anular', $compra), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'prueba'])
        ->assertSessionHasErrors('error');

    expect($compra->fresh()->estado)->toBe('pendiente')
        ->and((float) $proveedor->fresh()->saldo_proveedor)->toBe(500.0);
});

test('comprar a un nombre nuevo crea un cliente y la compra apunta a él', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'PROVEEDOR NUEVO',
        'fecha' => '2026-10-10',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $cliente = Cliente::where('nombre_cliente', 'PROVEEDOR NUEVO')->firstOrFail();
    expect((float) $cliente->deuda_pago_cliente)->toBe(-10.0)
        ->and(Compra::firstOrFail()->cliente_id)->toBe($cliente->id)
        ->and(DB::table('compras')->value('proveedor_id'))->toBeNull()
        ->and(Proveedor::count())->toBe(0);
});

test('la lista para comprar es la de clientes físicos, con su saldo, y ya no hay lista de proveedores', function () {
    $this->actingAs(User::factory()->admin()->create());
    Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => -40]);
    Cliente::factory()->create(['tipo_cliente' => 'fisico']);
    Proveedor::factory()->create();

    $clientes = collect($this->getJson(route('compras.clientes.fisicos'))->assertOk()->json());

    expect($clientes)->toHaveCount(2)
        ->and($clientes->pluck('deuda_pago_cliente')->map(fn ($s) => (float) $s)->contains(-40.0))->toBeTrue()
        ->and(Route::has('compras.proveedores'))->toBeFalse()
        ->and(Route::has('compras.proveedor.store'))->toBeFalse();
});

test('crear el cliente al que se le compra reutiliza el existente y no crea proveedores', function () {
    $this->actingAs(User::factory()->admin()->create());
    $datos = ['nombre_cliente' => 'MEDARDO NUEVO', 'telefono_cliente' => '555-9', 'tipo_cliente' => 'fisico'];

    $this->postJson(route('compras.cliente.store'), $datos)->assertCreated()->assertJsonPath('existe', false);
    $this->postJson(route('compras.cliente.store'), $datos)->assertOk()->assertJsonPath('existe', true);

    expect(Cliente::where('nombre_cliente', 'MEDARDO NUEVO')->count())->toBe(1)
        ->and(Proveedor::count())->toBe(0);
});
