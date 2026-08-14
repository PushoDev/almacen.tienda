<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
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

test('un vendedor no puede recibir en un almacén destino que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
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
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->almacen()->create();

    $response = $this->get(route('movimientos.productos-por-almacen', $almacen->id));

    $response->assertStatus(403);
});
