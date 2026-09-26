<?php

use App\Models\Almacen;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\User;
use App\Models\Venta;
use App\Services\DashboardStatsService;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    $this->actingAs($user = User::factory()->create());

    $this->get('/dashboard')->assertOk();
});

test('el movimiento reconstruido de las cuentas cuenta la comisión en la moneda de la cuenta de donde salió', function () {
    $vendedor = User::factory()->vendedor()->create();
    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true, 'principal' => true]);
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);

    foreach ([[$monedaCup, 365], [$monedaUsd, 1]] as [$moneda, $tasa]) {
        $cuenta = Cuenta::create([
            'nombre_cuenta' => "Cuenta {$moneda->codigo_moneda}", 'saldo_cuenta' => 1000, 'tipo_cuenta' => 'permanentes',
            'tipo' => 'efectivo', 'moneda_id' => $moneda->id, 'estado' => 'activa',
        ]);
        Venta::factory()->completada()->create([
            'user_id' => $vendedor->id, 'almacen_id' => $almacen->id, 'moneda_id' => $monedaUsd->id, 'total' => 100,
            'es_venta_gestor' => false, 'total_comision' => 10, 'comision_cuenta_id' => $cuenta->id, 'comision_tasa' => $tasa,
        ]);
    }

    $neto = app(DashboardStatsService::class)->reconstruirMovimientoCuentas(now()->subDay(), now()->addDay());

    expect(round($neto['CUP'], 2))->toBe(-3650.0)  // 10 USD × 365 sale de la cuenta CUP
        ->and(round($neto['USD'], 2))->toBe(-10.0); // 10 USD salen directo de la cuenta USD
});
