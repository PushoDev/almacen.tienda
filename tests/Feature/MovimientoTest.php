<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\User;

/**
 * NOTA: `cantidad_en_transito` NO está en $fillable de AlmacenProducto (solo
 * almacen_id/producto_id/cantidad), así que create() la ignora silenciosamente.
 * Se asigna aparte con setAttribute()+save() para poder fijar un valor inicial en los tests.
 */
function crearAlmacenProducto(Almacen $almacen, Producto $producto, int $cantidad, int $cantidadEnTransito = 0): AlmacenProducto
{
    $ap = AlmacenProducto::create([
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => $cantidad,
    ]);

    if ($cantidadEnTransito !== 0) {
        $ap->setAttribute('cantidad_en_transito', $cantidadEnTransito)->save();
    }

    return $ap;
}

function payloadStoreMovimiento(Almacen $origen, Almacen $destino, Producto $producto, int $cantidad): array
{
    return [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'productos' => [
            ['id' => $producto->id, 'cantidad' => $cantidad],
        ],
    ];
}

// ==========================================================================
// STORE — crear movimiento (no reserva stock todavía, solo valida disponibilidad)
// ==========================================================================

test('store() crea el movimiento con su detalle y el primer seguimiento, sin tocar el stock aún', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $response = $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('movimientos', [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'estado' => 'pendiente_confirmacion',
    ]);

    $movimiento = Movimiento::first();
    $this->assertDatabaseHas('movimiento_detalles', [
        'movimiento_id' => $movimiento->id,
        'producto_id' => $producto->id,
        'cantidad_solicitada' => 10,
        'cantidad_despachada' => 0,
    ]);
    $this->assertDatabaseHas('movimiento_seguimientos', [
        'movimiento_id' => $movimiento->id,
        'estado' => 'pendiente_confirmacion',
    ]);

    // El stock del origen no se toca al crear, solo al enviar
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id,
        'producto_id' => $producto->id,
        'cantidad' => 50,
        'cantidad_en_transito' => 0,
    ]);
});

test('store() rechaza el movimiento si no hay stock disponible en el almacén origen', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 5);

    $response = $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $response->assertSessionHasErrors('general');
    $this->assertDatabaseCount('movimientos', 0);
});

test('un vendedor no puede crear un movimiento desde un almacén que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create(); // no asignado al vendedor
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $response = $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $response->assertSessionHasErrors('almacen_origen_id');
    $this->assertDatabaseCount('movimientos', 0);
});

// ==========================================================================
// ACTUALIZAR — editar productos/cantidades antes de enviar (pedido del cliente:
// por error humano puede faltar o sobrar algún producto antes de despachar)
// ==========================================================================

test('actualizar() cambia la cantidad de un producto existente, agrega uno nuevo y quita otro', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $productoA = Producto::factory()->create();
    $productoB = Producto::factory()->create();
    $productoC = Producto::factory()->create();
    crearAlmacenProducto($origen, $productoA, cantidad: 50);
    crearAlmacenProducto($origen, $productoB, cantidad: 50);
    crearAlmacenProducto($origen, $productoC, cantidad: 50);

    $this->post(route('movimientos.store'), [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'productos' => [
            ['id' => $productoA->id, 'cantidad' => 10],
            ['id' => $productoB->id, 'cantidad' => 5],
        ],
    ]);
    $movimiento = Movimiento::first();

    // Sube A a 20, quita B, agrega C
    $response = $this->post(route('movimientos.actualizar', $movimiento), [
        'productos' => [
            ['id' => $productoA->id, 'cantidad' => 20],
            ['id' => $productoC->id, 'cantidad' => 7],
        ],
    ]);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('movimiento_detalles', [
        'movimiento_id' => $movimiento->id,
        'producto_id' => $productoA->id,
        'cantidad_solicitada' => 20,
    ]);
    $this->assertDatabaseHas('movimiento_detalles', [
        'movimiento_id' => $movimiento->id,
        'producto_id' => $productoC->id,
        'cantidad_solicitada' => 7,
    ]);
    $this->assertDatabaseMissing('movimiento_detalles', [
        'movimiento_id' => $movimiento->id,
        'producto_id' => $productoB->id,
    ]);
    expect($movimiento->fresh()->detalles)->toHaveCount(2);
    // Editar no toca stock — nada se reserva hasta enviar()
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $productoA->id, 'cantidad' => 50, 'cantidad_en_transito' => 0,
    ]);
});

test('actualizar() rechaza si no hay stock disponible para la nueva cantidad', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 10);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 5));
    $movimiento = Movimiento::first();

    $response = $this->post(route('movimientos.actualizar', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad' => 999]],
    ]);

    $response->assertSessionHasErrors('general');
    $movimiento->refresh();
    expect($movimiento->detalles->first()->cantidad_solicitada)->toBe(5);
});

test('no se puede editar un movimiento que ya está en tránsito', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));
    $movimiento = Movimiento::first();
    $this->post(route('movimientos.enviar', $movimiento), []);

    $response = $this->post(route('movimientos.actualizar', $movimiento->fresh()), [
        'productos' => [['id' => $producto->id, 'cantidad' => 20]],
    ]);

    $response->assertSessionHasErrors('general');
    expect($movimiento->fresh()->detalles->first()->cantidad_solicitada)->toBe(10);
});

test('un vendedor no puede editar un movimiento de un almacén origen que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $origen = Almacen::factory()->almacen()->create(); // no asignado al vendedor
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));
    $movimiento = Movimiento::first();

    $this->actingAs($vendedor);
    $response = $this->post(route('movimientos.actualizar', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad' => 15]],
    ]);

    $response->assertForbidden();
    expect($movimiento->fresh()->detalles->first()->cantidad_solicitada)->toBe(10);
});

// ==========================================================================
// ENVIAR — reserva stock (cantidad_en_transito), no descuenta cantidad todavía
// ==========================================================================

test('enviar() incrementa cantidad_en_transito en origen y pasa el movimiento a en_transito', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $admin->id,
        'estado' => 'pendiente_confirmacion',
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10]);

    $response = $this->post(route('movimientos.enviar', $movimiento), ['guia_transporte' => 'GUA-001']);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id,
        'producto_id' => $producto->id,
        'cantidad' => 50, // sin cambios todavía
        'cantidad_en_transito' => 10,
    ]);
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'en_transito']);
    $this->assertDatabaseHas('movimiento_detalles', [
        'movimiento_id' => $movimiento->id,
        'cantidad_despachada' => 10,
    ]);
});

test('enviar() falla si el stock disponible ya no alcanza (por ejemplo, reservado por otro movimiento)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    // Cantidad 10, pero ya hay 8 reservadas por otro movimiento => solo 2 disponibles
    crearAlmacenProducto($origen, $producto, cantidad: 10, cantidadEnTransito: 8);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $admin->id,
        'estado' => 'pendiente_confirmacion',
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 5]);

    $response = $this->post(route('movimientos.enviar', $movimiento));

    $response->assertSessionHasErrors('general');
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'pendiente_confirmacion']);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad_en_transito' => 8,
    ]);
});

test('no se puede enviar un movimiento que ya está en tránsito', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $movimiento = Movimiento::factory()->enTransito()->create(['user_id' => $admin->id]);

    $response = $this->post(route('movimientos.enviar', $movimiento));

    $response->assertSessionHasErrors('general');
});

// ==========================================================================
// RECIBIR — completa/parcial, reconciliación de diferencias
// ==========================================================================

test('recibir() completo: suma al destino, resta del origen (cantidad y en_transito), estado recibido_completo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 3);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]],
    ]);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 40, 'cantidad_en_transito' => 0,
    ]);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $destino->id, 'producto_id' => $producto->id, 'cantidad' => 13,
    ]);
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_completo']);
});

test('recibir() un movimiento que NO requiere prorrateo acumula sus unidades al lote idéntico del destino en vez de crear otro', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 5);
    $existente = LoteStock::create(['codigo' => 'LOTE-EXISTENTE', 'producto_id' => $producto->id, 'almacen_id' => $destino->id, 'cantidad' => 5, 'precio_costo' => 100]);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id, 'requiere_prorrateo' => false,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10]);

    $this->post(route('movimientos.recibir', $movimiento), ['productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]]])
        ->assertRedirect(route('movimientos.index'));

    expect($existente->fresh()->cantidad_disponible)->toBe(15);
    // El lote del movimiento existió, pero quedó absorbido: sin stock propio y apuntando al existente.
    $loteDelMovimiento = LoteStock::where('movimiento_id', $movimiento->id)->sole();
    expect($loteDelMovimiento->cantidad_disponible)->toBe(0);
    expect($loteDelMovimiento->fusionado_en_lote_id)->toBe($existente->id);
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $destino->id, 'producto_id' => $producto->id, 'cantidad' => 15]);
});

test('recibir() un movimiento que SÍ requiere prorrateo deja su lote aparte hasta que se decida (aplicar o eliminar de la lista)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 5);
    $existente = LoteStock::create(['codigo' => 'LOTE-EXISTENTE', 'producto_id' => $producto->id, 'almacen_id' => $destino->id, 'cantidad' => 5, 'precio_costo' => 100]);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id, 'requiere_prorrateo' => true,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10]);

    $this->post(route('movimientos.recibir', $movimiento), ['productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]]])
        ->assertRedirect(route('movimientos.index'));

    expect($existente->fresh()->cantidad_disponible)->toBe(5);
    $loteDelMovimiento = LoteStock::where('movimiento_id', $movimiento->id)->sole();
    expect($loteDelMovimiento->cantidad_disponible)->toBe(10);
    expect($loteDelMovimiento->fusionado_en_lote_id)->toBeNull();
});

test('recibir() parcial: la diferencia no recibida queda de vuelta en el origen, estado recibido_parcial', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    // Solo llegaron 7 de las 10 despachadas
    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 7]],
    ]);
    $response->assertRedirect(route('movimientos.index'));

    // Origen: 50 - 10 (despachado) + 3 (diferencia no recibida) = 43
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 43, 'cantidad_en_transito' => 0,
    ]);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $destino->id, 'producto_id' => $producto->id, 'cantidad' => 7,
    ]);
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_parcial']);
    $this->assertDatabaseHas('movimiento_detalles', [
        'movimiento_id' => $movimiento->id, 'cantidad_recibida' => 7,
    ]);
});

test('recibir() no marca completo si una línea recibió de menos y otra de más aunque el total coincida', function () {
    // Reproduce un caso real (movimiento #52): 2 despachadas/1 recibida en un producto y
    // 2 despachadas/3 recibidas en otro — el total (4/4) coincide y el código viejo lo
    // marcaba "recibido_completo", ocultando que ninguna de las 2 líneas llegó exacta.
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $productoA = Producto::factory()->create();
    $productoB = Producto::factory()->create();
    crearAlmacenProducto($origen, $productoA, cantidad: 50, cantidadEnTransito: 2);
    crearAlmacenProducto($origen, $productoB, cantidad: 50, cantidadEnTransito: 2);
    crearAlmacenProducto($destino, $productoA, cantidad: 0);
    crearAlmacenProducto($destino, $productoB, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $productoA->id, 'cantidad_solicitada' => 2, 'cantidad_despachada' => 2,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $productoB->id, 'cantidad_solicitada' => 2, 'cantidad_despachada' => 2,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [
            ['id' => $productoA->id, 'cantidad_recibida' => 1], // faltó 1
            ['id' => $productoB->id, 'cantidad_recibida' => 3], // sobró 1
        ],
    ]);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_parcial']);
});

test('no se puede recibir un movimiento que no está en tránsito', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $producto = Producto::factory()->create();
    $movimiento = Movimiento::factory()->create(['user_id' => $admin->id, 'estado' => 'pendiente_confirmacion']);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 5]],
    ]);

    $response->assertSessionHasErrors('general');
});

test('recibir() dos veces seguidas (doble clic) suma al destino una sola vez', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);
    $payload = ['productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]]];

    $this->post(route('movimientos.recibir', $movimiento), $payload)->assertRedirect(route('movimientos.index'));
    $this->post(route('movimientos.recibir', $movimiento), $payload)->assertSessionHasErrors('general');

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $destino->id, 'producto_id' => $producto->id, 'cantidad' => 10,
    ]);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 40, 'cantidad_en_transito' => 0,
    ]);
});

test('recibir() rechaza la petición si omite alguna línea del movimiento y no toca el stock', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $productoA = Producto::factory()->create();
    $productoB = Producto::factory()->create();
    crearAlmacenProducto($origen, $productoA, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($origen, $productoB, cantidad: 50, cantidadEnTransito: 5);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create(['producto_id' => $productoA->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10]);
    $movimiento->detalles()->create(['producto_id' => $productoB->id, 'cantidad_solicitada' => 5, 'cantidad_despachada' => 5]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $productoA->id, 'cantidad_recibida' => 10]],
    ]);

    $response->assertSessionHasErrors('general');
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'en_transito']);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $productoA->id, 'cantidad' => 50, 'cantidad_en_transito' => 10,
    ]);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $productoB->id, 'cantidad' => 50, 'cantidad_en_transito' => 5,
    ]);
});

test('un vendedor no puede recibir en un almacén destino que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create(); // no asignado al vendedor
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $vendedor->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]],
    ]);

    $response->assertForbidden();
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'en_transito']);
});

test('un vendedor sí puede recibir en un almacén destino que tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($destino->id);
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $vendedor->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]],
    ]);

    $response->assertRedirect(route('movimientos.index'));
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_completo']);
});

// ==========================================================================
// RECHAZAR — libera la reserva si estaba en tránsito
// ==========================================================================

test('rechazar() en tránsito libera cantidad_en_transito sin tocar cantidad', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.rechazar', $movimiento), ['observaciones' => 'Cliente canceló']);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 50, 'cantidad_en_transito' => 0,
    ]);
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'rechazado']);
});

test('rechazar() dos veces seguidas (doble clic) libera la reserva una sola vez', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'user_id' => $admin->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $this->post(route('movimientos.rechazar', $movimiento), ['observaciones' => 'Cliente canceló'])
        ->assertRedirect(route('movimientos.index'));
    $this->post(route('movimientos.rechazar', $movimiento), ['observaciones' => 'Cliente canceló'])
        ->assertSessionHasErrors('general');

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 50, 'cantidad_en_transito' => 0,
    ]);
});

test('rechazar() pendiente de confirmación no toca el stock (nunca se reservó)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id, 'user_id' => $admin->id, 'estado' => 'pendiente_confirmacion',
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10]);

    $response = $this->post(route('movimientos.rechazar', $movimiento), ['observaciones' => 'Error de captura']);
    $response->assertRedirect(route('movimientos.index'));

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $origen->id, 'producto_id' => $producto->id, 'cantidad' => 50, 'cantidad_en_transito' => 0,
    ]);
});

test('no se puede rechazar un movimiento ya recibido', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $movimiento = Movimiento::factory()->recibidoCompleto()->create(['user_id' => $admin->id]);

    $response = $this->post(route('movimientos.rechazar', $movimiento), ['observaciones' => 'x']);

    $response->assertSessionHasErrors('general');
});

// ==========================================================================
// SHOW — visible en cualquier estado (el emisor debe poder ver qué envió
// mientras el movimiento está en tránsito, no solo una vez resuelto)
// ==========================================================================

test('show() permite ver el detalle de un movimiento todavía en tránsito', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $movimiento = Movimiento::factory()->enTransito()->create(['user_id' => $admin->id]);

    $response = $this->get(route('movimientos.show', $movimiento));

    $response->assertOk();
});

test('show() permite ver el detalle de un movimiento recibido completo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $movimiento = Movimiento::factory()->recibidoCompleto()->create(['user_id' => $admin->id]);

    $response = $this->get(route('movimientos.show', $movimiento));

    $response->assertOk();
});

// ==========================================================================
// ACCESO POR ROL
// ==========================================================================

test('un moderador puede crear un movimiento desde cualquier almacén, igual que admin', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $origen = Almacen::factory()->almacen()->create(); // no asignado al moderador
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $response = $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $response->assertRedirect(route('movimientos.index'));
    $this->assertDatabaseCount('movimientos', 1);
});

test('un moderador puede recibir en cualquier almacén destino, igual que admin', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create(); // no asignado al moderador
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id, 'user_id' => $moderador->id,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]],
    ]);

    $response->assertRedirect(route('movimientos.index'));
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_completo']);
});

test('un vendedor no puede ver productos de un almacén que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->almacen()->create();

    $response = $this->get(route('movimientos.productos-por-almacen', $almacen->id));

    $response->assertStatus(403);
});

// ==========================================================================
// VISIBILIDAD — un vendedor solo ve los movimientos que salen de o llegan a sus almacenes
// ==========================================================================

test('index() muestra al vendedor solo los movimientos cuyo origen o destino es suyo', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $suyo = Almacen::factory()->almacen()->create();
    $ajeno1 = Almacen::factory()->almacen()->create();
    $ajeno2 = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($suyo->id);

    $saliente = Movimiento::factory()->create(['almacen_origen_id' => $suyo->id, 'almacen_destino_id' => $ajeno1->id]);
    $entrante = Movimiento::factory()->create(['almacen_origen_id' => $ajeno1->id, 'almacen_destino_id' => $suyo->id]);
    Movimiento::factory()->create(['almacen_origen_id' => $ajeno1->id, 'almacen_destino_id' => $ajeno2->id]);

    $this->get(route('movimientos.index'))->assertInertia(fn ($page) => $page
        ->has('movimientos.data', 2)
        ->where('movimientos.data', fn ($data) => collect($data)->pluck('id')->sort()->values()->all() === collect([$saliente->id, $entrante->id])->sort()->values()->all())
    );
});

test('index() muestra todos los movimientos a admin y moderador', function () {
    Movimiento::factory()->count(3)->create();

    foreach ([User::factory()->admin()->create(), User::factory()->moderador()->create()] as $usuario) {
        $this->actingAs($usuario)
            ->get(route('movimientos.index'))
            ->assertInertia(fn ($page) => $page->has('movimientos.data', 3));
    }
});

test('un vendedor no puede abrir ni consultar el seguimiento de un movimiento ajeno', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $movimiento = Movimiento::factory()->create();

    $this->get(route('movimientos.show', $movimiento))->assertForbidden();
    $this->get(route('movimientos.seguimiento', $movimiento))->assertForbidden();
});

test('un vendedor puede abrir un movimiento que llega a su almacén', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $destino = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($destino->id);
    $movimiento = Movimiento::factory()->create(['almacen_destino_id' => $destino->id]);

    $this->get(route('movimientos.show', $movimiento))->assertOk();
    $this->get(route('movimientos.seguimiento', $movimiento))->assertOk();
});

// ==========================================================================
// PANTALLA DE TRABAJO — solo lo reciente (3 días) y lo que sigue abierto
// ==========================================================================

test('index() muestra lo de los últimos 3 días y todo lo abierto, aunque sea viejo', function () {
    $this->travelTo('2026-10-06 12:00:00');
    $this->actingAs(User::factory()->admin()->create());

    $hoy = Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-10-06 08:00:00']);
    $limite = Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-10-04 00:30:00']);
    Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-10-03 23:30:00']);
    $pendienteViejo = Movimiento::factory()->create(['estado' => 'pendiente_confirmacion', 'created_at' => '2026-09-01 10:00:00']);
    $transitoViejo = Movimiento::factory()->enTransito()->create(['created_at' => '2026-09-10 10:00:00']);
    Movimiento::factory()->create(['estado' => 'rechazado', 'created_at' => '2026-09-15 10:00:00']);

    $this->get(route('movimientos.index'))->assertInertia(function ($page) use ($hoy, $limite, $pendienteViejo, $transitoViejo) {
        $ids = collect($page->toArray()['props']['movimientos']['data'])->pluck('id')->sort()->values()->all();

        expect($ids)->toBe(collect([$hoy->id, $limite->id, $pendienteViejo->id, $transitoViejo->id])->sort()->values()->all());
    });
});

test('el reporte de historial muestra todos los movimientos sin la ventana de 3 días', function () {
    $this->actingAs(User::factory()->admin()->create());

    Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-01-10 10:00:00']);
    Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-09-10 10:00:00']);

    $this->get(route('reportes.historial_movimientos'))->assertInertia(fn ($page) => $page->has('movimientos.data', 2));
});

test('un vendedor ve en el reporte de historial solo los movimientos de sus almacenes', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $suyo = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($suyo->id);
    $visible = Movimiento::factory()->create(['almacen_origen_id' => $suyo->id, 'estado' => 'recibido_completo', 'created_at' => '2026-01-10 10:00:00']);
    Movimiento::factory()->create(['estado' => 'recibido_completo', 'created_at' => '2026-01-10 10:00:00']);

    $this->get(route('reportes.historial_movimientos'))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $visible->id)->where('esVendedor', true));
});

// ==========================================================================
// FILTROS DEL REPORTE — estado, almacenes, sentido, fechas y búsqueda
// ==========================================================================

test('el reporte filtra por estado y por almacén origen y destino', function () {
    $this->actingAs(User::factory()->admin()->create());

    $almacenA = Almacen::factory()->almacen()->create();
    $almacenB = Almacen::factory()->almacen()->create();
    $pendienteAB = Movimiento::factory()->create(['almacen_origen_id' => $almacenA->id, 'almacen_destino_id' => $almacenB->id, 'estado' => 'pendiente_confirmacion']);
    $rechazadoBA = Movimiento::factory()->create(['almacen_origen_id' => $almacenB->id, 'almacen_destino_id' => $almacenA->id, 'estado' => 'rechazado']);

    $this->get(route('reportes.historial_movimientos', ['estado' => 'rechazado']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $rechazadoBA->id));

    $this->get(route('reportes.historial_movimientos', ['almacen_origen_id' => $almacenA->id]))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $pendienteAB->id));

    $this->get(route('reportes.historial_movimientos', ['almacen_destino_id' => $almacenA->id]))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $rechazadoBA->id));
});

test('el reporte filtra por rango de fechas de creación', function () {
    $this->actingAs(User::factory()->admin()->create());

    $viejo = Movimiento::factory()->create(['created_at' => '2026-09-01 10:00:00']);
    $reciente = Movimiento::factory()->create(['created_at' => '2026-10-05 10:00:00']);

    $this->get(route('reportes.historial_movimientos', ['desde' => '2026-10-01', 'hasta' => '2026-10-06']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $reciente->id));

    $this->get(route('reportes.historial_movimientos', ['hasta' => '2026-09-30']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $viejo->id));
});

test('el reporte rechaza un rango de fechas invertido', function () {
    $this->actingAs(User::factory()->admin()->create());

    $this->get(route('reportes.historial_movimientos', ['desde' => '2026-10-06', 'hasta' => '2026-10-01']))
        ->assertSessionHasErrors('hasta');
});

test('el reporte busca por número de movimiento, producto y solicitante', function () {
    $this->actingAs(User::factory()->admin()->create());

    $solicitante = User::factory()->vendedor()->create(['name' => 'Marta Pérez']);
    $producto = Producto::factory()->create(['nombre_producto' => 'LAVADORA EKO']);
    $conProducto = Movimiento::factory()->create(['user_id' => $solicitante->id]);
    $conProducto->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 2]);
    $otro = Movimiento::factory()->create();

    $this->get(route('reportes.historial_movimientos', ['buscar' => "#{$otro->id}"]))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $otro->id));

    $this->get(route('reportes.historial_movimientos', ['buscar' => 'lavadora']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $conProducto->id));

    $this->get(route('reportes.historial_movimientos', ['buscar' => 'Marta']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $conProducto->id));
});

test('el reporte permite al vendedor filtrar salientes y entrantes sin salirse de sus almacenes', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $suyo = Almacen::factory()->almacen()->create();
    $ajeno = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($suyo->id);

    $saliente = Movimiento::factory()->create(['almacen_origen_id' => $suyo->id, 'almacen_destino_id' => $ajeno->id]);
    $entrante = Movimiento::factory()->create(['almacen_origen_id' => $ajeno->id, 'almacen_destino_id' => $suyo->id]);
    Movimiento::factory()->create(['almacen_origen_id' => $ajeno->id, 'almacen_destino_id' => $ajeno->id]);

    $this->get(route('reportes.historial_movimientos', ['sentido' => 'salientes']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $saliente->id));

    $this->get(route('reportes.historial_movimientos', ['sentido' => 'entrantes']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1)->where('movimientos.data.0.id', $entrante->id));

    // Filtrar por un almacén ajeno como destino no destapa movimientos que no son suyos
    $this->get(route('reportes.historial_movimientos', ['almacen_origen_id' => $ajeno->id, 'almacen_destino_id' => $ajeno->id]))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 0));
});

test('el reporte totaliza todo lo filtrado, no solo la página, y respeta los filtros', function () {
    $this->actingAs(User::factory()->admin()->create());

    $producto = Producto::factory()->create();
    $recibido = Movimiento::factory()->create(['estado' => 'recibido_parcial']);
    $recibido->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10, 'cantidad_recibida' => 7]);
    $transito = Movimiento::factory()->enTransito()->create();
    $transito->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 5, 'cantidad_despachada' => 5]);
    Movimiento::factory()->count(16)->create(['estado' => 'rechazado']);

    $this->get(route('reportes.historial_movimientos'))->assertInertia(fn ($page) => $page
        ->where('totales.movimientos', 18)
        ->where('totales.unidades_solicitadas', 15)
        ->where('totales.unidades_despachadas', 15)
        ->where('totales.unidades_recibidas', 7)
        ->where('totales.por_estado', ['recibido_parcial' => 1, 'en_transito' => 1, 'rechazado' => 16])
        ->where('totales.parciales', ['movimientos' => 1, 'unidades_faltantes' => 3])
        ->has('movimientos.data', 15)
    );

    $this->get(route('reportes.historial_movimientos', ['estado' => 'en_transito']))->assertInertia(fn ($page) => $page
        ->where('totales.movimientos', 1)
        ->where('totales.unidades_solicitadas', 5)
        ->where('totales.unidades_recibidas', 0)
        ->where('totales.parciales', ['movimientos' => 0, 'unidades_faltantes' => 0])
    );
});

test('el reporte indica quién envió, recibió y rechazó cada movimiento', function () {
    $this->actingAs(User::factory()->admin()->create());

    $quienEnvia = User::factory()->vendedor()->create(['name' => 'Ana Envía']);
    $quienRecibe = User::factory()->vendedor()->create(['name' => 'Luis Recibe']);
    $quienRechaza = User::factory()->vendedor()->create(['name' => 'Eva Rechaza']);

    $recibido = Movimiento::factory()->create(['estado' => 'recibido_completo']);
    $recibido->seguimientos()->create(['estado' => 'en_transito', 'user_id' => $quienEnvia->id]);
    $recibido->seguimientos()->create(['estado' => 'recibido_completo', 'user_id' => $quienRecibe->id]);

    $rechazado = Movimiento::factory()->create(['estado' => 'rechazado']);
    $rechazado->seguimientos()->create(['estado' => 'rechazado', 'user_id' => $quienRechaza->id]);

    $this->get(route('reportes.historial_movimientos'))->assertInertia(function ($page) use ($recibido, $rechazado) {
        $filas = collect($page->toArray()['props']['movimientos']['data'])->keyBy('id');

        expect($filas[$recibido->id]['enviado_por'])->toBe('Ana Envía');
        expect($filas[$recibido->id]['recibido_por'])->toBe('Luis Recibe');
        expect($filas[$recibido->id]['rechazado_por'])->toBeNull();
        expect($filas[$rechazado->id]['rechazado_por'])->toBe('Eva Rechaza');
        expect($filas[$rechazado->id]['enviado_por'])->toBeNull();
    });
});

// ==========================================================================
// HOJA IMPRIMIBLE — comprobante de envío (recibido en blanco) y evidencia de recepción
// ==========================================================================

test('imprimir() de un movimiento sin recibir manda lo a enviar y deja lo recibido en blanco', function () {
    $this->actingAs(User::factory()->admin()->create());

    $producto = Producto::factory()->create(['nombre_producto' => 'LAVADORA EKO']);
    $pendiente = Movimiento::factory()->create(['estado' => 'pendiente_confirmacion']);
    $pendiente->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 4]);
    $enTransito = Movimiento::factory()->enTransito()->create();
    $enTransito->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 6, 'cantidad_despachada' => 5]);

    $this->get(route('movimientos.imprimir', $pendiente))->assertInertia(fn ($page) => $page
        ->component('Movimientos/Imprimir')
        ->where('movimiento.es_evidencia', false)
        ->where('movimiento.detalles.0.cantidad_enviada', 4)
        ->where('movimiento.detalles.0.cantidad_recibida', null)
        ->where('movimiento.detalles.0.producto.nombre', 'LAVADORA EKO')
    );

    // Ya despachado, lo que sale es lo despachado, no lo solicitado
    $this->get(route('movimientos.imprimir', $enTransito))->assertInertia(fn ($page) => $page
        ->where('movimiento.es_evidencia', false)
        ->where('movimiento.detalles.0.cantidad_enviada', 5)
    );
});

test('imprimir() de un movimiento recibido es la evidencia, con lo recibido y quién lo recibió', function () {
    $this->actingAs(User::factory()->admin()->create());

    $quienEnvia = User::factory()->vendedor()->create(['name' => 'Ana Envía']);
    $quienRecibe = User::factory()->vendedor()->create(['name' => 'Luis Recibe']);
    $producto = Producto::factory()->create();
    $movimiento = Movimiento::factory()->create(['estado' => 'recibido_parcial', 'fecha_recepcion' => now()]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10, 'cantidad_recibida' => 7]);
    $movimiento->seguimientos()->create(['estado' => 'en_transito', 'user_id' => $quienEnvia->id]);
    $movimiento->seguimientos()->create(['estado' => 'recibido_parcial', 'user_id' => $quienRecibe->id]);

    $this->get(route('movimientos.imprimir', $movimiento))->assertInertia(fn ($page) => $page
        ->where('movimiento.es_evidencia', true)
        ->where('movimiento.enviado_por', 'Ana Envía')
        ->where('movimiento.recibido_por', 'Luis Recibe')
        ->where('movimiento.detalles.0.cantidad_enviada', 10)
        ->where('movimiento.detalles.0.cantidad_recibida', 7)
    );
});

test('imprimir() lo pueden abrir el almacén origen y el destino, pero no un vendedor ajeno', function () {
    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $movimiento = Movimiento::factory()->create(['almacen_origen_id' => $origen->id, 'almacen_destino_id' => $destino->id]);

    $vendedorOrigen = User::factory()->vendedor()->create();
    $vendedorDestino = User::factory()->vendedor()->create();
    $vendedorAjeno = User::factory()->vendedor()->create();
    $vendedorOrigen->almacenes()->attach($origen->id);
    $vendedorDestino->almacenes()->attach($destino->id);

    foreach ([$vendedorOrigen, $vendedorDestino] as $vendedor) {
        crearTurnoActivo($vendedor);
        $this->actingAs($vendedor)->get(route('movimientos.imprimir', $movimiento))->assertOk();
    }

    crearTurnoActivo($vendedorAjeno);
    $this->actingAs($vendedorAjeno)->get(route('movimientos.imprimir', $movimiento))->assertForbidden();
});

// ==========================================================================
// PERMISOS POR FILA — la pantalla solo muestra los botones que el servidor aceptaría
// ==========================================================================

test('index() marca el origen como quien edita/envía/rechaza y el destino como quien recibe', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $suyo = Almacen::factory()->almacen()->create();
    $ajeno = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach($suyo->id);

    $pendienteSaliente = Movimiento::factory()->create(['almacen_origen_id' => $suyo->id, 'almacen_destino_id' => $ajeno->id, 'estado' => 'pendiente_confirmacion']);
    $pendienteEntrante = Movimiento::factory()->create(['almacen_origen_id' => $ajeno->id, 'almacen_destino_id' => $suyo->id, 'estado' => 'pendiente_confirmacion']);
    $transitoSaliente = Movimiento::factory()->enTransito()->create(['almacen_origen_id' => $suyo->id, 'almacen_destino_id' => $ajeno->id]);
    $transitoEntrante = Movimiento::factory()->enTransito()->create(['almacen_origen_id' => $ajeno->id, 'almacen_destino_id' => $suyo->id]);

    $this->get(route('movimientos.index'))->assertInertia(function ($page) use ($pendienteSaliente, $pendienteEntrante, $transitoSaliente, $transitoEntrante) {
        $permisos = collect($page->toArray()['props']['movimientos']['data'])->keyBy('id')->map(fn ($movimiento) => $movimiento['permisos']);

        expect($permisos[$pendienteSaliente->id])->toBe(['editar' => true, 'enviar' => true, 'rechazar' => true, 'recibir' => false]);
        expect($permisos[$pendienteEntrante->id])->toBe(['editar' => false, 'enviar' => false, 'rechazar' => false, 'recibir' => false]);
        expect($permisos[$transitoSaliente->id])->toBe(['editar' => false, 'enviar' => false, 'rechazar' => true, 'recibir' => false]);
        expect($permisos[$transitoEntrante->id])->toBe(['editar' => false, 'enviar' => false, 'rechazar' => false, 'recibir' => true]);
    });
});

test('index() da a admin todos los permisos que el estado permite y ninguno a un movimiento ya cerrado', function () {
    $this->actingAs(User::factory()->admin()->create());

    $pendiente = Movimiento::factory()->create(['estado' => 'pendiente_confirmacion']);
    $transito = Movimiento::factory()->enTransito()->create();
    $recibido = Movimiento::factory()->create(['estado' => 'recibido_completo']);

    $this->get(route('movimientos.index'))->assertInertia(function ($page) use ($pendiente, $transito, $recibido) {
        $permisos = collect($page->toArray()['props']['movimientos']['data'])->keyBy('id')->map(fn ($movimiento) => $movimiento['permisos']);

        expect($permisos[$pendiente->id])->toBe(['editar' => true, 'enviar' => true, 'rechazar' => true, 'recibir' => false]);
        expect($permisos[$transito->id])->toBe(['editar' => false, 'enviar' => false, 'rechazar' => true, 'recibir' => true]);
        expect($permisos[$recibido->id])->toBe(['editar' => false, 'enviar' => false, 'rechazar' => false, 'recibir' => false]);
    });
});
