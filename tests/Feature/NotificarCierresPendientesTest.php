<?php

use App\Models\CierreCaja;
use App\Models\User;
use App\Notifications\CierresPendientesNotification;
use Illuminate\Support\Facades\Notification;

test('notifica a los admins los moderador/vendedor que no registraron cierre hoy', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $moderadorSinCierre = User::factory()->moderador()->create();
    $vendedorConCierre = User::factory()->vendedor()->create();
    $vendedorSinCierre = User::factory()->vendedor()->create();

    CierreCaja::create(['user_id' => $vendedorConCierre->id]);

    $this->artisan('app:notificar-cierres-pendientes')->assertSuccessful();

    Notification::assertSentTo($admin, CierresPendientesNotification::class, function ($notification) use ($moderadorSinCierre, $vendedorSinCierre, $vendedorConCierre) {
        $ids = $notification->usuariosPendientes->pluck('id');

        return $ids->contains($moderadorSinCierre->id)
            && $ids->contains($vendedorSinCierre->id)
            && ! $ids->contains($vendedorConCierre->id);
    });
});

test('no notifica nada si todos los moderador/vendedor ya cerraron hoy', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    CierreCaja::create(['user_id' => $vendedor->id]);

    $this->artisan('app:notificar-cierres-pendientes')->assertSuccessful();

    Notification::assertNothingSentTo($admin);
});

test('un cierre de ayer no cuenta como cierre de hoy', function () {
    Notification::fake();

    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    CierreCaja::create(['user_id' => $vendedor->id, 'fecha_cierre' => now()->subDay()]);

    $this->artisan('app:notificar-cierres-pendientes')->assertSuccessful();

    Notification::assertSentTo($admin, CierresPendientesNotification::class, function ($notification) use ($vendedor) {
        return $notification->usuariosPendientes->pluck('id')->contains($vendedor->id);
    });
});
