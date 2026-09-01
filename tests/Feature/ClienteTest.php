<?php

use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\MovimientoFinanciero;
use App\Models\PagoVenta;
use App\Models\User;
use App\Models\Venta;

// crearTiposMovimientoFinanciero() está declarada globalmente en tests/Pest.php.

test('el detalle de un cliente trae saldo anterior/posterior de sus pagos de venta, movimientos financieros y compras financiadas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearTiposMovimientoFinanciero();

    $cliente = Cliente::factory()->create(['deuda_pago_cliente' => 70]);

    $venta = Venta::factory()->completada()->create();
    PagoVenta::factory()->create([
        'venta_id' => $venta->id,
        'cliente_id' => $cliente->id,
        'monto' => 50,
        'saldo_anterior' => 20,
        'saldo_posterior' => 70,
    ]);

    $ingreso = MovimientoFinanciero::factory()->ingreso()->create([
        'cliente_destino_id' => $cliente->id,
        'monto' => 100,
        'moneda' => 'USD',
        'saldo_anterior_destino' => 70,
        'saldo_posterior_destino' => 170,
        'moneda_destino' => 'USD',
    ]);

    $compra = Compra::factory()->create();
    CompraPago::create([
        'compra_id' => $compra->id,
        'cliente_id' => $cliente->id,
        'monto' => 30,
        'tipo_pago' => 'cliente',
        'saldo_anterior' => 170,
        'saldo_posterior' => 140,
    ]);

    $response = $this->get(route('clientes.show', $cliente->id), ['X-Inertia' => 'true']);
    $response->assertOk();

    $pagoVenta = collect($response->json('props.cliente.pagos_venta'))->firstWhere('id', PagoVenta::first()->id);
    expect((float) $pagoVenta['saldo_anterior'])->toBe(20.0);
    expect((float) $pagoVenta['saldo_posterior'])->toBe(70.0);

    $movimiento = collect($response->json('props.cliente.movimientos_como_destino'))->firstWhere('id', $ingreso->id);
    expect((float) $movimiento['saldo_anterior_destino'])->toBe(70.0);
    expect((float) $movimiento['saldo_posterior_destino'])->toBe(170.0);

    $compraPagador = collect($response->json('props.cliente.compras_como_pagador'))->firstWhere('id', $compra->id);
    expect((float) $compraPagador['pivot']['saldo_anterior'])->toBe(170.0);
    expect((float) $compraPagador['pivot']['saldo_posterior'])->toBe(140.0);
});
