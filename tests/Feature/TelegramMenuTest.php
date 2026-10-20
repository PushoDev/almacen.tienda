<?php

use App\Channels\TelegramChannel;
use App\Models\TelegramVinculo;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\VentaEspecialSolicitudNotification;
use Telegram\Bot\Laravel\Facades\Telegram;

/**
 * Bot por rol: /menu y /pendientes para consultar a demanda, y quién puede decidir una venta especial.
 */
function usuarioConTelegram(string $rol, string $chatId): User
{
    $usuario = User::factory()->{$rol}()->create();
    TelegramVinculo::factory()->for($usuario, 'usuario')->create(['chat_id' => $chatId]);

    return $usuario;
}

/**
 * Reemplaza la fachada por un registro de lo enviado (sin salir a la red).
 *
 * @return object{mensajes: array<int, array<string, mixed>>, respuestas: array<int, string>, ediciones: int}
 */
function registrarTelegram(): object
{
    $registro = (object) ['mensajes' => [], 'respuestas' => [], 'ediciones' => 0];

    $telegram = Mockery::mock();
    $telegram->shouldReceive('sendMessage')->andReturnUsing(function (array $params) use ($registro) {
        $registro->mensajes[] = $params;
    });
    $telegram->shouldReceive('answerCallbackQuery')->andReturnUsing(function (array $params) use ($registro) {
        $registro->respuestas[] = (string) ($params['text'] ?? '');
    });
    $telegram->shouldReceive('editMessageText')->andReturnUsing(function () use ($registro) {
        $registro->ediciones++;
    });
    Telegram::swap($telegram);

    return $registro;
}

function webhookTelegram(array $update): void
{
    test()->postJson('/api/telegram/webhook', $update, [
        'X-Telegram-Bot-Api-Secret-Token' => config('services.telegram.webhook_secret'),
    ])->assertOk();
}

function escribirAlBot(string $chatId, string $texto): void
{
    webhookTelegram(['message' => ['chat' => ['id' => $chatId], 'text' => $texto]]);
}

function tocarBoton(string $chatId, string $data): void
{
    webhookTelegram(['callback_query' => [
        'id' => 'cb-1',
        'data' => $data,
        'message' => ['chat' => ['id' => $chatId], 'message_id' => 7],
    ]]);
}

function textosDeBotones(array $mensaje): array
{
    $teclado = json_decode($mensaje['reply_markup'] ?? '{"inline_keyboard":[]}', true);

    return collect($teclado['inline_keyboard'])->flatten(1)->pluck('text')->all();
}

test('el menú de un moderador incluye los reportes y el del vendedor solo lo suyo', function () {
    usuarioConTelegram('moderador', '4001');
    usuarioConTelegram('vendedor', '4002');
    $registro = registrarTelegram();

    escribirAlBot('4001', '/menu');
    escribirAlBot('4002', '/menu');

    $moderador = collect(textosDeBotones($registro->mensajes[0]))->implode(' | ');
    $vendedor = collect(textosDeBotones($registro->mensajes[1]))->implode(' | ');

    expect($moderador)->toContain('Reporte del día')->toContain('Pendientes')
        ->and($vendedor)->toContain('Pendientes')->not->toContain('Reporte del día')->not->toContain('Cierres');
});

test('un vendedor no puede usar los reportes generales', function () {
    usuarioConTelegram('vendedor', '4002');
    $registro = registrarTelegram();

    escribirAlBot('4002', '/reporte');

    expect($registro->mensajes)->toHaveCount(1)
        ->and($registro->mensajes[0]['text'])->toContain('solo para administradores y moderadores');
});

test('un chat sin vincular no tiene acceso al bot', function () {
    $registro = registrarTelegram();

    escribirAlBot('9999', '/menu');

    expect($registro->mensajes[0]['text'])->toContain('No tienes acceso');
});

test('/pendientes muestra al moderador solo las ventas especiales que puede decidir, con botones', function () {
    usuarioConTelegram('moderador', '4001');
    $descuento = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'descuento']);
    $bajoCosto = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'bajo_costo']);
    $registro = registrarTelegram();

    escribirAlBot('4001', '/pendientes');

    $botones = collect(textosDeBotones($registro->mensajes[0]))->implode(' | ');

    expect($registro->mensajes[0]['text'])->toContain("Venta #{$descuento->id}")->not->toContain("Venta #{$bajoCosto->id}")
        ->and($botones)->toContain("Aprobar #{$descuento->id}")->not->toContain("#{$bajoCosto->id}");
});

test('/pendientes de un vendedor muestra solo sus propias solicitudes y sin botones de decisión', function () {
    $vendedor = usuarioConTelegram('vendedor', '4002');
    $propia = Venta::factory()->for($vendedor, 'usuario')->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'descuento']);
    $ajena = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'descuento']);
    $registro = registrarTelegram();

    escribirAlBot('4002', '/pendientes');

    expect($registro->mensajes[0]['text'])->toContain("Venta #{$propia->id}")->not->toContain("Venta #{$ajena->id}")
        ->and(textosDeBotones($registro->mensajes[0]))->toBe([]);
});

test('sin nada pendiente el bot lo dice', function () {
    usuarioConTelegram('admin', '4003');
    $registro = registrarTelegram();

    escribirAlBot('4003', '/pendientes');

    expect($registro->mensajes[0]['text'])->toContain('No tienes nada pendiente');
});

test('un moderador aprueba desde Telegram una venta de descuento', function () {
    usuarioConTelegram('moderador', '4001');
    $venta = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'descuento']);
    $registro = registrarTelegram();

    tocarBoton('4001', "aprobar_venta:{$venta->id}");

    expect($venta->fresh()->estado)->toBe('pendiente')
        ->and($registro->ediciones)->toBe(1);
});

test('un moderador no puede decidir una venta bajo costo desde Telegram', function () {
    usuarioConTelegram('moderador', '4001');
    $venta = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'bajo_costo']);
    $registro = registrarTelegram();

    tocarBoton('4001', "aprobar_venta:{$venta->id}");

    expect($venta->fresh()->estado)->toBe('solicitud_especial')
        ->and($registro->respuestas[0])->toContain('solo la puede decidir un administrador');
});

test('un vendedor no puede decidir ninguna solicitud desde Telegram', function () {
    usuarioConTelegram('vendedor', '4002');
    $venta = Venta::factory()->create(['estado' => 'solicitud_especial', 'es_venta_especial' => true, 'tipo_venta_especial' => 'descuento']);
    registrarTelegram();

    tocarBoton('4002', "aprobar_venta:{$venta->id}");

    expect($venta->fresh()->estado)->toBe('solicitud_especial');
});

test('la solicitud de venta especial llega por Telegram al moderador solo si es de descuento', function () {
    $moderador = usuarioConTelegram('moderador', '4001');
    $admin = usuarioConTelegram('admin', '4003');
    $descuento = new VentaEspecialSolicitudNotification(Venta::factory()->make(['tipo_venta_especial' => 'descuento']));
    $bajoCosto = new VentaEspecialSolicitudNotification(Venta::factory()->make(['tipo_venta_especial' => 'bajo_costo']));
    $canal = TelegramChannel::class;

    expect($descuento->via($moderador))->toContain($canal)
        ->and($bajoCosto->via($moderador))->not->toContain($canal)
        ->and($bajoCosto->via($admin))->toContain($canal);
});
