<?php

use App\Models\Almacen;
use App\Models\HistorialPrecioCosto;
use App\Models\MovimientoFinanciero;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;

// ─── Historial de Precios ────────────────────────────────────────────────────

test('el historial de precios muestra el tipo de cambio sin el id del almacén y cuenta subidas, bajadas y primeras asignaciones', function () {
    $admin = User::factory()->admin()->create();
    $producto = Producto::factory()->create(['nombre_producto' => 'PRODUCTO PRECIOS']);
    $almacen = Almacen::factory()->create(['nombre_almacen' => 'ALMACEN CENTRAL']);

    $crear = fn (?float $anterior, float $nuevo, string $accion) => PrecioHistorial::create([
        'producto_id' => $producto->id, 'user_id' => $admin->id, 'almacen_id' => $almacen->id,
        'precio_anterior' => $anterior, 'precio_nuevo' => $nuevo, 'comision' => 5, 'accion' => $accion,
    ]);

    $crear(null, 100, 'Primera asignación - Almacén ID '.$almacen->id);
    $crear(100, 120, 'Actualización - Almacén ID '.$almacen->id);
    $crear(120, 90, 'Precio de grupo - Almacén ID '.$almacen->id);

    $this->actingAs($admin)->get(route('reportes.historial_precios'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/HistorialPrecios')
            ->has('historial.data', 3)
            ->where('historial.data.0.accion', 'Precio de grupo')
            ->where('historial.data.0.almacen', 'ALMACEN CENTRAL')
            ->where('historial.data.2.precio_anterior', null)
            ->where('totales.cambios', 3)
            ->where('totales.productos', 1)
            ->where('totales.subidas', 1)
            ->where('totales.bajadas', 1)
            ->where('totales.primeras', 1));

    $this->actingAs($admin)->get(route('reportes.historial_precios', ['tipo' => 'primera']))
        ->assertInertia(fn ($page) => $page->has('historial.data', 1)->where('totales.cambios', 1));
});

// ─── Cambios de Precio de Costo ──────────────────────────────────────────────

test('el reporte de cambios de costo suma ganancias y pérdidas en papel y filtra por resultado', function () {
    $admin = User::factory()->admin()->create();
    $producto = Producto::factory()->create();
    $almacen = Almacen::factory()->create();

    foreach ([[10, 8, -2, 5, -10.0], [10, 12, 2, 4, 8.0], [5, 5, 0, 0, 0.0]] as [$anterior, $nuevo, $diferencia, $stock, $impacto]) {
        HistorialPrecioCosto::create([
            'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'user_id' => $admin->id,
            'precio_anterior' => $anterior, 'precio_nuevo' => $nuevo, 'diferencia' => $diferencia,
            'stock_momento' => $stock, 'impacto_financiero' => $impacto, 'es_perdida' => $impacto < 0, 'motivo' => 'AJUSTE',
        ]);
    }

    $this->actingAs($admin)->get(route('reportes.historial_costo_precio'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/HistorialCostoPrecio')
            ->has('historial.data', 3)
            ->where('stats.cambios', 3)
            ->where('stats.total_ganancias', 8)
            ->where('stats.total_perdidas', 10)
            ->where('stats.neto_impacto', -2)
            ->where('stats.cambios_con_ganancia', 1)
            ->where('stats.cambios_con_perdida', 1));

    $this->actingAs($admin)->get(route('reportes.historial_costo_precio', ['resultado' => 'perdida']))
        ->assertInertia(fn ($page) => $page->has('historial.data', 1)->where('stats.neto_impacto', -10));
});

// ─── Movimientos Financieros ─────────────────────────────────────────────────

test('los movimientos financieros no suman los cancelados y se pueden filtrar por tipo y estado', function () {
    crearTiposMovimientoFinanciero();
    $admin = User::factory()->admin()->create();

    MovimientoFinanciero::factory()->gasto()->create(['monto' => 40, 'monto_usd' => 40, 'descripcion' => 'GASTO UNO']);
    MovimientoFinanciero::factory()->gasto()->create(['monto' => 60, 'monto_usd' => 60]);
    MovimientoFinanciero::factory()->gasto()->create(['monto' => 999, 'monto_usd' => 999, 'estado' => 'cancelado']);
    MovimientoFinanciero::factory()->ingreso()->create(['monto' => 25, 'monto_usd' => 25]);

    $this->actingAs($admin)->get(route('reportes.movimientos_financieros'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/MovimientosFinancieros')
            ->has('movimientos.data', 4)
            ->where('totales.movimientos', 3)
            ->where('totales.cancelados', 1)
            ->where('porTipo.0.nombre', 'Gasto')
            ->where('porTipo.0.movimientos', 2)
            ->where('porTipo.0.monto_usd', 100));

    $this->actingAs($admin)->get(route('reportes.movimientos_financieros', ['estado' => 'cancelado']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1));

    $this->actingAs($admin)->get(route('reportes.movimientos_financieros', ['buscar' => 'GASTO UNO']))
        ->assertInertia(fn ($page) => $page->has('movimientos.data', 1));
});

test('un vendedor no puede abrir los reportes de finanzas', function () {
    $vendedor = User::factory()->vendedor()->create();

    foreach (['reportes.historial_precios', 'reportes.historial_costo_precio', 'reportes.movimientos_financieros'] as $ruta) {
        $this->actingAs($vendedor)->get(route($ruta))->assertRedirect();
    }
});
