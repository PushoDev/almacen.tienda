<?php

use App\Models\Almacen;
use App\Models\CierreCaja;
use App\Models\Movimiento;
use App\Models\TransferenciaPendiente;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\CierreCajaNotification;
use App\Notifications\CierresPendientesNotification;
use App\Notifications\MovimientoStockNotification;
use App\Notifications\ProrrateoRequeridoNotification;
use App\Notifications\TransferenciaPendienteNotification;
use App\Notifications\VentaDevueltaNotification;
use App\Notifications\VentaEspecialDecisionNotification;
use App\Notifications\VentaEspecialSolicitudNotification;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;

/**
 * Solo las notificaciones que exigen una acción van por push; el resto queda en la campana.
 * Se prueba el contrato observable: a qué usuario le corresponde el canal WebPush.
 */
function llevaPush(Notification $notificacion, User $usuario): bool
{
    return in_array(WebPushChannel::class, $notificacion->via($usuario), true);
}

function cierreDe(User $usuario, float $diferencia = 0): CierreCaja
{
    return (new CierreCaja)->forceFill(['id' => 501, 'user_id' => $usuario->id, 'cuenta_id' => null, 'diferencia' => $diferencia]);
}

test('el cierre de caja va por push a admin y moderador, no al vendedor', function () {
    $autor = User::factory()->vendedor()->create();
    $notificacion = new CierreCajaNotification(cierreDe($autor));

    expect(llevaPush($notificacion, User::factory()->admin()->create()))->toBeTrue()
        ->and(llevaPush($notificacion, User::factory()->moderador()->create()))->toBeTrue()
        ->and(llevaPush($notificacion, User::factory()->vendedor()->create()))->toBeFalse();
});

test('quien hizo el cierre no recibe el push de su propia acción', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    expect(llevaPush(new CierreCajaNotification(cierreDe($moderador)), $moderador))->toBeFalse();
});

test('la solicitud de venta especial va al admin y al moderador solo si es de descuento', function () {
    $admin = User::factory()->admin()->create();
    $moderador = User::factory()->moderador()->create();
    $descuento = new VentaEspecialSolicitudNotification(Venta::factory()->make(['tipo_venta_especial' => 'descuento']));
    $bajoCosto = new VentaEspecialSolicitudNotification(Venta::factory()->make(['tipo_venta_especial' => 'bajo_costo']));

    expect(llevaPush($descuento, $admin))->toBeTrue()
        ->and(llevaPush($descuento, $moderador))->toBeTrue()
        ->and(llevaPush($bajoCosto, $admin))->toBeTrue()
        ->and(llevaPush($bajoCosto, $moderador))->toBeFalse();
});

test('la decisión de venta especial le llega por push al vendedor que la pidió', function () {
    $vendedor = User::factory()->vendedor()->create();
    $venta = Venta::factory()->make(['tipo_venta_especial' => 'descuento']);

    expect(llevaPush(new VentaEspecialDecisionNotification($venta, 'aprobada'), $vendedor))->toBeTrue();
});

test('la venta devuelta, el prorrateo y los cierres pendientes respetan su rol', function () {
    $admin = User::factory()->admin()->create();
    $moderador = User::factory()->moderador()->create();
    $vendedor = User::factory()->vendedor()->create();

    $devuelta = new VentaDevueltaNotification(Venta::factory()->make());
    $prorrateo = new ProrrateoRequeridoNotification(Movimiento::factory()->make(['id' => 9]));
    $pendientes = new CierresPendientesNotification(collect([$vendedor]));

    expect(llevaPush($devuelta, $admin))->toBeTrue()
        ->and(llevaPush($devuelta, $moderador))->toBeTrue()
        ->and(llevaPush($devuelta, $vendedor))->toBeFalse()
        ->and(llevaPush($prorrateo, $moderador))->toBeTrue()
        ->and(llevaPush($prorrateo, $vendedor))->toBeFalse()
        ->and(llevaPush($pendientes, $admin))->toBeTrue()
        ->and(llevaPush($pendientes, $moderador))->toBeFalse();
});

test('solo el envío recién registrado va por push; lo que pasa después queda en la campana', function () {
    $admin = User::factory()->admin()->create();
    $envio = TransferenciaPendiente::factory()->create();

    expect(llevaPush(new TransferenciaPendienteNotification($envio, 'Pendiente de confirmación', requiereAccion: true), $admin))->toBeTrue()
        ->and(llevaPush(new TransferenciaPendienteNotification($envio, 'Confirmado'), $admin))->toBeFalse();
});

test('un movimiento enviado avisa al almacén destino y a admin/moderador, no al vendedor ajeno', function () {
    $movimiento = Movimiento::factory()->enTransito()->create();
    $deDestino = User::factory()->vendedor()->create();
    $deDestino->almacenes()->attach($movimiento->almacen_destino_id);
    $deOrigen = User::factory()->vendedor()->create();
    $deOrigen->almacenes()->attach($movimiento->almacen_origen_id);
    $ajeno = User::factory()->vendedor()->create();
    $ajeno->almacenes()->attach(Almacen::factory()->create()->id);
    $notificacion = new MovimientoStockNotification($movimiento, 'Movimiento enviado');

    expect(llevaPush($notificacion, $deDestino))->toBeTrue()
        ->and(llevaPush($notificacion, User::factory()->moderador()->create()))->toBeTrue()
        ->and(llevaPush($notificacion, $deOrigen))->toBeFalse()
        ->and(llevaPush($notificacion, $ajeno))->toBeFalse();
});

test('una discrepancia o un rechazo avisan al origen y a admin/moderador, no al destino', function (string $estado) {
    $movimiento = Movimiento::factory()->create(['estado' => $estado]);
    $deOrigen = User::factory()->vendedor()->create();
    $deOrigen->almacenes()->attach($movimiento->almacen_origen_id);
    $deDestino = User::factory()->vendedor()->create();
    $deDestino->almacenes()->attach($movimiento->almacen_destino_id);
    $notificacion = new MovimientoStockNotification($movimiento, 'Aviso');

    expect(llevaPush($notificacion, $deOrigen))->toBeTrue()
        ->and(llevaPush($notificacion, User::factory()->admin()->create()))->toBeTrue()
        ->and(llevaPush($notificacion, $deDestino))->toBeFalse();
})->with(['recibido_parcial', 'rechazado']);

test('crear, editar o recibir completo un movimiento no genera push para nadie', function (string $estado) {
    $movimiento = Movimiento::factory()->create(['estado' => $estado]);
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    $vendedor->almacenes()->attach([$movimiento->almacen_origen_id, $movimiento->almacen_destino_id]);
    $notificacion = new MovimientoStockNotification($movimiento);

    expect(llevaPush($notificacion, $admin))->toBeFalse()
        ->and(llevaPush($notificacion, $vendedor))->toBeFalse();
})->with(['pendiente_confirmacion', 'recibido_completo']);

test('el push lleva título, cuerpo y el enlace a la pantalla de la operación', function () {
    $movimiento = Movimiento::factory()->enTransito()->create();
    $admin = User::factory()->admin()->create();
    $notificacion = new MovimientoStockNotification($movimiento, "Movimiento #{$movimiento->id} enviado");

    $payload = $notificacion->toWebPush($admin, $notificacion)->toArray();

    expect($payload['title'])->toBe('Movimiento en camino')
        ->and($payload['body'])->toBe("Movimiento #{$movimiento->id} enviado")
        ->and($payload['data']['url'])->toBe(route('movimientos.show', $movimiento->id));
});
