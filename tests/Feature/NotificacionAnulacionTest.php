<?php

use App\Channels\TelegramChannel;
use App\Models\MovimientoFinanciero;
use App\Models\Remesa;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\MovimientoFinancieroNotification;
use App\Notifications\RemesaNotification;
use App\Notifications\VentaDevueltaNotification;
use Illuminate\Support\Facades\Notification;

// crearMoneda(), crearCuentaEnMoneda() y crearTiposMovimientoFinanciero() están
// declaradas globalmente en tests/Pest.php.

test('anular un gasto envía la notificación con anulado=true', function () {
    Notification::fake();
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 420);
    $movimiento = MovimientoFinanciero::create([
        'user_id' => $admin->id,
        'tipo_movimiento_id' => 1,
        'cuenta_origen_id' => $cuenta->id,
        'monto' => 80,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
        'estado' => 'completado',
        'saldo_anterior_origen' => 500,
        'saldo_posterior_origen' => 420,
        'moneda_origen' => 'USD',
    ]);

    $this->post(route('transacciones.anular', $movimiento->id), ['motivo_anulacion' => 'error_monto']);

    Notification::assertSentTo($admin, MovimientoFinancieroNotification::class, function ($notification) {
        return $notification->anulado === true;
    });
});

test('un moderador recibe el canal de Telegram para la notificación de movimiento financiero', function () {
    crearTiposMovimientoFinanciero();
    $moderador = User::factory()->moderador()->create(['telegram_chat_id' => '12345']);

    $movimiento = MovimientoFinanciero::create([
        'user_id' => $moderador->id,
        'tipo_movimiento_id' => 1,
        'monto' => 80,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
        'estado' => 'completado',
    ]);

    $notification = new MovimientoFinancieroNotification($movimiento, 'gasto');

    expect($notification->via($moderador))->toContain(TelegramChannel::class);
});

test('registrar una remesa envía RemesaNotification a admin/moderador', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($moneda, saldo: 100);
    $salida = crearCuentaEnMoneda($moneda, saldo: 500);

    $this->post(route('transacciones.remesa.store'), [
        'entrada_tipo' => 'cuenta',
        'entrada_id' => $entrada->id,
        'entrada_monto' => 50,
        'salida_tipo' => 'cuenta',
        'salida_id' => $salida->id,
        'salida_monto' => 40,
    ]);

    Notification::assertSentTo($admin, RemesaNotification::class, function ($notification) {
        return $notification->anulada === false;
    });
});

test('anular una remesa envía RemesaNotification con anulada=true', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $moneda = crearMonedaUsd();
    $entrada = crearCuentaEnMoneda($moneda, saldo: 150);
    $salida = crearCuentaEnMoneda($moneda, saldo: 460);

    $remesa = Remesa::create([
        'user_id' => $admin->id,
        'entrada_tipo' => 'cuenta',
        'entrada_cuenta_id' => $entrada->id,
        'entrada_monto' => 50,
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 100,
        'entrada_saldo_posterior' => 150,
        'salida_tipo' => 'cuenta',
        'salida_cuenta_id' => $salida->id,
        'salida_monto' => 40,
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 500,
        'salida_saldo_posterior' => 460,
        'fecha_operacion' => now(),
    ]);

    $this->post(route('transacciones.remesa.anular', $remesa->id), ['motivo_anulacion' => 'duplicado']);

    Notification::assertSentTo($admin, RemesaNotification::class, function ($notification) {
        return $notification->anulada === true;
    });
});

test('devolver una venta completada envía VentaDevueltaNotification a admin/moderador', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->completada()->create(['user_id' => $admin->id]);

    $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_pedido']);

    Notification::assertSentTo($admin, VentaDevueltaNotification::class);
});

test('anular una venta pendiente no envía VentaDevueltaNotification', function () {
    Notification::fake();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->create(['user_id' => $admin->id, 'estado' => 'pendiente']);

    $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_pedido']);

    Notification::assertNotSentTo($admin, VentaDevueltaNotification::class);
});

test('un moderador recibe el canal de Telegram para la notificación de devolución de venta', function () {
    $moderador = User::factory()->moderador()->create(['telegram_chat_id' => '12345']);
    $venta = Venta::factory()->devuelta()->create();

    $notification = new VentaDevueltaNotification($venta);

    expect($notification->via($moderador))->toContain(TelegramChannel::class);
});
