<?php

use App\Models\User;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Str;

function crearNotificacionNoLeida(User $usuario): void
{
    DatabaseNotification::create([
        'id' => (string) Str::uuid(),
        'type' => 'App\\Notifications\\Prueba',
        'notifiable_type' => $usuario->getMorphClass(),
        'notifiable_id' => $usuario->id,
        'data' => ['type' => 'prueba'],
    ]);
}

test('marcar todo como leído deja el listado vacío y solo afecta al usuario actual', function () {
    $usuario = User::factory()->vendedor()->create();
    $otro = User::factory()->vendedor()->create();
    crearTurnoActivo($usuario);

    foreach (range(1, 12) as $_) {
        crearNotificacionNoLeida($usuario);
    }
    crearNotificacionNoLeida($otro);

    $this->actingAs($usuario)->postJson(route('notifications.markAllAsRead'))->assertOk();

    expect($usuario->unreadNotifications()->count())->toBe(0)
        ->and($otro->unreadNotifications()->count())->toBe(1);

    $this->actingAs($usuario)->getJson(route('notifications.index'))
        ->assertOk()
        ->assertJson(['count' => 0, 'notifications' => []]);
});
