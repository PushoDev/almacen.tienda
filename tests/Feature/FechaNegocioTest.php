<?php

use App\Models\Almacen;
use App\Models\Producto;
use App\Models\TelegramVinculo;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Services\FechaNegocio;
use Telegram\Bot\Laravel\Facades\Telegram;

test('el día de negocio se convierte a UTC con el horario de verano de Cuba', function () {
    // Octubre: Cuba en UTC-4 (horario de verano). Diciembre: UTC-5.
    expect(FechaNegocio::rangoDelDiaUtc('2026-10-13'))->toBe(['2026-10-13 04:00:00', '2026-10-14 03:59:59'])
        ->and(FechaNegocio::rangoDelDiaUtc('2026-12-13'))->toBe(['2026-12-13 05:00:00', '2026-12-14 04:59:59']);
});

test('el filtro de fecha del Rastreo usa el día de Cuba: una venta de la noche no pasa al día siguiente', function () {
    $this->actingAs(User::factory()->admin()->create());
    crearTiposMovimientoFinanciero();

    // 21:14 del 13-oct en Cuba = 01:14 del 14-oct en UTC.
    $ventaDeLaNoche = Venta::factory()->create(['created_at' => '2026-10-14 01:14:05']);
    $ventaDelDiaSiguiente = Venta::factory()->create(['created_at' => '2026-10-14 05:00:00']);

    $idsDelDia = fn (string $dia) => collect(
        $this->get(route('reportes.rastreo_operaciones', ['fecha' => $dia]), ['X-Inertia' => 'true'])->json('props.operaciones.data')
    )->pluck('id')->all();

    expect($idsDelDia('2026-10-13'))->toBe([$ventaDeLaNoche->id])
        ->and($idsDelDia('2026-10-14'))->toBe([$ventaDelDiaSiguiente->id]);
});

// ─── Agrupaciones y "hoy" por día de Cuba: son las 22:00 del 13-oct allá (02:00 del 14 en UTC) ───

test('el gráfico de compras y ventas cuenta una venta de la noche en el día de Cuba', function () {
    $this->travelTo('2026-10-14 02:00:00');
    $this->actingAs(User::factory()->admin()->create());
    Venta::factory()->create(['total' => 100, 'created_at' => '2026-10-14 01:30:00']);

    $datos = $this->getJson(route('dashboard.chart.data', ['timeRange' => '1d']))->assertOk()->json();

    expect($datos)->toHaveCount(1)
        ->and($datos[0]['date'])->toBe('2026-10-13')
        ->and((float) $datos[0]['ventas'])->toBe(100.0);
});

test('el resumen por almacén agrupa las ventas por día de Cuba', function () {
    $this->travelTo('2026-10-14 02:00:00');
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $venta = Venta::factory()->completada()->create(['almacen_id' => $almacen->id, 'created_at' => '2026-10-14 01:30:00']);
    VentaDetalle::factory()->create([
        'venta_id' => $venta->id, 'producto_id' => Producto::factory()->create()->id, 'cantidad' => 2,
        'precio_venta' => 30, 'subtotal' => 60, 'costo_unitario' => 20,
    ]);

    $serie = collect($this->getJson(route('logistica.almacen.resumen', $almacen))->assertOk()->json('ventas_por_dia'));

    expect($serie->last())->toBe(['fecha' => '2026-10-13', 'venta' => 60, 'costo' => 40, 'ganancia' => 20])
        ->and($serie->pluck('fecha')->contains('2026-10-14'))->toBeFalse();
});

test('/reporte de Telegram cuenta las ventas de "hoy" por el día de Cuba y muestra esa fecha', function () {
    $this->travelTo('2026-10-14 02:00:00');
    $admin = User::factory()->admin()->create();
    TelegramVinculo::factory()->for($admin, 'usuario')->create(['chat_id' => '777']);
    Venta::factory()->completada()->create(['total' => 100, 'created_at' => '2026-10-14 01:30:00']);

    $telegramMock = Mockery::mock();
    $telegramMock->shouldReceive('sendMessage')
        ->once()
        ->with(Mockery::on(fn (array $params) => str_contains($params['text'], 'Reporte del día 13/10/2026')
            && str_contains($params['text'], 'Total global: 1 ventas')))
        ->andReturn(null);
    Telegram::swap($telegramMock);

    $this->postJson('/api/telegram/webhook', [
        'message' => ['chat' => ['id' => '777'], 'text' => '/reporte'],
    ], ['X-Telegram-Bot-Api-Secret-Token' => config('services.telegram.webhook_secret')])->assertOk();
});
