<?php

use App\Models\CierreCaja;
use App\Models\User;
use Telegram\Bot\Laravel\Facades\Telegram;

function enviarComandoTelegram(User $admin, string $texto): void
{
    test()->postJson('/api/telegram/webhook', [
        'message' => [
            'chat' => ['id' => $admin->telegram_chat_id],
            'text' => $texto,
        ],
    ], [
        'X-Telegram-Bot-Api-Secret-Token' => config('services.telegram.webhook_secret'),
    ])->assertOk();
}

test('/estadocierres separa a los que ya cerraron de los que faltan', function () {
    $admin = User::factory()->admin()->create(['telegram_chat_id' => '111']);

    $vendedorConCierre = User::factory()->vendedor()->create(['name' => 'Ana Vendedora']);
    $moderadorSinCierre = User::factory()->moderador()->create(['name' => 'Beto Moderador']);

    CierreCaja::create([
        'user_id' => $vendedorConCierre->id,
        'saldo_esperado' => 100,
        'saldo_contado' => 100,
    ]);

    $telegramMock = Mockery::mock();
    $telegramMock->shouldReceive('sendMessage')
        ->once()
        ->with(Mockery::on(function (array $params) {
            return $params['chat_id'] === '111'
                && str_contains($params['text'], 'Ya cerraron (1)')
                && str_contains($params['text'], 'Ana Vendedora')
                && str_contains($params['text'], 'Faltan por cerrar (1)')
                && str_contains($params['text'], 'Beto Moderador');
        }))
        ->andReturn(null);
    Telegram::swap($telegramMock);

    enviarComandoTelegram($admin, '/estadocierres');
});

test('/estadocierres muestra "faltan por cerrar (0)" cuando todos ya cerraron', function () {
    $admin = User::factory()->admin()->create(['telegram_chat_id' => '222']);

    $vendedor = User::factory()->vendedor()->create(['name' => 'Carla Vendedora']);
    CierreCaja::create([
        'user_id' => $vendedor->id,
        'saldo_esperado' => 50,
        'saldo_contado' => 50,
    ]);

    $telegramMock = Mockery::mock();
    $telegramMock->shouldReceive('sendMessage')
        ->once()
        ->with(Mockery::on(function (array $params) {
            return str_contains($params['text'], 'Ya cerraron (1)')
                && str_contains($params['text'], 'Faltan por cerrar (0)');
        }))
        ->andReturn(null);
    Telegram::swap($telegramMock);

    enviarComandoTelegram($admin, '/estadocierres');
});
