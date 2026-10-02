<?php

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Compra;
use App\Models\HistorialPrecioCosto;
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

test('fusionar recalcula el costo global ponderado en la ficha conservada y lo registra en el historial de precio de costo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $almacen = Almacen::factory()->create();
    // La ficha que va a quedar ("conservar") tiene más stock que la eliminada — mismo criterio
    // que preselecciona FusionFichasDialog en el frontend.
    $conservar = fichaVentilador(['precio_compra_producto' => 118.82]);
    $eliminar = fichaVentilador(['precio_compra_producto' => 231.45]);
    stockConLote($conservar, $almacen, 360, 118.82);
    stockConLote($eliminar, $almacen, 28, 231.45);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertOk();
    // (360*118.82 + 28*231.45) / 388 = 126.95 — el mismo caso real de PANEL SOLAR LONGI BIFACIAL.
    expect((float) $conservar->fresh()->precio_compra_producto)->toBe(126.95);

    $historial = HistorialPrecioCosto::where('producto_id', $conservar->id)->where('almacen_id', null)->first();
    expect($historial)->not->toBeNull()
        ->and((float) $historial->precio_anterior)->toBe(118.82)
        ->and((float) $historial->precio_nuevo)->toBe(126.95)
        ->and($historial->stock_momento)->toBe(388)
        ->and($historial->user_id)->toBe($admin->id)
        ->and($historial->es_perdida)->toBeFalse(); // el costo subió, no es pérdida de valor
});

test('fusionar informa todos los almacenes con stock y marca como sugeridos los que quedaron con lotes a costo distinto, sin tocarlos', function () {
    $this->actingAs(User::factory()->admin()->create());
    $bejucal = Almacen::factory()->create();
    $quivican = Almacen::factory()->create();
    $conservar = fichaVentilador(['precio_compra_producto' => 118.82]);
    $eliminar = fichaVentilador(['precio_compra_producto' => 231.45]);
    // Bejucal: coincide stock de las 2 fichas a costo distinto — sugerido.
    stockConLote($conservar, $bejucal, 360, 118.82);
    stockConLote($eliminar, $bejucal, 18, 231.45);
    // Quivican: solo la ficha eliminada tenía stock ahí — pasa a la conservada con 1 solo lote,
    // aparece en la lista (el admin puede elegirlo igual) pero no viene sugerido.
    stockConLote($eliminar, $quivican, 4, 231.45);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertOk()->assertJsonCount(2, 'resultado.almacenes');
    $almacenes = collect($response->json('resultado.almacenes'))->keyBy('almacen_id');
    expect($almacenes[$bejucal->id]['sugerido'])->toBeTrue()
        ->and($almacenes[$bejucal->id]['lotes'])->toBe(2)
        ->and($almacenes[$quivican->id]['sugerido'])->toBeFalse()
        ->and($almacenes[$quivican->id]['lotes'])->toBe(1);

    // No se tocó ningún lote — la unificación la dispara el admin aparte, nunca automática.
    expect(LoteStock::where('producto_id', $conservar->id)->where('almacen_id', $bejucal->id)->count())->toBe(2);
});

test('fusionar no marca como sugerido un almacén con 2 lotes si ya tienen el mismo costo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador(['precio_compra_producto' => 30]);
    $eliminar = fichaVentilador(['precio_compra_producto' => 30]);
    stockConLote($conservar, $almacen, 10, 30);
    stockConLote($eliminar, $almacen, 5, 30);

    $response = $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertOk()->assertJsonPath('resultado.almacenes.0.sugerido', false);
});

test('fusionar no crea historial de costo si el promedio ponderado no cambia', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador(['precio_compra_producto' => 30]);
    $eliminar = fichaVentilador(['precio_compra_producto' => 30]);
    stockConLote($conservar, $almacen, 10, 30);
    stockConLote($eliminar, $almacen, 5, 30);

    $this->postJson(route('productos.fusionar'), [
        'producto_conservar_id' => $conservar->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ])->assertOk();

    expect((float) $conservar->fresh()->precio_compra_producto)->toBe(30.0);
    expect(HistorialPrecioCosto::where('producto_id', $conservar->id)->count())->toBe(0);
});

// ===========================================================================
// actualizarCostoEnAlmacenes() — el admin elige a mano en qué almacenes aplicar un costo
// combinado. Caso real: PANEL SOLAR LONGI BIFACIAL (Bejucal 378 unds mezcladas + Quivican 4
// unds sin mezclar, ambos elegidos juntos).
// ===========================================================================

test('actualizarCostoEnAlmacenes combina el stock de los almacenes elegidos en un solo promedio y lo aplica a ambos', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $bejucal = Almacen::factory()->create();
    $quivican = Almacen::factory()->create();
    $producto = fichaVentilador(['precio_compra_producto' => 118.82]);
    // Bejucal: 2 lotes del MISMO producto a costo distinto (lo que ya se fusiona con
    // FusionLotesService) — stockConLote() no sirve para el segundo (codigo repetido).
    $loteA = stockConLote($producto, $bejucal, 360, 118.82);
    $loteB = LoteStock::create(['codigo' => 'LOTE-BEJUCAL-B', 'producto_id' => $producto->id, 'almacen_id' => $bejucal->id, 'cantidad' => 18, 'cantidad_disponible' => 18, 'precio_costo' => 231.45]);
    $producto->almacenes()->updateExistingPivot($bejucal->id, ['cantidad' => 378]);
    // Quivican: 1 solo lote — nada que fusionar, pero igual debe cambiar si se elige.
    $loteQuivican = stockConLote($producto, $quivican, 4, 231.45);

    $response = $this->postJson(route('productos.actualizar-costo-almacenes', $producto), [
        'almacen_ids' => [$bejucal->id, $quivican->id],
    ]);

    $response->assertOk();
    // (360*118.82 + 18*231.45 + 4*231.45) / 382 = 125.31 — combinado de los 2 almacenes juntos
    // (distinto del 126.95 que daría Bejucal+eliminada sola, acá es con Quivican también).
    $response->assertJsonPath('resultado.costo', 125.31);

    // Bejucal: los 2 lotes viejos quedan en 0, fusionados en uno nuevo a 125.31 (no el local 124.18).
    expect($loteA->fresh()->cantidad_disponible)->toBe(0)
        ->and($loteB->fresh()->cantidad_disponible)->toBe(0);
    $loteFusionado = LoteStock::where('producto_id', $producto->id)->where('almacen_id', $bejucal->id)->where('cantidad_disponible', '>', 0)->first();
    expect((float) $loteFusionado->precio_costo)->toBe(125.31)
        ->and($loteFusionado->cantidad_disponible)->toBe(378);

    // Quivican: el único lote se corrige directo al mismo costo combinado, sin fusionarse con nada.
    expect((float) $loteQuivican->fresh()->precio_costo)->toBe(125.31);

    $historialQuivican = HistorialPrecioCosto::where('producto_id', $producto->id)->where('almacen_id', $quivican->id)->first();
    expect($historialQuivican)->not->toBeNull()
        ->and((float) $historialQuivican->precio_anterior)->toBe(231.45)
        ->and((float) $historialQuivican->precio_nuevo)->toBe(125.31)
        ->and($historialQuivican->user_id)->toBe($admin->id);

    // El costo global de la ficha también queda al día.
    expect((float) $producto->fresh()->precio_compra_producto)->toBe(125.31);
});

test('actualizarCostoEnAlmacenes solo toca los almacenes elegidos, no los demás', function () {
    $this->actingAs(User::factory()->admin()->create());
    $bejucal = Almacen::factory()->create();
    $laSalud = Almacen::factory()->create();
    $producto = fichaVentilador(['precio_compra_producto' => 100]);
    stockConLote($producto, $bejucal, 10, 100);
    $loteLaSalud = stockConLote($producto, $laSalud, 5, 50);

    $this->postJson(route('productos.actualizar-costo-almacenes', $producto), [
        'almacen_ids' => [$bejucal->id],
    ])->assertOk();

    // La Salud no se eligió — sigue con su costo original.
    expect((float) $loteLaSalud->fresh()->precio_costo)->toBe(50.0);
    expect(HistorialPrecioCosto::where('producto_id', $producto->id)->where('almacen_id', $laSalud->id)->count())->toBe(0);
});

test('actualizarCostoEnAlmacenes rechaza un almacén donde el producto no tiene stock', function () {
    $this->actingAs(User::factory()->admin()->create());
    $conStock = Almacen::factory()->create();
    $sinStock = Almacen::factory()->create();
    $producto = fichaVentilador();
    stockConLote($producto, $conStock, 10, 30);

    $response = $this->postJson(route('productos.actualizar-costo-almacenes', $producto), [
        'almacen_ids' => [$conStock->id, $sinStock->id],
    ]);

    $response->assertStatus(422)->assertJson(['success' => false]);
});

test('un moderador puede usar actualizarCostoEnAlmacenes (misma familia que fusionar lotes)', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);
    $almacen = Almacen::factory()->create();
    $producto = fichaVentilador(['precio_compra_producto' => 30]);
    stockConLote($producto, $almacen, 10, 30);

    $this->postJson(route('productos.actualizar-costo-almacenes', $producto), [
        'almacen_ids' => [$almacen->id],
    ])->assertOk();
});

test('un vendedor no puede usar actualizarCostoEnAlmacenes', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    $almacen = Almacen::factory()->create();
    $producto = fichaVentilador();
    stockConLote($producto, $almacen, 10, 30);

    $this->postJson(route('productos.actualizar-costo-almacenes', $producto), [
        'almacen_ids' => [$almacen->id],
    ])->assertForbidden();
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

// ==========================================================================
// FUSIÓN POR ALMACÉN (2026-09-28) — Productos/Edit.tsx, "Fusionar fichas en este almacén"
// ==========================================================================

test('fusionar-en-almacen rechaza una ficha que también tiene stock en otro almacén', function () {
    $this->actingAs(User::factory()->admin()->create());
    $bejucal = Almacen::factory()->create(['nombre_almacen' => 'BEJUCAL']);
    $otroAlmacen = Almacen::factory()->create(['nombre_almacen' => 'MANZANILLO']);
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $bejucal, 257, 30);
    // La ficha a eliminar vive en Bejucal Y en Manzanillo — no se puede fusionar solo en Bejucal.
    stockConLote($eliminar, $bejucal, 23, 37);
    stockConLote($eliminar, $otroAlmacen, 50, 37);

    $response = $this->post(route('productos.fusionar-en-almacen', $conservar), [
        'almacen_id' => $bejucal->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertSessionHasErrors('almacen_id');
    $this->assertModelExists($eliminar);
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $eliminar->id, 'almacen_id' => $otroAlmacen->id, 'cantidad' => 50]);
});

test('fusionar-en-almacen junta las fichas confinadas a ese almacén sin tocar al conservar en sus otros almacenes', function () {
    $this->actingAs(User::factory()->admin()->create());
    $bejucal = Almacen::factory()->create(['nombre_almacen' => 'BEJUCAL']);
    $manzanillo = Almacen::factory()->create(['nombre_almacen' => 'MANZANILLO']);
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    // El conservar también vive en Manzanillo — eso no debe cambiar.
    stockConLote($conservar, $bejucal, 257, 30);
    stockConLote($conservar, $manzanillo, 61, 30);
    stockConLote($eliminar, $bejucal, 23, 37);

    $response = $this->post(route('productos.fusionar-en-almacen', $conservar), [
        'almacen_id' => $bejucal->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertRedirect(route('productos.edit', $conservar));
    $this->assertModelMissing($eliminar);
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $conservar->id, 'almacen_id' => $bejucal->id, 'cantidad' => 280]);
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $conservar->id, 'almacen_id' => $manzanillo->id, 'cantidad' => 61]);
});

test('fusionar-en-almacen no deja fusionar la ficha consigo misma', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador();
    stockConLote($conservar, $almacen, 10, 30);

    $response = $this->post(route('productos.fusionar-en-almacen', $conservar), [
        'almacen_id' => $almacen->id,
        'productos_eliminar_ids' => [$conservar->id],
    ]);

    $response->assertSessionHasErrors('productos_eliminar_ids.0');
    $this->assertModelExists($conservar);
});

test('un vendedor no puede fusionar-en-almacen', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    $almacen = Almacen::factory()->create();
    $conservar = fichaVentilador();
    $eliminar = fichaVentilador();
    stockConLote($conservar, $almacen, 10, 30);
    stockConLote($eliminar, $almacen, 5, 37);

    $response = $this->post(route('productos.fusionar-en-almacen', $conservar), [
        'almacen_id' => $almacen->id,
        'productos_eliminar_ids' => [$eliminar->id],
    ]);

    $response->assertForbidden();
    $this->assertModelExists($eliminar);
});

// ===========================================================================
// editarEnLote() — edición masiva de productos EXISTENTES, solo admin. No fusiona ni toca
// stock: a diferencia de normalizarDuplicados()/fusionarDuplicados(), no depende de que
// FichasHermanasService ya haya agrupado las fichas (sirve justo para el caso en que NO las
// agrupó, por un tipeo como "635W" vs "635 W").
// ===========================================================================

test('un admin corrige la capacidad de varios productos a la vez sin fusionarlos', function () {
    $this->actingAs(User::factory()->admin()->create());

    $a = fichaVentilador(['capacidad_producto' => '20000MAH']);
    $b = fichaVentilador(['capacidad_producto' => '20000 Mah']);

    $response = $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
        'capacidad_producto' => '20000 MAH',
    ]);

    $response->assertOk()->assertJson(['success' => true]);
    expect($a->fresh()->capacidad_producto)->toBe('20000 MAH');
    expect($b->fresh()->capacidad_producto)->toBe('20000 MAH');
    // Siguen siendo 2 fichas separadas — editar en lote no fusiona.
    $this->assertModelExists($a);
    $this->assertModelExists($b);
});

test('editar en lote guarda los campos de texto en mayúscula aunque se manden en minúscula', function () {
    $this->actingAs(User::factory()->admin()->create());

    $a = fichaVentilador(['marca_producto' => 'acme']);
    $b = fichaVentilador(['marca_producto' => 'Acme Corp']);

    $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
        'marca_producto' => 'acme corp',
    ])->assertOk();

    expect($a->fresh()->marca_producto)->toBe('ACME CORP');
    expect($b->fresh()->marca_producto)->toBe('ACME CORP');
});

test('editar en lote solo toca los campos enviados, deja el resto intacto', function () {
    $this->actingAs(User::factory()->admin()->create());

    $categoriaOriginal = Categoria::factory()->create();
    $a = fichaVentilador(['marca_producto' => 'ACME', 'categoria_id' => $categoriaOriginal->id]);
    $b = fichaVentilador(['marca_producto' => 'acme corp', 'categoria_id' => $categoriaOriginal->id]);

    $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
        'marca_producto' => 'ACME',
    ])->assertOk();

    expect($a->fresh()->marca_producto)->toBe('ACME');
    expect($b->fresh()->marca_producto)->toBe('ACME');
    // categoria_id no se mandó: queda igual que antes en ambas.
    expect($b->fresh()->categoria_id)->toBe($categoriaOriginal->id);
});

test('editar en lote rechaza una selección de un solo producto', function () {
    $this->actingAs(User::factory()->admin()->create());
    $a = fichaVentilador();

    $response = $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id],
        'capacidad_producto' => '20000 MAH',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('productos_ids');
});

test('editar en lote rechaza el payload sin ningún campo para actualizar', function () {
    $this->actingAs(User::factory()->admin()->create());
    $a = fichaVentilador();
    $b = fichaVentilador();

    $response = $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
    ]);

    $response->assertStatus(422)->assertJson(['success' => false]);
});

test('un moderador no puede editar productos en lote (a diferencia de normalizar/fusionar duplicados)', function () {
    $this->actingAs(User::factory()->moderador()->create());
    $a = fichaVentilador(['capacidad_producto' => '20000MAH']);
    $b = fichaVentilador(['capacidad_producto' => '20000MAH']);

    $response = $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
        'capacidad_producto' => '20000 MAH',
    ]);

    $response->assertForbidden();
    expect($a->fresh()->capacidad_producto)->toBe('20000MAH');
});

test('un vendedor no puede editar productos en lote', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    $a = fichaVentilador();
    $b = fichaVentilador();

    $response = $this->postJson(route('productos.editar-en-lote'), [
        'productos_ids' => [$a->id, $b->id],
        'capacidad_producto' => '20000 MAH',
    ]);

    $response->assertForbidden();
});
