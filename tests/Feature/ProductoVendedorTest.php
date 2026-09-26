<?php

use App\Models\Almacen;
use App\Models\LoteStock;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Facades\DB;

// ─── Update masivo: aplicar el mismo precio a varios almacenes a la vez ────

test('un admin puede aplicar el mismo precio a varios almacenes a la vez', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();
    $almacenC = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacenA->id, $almacenB->id, $almacenC->id],
        'precio_venta' => 25.50,
        'comision' => 2,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'new_price' => 25.50,
        'new_profit' => 15.50,
        'new_comision' => 2,
    ]);

    foreach ([$almacenA, $almacenB, $almacenC] as $almacen) {
        $this->assertDatabaseHas('producto_vendedors', [
            'producto_id' => $producto->id,
            'almacen_id' => $almacen->id,
            'precio_venta' => 25.50,
            'comision' => 2,
        ]);
    }

    expect(PrecioHistorial::where('producto_id', $producto->id)->count())->toBe(3);
});

test('el update masivo funciona sin comisión (opcional)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 30,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();
    $response->assertJson(['success' => true, 'new_comision' => null]);

    $this->assertDatabaseHas('producto_vendedors', [
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => 30,
    ]);
});

test('el update masivo solo registra historial en los almacenes cuyo precio realmente cambió', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();

    // almacenA ya tiene ese mismo precio asignado, almacenB no tiene precio todavía.
    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacenA->id,
        'precio_venta' => 20,
        'venta_ganancia' => 10,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacenA->id, $almacenB->id],
        'precio_venta' => 20,
        'password_confirmacion' => 'password',
    ]);

    $response->assertOk();

    expect(PrecioHistorial::where('producto_id', $producto->id)->where('almacen_id', $almacenA->id)->count())->toBe(0);
    expect(PrecioHistorial::where('producto_id', $producto->id)->where('almacen_id', $almacenB->id)->count())->toBe(1);
});

test('el update masivo rechaza una contraseña incorrecta, y no se crea nada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 30,
        'password_confirmacion' => 'password-incorrecta',
    ]);

    $response->assertStatus(422);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
    expect(PrecioHistorial::where('producto_id', $producto->id)->count())->toBe(0);
});

test('un moderador no puede usar el update masivo (403), y no se crea nada', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('un vendedor no puede usar el update masivo por bypass directo de URL (403), y no se crea nada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('el update masivo exige al menos un almacén', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();

    $response = $this->put(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [],
        'precio_venta' => 15,
        'password_confirmacion' => 'password',
    ]);

    $response->assertStatus(302); // redirect de validación (no es request Inertia/JSON en este test)
});

test('el update masivo rechaza un precio de venta inválido', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 0,
        'password_confirmacion' => 'password',
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

test('el update masivo exige contraseña', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();

    $response = $this->putJson(route('disponibles.bulk-actualizar'), [
        'producto_id' => $producto->id,
        'almacen_ids' => [$almacen->id],
        'precio_venta' => 15,
    ]);

    $response->assertStatus(422);
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $producto->id]);
});

// ─── Precio del grupo: mismo producto repetido como 2+ fichas en un almacén ────

/**
 * Crea una ficha hermana (mismo nombre/marca/modelo/capacidad/color) con stock y lote a
 * `$costo` en el almacén, y opcionalmente su propio precio de venta.
 */
function fichaHermanaEnAlmacen(Almacen $almacen, int $stock, float $costo, ?float $precio = null, bool $precioDeGrupo = false): Producto
{
    $ficha = Producto::factory()->create([
        'nombre_producto' => 'ESTACION DELTA 3',
        'marca_producto' => 'ECOFLOW',
        'modelo_producto' => 'DELTA 3',
        'capacidad_producto' => '1800 W',
        'color_producto' => null,
        'precio_compra_producto' => $costo,
    ]);
    $ficha->almacenes()->attach($almacen->id, ['cantidad' => $stock]);
    LoteStock::create([
        'codigo' => 'LOTE-GRUPO-'.$ficha->id, 'producto_id' => $ficha->id, 'almacen_id' => $almacen->id,
        'cantidad' => $stock, 'precio_costo' => $costo,
    ]);

    if ($precio !== null) {
        DB::table('producto_vendedors')->insert([
            'producto_id' => $ficha->id, 'almacen_id' => $almacen->id,
            'precio_venta' => $precio, 'comision' => 20, 'precio_de_grupo' => $precioDeGrupo,
        ]);
    }

    return $ficha;
}

test('el precio del grupo se aplica a la ficha hermana sin precio y respeta la que tiene precio propio', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $conPrecioPropio = fichaHermanaEnAlmacen($almacen, 2, 489.84, 660);
    $sinPrecio = fichaHermanaEnAlmacen($almacen, 75, 490.06);

    $response = $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $sinPrecio->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => 650,
        'comision' => 15,
    ]);

    $response->assertOk()
        ->assertJsonPath('fichas.0.aplicado', false)
        ->assertJsonPath('fichas.1.aplicado', true)
        ->assertJsonPath('fichas.1.margen_unitario', 144.94);
    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $conPrecioPropio->id, 'precio_venta' => 660, 'precio_de_grupo' => false]);
    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $sinPrecio->id, 'precio_venta' => 650, 'comision' => 15, 'precio_de_grupo' => true]);
    $this->assertDatabaseHas('precio_historials', ['producto_id' => $sinPrecio->id, 'precio_anterior' => null, 'precio_nuevo' => 650, 'accion' => 'Precio de grupo - Almacén ID '.$almacen->id]);
});

test('cambiar el precio del grupo actualiza las fichas que lo siguen', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $a = fichaHermanaEnAlmacen($almacen, 4, 572.55, 750, precioDeGrupo: true);
    $b = fichaHermanaEnAlmacen($almacen, 2, 602.14, 750, precioDeGrupo: true);

    $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $a->id, 'almacen_id' => $almacen->id, 'precio_venta' => 780,
    ])->assertOk();

    expect(DB::table('producto_vendedors')->whereIn('producto_id', [$a->id, $b->id])->pluck('precio_venta')->map(fn ($p) => (float) $p)->all())
        ->toBe([780.0, 780.0]);
});

test('editar a mano el precio de una ficha la separa del grupo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $separada = fichaHermanaEnAlmacen($almacen, 4, 572.55, 750, precioDeGrupo: true);
    $enGrupo = fichaHermanaEnAlmacen($almacen, 2, 602.14, 750, precioDeGrupo: true);

    $this->putJson(route('disponibles.update', $separada->id), ['precio_venta' => 740, 'almacen_id' => $almacen->id])->assertOk();
    $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $enGrupo->id, 'almacen_id' => $almacen->id, 'precio_venta' => 800,
    ])->assertOk();

    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $separada->id, 'precio_venta' => 740, 'precio_de_grupo' => false]);
    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $enGrupo->id, 'precio_venta' => 800, 'precio_de_grupo' => true]);
});

test('el precio del grupo pisa los precios propios solo si se pide explícitamente', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $a = fichaHermanaEnAlmacen($almacen, 257, 30.09, 49);
    $b = fichaHermanaEnAlmacen($almacen, 23, 37.34, 52);

    $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $a->id, 'almacen_id' => $almacen->id, 'precio_venta' => 50, 'incluir_con_precio_propio' => true,
    ])->assertOk();

    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $a->id, 'precio_venta' => 50, 'precio_de_grupo' => true]);
    $this->assertDatabaseHas('producto_vendedors', ['producto_id' => $b->id, 'precio_venta' => 50, 'precio_de_grupo' => true]);
});

test('el precio del grupo avisa cuando queda por debajo del costo real de una ficha', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $barata = fichaHermanaEnAlmacen($almacen, 4, 572.55);
    fichaHermanaEnAlmacen($almacen, 2, 602.14);

    $response = $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $barata->id, 'almacen_id' => $almacen->id, 'precio_venta' => 590,
    ]);

    $response->assertOk()
        ->assertJsonPath('fichas.0.bajo_costo', false)
        ->assertJsonPath('fichas.1.bajo_costo', true);
});

test('el precio del grupo exige que haya fichas hermanas con stock en el almacén', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $unica = fichaHermanaEnAlmacen($almacen, 4, 572.55);

    $response = $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $unica->id, 'almacen_id' => $almacen->id, 'precio_venta' => 700,
    ]);

    $response->assertUnprocessable();
    $this->assertDatabaseMissing('producto_vendedors', ['producto_id' => $unica->id]);
});

test('un vendedor no puede poner el precio del grupo en un almacén que no tiene asignado', function () {
    $this->actingAs(User::factory()->vendedor()->create());
    $almacen = Almacen::factory()->create();
    $a = fichaHermanaEnAlmacen($almacen, 4, 572.55);
    fichaHermanaEnAlmacen($almacen, 2, 602.14);

    $response = $this->putJson(route('disponibles.precio-grupo'), [
        'producto_id' => $a->id, 'almacen_id' => $almacen->id, 'precio_venta' => 700,
    ]);

    $response->assertForbidden();
    $this->assertDatabaseCount('producto_vendedors', 0);
});

test('el listado de disponibles marca las fichas hermanas del almacén con la misma clave de grupo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $a = fichaHermanaEnAlmacen($almacen, 4, 572.55, 750, precioDeGrupo: true);
    $b = fichaHermanaEnAlmacen($almacen, 2, 602.14);
    $sola = Producto::factory()->create(['nombre_producto' => 'OTRO PRODUCTO']);
    $sola->almacenes()->attach($almacen->id, ['cantidad' => 3]);

    $response = $this->get(route('disponibles.index'));

    $response->assertInertia(fn ($page) => $page->where('almacenes.0.productos', function ($productos) use ($a, $b, $sola) {
        $porId = collect($productos)->keyBy('id');

        return $porId[$a->id]['grupo_clave'] !== null
            && $porId[$a->id]['grupo_clave'] === $porId[$b->id]['grupo_clave']
            && $porId[$sola->id]['grupo_clave'] === null
            && $porId[$a->id]['precio_de_grupo'] === true
            && $porId[$b->id]['costo_real'] === 602.14;
    }));
});

// ─── Desglose por lote: productos con 2+ lotes con stock en el almacén (igual costo o no) ────

test('el listado de disponibles trae los lotes cuando el producto tiene 2+ lotes con stock en el almacén, aunque cuesten lo mismo', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $variosCostos = Producto::factory()->create(['nombre_producto' => 'OLLA ARROCERA']);
    $variosCostos->almacenes()->attach($almacen->id, ['cantidad' => 78]);
    $loteViejo = LoteStock::create(['codigo' => 'AJUSTE-LEGADO-1', 'producto_id' => $variosCostos->id, 'almacen_id' => $almacen->id, 'cantidad' => 28, 'precio_costo' => 21.38]);
    $loteNuevo = LoteStock::create(['codigo' => 'LOTE-MOV-209-1', 'producto_id' => $variosCostos->id, 'almacen_id' => $almacen->id, 'cantidad' => 50, 'precio_costo' => 21.85, 'precio_venta' => 36]);
    // Dos lotes al MISMO costo: también salen (se pueden fusionar aunque no cambie el costo).
    $mismoCosto = Producto::factory()->create(['nombre_producto' => 'MICROONDAS']);
    $mismoCosto->almacenes()->attach($almacen->id, ['cantidad' => 4]);
    $loteA = LoteStock::create(['codigo' => 'LOTE-A', 'producto_id' => $mismoCosto->id, 'almacen_id' => $almacen->id, 'cantidad' => 2, 'precio_costo' => 50]);
    $loteB = LoteStock::create(['codigo' => 'LOTE-B', 'producto_id' => $mismoCosto->id, 'almacen_id' => $almacen->id, 'cantidad' => 2, 'precio_costo' => 50]);
    // Un solo lote con stock (el otro está agotado): sin desglose.
    $unSoloLote = Producto::factory()->create(['nombre_producto' => 'LICUADORA']);
    $unSoloLote->almacenes()->attach($almacen->id, ['cantidad' => 3]);
    LoteStock::create(['codigo' => 'LOTE-C', 'producto_id' => $unSoloLote->id, 'almacen_id' => $almacen->id, 'cantidad' => 3, 'precio_costo' => 30]);
    LoteStock::create(['codigo' => 'LOTE-D-AGOTADO', 'producto_id' => $unSoloLote->id, 'almacen_id' => $almacen->id, 'cantidad' => 2, 'cantidad_disponible' => 0, 'precio_costo' => 31]);

    $response = $this->get(route('disponibles.index'));

    $response->assertInertia(fn ($page) => $page->where('almacenes.0.productos', function ($productos) use ($variosCostos, $mismoCosto, $unSoloLote, $loteA, $loteB, $loteViejo, $loteNuevo) {
        $porId = collect($productos)->keyBy('id');

        return $porId[$unSoloLote->id]['lotes'] === null
            && $porId[$mismoCosto->id]['lotes'] == [
                ['id' => $loteA->id, 'codigo' => 'LOTE-A', 'cantidad' => 2, 'costo' => 50.0, 'precio_venta' => null, 'comision' => null, 'prorrateo_pendiente' => false],
                ['id' => $loteB->id, 'codigo' => 'LOTE-B', 'cantidad' => 2, 'costo' => 50.0, 'precio_venta' => null, 'comision' => null, 'prorrateo_pendiente' => false],
            ]
            // == (no ===): al pasar por JSON, 36.0 llega como 36.
            && $porId[$variosCostos->id]['lotes'] == [
                ['id' => $loteViejo->id, 'codigo' => 'AJUSTE-LEGADO-1', 'cantidad' => 28, 'costo' => 21.38, 'precio_venta' => null, 'comision' => null, 'prorrateo_pendiente' => false],
                ['id' => $loteNuevo->id, 'codigo' => 'LOTE-MOV-209-1', 'cantidad' => 50, 'costo' => 21.85, 'precio_venta' => 36.0, 'comision' => null, 'prorrateo_pendiente' => false],
            ];
    }));
});

test('el listado de disponibles trae la comisión propia de cada lote (null si no tiene)', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 4]);
    $sinComision = LoteStock::create(['codigo' => 'LOTE-SIN', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 2, 'precio_costo' => 50]);
    $conComision = LoteStock::create(['codigo' => 'LOTE-CON', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 2, 'precio_costo' => 50, 'comision' => 4.5]);

    $this->get(route('disponibles.index'))->assertInertia(fn ($page) => $page->where('almacenes.0.productos.0.lotes', function ($lotes) use ($sinComision, $conComision) {
        $porId = collect($lotes)->keyBy('id');

        return $porId[$sinComision->id]['comision'] === null && $porId[$conComision->id]['comision'] == 4.5;
    }));
});

test('el precio propio de un lote se puede poner y quitar por JSON desde disponibles', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create();
    $lote = LoteStock::create(['codigo' => 'LOTE-JSON', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 5, 'precio_costo' => 21.85]);

    $poner = $this->putJson(route('productos.lotes.precio-venta', [$producto, $lote]), ['precio_venta' => 36.5]);
    $quitar = $this->putJson(route('productos.lotes.precio-venta', [$producto, $lote]), ['precio_venta' => null]);

    $poner->assertOk()->assertJson(['success' => true, 'precio_venta' => 36.5]);
    $quitar->assertOk()->assertJson(['success' => true, 'precio_venta' => null]);
    expect($lote->fresh()->precio_venta)->toBeNull();
});

// ─── Fichas agotadas: se listan si tienen precio (como el POS), las vacías sin precio no ────

test('el listado de disponibles incluye las fichas agotadas con precio y omite las agotadas sin precio', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();

    $conStock = Producto::factory()->create(['nombre_producto' => 'CON STOCK']);
    $conStock->almacenes()->attach($almacen->id, ['cantidad' => 7]);
    $agotadaConPrecio = Producto::factory()->create(['nombre_producto' => 'AGOTADA CON PRECIO']);
    $agotadaConPrecio->almacenes()->attach($almacen->id, ['cantidad' => 0]);
    DB::table('producto_vendedors')->insert([
        'producto_id' => $agotadaConPrecio->id, 'almacen_id' => $almacen->id, 'precio_venta' => 25,
        'venta_ganancia' => 5, 'comision' => 0, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $agotadaSinPrecio = Producto::factory()->create(['nombre_producto' => 'AGOTADA SIN PRECIO']);
    $agotadaSinPrecio->almacenes()->attach($almacen->id, ['cantidad' => 0]);

    $response = $this->get(route('disponibles.index'));

    $response->assertInertia(fn ($page) => $page->where('almacenes.0.productos', function ($productos) use ($conStock, $agotadaConPrecio, $agotadaSinPrecio) {
        $porId = collect($productos)->keyBy('id');

        return $porId->count() === 2
            && $porId[$conStock->id]['stock_almacen'] === 7
            && $porId[$agotadaConPrecio->id]['stock_almacen'] === 0
            && $porId[$agotadaConPrecio->id]['tiene_precio'] === true
            && ! $porId->has($agotadaSinPrecio->id);
    }));
});
