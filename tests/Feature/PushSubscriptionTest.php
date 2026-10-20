<?php

use App\Models\User;

function cargaUtilSuscripcion(string $endpoint = 'https://fcm.googleapis.com/fcm/send/dispositivo-1'): array
{
    return [
        'endpoint' => $endpoint,
        'keys' => [
            'p256dh' => 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
            'auth' => 'tBHItJI5svbpez7KI4CCXg',
        ],
        'contentEncoding' => 'aes128gcm',
    ];
}

test('un invitado no puede registrar ni consultar avisos push', function () {
    $this->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion())->assertUnauthorized();
    $this->getJson(route('push.config'))->assertUnauthorized();
});

test('la configuración informa si hay clave VAPID', function () {
    config(['webpush.vapid.public_key' => 'clave-publica-de-prueba']);

    $this->actingAs(User::factory()->vendedor()->create())
        ->getJson(route('push.config'))
        ->assertOk()
        ->assertJson(['habilitado' => true, 'public_key' => 'clave-publica-de-prueba']);

    config(['webpush.vapid.public_key' => null]);

    $this->actingAs(User::factory()->vendedor()->create())
        ->getJson(route('push.config'))
        ->assertOk()
        ->assertJson(['habilitado' => false]);
});

test('un vendedor sin turno activo puede activar los avisos en su dispositivo', function () {
    $vendedor = User::factory()->vendedor()->create();

    $this->actingAs($vendedor)
        ->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion())
        ->assertOk()
        ->assertJson(['success' => true]);

    expect($vendedor->pushSubscriptions()->count())->toBe(1)
        ->and($vendedor->pushSubscriptions()->first()->endpoint)->toBe('https://fcm.googleapis.com/fcm/send/dispositivo-1');
});

test('registrar el mismo dispositivo dos veces no duplica la suscripción', function () {
    $moderador = User::factory()->moderador()->create();

    $this->actingAs($moderador)->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion());
    $this->actingAs($moderador)->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion());

    expect($moderador->pushSubscriptions()->count())->toBe(1);
});

test('una suscripción sin claves es rechazada', function () {
    $this->actingAs(User::factory()->vendedor()->create())
        ->postJson(route('push.suscripciones.store'), ['endpoint' => 'https://fcm.googleapis.com/fcm/send/x'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['keys.p256dh', 'keys.auth']);
});

test('desactivar los avisos elimina solo la suscripción de ese dispositivo', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $this->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion('https://fcm.googleapis.com/fcm/send/telefono'));
    $this->postJson(route('push.suscripciones.store'), cargaUtilSuscripcion('https://fcm.googleapis.com/fcm/send/computadora'));

    $this->deleteJson(route('push.suscripciones.destroy'), ['endpoint' => 'https://fcm.googleapis.com/fcm/send/telefono'])
        ->assertOk();

    expect($vendedor->pushSubscriptions()->pluck('endpoint')->all())
        ->toBe(['https://fcm.googleapis.com/fcm/send/computadora']);
});
