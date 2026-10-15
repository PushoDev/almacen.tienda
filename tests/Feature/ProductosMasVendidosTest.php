<?php

use App\Models\Almacen;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;

/**
 * Una venta con un solo detalle del producto indicado.
 */
function ventaConDetalle(Producto $producto, int $cantidad, string $estado = 'completada', ?Almacen $almacen = null, ?string $fecha = null): Venta
{
    $venta = Venta::factory()->create(array_filter([
        'estado' => $estado,
        'almacen_id' => $almacen?->id,
        'created_at' => $fecha,
    ]));

    VentaDetalle::factory()->create([
        'venta_id' => $venta->id,
        'producto_id' => $producto->id,
        'cantidad' => $cantidad,
        'precio_venta' => 10,
        'subtotal' => 10 * $cantidad,
        'costo_unitario' => 6,
        'ganancia' => 4 * $cantidad,
    ]);

    return $venta;
}

test('el reporte ordena por unidades, suma ingresos y ganancia y manda los totales de lo filtrado', function () {
    $admin = User::factory()->admin()->create();
    $menosVendido = Producto::factory()->create(['nombre_producto' => 'PRODUCTO POCO']);
    $masVendido = Producto::factory()->create(['nombre_producto' => 'PRODUCTO MUCHO']);

    ventaConDetalle($menosVendido, 2);
    ventaConDetalle($masVendido, 5);
    ventaConDetalle($masVendido, 4);

    $this->actingAs($admin)->get(route('reportes.productos_mas_vendidos'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Reportes/Report/ProductosMasVendidos')
            ->has('productos', 2)
            ->where('productos.0.nombre_producto', 'PRODUCTO MUCHO')
            ->where('productos.0.total_vendido', 9)
            ->where('productos.0.veces_vendido', 2)
            ->where('productos.0.ingresos', 90)
            ->where('productos.0.ganancia', 36)
            ->where('productos.1.nombre_producto', 'PRODUCTO POCO')
            ->where('totales.unidades', 11)
            ->where('totales.productos', 2)
            ->where('totales.ventas', 3)
            ->where('totales.ingresos', 110));
});

test('el reporte solo cuenta ventas completadas', function () {
    $admin = User::factory()->admin()->create();
    $producto = Producto::factory()->create();

    ventaConDetalle($producto, 3);
    ventaConDetalle($producto, 50, 'cancelada');
    ventaConDetalle($producto, 40, 'devuelta');
    ventaConDetalle($producto, 30, 'pendiente');

    $this->actingAs($admin)->get(route('reportes.productos_mas_vendidos'))
        ->assertInertia(fn ($page) => $page
            ->where('productos.0.total_vendido', 3)
            ->where('totales.unidades', 3)
            ->where('totales.ventas', 1));
});

test('los filtros de almacén, fechas y producto acotan el top y los totales', function () {
    $admin = User::factory()->admin()->create();
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();
    $televisor = Producto::factory()->create(['nombre_producto' => 'TELEVISOR UNICO']);
    $otro = Producto::factory()->create(['nombre_producto' => 'OTRO ARTICULO']);

    ventaConDetalle($televisor, 4, 'completada', $almacenA, '2026-09-10 12:00:00');
    ventaConDetalle($otro, 7, 'completada', $almacenB, '2026-10-05 12:00:00');

    $this->actingAs($admin)->get(route('reportes.productos_mas_vendidos', ['almacen_id' => $almacenA->id]))
        ->assertInertia(fn ($page) => $page->has('productos', 1)->where('productos.0.nombre_producto', 'TELEVISOR UNICO')->where('totales.unidades', 4));

    $this->actingAs($admin)->get(route('reportes.productos_mas_vendidos', ['desde' => '2026-10-01']))
        ->assertInertia(fn ($page) => $page->has('productos', 1)->where('productos.0.nombre_producto', 'OTRO ARTICULO'));

    $this->actingAs($admin)->get(route('reportes.productos_mas_vendidos', ['buscar' => 'televisor']))
        ->assertInertia(fn ($page) => $page->has('productos', 1)->where('totales.unidades', 4));
});

test('un vendedor no puede abrir el reporte', function () {
    $this->actingAs(User::factory()->vendedor()->create())
        ->get(route('reportes.productos_mas_vendidos'))
        ->assertRedirect();
});
