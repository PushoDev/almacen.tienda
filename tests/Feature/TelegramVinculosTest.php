<?php

use App\Channels\TelegramChannel;
use App\Models\TelegramVinculo;
use App\Models\User;
use App\Notifications\CierresPendientesNotification;
use App\Services\DatabaseBackupService;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Telegram\Bot\FileUpload\InputFile;
use Telegram\Bot\Laravel\Facades\Telegram;

/**
 * Varios Telegram por cuenta: los responsables de turno de una misma cuenta de punto de venta
 * vinculan cada uno el suyo con el mismo código.
 */
function mensajeTelegram(string $chatId, string $texto, array $from = []): void
{
    test()->postJson('/api/telegram/webhook', [
        'message' => ['chat' => ['id' => $chatId], 'text' => $texto, 'from' => $from],
    ], [
        'X-Telegram-Bot-Api-Secret-Token' => config('services.telegram.webhook_secret'),
    ])->assertOk();
}

beforeEach(function () {
    // Mock simple (Telegram es una fachada sobre una clase final): ningún test sale a la red.
    $telegram = Mockery::mock();
    $telegram->shouldReceive('sendMessage')->andReturn(null);
    Telegram::swap($telegram);
});

test('dos personas vinculan su Telegram con el mismo código y el código sigue sirviendo', function () {
    $cuenta = User::factory()->vendedor()->create(['telegram_link_token' => 'ABCD1234']);

    mensajeTelegram('1001', '/vincular ABCD1234', ['first_name' => 'Ana', 'last_name' => 'Turno Mañana']);
    mensajeTelegram('1002', '/vincular ABCD1234', ['first_name' => 'Beto']);

    expect($cuenta->telegramVinculos()->pluck('chat_id')->all())->toBe(['1001', '1002'])
        ->and($cuenta->telegramVinculos()->pluck('nombre')->all())->toBe(['Ana Turno Mañana', 'Beto'])
        ->and($cuenta->fresh()->telegram_link_token)->toBe('ABCD1234');
});

test('vincular dos veces el mismo chat no lo duplica', function () {
    $cuenta = User::factory()->vendedor()->create(['telegram_link_token' => 'ABCD1234']);

    mensajeTelegram('1001', '/vincular ABCD1234');
    mensajeTelegram('1001', '/vincular ABCD1234');

    expect($cuenta->telegramVinculos()->count())->toBe(1);
});

test('un chat que ya estaba en otra cuenta pasa a la cuenta del código nuevo', function () {
    $anterior = User::factory()->vendedor()->create();
    TelegramVinculo::factory()->for($anterior, 'usuario')->create(['chat_id' => '1001']);
    $nueva = User::factory()->vendedor()->create(['telegram_link_token' => 'ZZZZ9999']);

    mensajeTelegram('1001', '/vincular ZZZZ9999');

    expect($anterior->telegramVinculos()->count())->toBe(0)
        ->and($nueva->telegramVinculos()->pluck('chat_id')->all())->toBe(['1001']);
});

test('un código inválido no vincula a nadie', function () {
    User::factory()->vendedor()->create(['telegram_link_token' => 'ABCD1234']);

    mensajeTelegram('1001', '/vincular NOEXISTE');

    expect(TelegramVinculo::count())->toBe(0);
});

test('la notificación de Telegram se envía a todos los vinculados de la cuenta', function () {
    $admin = User::factory()->admin()->create();
    TelegramVinculo::factory()->for($admin, 'usuario')->create(['chat_id' => '2001']);
    TelegramVinculo::factory()->for($admin, 'usuario')->create(['chat_id' => '2002']);

    $enviados = [];
    $telegram = Mockery::mock();
    $telegram->shouldReceive('sendMessage')->twice()->andReturnUsing(function (array $params) use (&$enviados) {
        $enviados[] = $params['chat_id'];
    });
    Telegram::swap($telegram);

    $notificacion = new CierresPendientesNotification(collect([User::factory()->vendedor()->create()]));
    (new TelegramChannel)->send($admin, $notificacion);

    expect($enviados)->toBe(['2001', '2002']);
});

test('el respaldo de la base de datos va solo al vínculo más antiguo del admin', function () {
    Process::fake(['*mysqldump*' => Process::result(output: '-- dump falso --')]);
    Storage::fake('local');

    $admin = User::factory()->admin()->create();
    TelegramVinculo::factory()->for($admin, 'usuario')->create(['chat_id' => '3001']);
    TelegramVinculo::factory()->for($admin, 'usuario')->create(['chat_id' => '3002']);

    $documentos = [];
    $telegram = Mockery::mock();
    $telegram->shouldReceive('sendDocument')->andReturnUsing(function (array $params) use (&$documentos) {
        expect($params['document'])->toBeInstanceOf(InputFile::class);
        $documentos[] = $params['chat_id'];
    });
    $telegram->shouldReceive('sendMessage')->andReturn(null);
    Telegram::swap($telegram);

    app(DatabaseBackupService::class)->ejecutar();

    expect($documentos)->toBe(['3001']);
});

test('cada persona se desconecta por separado y las demás siguen conectadas', function () {
    $cuenta = User::factory()->vendedor()->create();
    $ana = TelegramVinculo::factory()->for($cuenta, 'usuario')->create();
    $beto = TelegramVinculo::factory()->for($cuenta, 'usuario')->create();

    $this->actingAs($cuenta)
        ->delete(route('profile.telegram.disconnect-vinculo', ['vinculo' => $ana->id]))
        ->assertRedirect(route('profile.edit'));

    expect($cuenta->telegramVinculos()->pluck('id')->all())->toBe([$beto->id]);
});

test('nadie puede desconectar a una persona de otra cuenta', function () {
    $otra = User::factory()->vendedor()->create();
    $ajeno = TelegramVinculo::factory()->for($otra, 'usuario')->create();

    $this->actingAs(User::factory()->vendedor()->create())
        ->delete(route('profile.telegram.disconnect-vinculo', ['vinculo' => $ajeno->id]))
        ->assertNotFound();

    expect(TelegramVinculo::count())->toBe(1);
});

test('desconectar a todos borra los vínculos y anula el código', function () {
    $cuenta = User::factory()->moderador()->create(['telegram_link_token' => 'ABCD1234']);
    TelegramVinculo::factory()->count(2)->for($cuenta, 'usuario')->create();

    $this->actingAs($cuenta)->delete(route('profile.telegram.disconnect'))->assertRedirect();

    expect($cuenta->telegramVinculos()->count())->toBe(0)
        ->and($cuenta->fresh()->telegram_link_token)->toBeNull();
});

test('Configuración › Perfil lista a las personas conectadas, también para un moderador', function () {
    $moderador = User::factory()->moderador()->create();
    TelegramVinculo::factory()->for($moderador, 'usuario')->create(['nombre' => 'Ana']);

    $this->actingAs($moderador)
        ->get(route('profile.edit'))
        ->assertInertia(fn ($page) => $page
            ->component('settings/profile')
            ->has('telegramVinculos', 1)
            ->where('telegramVinculos.0.nombre', 'Ana'));
});

test('editar un empleado desde Empleados ya no borra su Telegram', function () {
    $admin = User::factory()->admin()->create();
    $empleado = User::factory()->vendedor()->create();
    TelegramVinculo::factory()->for($empleado, 'usuario')->create();

    $this->actingAs($admin)->put(route('empleados.update', $empleado->id), [
        'name' => 'Nuevo nombre',
        'email' => $empleado->email,
        'role' => 'vendedor',
    ]);

    expect($empleado->telegramVinculos()->count())->toBe(1);
});
