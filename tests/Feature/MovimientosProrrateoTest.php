<?php

use App\Models\Almacen;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\User;
use App\Notifications\ProrrateoRequeridoNotification;
use Illuminate\Support\Facades\Notification;

// ==========================================================================
// STORE — cálculo de requiere_prorrateo
// ==========================================================================

test('vendedor crea movimiento hacia un almacén que no tiene asignado: requiere_prorrateo queda true', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create(); // no asignado al vendedor
    $vendedor->almacenes()->attach($origen->id);
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $this->assertDatabaseHas('movimientos', [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'requiere_prorrateo' => true,
    ]);
});

test('vendedor crea movimiento hacia un almacén que sí tiene asignado: requiere_prorrateo queda false', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $vendedor->almacenes()->attach([$origen->id, $destino->id]);
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $this->assertDatabaseHas('movimientos', [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'requiere_prorrateo' => false,
    ]);
});

test('admin crea movimiento hacia un almacén que no tiene asignado: requiere_prorrateo queda true igual que un vendedor', function () {
    // La regla es sobre el destino, no sobre quién lo crea — un admin que despacha un
    // contenedor completo hacia otro punto de venta también debe poder decidir el prorrateo.
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create(); // no asignado al admin
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $this->assertDatabaseHas('movimientos', [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'requiere_prorrateo' => true,
    ]);
});

test('admin crea movimiento hacia un almacén que sí tiene asignado: requiere_prorrateo igual queda true (sin condición para admin/moderador)', function () {
    // A diferencia de un vendedor, admin/moderador no depende de si el destino le pertenece —
    // siempre queda disponible para decidir, aunque coincida con un almacén que tiene asignado.
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $admin->almacenes()->attach([$origen->id, $destino->id]);
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $this->post(route('movimientos.store'), payloadStoreMovimiento($origen, $destino, $producto, 10));

    $this->assertDatabaseHas('movimientos', [
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'requiere_prorrateo' => true,
    ]);
});

// ==========================================================================
// ENVIAR — notificación de prorrateo requerido
// ==========================================================================

test('enviar() notifica a admin/moderador cuando el movimiento requiere_prorrateo', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $moderador = User::factory()->moderador()->create();
    User::factory()->vendedor()->create(); // no debe recibir la notificación

    $creador = User::factory()->vendedor()->create();
    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $creador->id,
        'estado' => 'pendiente_confirmacion',
        'requiere_prorrateo' => true,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10]);

    $admin2 = User::factory()->admin()->create();
    $this->actingAs($admin2)->post(route('movimientos.enviar', $movimiento));

    Notification::assertSentTo([$admin, $moderador, $admin2], ProrrateoRequeridoNotification::class);
});

test('enviar() NO notifica de prorrateo cuando el movimiento no lo requiere', function () {
    Notification::fake();

    $creador = User::factory()->admin()->create();
    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $creador->id,
        'estado' => 'pendiente_confirmacion',
        'requiere_prorrateo' => false,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10]);

    $this->actingAs($creador)->post(route('movimientos.enviar', $movimiento));

    Notification::assertNotSentTo($creador, ProrrateoRequeridoNotification::class);
    Notification::assertSentTo($creador, \App\Notifications\MovimientoStockNotification::class); // sanity check: el flujo normal de enviar() sigue intacto
});

// ==========================================================================
// RECIBIR — sin gate, regresión explícita: el prorrateo es una acción libre, nunca bloquea
// ==========================================================================

test('recibir() funciona sin importar el estado de prorrateo_decision (sin gate, a propósito)', function (?string $decision) {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    crearAlmacenProducto($origen, $producto, cantidad: 50, cantidadEnTransito: 10);
    crearAlmacenProducto($destino, $producto, cantidad: 0);

    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $admin->id,
        'requiere_prorrateo' => true,
        'prorrateo_decision' => $decision,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10,
    ]);

    $response = $this->post(route('movimientos.recibir', $movimiento), [
        'productos' => [['id' => $producto->id, 'cantidad_recibida' => 10]],
    ]);

    $response->assertRedirect(route('movimientos.index'));
    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'estado' => 'recibido_completo']);
})->with([
    'sin decisión (null)' => [null],
    'ya aplicado' => ['aplicado'],
    'ya omitido' => ['omitido'],
]);
