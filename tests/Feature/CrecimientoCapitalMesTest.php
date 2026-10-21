<?php

use App\Models\HistorialComparacionMensual;
use App\Models\MovimientoFinanciero;
use App\Models\Remesa;
use App\Models\User;
use App\Models\Venta;
use App\Services\DashboardStatsService;
use Illuminate\Support\Facades\DB;

function crearCierreDelMesAnterior(string $codigo, float $montoActual, float $tasa): void
{
    HistorialComparacionMensual::create([
        'user_id' => null,
        'mes_comparado' => now()->startOfMonth()->subMonth()->toDateString(),
        'moneda_codigo' => $codigo,
        'moneda_nombre' => $codigo,
        'moneda_simbolo' => $codigo,
        'saldo_inicio_mes' => 0,
        'monto_anterior' => 0,
        'monto_actual' => $montoActual,
        'diferencia' => $montoActual,
        'porcentaje_cambio' => 0,
        'tasa_cambio_usada' => $tasa,
    ]);
}

test('el crecimiento del capital es el capital de hoy menos el cierre guardado, cada moneda a la tasa de ese cierre', function () {
    crearTiposMovimientoFinanciero();

    crearCuentaEnMoneda(crearMonedaUsd(), 1000);
    crearCuentaEnMoneda(crearMoneda('CUP', 840), 840000);

    crearCierreDelMesAnterior('USD', 1500, 1);
    crearCierreDelMesAnterior('CUP', 760000, 760);
    crearCierreDelMesAnterior('PROVEEDORES', -999, 1);

    MovimientoFinanciero::factory()->gasto()->create(['monto_usd' => 100]);
    MovimientoFinanciero::factory()->ingreso()->create(['monto_usd' => 30]);
    MovimientoFinanciero::factory()->gasto()->create(['monto_usd' => 500, 'estado' => 'cancelado']);

    $resultado = app(DashboardStatsService::class)->getCrecimientoCapitalMes();

    // Las fábricas de movimientos crean sus propias cuentas, así que el capital de hoy se toma tal cual lo calcula el servicio.
    $capital = $resultado['capital_actual'];

    expect($capital)->toBeGreaterThanOrEqual(2000.0)
        ->and($resultado['cierre_mes_anterior'])->toBe(2500.0)
        ->and($resultado['crecimiento'])->toBe(round($capital - 2500, 2))
        ->and($resultado['gastos'])->toBe(100.0)
        ->and($resultado['ingresos'])->toBe(30.0)
        ->and($resultado['ganancia_operaciones'])->toBe(0.0)
        ->and($resultado['otros_efectos'])->toBe(round($capital - 2500 + 70, 2));
});

test('sin cierre del mes anterior el crecimiento no se inventa', function () {
    crearTiposMovimientoFinanciero();
    crearCuentaEnMoneda(crearMonedaUsd(), 1000);

    $resultado = app(DashboardStatsService::class)->getCrecimientoCapitalMes();

    expect($resultado['capital_actual'])->toBe(1000.0)
        ->and($resultado['cierre_mes_anterior'])->toBeNull()
        ->and($resultado['crecimiento'])->toBeNull()
        ->and($resultado['otros_efectos'])->toBeNull();
});

test('el dashboard manda el crecimiento del capital a admin y moderador pero no al vendedor', function () {
    crearTiposMovimientoFinanciero();
    crearCuentaEnMoneda(crearMonedaUsd(), 1000);
    crearCierreDelMesAnterior('USD', 400, 1);

    $this->actingAs(User::factory()->admin()->create())->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('crecimientoCapitalMes.cierre_mes_anterior', fn ($valor) => (float) $valor === 400.0)
        ->where('crecimientoCapitalMes.crecimiento', fn ($valor) => (float) $valor === 600.0)
        ->where('crecimientoCapitalMes.capital_actual', fn ($valor) => (float) $valor === 1000.0));

    $this->actingAs(User::factory()->vendedor()->create())->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('crecimientoCapitalMes', null));
});

test('la ganancia de transferencias del mes no cuenta las transferencias anuladas', function () {
    crearTiposMovimientoFinanciero();
    $moneda = crearMonedaUsd();
    $origen = crearCuentaEnMoneda($moneda);
    $destino = crearCuentaEnMoneda($moneda);

    MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $origen->id,
        'cuenta_destino_id' => $destino->id,
        'ganancia_perdida_cambiaria' => -5,
    ]);
    MovimientoFinanciero::factory()->transferencia()->create([
        'cuenta_origen_id' => $origen->id,
        'cuenta_destino_id' => $destino->id,
        'ganancia_perdida_cambiaria' => 20,
        'estado' => 'cancelado',
    ]);

    $ganancia = app(DashboardStatsService::class)->getGananciaAgenciaMes();

    expect($ganancia['ganancia_transferencias'])->toBe(-5.0)
        ->and($ganancia['ganancia_neta_total'])->toBe(-5.0);
});

test('cada fila de la comparación mensual trae la tasa con que quedó guardado el cierre del mes anterior', function () {
    crearCuentaEnMoneda(crearMonedaUsd(), 1000);
    crearCuentaEnMoneda(crearMoneda('CUP', 840), 840000);

    crearCierreDelMesAnterior('USD', 900, 1);
    crearCierreDelMesAnterior('CUP', 760000, 760);

    $filas = collect(app(DashboardStatsService::class)->actualizarComparacionMensual(null))->keyBy('moneda');

    expect($filas['CUP']['tasa_cambio_anterior'])->toBe(760.0)
        ->and($filas['CUP']['monto_anterior'])->toBe(760000.0)
        ->and($filas['CUP']['tasa_cambio'])->toBe(840.0)
        ->and($filas['USD']['tasa_cambio_anterior'])->toBe(1.0)
        ->and($filas['INVENTARIO']['tasa_cambio_anterior'])->toBeNull();
});

test('la escalera de ganancia cierra: margen, comisión y cambiaria suman la ganancia de ventas', function () {
    crearTiposMovimientoFinanciero();
    crearCuentaEnMoneda(crearMonedaUsd(), 1000);

    Venta::factory()->create(['estado' => 'completada', 'total_ganancia' => 100, 'total_comision' => 10, 'ganancia_neta' => 85]);
    Venta::factory()->create(['estado' => 'completada', 'total_ganancia' => 50, 'total_comision' => 5, 'ganancia_neta' => 45]);
    Venta::factory()->create(['estado' => 'cancelada', 'total_ganancia' => 900, 'total_comision' => 90, 'ganancia_neta' => 810]);

    $resultado = app(DashboardStatsService::class)->getCrecimientoCapitalMes();

    expect($resultado['margen_ventas'])->toBe(150.0)
        ->and($resultado['comision_ventas'])->toBe(15.0)
        ->and($resultado['ganancia_ventas'])->toBe(130.0)
        ->and($resultado['cambiaria_y_ajustes_ventas'])->toBe(-5.0)
        ->and($resultado['margen_ventas'] - $resultado['comision_ventas'] + $resultado['cambiaria_y_ajustes_ventas'])->toBe($resultado['ganancia_ventas']);
});

function crearRemesaCompletada(array $datos): Remesa
{
    return Remesa::create(array_merge([
        'user_id' => User::factory()->admin()->create()->id,
        'entrada_tipo' => 'cuenta',
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 0,
        'entrada_saldo_posterior' => 0,
        'salida_tipo' => 'cuenta',
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 0,
        'salida_saldo_posterior' => 0,
        'fecha_operacion' => now(),
        'estado' => 'completado',
    ], $datos));
}

test('la ganancia de remesas es lo que entra menos lo que sale y el mensajero, con la tasa de cada momento', function () {
    $cup = crearMoneda('CUP', 840);
    crearMonedaUsd();

    // Antes de esta remesa la tasa del CUP era 800: 80.000 CUP valen 100 USD (con la tasa actual, 840, valdrían 95,24).
    DB::table('historial_tasa_cambios')->insert([
        'moneda_id' => $cup->id,
        'user_id' => User::factory()->admin()->create()->id,
        'tasa_anterior' => 790,
        'tasa_nueva' => 800,
        'diferencia_tasa' => 10,
        'porcentaje_cambio' => 1.27,
        'total_cuentas_afectadas' => 0,
        'impacto_financiero' => 0,
        'impacto_porcentaje' => 0,
        'numero_cuentas_afectadas' => 0,
        'created_at' => now()->subDay(),
        'updated_at' => now()->subDay(),
    ]);

    crearRemesaCompletada(['entrada_monto' => 110, 'salida_monto' => 80000, 'salida_moneda' => 'CUP', 'mensajero_monto' => 800, 'mensajero_moneda' => 'CUP']);
    crearRemesaCompletada(['entrada_monto' => 60, 'salida_monto' => 56]);
    crearRemesaCompletada(['entrada_monto' => 5000, 'salida_monto' => 10, 'estado' => 'anulada']);

    $ganancia = app(DashboardStatsService::class)->getGananciaAgenciaMes();

    // 110 − 100 − 1 + (60 − 56) = 13
    expect($ganancia['ganancia_remesas'])->toBe(13.0)
        ->and($ganancia['ganancia_neta_total'])->toBe(13.0);
});
