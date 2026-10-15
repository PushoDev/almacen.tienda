<?php

use App\Models\User;
use App\Models\Venta;

test('el reporte desglosa la ganancia de cada venta completada y suma los totales', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create(['name' => 'VENDEDOR UNO']);

    $venta = Venta::factory()->create([
        'user_id' => $vendedor->id, 'estado' => 'completada', 'total' => 100,
        'total_ganancia' => 30, 'ganancia_perdida_cambiaria' => -2, 'total_comision' => 5, 'ganancia_neta' => 23,
    ]);
    Venta::factory()->create([
        'estado' => 'completada', 'total' => 50,
        'total_ganancia' => 10, 'ganancia_perdida_cambiaria' => 1, 'total_comision' => 0, 'ganancia_neta' => 11,
    ]);
    Venta::factory()->create(['estado' => 'cancelada', 'total' => 999, 'total_ganancia' => 999, 'ganancia_neta' => 999, 'total_comision' => 0]);

    $this->actingAs($admin)->get(route('reportes.reporte_ganancias'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/ReporteGanancias')
            ->has('ventas.data', 2)
            ->where('ventas.data.1.id', $venta->id)
            ->where('ventas.data.1.usuario.name', 'VENDEDOR UNO')
            ->where('totales.ventas', 2)
            ->where('totales.total', 150)
            ->where('totales.productos', 40)
            ->where('totales.cambiaria', -1)
            ->where('totales.comision', 5)
            ->where('totales.neta', 34));
});

test('el periodo, el vendedor y la búsqueda acotan el reporte', function () {
    $admin = User::factory()->admin()->create();
    $ana = User::factory()->vendedor()->create(['name' => 'ANA']);
    $luis = User::factory()->vendedor()->create(['name' => 'LUIS']);

    Venta::factory()->create(['user_id' => $ana->id, 'estado' => 'completada', 'total' => 40, 'created_at' => '2026-10-05 10:00:00']);
    Venta::factory()->create(['user_id' => $ana->id, 'estado' => 'completada', 'total' => 60, 'created_at' => '2026-09-05 10:00:00']);
    Venta::factory()->create(['user_id' => $luis->id, 'estado' => 'completada', 'total' => 25, 'created_at' => '2026-10-06 10:00:00']);

    $this->actingAs($admin)->get(route('reportes.reporte_ganancias', ['desde' => '2026-10-01', 'hasta' => '2026-10-31']))
        ->assertInertia(fn ($page) => $page->has('ventas.data', 2)->where('totales.total', 65));

    $this->actingAs($admin)->get(route('reportes.reporte_ganancias', ['user_id' => $luis->id]))
        ->assertInertia(fn ($page) => $page->has('ventas.data', 1)->where('totales.total', 25));

    $this->actingAs($admin)->get(route('reportes.reporte_ganancias', ['buscar' => 'ana']))
        ->assertInertia(fn ($page) => $page->has('ventas.data', 2)->where('totales.total', 100));
});

test('el reporte pagina de a 15 y los totales cubren todas las ventas', function () {
    $admin = User::factory()->admin()->create();
    Venta::factory()->count(17)->create(['estado' => 'completada', 'total' => 10, 'total_ganancia' => 2, 'ganancia_neta' => 2, 'total_comision' => 0]);

    $this->actingAs($admin)->get(route('reportes.reporte_ganancias'))
        ->assertInertia(fn ($page) => $page
            ->has('ventas.data', 15)
            ->where('ventas.total', 17)
            ->where('totales.ventas', 17)
            ->where('totales.neta', 34));
});
