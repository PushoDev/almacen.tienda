<?php

use App\Models\User;
use App\Models\Venta;

test('el reporte agrupa las ventas completadas por vendedor con total, ganancia, comisión y rol', function () {
    $admin = User::factory()->admin()->create();
    $mayor = User::factory()->vendedor()->create(['name' => 'VENDEDOR MAYOR']);
    $menor = User::factory()->moderador()->create(['name' => 'MODERADOR MENOR']);

    Venta::factory()->create(['user_id' => $mayor->id, 'estado' => 'completada', 'total' => 100, 'total_ganancia' => 30, 'total_comision' => 5]);
    Venta::factory()->create(['user_id' => $mayor->id, 'estado' => 'completada', 'total' => 200, 'total_ganancia' => 50, 'total_comision' => 10]);
    Venta::factory()->create(['user_id' => $menor->id, 'estado' => 'completada', 'total' => 50, 'total_ganancia' => 10, 'total_comision' => 0]);
    Venta::factory()->create(['user_id' => $menor->id, 'estado' => 'cancelada', 'total' => 999, 'total_ganancia' => 999, 'total_comision' => 999]);

    $this->actingAs($admin)->get(route('reportes.ventas_por_vendedor'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/VentasPorVendedor')
            ->has('vendedores', 2)
            ->where('vendedores.0.vendedor', 'VENDEDOR MAYOR')
            ->where('vendedores.0.rol', 'vendedor')
            ->where('vendedores.0.total_ventas', 2)
            ->where('vendedores.0.monto_total_vendido', 300)
            ->where('vendedores.0.ganancia', 80)
            ->where('vendedores.0.comision', 15)
            ->where('vendedores.1.rol', 'moderador')
            ->where('totales.vendedores', 2)
            ->where('totales.ventas', 3)
            ->where('totales.total', 350)
            ->where('totales.ganancia', 90));
});

test('el periodo y la búsqueda por nombre acotan vendedores y totales', function () {
    $admin = User::factory()->admin()->create();
    $ana = User::factory()->vendedor()->create(['name' => 'ANA']);
    $luis = User::factory()->vendedor()->create(['name' => 'LUIS']);

    Venta::factory()->create(['user_id' => $ana->id, 'estado' => 'completada', 'total' => 40, 'created_at' => '2026-10-05 10:00:00']);
    Venta::factory()->create(['user_id' => $ana->id, 'estado' => 'completada', 'total' => 60, 'created_at' => '2026-09-05 10:00:00']);
    Venta::factory()->create(['user_id' => $luis->id, 'estado' => 'completada', 'total' => 25, 'created_at' => '2026-10-06 10:00:00']);

    $this->actingAs($admin)->get(route('reportes.ventas_por_vendedor', ['desde' => '2026-10-01', 'hasta' => '2026-10-31']))
        ->assertInertia(fn ($page) => $page->has('vendedores', 2)->where('totales.total', 65));

    $this->actingAs($admin)->get(route('reportes.ventas_por_vendedor', ['buscar' => 'ana']))
        ->assertInertia(fn ($page) => $page->has('vendedores', 1)->where('vendedores.0.vendedor', 'ANA')->where('totales.total', 100));
});
