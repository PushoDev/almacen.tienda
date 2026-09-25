<?php

use App\Models\Almacen;
use App\Models\LoteFusion;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\User;
use App\Services\ValorInventarioService;

/**
 * Caso real de la OLLA ARROCERA en Manzanillo: lote viejo (AJUSTE-LEGADO) y lote del
 * movimiento #209, a costo distinto.
 *
 * @return array{producto: Producto, almacen: Almacen, viejo: LoteStock, nuevo: LoteStock}
 */
function ollaConDosLotes(?Movimiento $movimiento = null): array
{
    $producto = Producto::factory()->create(['nombre_producto' => 'OLLA ARROCERA']);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 78]);

    $viejo = LoteStock::create([
        'codigo' => 'AJUSTE-LEGADO-OLLA', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 28, 'precio_costo' => 21.38,
    ]);
    $viejo->created_at = now()->subMonths(3);
    $viejo->save();

    $nuevo = LoteStock::create([
        'codigo' => 'LOTE-MOV-209-OLLA', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'movimiento_id' => $movimiento?->id, 'cantidad' => 50, 'precio_costo' => 21.85, 'precio_venta' => 36,
    ]);

    return compact('producto', 'almacen', 'viejo', 'nuevo');
}

test('fusionar dos lotes crea uno solo con la cantidad sumada, costo ponderado y la antigüedad del más viejo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo, 'nuevo' => $nuevo] = ollaConDosLotes();
    $valorAntes = app(ValorInventarioService::class)->valorTotal();

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $nuevo->id],
        'precio_venta' => 35,
    ]);

    // (28*21.38 + 50*21.85) / 78 = 21.68
    $response->assertOk()
        ->assertJsonPath('lote.codigo', "FUSION-{$producto->id}-{$almacen->id}-1")
        ->assertJsonPath('lote.cantidad', 78)
        ->assertJsonPath('lote.costo', 21.68)
        ->assertJsonPath('lote.precio_venta', 35);
    $resultante = LoteStock::where('codigo', "FUSION-{$producto->id}-{$almacen->id}-1")->sole();
    expect($resultante->created_at->equalTo($viejo->created_at))->toBeTrue()
        ->and($viejo->fresh()->only(['cantidad_disponible', 'fusionado_en_lote_id']))->toBe(['cantidad_disponible' => 0, 'fusionado_en_lote_id' => $resultante->id])
        ->and($nuevo->fresh()->only(['cantidad_disponible', 'fusionado_en_lote_id']))->toBe(['cantidad_disponible' => 0, 'fusionado_en_lote_id' => $resultante->id])
        ->and($producto->costoEnAlmacen($almacen->id))->toBe(21.68);
    // El valor del inventario solo puede variar por el redondeo del costo a 2 decimales.
    expect(abs(app(ValorInventarioService::class)->valorTotal() - $valorAntes))->toBeLessThan(0.5);
    $fusion = LoteFusion::sole();
    expect($fusion->user_id)->toBe($admin->id)
        ->and($fusion->cantidad_total)->toBe(78)
        ->and(collect($fusion->lotes_origen)->pluck('codigo')->all())->toBe(['AJUSTE-LEGADO-OLLA', 'LOTE-MOV-209-OLLA']);
});

test('sin precio de venta, el lote fusionado hereda el precio del producto', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo, 'nuevo' => $nuevo] = ollaConDosLotes();

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $nuevo->id],
    ]);

    $response->assertOk()->assertJsonPath('lote.precio_venta', null);
});

test('un vendedor no puede fusionar lotes', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo, 'nuevo' => $nuevo] = ollaConDosLotes();

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $nuevo->id],
    ]);

    $response->assertForbidden();
    expect($viejo->fresh()->cantidad_disponible)->toBe(28);
    $this->assertDatabaseCount('lote_fusions', 0);
});

test('no se fusionan lotes de almacenes distintos', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo] = ollaConDosLotes();
    $otroAlmacen = Almacen::factory()->create();
    $ajeno = LoteStock::create([
        'codigo' => 'LOTE-OTRO-ALMACEN', 'producto_id' => $producto->id, 'almacen_id' => $otroAlmacen->id,
        'cantidad' => 5, 'precio_costo' => 20,
    ]);

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $ajeno->id],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors(['lote_ids' => 'mismo almacén']);
    expect($ajeno->fresh()->cantidad_disponible)->toBe(5);
});

test('se puede fusionar un lote cuyo movimiento tiene el prorrateo pendiente: el prorrateo es opcional y no bloquea', function () {
    $this->actingAs(User::factory()->admin()->create());
    $movimiento = Movimiento::factory()->create(['requiere_prorrateo' => true, 'prorrateo_decision' => null]);
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo, 'nuevo' => $nuevo] = ollaConDosLotes($movimiento);

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $nuevo->id],
    ]);

    $response->assertOk();
    expect($nuevo->fresh()->cantidad_disponible)->toBe(0);
    expect(LoteStock::where('codigo', 'like', 'FUSION-%')->sole()->cantidad_disponible)->toBe(78);
    // La decisión del prorrateo no se toca: sigue pendiente hasta que el usuario la aplique o la elimine de la lista.
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'requiere_prorrateo' => true, 'prorrateo_decision' => null]);
});

test('un lote ya fusionado no se puede volver a fusionar', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['producto' => $producto, 'almacen' => $almacen, 'viejo' => $viejo, 'nuevo' => $nuevo] = ollaConDosLotes();
    $this->postJson(route('productos.lotes.fusionar', $producto), ['almacen_id' => $almacen->id, 'lote_ids' => [$viejo->id, $nuevo->id]])->assertOk();
    $resultante = LoteStock::where('codigo', 'like', 'FUSION-%')->sole();

    $response = $this->postJson(route('productos.lotes.fusionar', $producto), [
        'almacen_id' => $almacen->id,
        'lote_ids' => [$viejo->id, $resultante->id],
    ]);

    $response->assertUnprocessable()->assertJsonValidationErrors(['lote_ids' => 'ya se fusionaron']);
});

test('fusionar lotes del almacén une cada producto elegido, sigue si uno falla y avisa cuál', function () {
    $this->actingAs(User::factory()->admin()->create());
    ['producto' => $olla, 'almacen' => $almacen] = ollaConDosLotes();
    // Un producto con UN solo lote con stock: no hay nada que fusionar y esa fila falla, sin frenar a la otra.
    $refrigerador = Producto::factory()->create(['nombre_producto' => 'REFRIGERADOR']);
    $refrigerador->almacenes()->attach($almacen->id, ['cantidad' => 8]);
    $soloUno = LoteStock::create(['codigo' => 'REF-UNICO', 'producto_id' => $refrigerador->id, 'almacen_id' => $almacen->id, 'cantidad' => 8, 'precio_costo' => 433.15]);

    $response = $this->postJson(route('disponibles.fusionar-lotes', $almacen), [
        'producto_ids' => [$refrigerador->id, $olla->id],
    ]);

    $response->assertOk()
        ->assertJsonCount(1, 'fusionados')
        ->assertJsonPath('fusionados.0.producto_id', $olla->id)
        ->assertJsonPath('fusionados.0.nombre_producto', 'OLLA ARROCERA')
        ->assertJsonPath('fusionados.0.cantidad', 78)
        ->assertJsonCount(1, 'fallidos')
        ->assertJsonPath('fallidos.0.producto_id', $refrigerador->id);
    expect($response->json('fallidos.0.motivo'))->toContain('al menos 2 lotes')
        ->and($soloUno->fresh()->cantidad_disponible)->toBe(8)
        ->and(LoteStock::where('producto_id', $olla->id)->where('cantidad_disponible', '>', 0)->pluck('codigo')->all())->toBe(["FUSION-{$olla->id}-{$almacen->id}-1"]);
});

test('un vendedor no puede usar la fusión de lotes del almacén', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    ['producto' => $olla, 'almacen' => $almacen, 'viejo' => $viejo] = ollaConDosLotes();

    $response = $this->postJson(route('disponibles.fusionar-lotes', $almacen), ['producto_ids' => [$olla->id]]);

    $response->assertForbidden();
    expect($viejo->fresh()->cantidad_disponible)->toBe(28);
});
