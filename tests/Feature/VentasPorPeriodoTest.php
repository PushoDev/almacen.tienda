<?php

use App\Models\Almacen;
use App\Models\DestinatarioVenta;
use App\Models\User;
use App\Models\Venta;

/**
 * Venta con receptor, lista para el reporte.
 *
 * @param  array<string, mixed>  $atributos
 */
function ventaConReceptor(string $nombre, string $apellidos, string $telefono, array $atributos = []): Venta
{
    $venta = Venta::factory()->create(['estado' => 'completada'] + $atributos);

    DestinatarioVenta::create([
        'venta_id' => $venta->id,
        'nombre' => $nombre,
        'apellidos' => $apellidos,
        'telefono_contacto' => $telefono,
    ]);

    return $venta;
}

test('el reporte lista solo ventas completadas con su receptor y calcula los totales', function () {
    $admin = User::factory()->admin()->create();
    $primera = ventaConReceptor('MARIA', 'PEREZ GOMEZ', '55501234', ['total' => 100, 'total_ganancia' => 20]);
    ventaConReceptor('JUAN', 'LOPEZ RUIZ', '55504321', ['total' => 50, 'total_ganancia' => 10]);
    Venta::factory()->create(['estado' => 'cancelada', 'total' => 999, 'total_ganancia' => 999]);

    $this->actingAs($admin)->get(route('reportes.ventas_por_periodo'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/VentasPorPeriodo')
            ->has('ventas.data', 2)
            ->where('ventas.data.1.id', $primera->id)
            ->where('ventas.data.1.destinatario.nombre', 'MARIA')
            ->where('ventas.data.1.destinatario.telefono_contacto', '55501234')
            ->where('totales.ventas', 2)
            ->where('totales.total', 150)
            ->where('totales.ganancia', 30)
            ->where('totales.promedio', 75));
});

test('el buscador encuentra por receptor, teléfono, número de venta y vendedor', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create(['name' => 'VENDEDORA ESPECIAL']);
    $venta = ventaConReceptor('MARIA', 'PEREZ GOMEZ', '55501234', ['user_id' => $vendedor->id]);
    ventaConReceptor('JUAN', 'LOPEZ RUIZ', '55504321');

    foreach (['PEREZ', '55501234', 'VENDEDORA'] as $busqueda) {
        $this->actingAs($admin)->get(route('reportes.ventas_por_periodo', ['buscar' => $busqueda]))
            ->assertInertia(fn ($page) => $page->has('ventas.data', 1)->where('ventas.data.0.id', $venta->id));
    }

    // El número también busca teléfonos parciales, así que además de la venta puede traer otras: debe incluirla.
    $this->actingAs($admin)->get(route('reportes.ventas_por_periodo', ['buscar' => (string) $venta->id]))
        ->assertInertia(function ($page) use ($venta) {
            $ids = collect($page->toArray()['props']['ventas']['data'])->pluck('id');
            expect($ids)->toContain($venta->id);

            return $page;
        });
});

test('los filtros de vendedor, almacén y fechas acotan lista y totales', function () {
    $admin = User::factory()->admin()->create();
    $vendedor = User::factory()->vendedor()->create();
    $almacen = Almacen::factory()->create();
    $buscada = ventaConReceptor('ANA', 'DIAZ', '55509999', [
        'user_id' => $vendedor->id,
        'almacen_id' => $almacen->id,
        'total' => 70,
        'created_at' => '2026-10-05 10:00:00',
    ]);
    ventaConReceptor('OTRO', 'CLIENTE', '55508888', ['created_at' => '2026-09-01 10:00:00', 'total' => 30]);

    $this->actingAs($admin)->get(route('reportes.ventas_por_periodo', [
        'user_id' => $vendedor->id,
        'almacen_id' => $almacen->id,
        'desde' => '2026-10-01',
        'hasta' => '2026-10-31',
    ]))->assertInertia(fn ($page) => $page
        ->has('ventas.data', 1)
        ->where('ventas.data.0.id', $buscada->id)
        ->where('totales.total', 70));
});

test('el reporte pagina de a 15 y los totales cubren todas las ventas', function () {
    $admin = User::factory()->admin()->create();

    foreach (range(1, 17) as $numero) {
        ventaConReceptor('CLIENTE '.$numero, 'APELLIDO', '5550'.$numero, ['total' => 10]);
    }

    $this->actingAs($admin)->get(route('reportes.ventas_por_periodo'))
        ->assertInertia(fn ($page) => $page
            ->has('ventas.data', 15)
            ->where('ventas.total', 17)
            ->where('totales.ventas', 17)
            ->where('totales.total', 170));
});
