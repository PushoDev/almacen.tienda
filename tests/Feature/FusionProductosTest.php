<?php

use App\Models\Almacen;
use App\Models\Compra;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\VentaDetalle;
use Illuminate\Support\Facades\DB;

/**
 * Ficha del mismo producto físico (nombre/marca/modelo/capacidad/color idénticos) — una
 * "ficha hermana" más cada vez que se llama.
 */
function fichaVentilador(array $atributos = []): Producto
{
    return Producto::factory()->create(array_merge([
        'nombre_producto' => 'VENTILADOR F6',
        'marca_producto' => 'ACME',
        'modelo_producto' => 'RECARGABLE',
        'capacidad_producto' => '20000 MAH',
        'color_producto' => null,
        'precio_compra_producto' => 30,
    ], $atributos));
}

function stockConLote(Producto $producto, Almacen $almacen, int $cantidad, float $costo): LoteStock
{
    $producto->almacenes()->attach($almacen->id, ['cantidad' => $cantidad]);

    return LoteStock::create([
        'codigo' => 'LOTE-'.$producto->id.'-'.$almacen->id,
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => $cantidad,
        'precio_costo' => $costo,
    ]);
}

function precioEnAlmacen(Producto $producto, Almacen $almacen, float $precio, float $comision = 0): void
{
    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => $precio,
        'comision' => $comision,
    ]);
}

test('un vendedor no puede ver ni fusionar productos duplicados', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();

    $listar = $this->getJson(route('productos.duplicados'));
    $fusionar = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $listar->assertForbidden();
    $fusionar->assertForbidden();
    $this->assertModelExists($eliminar);
});

test('fusionar reasigna ventas, compras, lotes, movimientos y códigos en vez de borrarlos', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $almacen, 10, 30);
    $loteEliminado = stockConLote($eliminar, $almacen, 5, 37);
    $venta = VentaDetalle::factory()->create(['producto_id' => $eliminar->id]);
    $codigo = ProductoCodigo::factory()->create(['producto_id' => $eliminar->id, 'codigo_barras' => 'SOLO-EN-ELIMINADA']);
    $compraLinea = DB::table('compra_producto')->insertGetId(['compra_id' => Compra::factory()->create()->id, 'producto_id' => $eliminar->id, 'cantidad' => 5, 'precio' => 37]);
    $movimientoLinea = DB::table('movimiento_detalles')->insertGetId(['movimiento_id' => Movimiento::factory()->create()->id, 'producto_id' => $eliminar->id, 'cantidad_solicitada' => 5]);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertOk()->assertJsonPath('resultado.cantidad_total', 15);
    $this->assertModelMissing($eliminar);
    expect($venta->fresh()->producto_id)->toBe($conservar->id)
        ->and($codigo->fresh()->producto_id)->toBe($conservar->id)
        ->and(DB::table('compra_producto')->where('id', $compraLinea)->value('producto_id'))->toBe($conservar->id)
        ->and(DB::table('movimiento_detalles')->where('id', $movimientoLinea)->value('producto_id'))->toBe($conservar->id);
    // El lote se mueve con su costo propio: el costo real del almacén queda ponderado (10*30 + 5*37)/15.
    expect($loteEliminado->fresh()->producto_id)->toBe($conservar->id)
        ->and((float) $loteEliminado->fresh()->precio_costo)->toBe(37.0)
        ->and($conservar->fresh()->costoEnAlmacen($almacen->id))->toBe(32.33);
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $conservar->id, 'almacen_id' => $almacen->id, 'cantidad' => 15]);
});

test('un código de barras repetido se unifica y la venta que lo usaba apunta al que queda', function () {
    $this->actingAs(User::factory()->admin()->create());
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    $codigoQueQueda = ProductoCodigo::factory()->create(['producto_id' => $conservar->id, 'codigo_barras' => '7501']);
    $codigoRepetido = ProductoCodigo::factory()->create(['producto_id' => $eliminar->id, 'codigo_barras' => '7501']);
    $venta = VentaDetalle::factory()->create(['producto_id' => $eliminar->id, 'producto_codigo_id' => $codigoRepetido->id]);

    $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ])->assertOk();

    $this->assertModelMissing($codigoRepetido);
    expect($venta->fresh()->producto_codigo_id)->toBe($codigoQueQueda->id);
});

test('no se fusiona si las fichas tienen precios distintos en un almacén y no se eligió cuál queda', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create(['nombre_almacen' => 'BEJUCAL']);
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $almacen, 257, 30);
    stockConLote($eliminar, $almacen, 23, 37);
    precioEnAlmacen($conservar, $almacen, 49, 3);
    precioEnAlmacen($eliminar, $almacen, 52, 3);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors(['precios_por_almacen' => 'BEJUCAL']);
    $this->assertModelExists($eliminar);
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $conservar->id, 'cantidad' => 257]);
});

test('fusionar con precio elegido deja una sola fila de precio y registra el cambio en el historial', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $almacen, 257, 30);
    stockConLote($eliminar, $almacen, 23, 37);
    precioEnAlmacen($conservar, $almacen, 49, 3);
    precioEnAlmacen($eliminar, $almacen, 52, 3);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
        'precios_por_almacen' => [$almacen->id => ['precio_venta' => 50.5, 'comision' => 4]],
    ]);

    $response->assertOk();
    expect(DB::table('producto_vendedors')->where('almacen_id', $almacen->id)->get(['producto_id', 'precio_venta', 'comision', 'precio_de_grupo'])->map(fn ($f) => (array) $f)->all())
        ->toEqual([['producto_id' => $conservar->id, 'precio_venta' => '50.50', 'comision' => '4.00', 'precio_de_grupo' => 0]]);
    $this->assertDatabaseHas('precio_historials', [
        'producto_id' => $conservar->id,
        'almacen_id' => $almacen->id,
        'user_id' => $admin->id,
        'precio_anterior' => 49,
        'precio_nuevo' => 50.5,
    ]);
});

test('si todas las fichas venden al mismo precio, la fusión lo conserva sin pedir elección', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $almacen, 2, 30);
    stockConLote($eliminar, $almacen, 414, 31.69);
    precioEnAlmacen($eliminar, $almacen, 49, 3);

    $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ])->assertOk();

    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $conservar->id, 'almacen_id' => $almacen->id, 'precio_venta' => 49, 'comision' => 3]);
    expect(PrecioHistorial::where('producto_id', $conservar->id)->value('accion'))->toStartWith('Fusión de productos');
});

test('no se pueden fusionar fichas de productos distintos', function () {
    $this->actingAs(User::factory()->admin()->create());
    $conservar = fichaVentilador();
    $otroProducto = fichaVentilador(['modelo_producto' => 'CLASSIC']);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$otroProducto->id],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors('productos_eliminar_ids');
    $this->assertModelExists($otroProducto);
});

test('la fusión rechazada revierte también la normalización de capacidad', function () {
    $this->actingAs(User::factory()->admin()->create());
    $conservar = fichaVentilador();
    $otroProducto = fichaVentilador(['modelo_producto' => 'CLASSIC', 'capacidad_producto' => '10000 MAH']);

    $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$otroProducto->id],
        'valores_canonicos' => ['capacidad_producto' => '20000 MAH'],
    ])->assertUnprocessable();

    expect($otroProducto->fresh()->capacidad_producto)->toBe('10000 MAH');
});

test('duplicados agrupa fichas hermanas aunque difieran en mayúsculas y comillas de capacidad', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $a = fichaVentilador(['capacidad_producto' => '3.5"']);
    $b = fichaVentilador(['nombre_producto' => 'ventilador f6', 'capacidad_producto' => '3.5´']);
    fichaVentilador(['modelo_producto' => 'CLASSIC']);
    stockConLote($a, $almacen, 257, 30);
    stockConLote($b, $almacen, 23, 37);
    precioEnAlmacen($a, $almacen, 49, 3);
    precioEnAlmacen($b, $almacen, 52, 3);

    $response = $this->getJson(route('productos.duplicados'));

    // Promedio ponderado por stock: (49*257 + 52*23) / 280 = 49.25
    $response->assertOk()
        ->assertJsonPath('total_grupos', 1)
        ->assertJsonPath('grupos.0.productos.*.id', [$a->id, $b->id])
        ->assertJsonPath('grupos.0.conflictos_precio.0.almacen_id', $almacen->id)
        ->assertJsonPath('grupos.0.conflictos_precio.0.promedio_ponderado', 49.25);
});
