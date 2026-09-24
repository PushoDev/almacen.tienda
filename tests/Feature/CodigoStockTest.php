<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\AlmacenProductoCodigo;
use App\Models\Categoria;
use App\Models\Compra;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Services\CodigoStockService;
use Illuminate\Support\Facades\DB;

/**
 * Producto con 2 códigos repartidos entre dos almacenes: el código A (por defecto) con 12
 * unidades en el primero y el código B con 8 en el mismo primero.
 *
 * @return array{0: Producto, 1: ProductoCodigo, 2: ProductoCodigo}
 */
function productoConDosCodigos(Almacen $almacen, int $unidadesA, int $unidadesB): array
{
    $producto = Producto::factory()->create();
    $codigoA = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id, 'cantidad' => $unidadesA]);
    $codigoB = ProductoCodigo::factory()->create(['producto_id' => $producto->id, 'cantidad' => $unidadesB]);
    AlmacenProducto::create(['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => $unidadesA + $unidadesB]);
    AlmacenProductoCodigo::create(['almacen_id' => $almacen->id, 'producto_codigo_id' => $codigoA->id, 'cantidad' => $unidadesA]);
    AlmacenProductoCodigo::create(['almacen_id' => $almacen->id, 'producto_codigo_id' => $codigoB->id, 'cantidad' => $unidadesB]);

    return [$producto, $codigoA, $codigoB];
}

function unidadesDeCodigoEn(Almacen $almacen, ProductoCodigo $codigo): int
{
    return (int) AlmacenProductoCodigo::where('almacen_id', $almacen->id)->where('producto_codigo_id', $codigo->id)->value('cantidad');
}

// ==========================================================================
// Movimientos — el código viaja con las unidades
// ==========================================================================

test('recibir un movimiento mueve los códigos del origen al destino, empezando por el que más tiene', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    [$producto, $codigoA, $codigoB] = productoConDosCodigos($origen, unidadesA: 12, unidadesB: 8);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 15, 'cantidad_despachada' => 15]);

    $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 15]],
    ])->assertRedirect(route('movimientos.index'));

    // Salen 12 del código con más unidades (A) y 3 del otro (B).
    expect(unidadesDeCodigoEn($origen, $codigoA))->toBe(0);
    expect(unidadesDeCodigoEn($origen, $codigoB))->toBe(5);
    expect(unidadesDeCodigoEn($destino, $codigoA))->toBe(12);
    expect(unidadesDeCodigoEn($destino, $codigoB))->toBe(3);
});

test('recibir de menos mueve solo lo recibido; lo no recibido se queda con su código en el origen', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    [$producto, $codigoA] = productoConDosCodigos($origen, unidadesA: 10, unidadesB: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 6, 'cantidad_despachada' => 6]);

    $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 4]],
    ]);

    expect(unidadesDeCodigoEn($origen, $codigoA))->toBe(6);
    expect(unidadesDeCodigoEn($destino, $codigoA))->toBe(4);
});

// ==========================================================================
// Compras, transferencia de código y fusión de fichas
// ==========================================================================

test('aprobar una compra deja las unidades con su código en el almacén de esa línea', function () {
    $this->actingAs(User::factory()->admin()->create());

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Reparto',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-24',
        'productos' => [[
            'almacen_id' => $almacen->id,
            'producto' => 'Producto Reparto',
            'categoria' => $categoria->nombre_categoria,
            'codigo_barras' => 'REPARTO-001',
            'cantidad' => 6,
            'precio' => 10,
        ]],
    ])->assertSessionHasNoErrors();

    $compra = Compra::firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $codigo = ProductoCodigo::where('codigo_barras', 'REPARTO-001')->firstOrFail();
    expect(unidadesDeCodigoEn($almacen, $codigo))->toBe(6);
});

test('transferir cantidad a otro código cambia el código de esas unidades en el almacén donde estaban', function () {
    $this->actingAs(User::factory()->admin()->create());

    $almacen = Almacen::factory()->almacen()->create();
    [$producto, $codigoA] = productoConDosCodigos($almacen, unidadesA: 10, unidadesB: 0);

    $this->post(route('productos.transferir-codigo', $producto), [
        'codigo_origen_id' => $codigoA->id,
        'nuevo_codigo' => 'NUEVO-ESCANEADO',
        'cantidad' => 4,
    ])->assertSessionHasNoErrors();

    $nuevo = ProductoCodigo::where('codigo_barras', 'NUEVO-ESCANEADO')->firstOrFail();
    expect(unidadesDeCodigoEn($almacen, $codigoA))->toBe(6);
    expect(unidadesDeCodigoEn($almacen, $nuevo))->toBe(4);
});

test('fusionar fichas con un código de barras repetido junta su reparto por almacén en el código que queda', function () {
    $this->actingAs(User::factory()->admin()->create());

    $almacen = Almacen::factory()->almacen()->create();
    $datos = ['nombre_producto' => 'VENTILADOR', 'marca_producto' => 'ACME', 'modelo_producto' => 'X1', 'capacidad_producto' => null, 'color_producto' => null];
    $conservar = Producto::factory()->create($datos);
    $eliminar = Producto::factory()->create($datos);
    $codigoQueQueda = ProductoCodigo::factory()->create(['producto_id' => $conservar->id, 'codigo_barras' => '7501', 'cantidad' => 3]);
    $codigoRepetido = ProductoCodigo::factory()->create(['producto_id' => $eliminar->id, 'codigo_barras' => '7501', 'cantidad' => 2]);
    AlmacenProductoCodigo::create(['almacen_id' => $almacen->id, 'producto_codigo_id' => $codigoQueQueda->id, 'cantidad' => 3]);
    AlmacenProductoCodigo::create(['almacen_id' => $almacen->id, 'producto_codigo_id' => $codigoRepetido->id, 'cantidad' => 2]);

    $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ])->assertOk();

    expect(unidadesDeCodigoEn($almacen, $codigoQueQueda))->toBe(5);
    expect(AlmacenProductoCodigo::where('producto_codigo_id', $codigoRepetido->id)->count())->toBe(0);
});

// ==========================================================================
// CodigoStockService — límites
// ==========================================================================

test('descontar nunca deja el reparto de un código por debajo de cero', function () {
    $almacen = Almacen::factory()->almacen()->create();
    [, $codigoA] = productoConDosCodigos($almacen, unidadesA: 2, unidadesB: 0);

    app(CodigoStockService::class)->descontar($almacen->id, $codigoA->id, 5);

    expect(unidadesDeCodigoEn($almacen, $codigoA))->toBe(0);
});

test('mover unidades que el origen no sabe de qué código son las deja en el código por defecto del destino', function () {
    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $codigoPorDefecto = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id, 'cantidad' => 10]);
    AlmacenProducto::create(['almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 10]);

    app(CodigoStockService::class)->mover($producto->id, $origen->id, $destino->id, 4);

    expect(unidadesDeCodigoEn($destino, $codigoPorDefecto))->toBe(4);
});

// ==========================================================================
// Comando de llenado inicial
// ==========================================================================

test('el llenado inicial asigna todo el stock al único código de un producto y es repetible', function () {
    $almacen = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $codigo = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id, 'cantidad' => 9]);
    AlmacenProducto::create(['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 9]);

    $this->artisan('codigos:backfill-por-almacen')->assertSuccessful();
    $this->artisan('codigos:backfill-por-almacen')->assertSuccessful();

    expect(unidadesDeCodigoEn($almacen, $codigo))->toBe(9);
    expect(AlmacenProductoCodigo::count())->toBe(1);
});

test('el llenado inicial respeta el código que dicen las compras aprobadas para cada almacén', function () {
    $almacenX = Almacen::factory()->almacen()->create();
    $almacenY = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $codigoA = ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id, 'cantidad' => 5, 'codigo_barras' => 'COD-A']);
    $codigoB = ProductoCodigo::factory()->create(['producto_id' => $producto->id, 'cantidad' => 5, 'codigo_barras' => 'COD-B']);
    AlmacenProducto::create(['almacen_id' => $almacenX->id, 'producto_id' => $producto->id, 'cantidad' => 5]);
    AlmacenProducto::create(['almacen_id' => $almacenY->id, 'producto_id' => $producto->id, 'cantidad' => 5]);

    $compra = Compra::factory()->create();
    DB::table('compras')->where('id', $compra->id)->update(['estado' => 'aprobada']);
    DB::table('compra_producto')->insert([
        'compra_id' => $compra->id, 'producto_id' => $producto->id, 'cantidad' => 5, 'precio' => 10,
        'almacen_id' => $almacenY->id, 'codigo_barras' => 'COD-B', 'created_at' => now(), 'updated_at' => now(),
    ]);

    $this->artisan('codigos:backfill-por-almacen')->assertSuccessful();

    expect(unidadesDeCodigoEn($almacenY, $codigoB))->toBe(5); // la compra dice que B llegó a Y
    expect(unidadesDeCodigoEn($almacenX, $codigoA))->toBe(5);
    expect(unidadesDeCodigoEn($almacenX, $codigoB))->toBe(0);
});

test('el llenado inicial en modo dry-run no escribe nada', function () {
    $almacen = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    ProductoCodigo::factory()->default()->create(['producto_id' => $producto->id, 'cantidad' => 9]);
    AlmacenProducto::create(['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 9]);

    $this->artisan('codigos:backfill-por-almacen', ['--dry-run' => true])->assertSuccessful();

    expect(AlmacenProductoCodigo::count())->toBe(0);
});
