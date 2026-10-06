<?php

use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use App\Models\TransferenciaPendiente;
use App\Models\User;

/**
 * Envío de dinero que espera confirmación: un vendedor transfiere a una cuenta que no es suya, el dinero sale
 * del origen y queda en tránsito hasta que el destino (o admin/moderador) confirma lo que llegó.
 */

/**
 * Un vendedor emisor con su cuenta personal (500 USD) y otro receptor con su cuenta (100 USD); el emisor envía
 * 100 USD a la cuenta del receptor. Deja el envío en tránsito y todo listo para confirmarlo, rechazarlo o anularlo.
 *
 * @return array{emisor: User, receptor: User, origen: Cuenta, destino: Cuenta, envio: TransferenciaPendiente}
 */
function prepararEnvioEnTransito(float $monto = 100): array
{
    crearTiposMovimientoFinanciero();
    $emisor = User::factory()->vendedor()->create();
    $receptor = User::factory()->vendedor()->create();
    crearTurnoActivo($emisor);
    crearTurnoActivo($receptor);

    $usd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($usd, saldo: 500, propietario: $emisor);
    $origen->update(['tipo_titular' => 'personal']);
    $destino = crearCuentaEnMoneda($usd, saldo: 100, propietario: $receptor);

    test()->actingAs($emisor)->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => $monto, 'moneda' => 'USD', 'comentario' => 'Préstamo para vueltos',
    ])->assertRedirect(route('transacciones.envios.index'));

    return ['emisor' => $emisor, 'receptor' => $receptor, 'origen' => $origen, 'destino' => $destino, 'envio' => TransferenciaPendiente::firstOrFail()];
}

function saldoDe(Cuenta $cuenta): float
{
    return (float) $cuenta->fresh()->saldo_cuenta;
}

// ==========================================================================
// ENVIAR — cuándo es inmediata y cuándo queda pendiente
// ==========================================================================

test('una transferencia a una cuenta ajena saca el dinero del origen, lo deja en tránsito y no acredita al destino', function () {
    ['emisor' => $emisor, 'origen' => $origen, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    expect(saldoDe($origen))->toBe(400.0);
    expect(saldoDe($destino))->toBe(100.0);
    expect($envio)->estado->toBe('en_transito')->monto->toBe(100.0)->saldo_anterior_origen->toBe(500.0)->saldo_posterior_origen->toBe(400.0);
    expect($envio->user_id)->toBe($emisor->id);
    expect($envio->turno_vendedor_id)->not->toBeNull();
    expect(MovimientoFinanciero::count())->toBe(0);
    expect($envio->seguimientos)->toHaveCount(1);
    expect($envio->seguimientos->first())->estado->toBe('en_transito')->user_id->toBe($emisor->id);
});

test('una transferencia a una cuenta propia del vendedor sigue siendo inmediata, aunque sea de solo cobro', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $usd = crearMoneda('USD', 1, true);
    $origen = crearCuentaEnMoneda($usd, saldo: 500, propietario: $vendedor);
    $origen->update(['tipo_titular' => 'personal']);
    $propiaDeCobro = crearCuentaEnMoneda($usd, saldo: 10);
    $vendedor->cuentas()->attach($propiaDeCobro->id, ['acceso' => Cuenta::ACCESO_COBRO]);

    $this->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $propiaDeCobro->id,
        'monto' => 40, 'moneda' => 'USD',
    ])->assertRedirect();

    expect(saldoDe($origen))->toBe(460.0);
    expect(saldoDe($propiaDeCobro))->toBe(50.0);
    expect(TransferenciaPendiente::count())->toBe(0);
    expect(MovimientoFinanciero::count())->toBe(1);
});

test('admin y moderador transfieren siempre al instante, también a cuentas de otros', function () {
    crearTiposMovimientoFinanciero();
    $usd = crearMoneda('USD', 1, true);
    $ajena = crearCuentaEnMoneda($usd, saldo: 0, propietario: User::factory()->vendedor()->create());

    foreach ([User::factory()->admin()->create(), User::factory()->moderador()->create()] as $usuario) {
        crearTurnoActivo($usuario);
        $origen = crearCuentaEnMoneda($usd, saldo: 300);

        $this->actingAs($usuario)->post(route('transacciones.transferir'), [
            'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
            'destino_tipo' => 'cuenta', 'destino_id' => $ajena->id,
            'monto' => 50, 'moneda' => 'USD',
        ])->assertRedirect();

        expect(saldoDe($origen))->toBe(250.0);
    }

    expect(saldoDe($ajena))->toBe(100.0);
    expect(TransferenciaPendiente::count())->toBe(0);
});

test('al enviar se avisa a quien tiene la cuenta destino y a admin y moderador, no al que envió', function () {
    $admin = User::factory()->admin()->create();
    ['emisor' => $emisor, 'receptor' => $receptor] = prepararEnvioEnTransito();

    expect($receptor->notifications()->count())->toBe(1);
    expect($admin->notifications()->count())->toBe(1);
    expect($emisor->notifications()->count())->toBe(0);
    expect($receptor->notifications()->first()->data)->toMatchArray(['type' => 'transferencia_pendiente', 'estado' => 'en_transito']);
});

// ==========================================================================
// CONFIRMAR
// ==========================================================================

test('quien tiene la cuenta destino confirma lo que llegó completo: se acredita, queda la transferencia normal y quién confirmó', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'origen' => $origen, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)
        ->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100, 'observaciones' => 'Todo en orden'])
        ->assertOk();

    expect(saldoDe($destino))->toBe(200.0);
    expect(saldoDe($origen))->toBe(400.0);

    $envio->refresh();
    expect($envio)->estado->toBe('recibido')->monto_recibido->toBe(100.0)->monto_acreditado->toBe(100.0)->diferencia->toBe(0.0);
    expect($envio->confirmado_por)->toBe($receptor->id);

    $movimiento = MovimientoFinanciero::firstOrFail();
    expect($movimiento->id)->toBe($envio->movimiento_financiero_id);
    expect($movimiento)->tipo_movimiento_id->toBe(3)->cuenta_origen_id->toBe($origen->id)->cuenta_destino_id->toBe($destino->id)
        ->monto->toBe(100.0)->saldo_anterior_origen->toBe(500.0)->saldo_posterior_origen->toBe(400.0)
        ->saldo_anterior_destino->toBe(100.0)->saldo_posterior_destino->toBe(200.0)->estado->toBe('completado');
    expect($movimiento->user_id)->toBe($emisor->id);

    $ultimo = $envio->seguimientos()->latest('id')->first();
    expect($ultimo)->estado->toBe('recibido')->user_id->toBe($receptor->id);
});

test('si llega menos de lo enviado se acredita solo lo recibido y la diferencia queda por resolver', function () {
    ['receptor' => $receptor, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 80])->assertOk();

    expect(saldoDe($destino))->toBe(180.0);
    $envio->refresh();
    expect($envio)->estado->toBe('recibido_parcial')->monto_recibido->toBe(80.0)->monto_acreditado->toBe(80.0)->diferencia->toBe(20.0);
    expect($envio->tieneDiferenciaPorResolver())->toBeTrue();
});

test('con monedas distintas se acredita en proporción a lo que llegó, con la tasa fijada al enviar', function () {
    crearTiposMovimientoFinanciero();
    $emisor = User::factory()->vendedor()->create();
    $receptor = User::factory()->vendedor()->create();
    crearTurnoActivo($emisor);
    crearTurnoActivo($receptor);
    $usd = crearMoneda('USD', 1, true);
    $cup = crearMoneda('CUP', 400);
    $origen = crearCuentaEnMoneda($usd, saldo: 500, propietario: $emisor);
    $origen->update(['tipo_titular' => 'personal']);
    $destino = crearCuentaEnMoneda($cup, saldo: 0, propietario: $receptor);

    $this->actingAs($emisor)->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $origen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $destino->id,
        'monto' => 100, 'moneda' => 'USD', 'tasa_cambio_aplicada' => 420,
    ])->assertRedirect();

    $envio = TransferenciaPendiente::firstOrFail();
    expect($envio)->monto_destino->toBe(42000.0)->moneda_destino->toBe('CUP')->tasa_cambio_aplicada->toBe(420.0);

    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 50])->assertOk();

    expect(saldoDe($destino))->toBe(21000.0);
    expect($envio->refresh()->diferencia)->toBe(50.0);
});

test('no se puede confirmar más de lo enviado ni una cantidad en cero', function () {
    ['receptor' => $receptor, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 120])
        ->assertStatus(422)->assertJsonFragment(['message' => 'No se puede recibir más de lo enviado (100 USD).']);
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 0])->assertStatus(422);

    expect(saldoDe($destino))->toBe(100.0);
    expect($envio->refresh()->estado)->toBe('en_transito');
});

test('confirmar dos veces seguidas (doble clic) acredita una sola vez', function () {
    ['receptor' => $receptor, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertOk();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])
        ->assertStatus(422)->assertJsonFragment(['message' => 'Este envío ya fue procesado.']);

    expect(saldoDe($destino))->toBe(200.0);
    expect(MovimientoFinanciero::count())->toBe(1);
});

test('admin y moderador también pueden confirmar y queda registrado quién lo hizo', function () {
    foreach (['admin', 'moderador'] as $rol) {
        ['destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();
        $usuario = User::factory()->{$rol}()->create();
        crearTurnoActivo($usuario);

        $this->actingAs($usuario)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertOk();

        expect(saldoDe($destino))->toBe(200.0);
        expect($envio->refresh()->confirmado_por)->toBe($usuario->id);
        expect($envio->seguimientos()->latest('id')->first()->user_id)->toBe($usuario->id);

        TransferenciaPendiente::query()->delete();
    }
});

test('quien envió, o un vendedor sin relación con la cuenta destino, no puede confirmar ni rechazar', function () {
    ['emisor' => $emisor, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();
    $ajeno = User::factory()->vendedor()->create();
    crearTurnoActivo($ajeno);

    foreach ([$emisor, $ajeno] as $usuario) {
        $this->actingAs($usuario)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertForbidden();
        $this->actingAs($usuario)->postJson(route('transacciones.envios.rechazar', $envio), ['observaciones' => 'No'])->assertForbidden();
    }

    expect(saldoDe($destino))->toBe(100.0);
    expect($envio->refresh()->estado)->toBe('en_transito');
});

// ==========================================================================
// RECHAZAR / ANULAR — el dinero vuelve al origen
// ==========================================================================

test('quien debía recibir lo rechaza: el dinero vuelve íntegro al origen y queda quién y por qué', function () {
    ['receptor' => $receptor, 'origen' => $origen, 'destino' => $destino, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->postJson(route('transacciones.envios.rechazar', $envio), ['observaciones' => 'No lo esperábamos'])->assertOk();

    expect(saldoDe($origen))->toBe(500.0);
    expect(saldoDe($destino))->toBe(100.0);
    $envio->refresh();
    expect($envio->estado)->toBe('rechazado');
    expect($envio->seguimientos()->latest('id')->first())->estado->toBe('rechazado')->observaciones->toBe('No lo esperábamos')->user_id->toBe($receptor->id);
    expect(MovimientoFinanciero::count())->toBe(0);
});

test('rechazar y anular exigen el motivo', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->postJson(route('transacciones.envios.rechazar', $envio), [])->assertStatus(422)->assertJsonValidationErrors('observaciones');
    $this->actingAs($emisor)->postJson(route('transacciones.envios.anular', $envio), [])->assertStatus(422)->assertJsonValidationErrors('observaciones');
});

test('quien envió lo anula mientras sigue en tránsito y el dinero vuelve al origen', function () {
    ['emisor' => $emisor, 'origen' => $origen, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($emisor)->postJson(route('transacciones.envios.anular', $envio), ['observaciones' => 'Me equivoqué de cuenta'])->assertOk();

    expect(saldoDe($origen))->toBe(500.0);
    expect($envio->refresh()->estado)->toBe('anulado');
});

test('un vendedor ajeno no puede anular un envío que no es suyo', function () {
    ['origen' => $origen, 'envio' => $envio] = prepararEnvioEnTransito();
    $ajeno = User::factory()->vendedor()->create();
    crearTurnoActivo($ajeno);

    $this->actingAs($ajeno)->postJson(route('transacciones.envios.anular', $envio), ['observaciones' => 'x'])->assertForbidden();

    expect(saldoDe($origen))->toBe(400.0);
});

test('un envío ya confirmado, rechazado o anulado no se puede devolver otra vez ni devuelve el dinero dos veces', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'origen' => $origen, 'envio' => $envio] = prepararEnvioEnTransito();

    $this->actingAs($emisor)->postJson(route('transacciones.envios.anular', $envio), ['observaciones' => 'Error'])->assertOk();
    $this->actingAs($emisor)->postJson(route('transacciones.envios.anular', $envio), ['observaciones' => 'Error'])->assertStatus(422);
    $this->actingAs($receptor)->postJson(route('transacciones.envios.rechazar', $envio), ['observaciones' => 'No'])->assertStatus(422);
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertStatus(422);

    expect(saldoDe($origen))->toBe(500.0);
});

// ==========================================================================
// DIFERENCIA POR RESOLVER
// ==========================================================================

test('admin y moderador resuelven una diferencia con una nota y un vendedor no puede', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 70])->assertOk();

    $this->actingAs($emisor)->postJson(route('transacciones.envios.resolver-diferencia', $envio), ['nota' => 'x'])->assertForbidden();

    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador)->postJson(route('transacciones.envios.resolver-diferencia', $envio), ['nota' => 'El mensajero asume los 30 USD'])->assertOk();

    $envio->refresh();
    expect($envio->tieneDiferenciaPorResolver())->toBeFalse();
    expect($envio)->diferencia_nota->toBe('El mensajero asume los 30 USD')->diferencia_resuelta_por->toBe($moderador->id);

    // Ya resuelta, no se puede resolver otra vez
    $this->actingAs($moderador)->postJson(route('transacciones.envios.resolver-diferencia', $envio), ['nota' => 'otra'])->assertStatus(422);
});

// ==========================================================================
// LISTA — visibilidad y saldos
// ==========================================================================

test('cada vendedor ve solo los envíos que envió o que llegan a sus cuentas, y admin ve todos', function () {
    ['emisor' => $emisor, 'receptor' => $receptor] = prepararEnvioEnTransito();
    $ajeno = User::factory()->vendedor()->create();
    crearTurnoActivo($ajeno);

    $this->actingAs($emisor)->get(route('transacciones.envios.index'))->assertOk()->assertInertia(fn ($page) => $page->component('Transacciones/Envios')->has('envios', 1));
    $this->actingAs($receptor)->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page->has('envios', 1));
    $this->actingAs($ajeno)->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page->has('envios', 0));
    $this->actingAs(User::factory()->admin()->create())->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page->has('envios', 1));
});

test('la vista marca qué puede hacer cada uno, cuenta lo pendiente y nunca manda saldos', function () {
    ['emisor' => $emisor, 'receptor' => $receptor] = prepararEnvioEnTransito();

    $this->actingAs($receptor)->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page
        ->where('envios.0.permisos', ['confirmar' => true, 'rechazar' => true, 'anular' => false, 'resolver_diferencia' => false])
        ->where('totales', ['en_transito' => 1, 'por_confirmar' => 1, 'con_diferencia' => 0])
    );

    $paraElEmisor = $this->actingAs($emisor)->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page
        ->where('envios.0.permisos', ['confirmar' => false, 'rechazar' => false, 'anular' => true, 'resolver_diferencia' => false])
        ->where('totales.por_confirmar', 0)
    );

    // Ni el origen ni el destino llevan saldo, para ninguno de los dos
    $texto = json_encode($paraElEmisor->inertiaProps());
    expect($texto)->not->toContain('saldo_cuenta')->not->toContain('saldo_anterior')->not->toContain('saldo_posterior');
});

test('un envío con diferencia por resolver sigue en la lista de abiertos y cuenta para admin y moderador', function () {
    ['receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 60])->assertOk();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('transacciones.envios.index'))->assertInertia(fn ($page) => $page
        ->where('totales', ['en_transito' => 0, 'por_confirmar' => 0, 'con_diferencia' => 1])
        ->where('envios.0.permisos.resolver_diferencia', true)
    );
});

test('los widgets filtran la vista: en tránsito, por confirmar por ti y diferencias', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'envio' => $envioEnTransito] = prepararEnvioEnTransito();

    // Un segundo envío, ya confirmado a medias (diferencia por resolver)
    $usd = crearMoneda('USD');
    $segundoOrigen = crearCuentaEnMoneda($usd, saldo: 300, propietario: $emisor);
    $segundoOrigen->update(['tipo_titular' => 'personal']);
    $segundoDestino = $receptor->cuentas()->first();
    $this->actingAs($emisor)->post(route('transacciones.transferir'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $segundoOrigen->id,
        'destino_tipo' => 'cuenta', 'destino_id' => $segundoDestino->id,
        'monto' => 50, 'moneda' => 'USD',
    ])->assertRedirect();
    $conDiferencia = TransferenciaPendiente::where('id', '!=', $envioEnTransito->id)->firstOrFail();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $conDiferencia), ['monto_recibido' => 30])->assertOk();

    $admin = User::factory()->admin()->create();

    $this->actingAs($admin)->get(route('transacciones.envios.index', ['estado' => 'en_transito']))
        ->assertInertia(fn ($page) => $page->has('envios', 1)->where('envios.0.id', $envioEnTransito->id)->where('filtro', 'en_transito'));
    $this->actingAs($admin)->get(route('transacciones.envios.index', ['estado' => 'diferencia']))
        ->assertInertia(fn ($page) => $page->has('envios', 1)->where('envios.0.id', $conDiferencia->id));
    $this->actingAs($receptor)->get(route('transacciones.envios.index', ['estado' => 'por_confirmar']))
        ->assertInertia(fn ($page) => $page->has('envios', 1)->where('envios.0.id', $envioEnTransito->id));
    $this->actingAs($admin)->get(route('transacciones.envios.index', ['estado' => 'cualquier-cosa']))
        ->assertInertia(fn ($page) => $page->where('filtro', null)->has('envios', 2));
});

// ==========================================================================
// AVISO BAJO EL ENCABEZADO — dinero en tránsito, por rol y solo en las pantallas del dinero
// ==========================================================================

test('el aviso de dinero en tránsito viaja en las pantallas del dinero con el monto por moneda y solo lo que cada usuario ve', function () {
    ['emisor' => $emisor, 'receptor' => $receptor] = prepararEnvioEnTransito(); // 100 USD
    $ajeno = User::factory()->vendedor()->create();
    crearTurnoActivo($ajeno);

    $this->actingAs($emisor)->get(route('cuentas.index'))->assertInertia(fn ($page) => $page
        ->where('enviosAbiertos', ['total' => 1, 'por_confirmar' => 0, 'montos' => [['moneda' => 'USD', 'monto' => 100]]])
    );
    $this->actingAs($receptor)->get(route('cuentas.index'))->assertInertia(fn ($page) => $page
        ->where('enviosAbiertos.total', 1)->where('enviosAbiertos.por_confirmar', 1)
    );
    $this->actingAs($ajeno)->get(route('cuentas.index'))->assertInertia(fn ($page) => $page
        ->where('enviosAbiertos', ['total' => 0, 'por_confirmar' => 0, 'montos' => []])
    );
    $this->actingAs(User::factory()->admin()->create())->get(route('cuentas.index'))->assertInertia(fn ($page) => $page
        ->where('enviosAbiertos.total', 1)
    );
});

test('el aviso no se calcula ni viaja en pantallas que no son del dinero', function () {
    prepararEnvioEnTransito();

    $this->actingAs(User::factory()->admin()->create())->get(route('reportes.index'))
        ->assertInertia(fn ($page) => $page->where('enviosAbiertos', null));
});

test('el aviso deja de contar un envío cuando ya se confirmó', function () {
    ['receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertOk();

    $this->actingAs($receptor)->get(route('cuentas.index'))->assertInertia(fn ($page) => $page->where('enviosAbiertos.total', 0));
});

// ==========================================================================
// DETALLE DE LA TRANSACCIÓN — saldos ajenos ocultos y vínculo con el envío
// ==========================================================================

test('el detalle de una transferencia confirmada oculta al vendedor los saldos de la cuenta ajena y enlaza el envío', function () {
    ['emisor' => $emisor, 'receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertOk();
    $movimiento = $envio->fresh()->movimientoFinanciero;

    // El emisor ve su cuenta (origen) completa y la del receptor (destino) sin saldos
    $this->actingAs($emisor)->get(route('transacciones.show', $movimiento))->assertOk()->assertInertia(fn ($page) => $page
        ->where('detallesOrigen.saldos_visibles', true)
        ->where('detallesOrigen.saldo_posterior', 400)
        ->where('detallesDestino.saldos_visibles', false)
        ->where('detallesDestino.saldo_anterior', null)
        ->where('detallesDestino.saldo_posterior', null)
        ->where('detallesDestino.saldo_actual', null)
        ->where('detallesDestino.monto_operacion', 100)
        ->where('envioOrigen.id', $envio->id)
        ->where('envioOrigen.estado', 'recibido')
        ->where('envioOrigen.confirmado_por', $receptor->name)
    );

    // El receptor, al revés
    $this->actingAs($receptor)->get(route('transacciones.show', $movimiento))->assertInertia(fn ($page) => $page
        ->where('detallesOrigen.saldos_visibles', false)
        ->where('detallesOrigen.saldo_posterior', null)
        ->where('detallesDestino.saldos_visibles', true)
        ->where('detallesDestino.saldo_posterior', 200)
    );

    // El admin ve todo
    $this->actingAs(User::factory()->admin()->create())->get(route('transacciones.show', $movimiento))->assertInertia(fn ($page) => $page
        ->where('detallesOrigen.saldos_visibles', true)->where('detallesDestino.saldos_visibles', true)
        ->where('detallesDestino.saldo_posterior', 200)
    );
});

test('un vendedor sin relación con la transferencia no puede abrir su detalle', function () {
    ['receptor' => $receptor, 'envio' => $envio] = prepararEnvioEnTransito();
    $this->actingAs($receptor)->postJson(route('transacciones.envios.confirmar', $envio), ['monto_recibido' => 100])->assertOk();

    $ajeno = User::factory()->vendedor()->create();
    crearTurnoActivo($ajeno);

    $this->actingAs($ajeno)->get(route('transacciones.show', $envio->fresh()->movimiento_financiero_id))->assertForbidden();
});

test('el detalle de un gasto del vendedor no trae envío de origen y muestra su saldo', function () {
    crearTiposMovimientoFinanciero();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $cuenta = crearCuentaEnMoneda(crearMonedaUsd(), saldo: 300, propietario: $vendedor);
    $cuenta->update(['tipo_titular' => 'personal']);

    $this->actingAs($vendedor)->post(route('transacciones.gastar'), [
        'origen_tipo' => 'cuenta', 'origen_id' => $cuenta->id, 'monto' => 50, 'moneda' => 'USD', 'comentario' => 'Gasto',
    ]);

    $this->get(route('transacciones.show', MovimientoFinanciero::firstOrFail()))->assertInertia(fn ($page) => $page
        ->where('detallesOrigen.saldos_visibles', true)
        ->where('detallesOrigen.saldo_posterior', 250)
        ->where('envioOrigen', null)
    );
});
