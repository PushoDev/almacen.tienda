<?php

use App\Models\Almacen;
use App\Models\HistorialPrecioCosto;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function payloadProducto(Producto $producto, float $precioCosto, ?string $password = null): array
{
    $payload = [
        'nombre_producto' => $producto->nombre_producto,
        'categoria_id' => $producto->categoria_id,
        'precio_compra_producto' => $precioCosto,
    ];

    if ($password !== null) {
        $payload['password_confirmacion'] = $password;
    }

    return $payload;
}

test('un admin puede cambiar el precio de costo con su contraseña correcta', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-admin'));

    $response->assertSessionDoesntHaveErrors();
    expect($producto->fresh()->precio_compra_producto)->toEqual('15.00');
});

test('un admin con la contraseña incorrecta no puede cambiar el precio de costo', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-equivocada'));

    $response->assertSessionHasErrors('password_confirmacion');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un moderador ya no puede cambiar el precio de costo', function () {
    $moderador = User::factory()->moderador()->create(['password' => bcrypt('clave-mod')]);
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-mod'));

    $response->assertSessionHas('error');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un vendedor no puede cambiar el precio de costo', function () {
    $vendedor = User::factory()->vendedor()->create(['password' => bcrypt('clave-vend')]);
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);

    $response = $this->put(route('productos.update', $producto), payloadProducto($producto, 15, 'clave-vend'));

    $response->assertSessionHas('error');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

test('un moderador puede seguir editando otros campos del producto sin tocar el precio de costo', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10, 'nombre_producto' => 'Original']);

    $response = $this->put(route('productos.update', $producto), array_merge(payloadProducto($producto, 10, null), ['nombre_producto' => 'Actualizado']));

    $response->assertSessionDoesntHaveErrors();
    expect($producto->fresh()->nombre_producto)->toBe('Actualizado');
});

// ==========================================================================
// FICHAS HERMANAS — mismo nombre+marca+modelo+capacidad+categoría, costo distinto
// (cada compra crea siempre una ficha nueva desde 2026-09-18, ver CompraController).
// ==========================================================================

test('show() incluye las fichas hermanas del mismo producto a otro costo, ordenadas por precio, sin incluirse a sí misma', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $atributos = [
        'nombre_producto' => 'Producto Hermano',
        'marca_producto' => 'MarcaX',
        'modelo_producto' => 'ModeloY',
        'capacidad_producto' => '128GB',
    ];

    $principal = Producto::factory()->create($atributos + ['categoria_id' => Producto::factory()->create()->categoria_id, 'precio_compra_producto' => 20]);
    $hermanoCaro = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 30]);
    $hermanoBarato = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 15]);
    // Mismo nombre pero distinta marca — no es hermano, no debe aparecer.
    Producto::factory()->create(['nombre_producto' => 'Producto Hermano', 'marca_producto' => 'Otra', 'categoria_id' => $principal->categoria_id]);

    $response = $this->get(route('productos.show', $principal));

    $response->assertInertia(fn ($page) => $page
        ->has('fichas_hermanas', 2)
        ->where('fichas_hermanas.0.id', $hermanoBarato->id)
        ->where('fichas_hermanas.0.precio_compra_producto', 15)
        ->where('fichas_hermanas.1.id', $hermanoCaro->id)
        ->where('fichas_hermanas.1.precio_compra_producto', 30)
    );
});

test('show() no incluye fichas_hermanas cuando el producto no tiene ninguna', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['nombre_producto' => 'Producto Único']);

    $response = $this->get(route('productos.show', $producto));

    $response->assertInertia(fn ($page) => $page->has('fichas_hermanas', 0));
});

test('edit() también incluye las fichas hermanas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $atributos = [
        'nombre_producto' => 'Producto Hermano Edit',
        'marca_producto' => 'MarcaX',
        'modelo_producto' => 'ModeloY',
        'capacidad_producto' => '128GB',
    ];

    $principal = Producto::factory()->create($atributos + ['categoria_id' => Producto::factory()->create()->categoria_id, 'precio_compra_producto' => 20]);
    $hermano = Producto::factory()->create($atributos + ['categoria_id' => $principal->categoria_id, 'precio_compra_producto' => 25]);

    $response = $this->get(route('productos.edit', $principal));

    $response->assertInertia(fn ($page) => $page
        ->has('fichas_hermanas', 1)
        ->where('fichas_hermanas.0.id', $hermano->id)
    );
});

// ==========================================================================
// COSTO POR ALMACÉN — corregir el costo real de un producto en un solo
// almacén (lotes_stock) sin tocar el campo global de la ficha ni los demás
// almacenes donde el mismo producto también tenga stock.
// ==========================================================================

test('un admin corrige el costo en un almacén con lotes sin tocar el campo global ni otros almacenes', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();

    $producto->almacenes()->attach($almacenA->id, ['cantidad' => 5]);
    $producto->almacenes()->attach($almacenB->id, ['cantidad' => 3]);

    LoteStock::create([
        'codigo' => 'LOTE-TEST-A',
        'producto_id' => $producto->id,
        'almacen_id' => $almacenA->id,
        'cantidad' => 5,
        'precio_costo' => 12,
    ]);

    $response = $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 20, 'clave-admin') + ['almacen_id' => $almacenA->id]
    );

    $response->assertSessionDoesntHaveErrors();

    $producto->refresh();
    expect($producto->precio_compra_producto)->toEqual('10.00');
    expect($producto->costoEnAlmacen($almacenA->id))->toBe(20.0);
    expect($producto->costoEnAlmacen($almacenB->id))->toBe(10.0);
});

test('con 2 lotes en el mismo almacén, corregir uno por lote_id no toca el otro', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 8]);

    $loteViejo = LoteStock::create([
        'codigo' => 'LOTE-TEST-VIEJO',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 3,
        'precio_costo' => 20,
    ]);
    $loteNuevo = LoteStock::create([
        'codigo' => 'LOTE-TEST-NUEVO',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 25,
    ]);

    $response = $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 30, 'clave-admin') + ['almacen_id' => $almacen->id, 'lote_id' => $loteNuevo->id]
    );

    $response->assertSessionDoesntHaveErrors();

    expect((float) $loteNuevo->fresh()->precio_costo)->toBe(30.0);
    expect((float) $loteViejo->fresh()->precio_costo)->toBe(20.0);

    // El promedio ponderado del almacén refleja solo el cambio del lote corregido.
    expect($producto->costoEnAlmacen($almacen->id))->toBe(round((3 * 20 + 5 * 30) / 8, 2));

    $historial = HistorialPrecioCosto::where('producto_id', $producto->id)->latest()->first();
    expect((float) $historial->precio_anterior)->toBe(25.0); // el costo del lote, no el promedio del almacén (23.13)
    expect($historial->stock_momento)->toBe(5); // solo las unidades de ESE lote, no las 8 del almacén
});

test('un lote_id que no pertenece a este producto/almacén se rechaza', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);

    $otroProducto = Producto::factory()->create();
    $loteAjeno = LoteStock::create([
        'codigo' => 'LOTE-TEST-AJENO',
        'producto_id' => $otroProducto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 2,
        'precio_costo' => 99,
    ]);

    $response = $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 30, 'clave-admin') + ['almacen_id' => $almacen->id, 'lote_id' => $loteAjeno->id]
    );

    $response->assertSessionHas('error');
    expect((float) $loteAjeno->fresh()->precio_costo)->toBe(99.0);
});

test('corregir el costo en un almacén sin lotes todavía crea un lote de ajuste manual', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 7]);

    $response = $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 18, 'clave-admin') + ['almacen_id' => $almacen->id]
    );

    $response->assertSessionDoesntHaveErrors();
    expect($producto->costoEnAlmacen($almacen->id))->toBe(18.0);

    $lote = LoteStock::where('producto_id', $producto->id)->where('almacen_id', $almacen->id)->first();
    expect($lote)->not->toBeNull();
    expect($lote->cantidad)->toBe(7);
    expect((float) $lote->precio_costo)->toBe(18.0);
    expect($lote->compra_producto_id)->toBeNull();
});

test('la corrección de costo por almacén queda auditada con el almacén y el costo real anterior, no el global', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 4]);

    LoteStock::create([
        'codigo' => 'LOTE-TEST-HIST',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 4,
        'precio_costo' => 12,
    ]);

    $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 20, 'clave-admin') + ['almacen_id' => $almacen->id]
    );

    $historial = HistorialPrecioCosto::where('producto_id', $producto->id)->latest()->first();

    expect($historial)->not->toBeNull();
    expect($historial->almacen_id)->toBe($almacen->id);
    expect((float) $historial->precio_anterior)->toBe(12.0);
    expect((float) $historial->precio_nuevo)->toBe(20.0);
    expect($historial->stock_momento)->toBe(4);
});

test('un admin no puede corregir el costo en un almacén que no pertenece al producto', function () {
    $admin = User::factory()->admin()->create(['password' => bcrypt('clave-admin')]);
    $this->actingAs($admin);

    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacenAjeno = Almacen::factory()->create();

    $response = $this->put(
        route('productos.update', $producto),
        payloadProducto($producto, 20, 'clave-admin') + ['almacen_id' => $almacenAjeno->id]
    );

    $response->assertSessionHas('error');
    expect($producto->fresh()->precio_compra_producto)->toEqual('10.00');
});

// "Opción A" (2026-09-20): override opcional de precio de venta por lote puntual.
test('un admin puede setear un precio de venta propio para un lote, sin afectar el resto', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => 20,
        'venta_ganancia' => 10,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $loteCaro = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-CARO',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $loteCaro->id]),
        ['precio_venta' => 25]
    );

    $response->assertSessionDoesntHaveErrors();
    expect((float) $loteCaro->fresh()->precio_venta)->toBe(25.0);
    expect($producto->precioVentaEfectivo($loteCaro->fresh()))->toBe(25.0);
    // El precio general del almacén (producto_vendedors) no se toca.
    expect($producto->precioVentaEnAlmacen($almacen->id))->toBe(20.0);
});

test('vaciar el precio de venta de un lote hace que vuelva a heredar el del almacén', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => 20,
        'venta_ganancia' => 10,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $lote = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-RESET',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
        'precio_venta' => 25,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $lote->id]),
        ['precio_venta' => '']
    );

    $response->assertSessionDoesntHaveErrors();
    expect($lote->fresh()->precio_venta)->toBeNull();
    expect($producto->precioVentaEfectivo($lote->fresh()))->toBe(20.0);
});

test('un moderador también puede corregir el precio de venta de un lote, sin contraseña', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    $lote = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-MOD',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $lote->id]),
        ['precio_venta' => 25]
    );

    $response->assertSessionDoesntHaveErrors();
    expect((float) $lote->fresh()->precio_venta)->toBe(25.0);
});

test('un vendedor sin acceso al almacén no puede corregir el precio de venta de un lote', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    $lote = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-VEND-BLOQUEADO',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $lote->id]),
        ['precio_venta' => 25]
    );

    $response->assertStatus(403);
    expect($lote->fresh()->precio_venta)->toBeNull();
});

test('un vendedor asignado al almacén sí puede corregir el precio de venta de un lote', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $vendedor->almacenes()->attach($almacen->id);
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    $lote = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-VEND-OK',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $lote->id]),
        ['precio_venta' => 25]
    );

    $response->assertSessionDoesntHaveErrors();
    expect((float) $lote->fresh()->precio_venta)->toBe(25.0);
});

test('un lote que no pertenece a este producto se rechaza con 404 al corregir su precio de venta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $otroProducto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();
    $loteAjeno = LoteStock::create([
        'codigo' => 'LOTE-PRECIO-AJENO',
        'producto_id' => $otroProducto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
    ]);

    $response = $this->put(
        route('productos.lotes.precio-venta', ['producto' => $producto->id, 'lote' => $loteAjeno->id]),
        ['precio_venta' => 25]
    );

    $response->assertStatus(404);
});
