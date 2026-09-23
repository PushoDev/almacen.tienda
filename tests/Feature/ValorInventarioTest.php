<?php

use App\Exports\ProductoExport;
use App\Models\Almacen;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\User;
use App\Services\DashboardStatsService;
use App\Services\ValorInventarioService;

/**
 * Escenario compartido: un producto con prorrateo (lote a $20 aunque la ficha dice $10) y un
 * producto de catálogo viejo sin ningún lote (cae al costo de la ficha, $3). Valor real
 * esperado: 5*20 + 2*3 = 106 — el cálculo viejo con el costo de la ficha daba 5*10 + 2*3 = 56.
 *
 * @return array{producto: Producto, almacen: Almacen, productoViejo: Producto, almacenViejo: Almacen}
 */
function inventarioConProrrateoYCatalogoViejo(): array
{
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    LoteStock::create([
        'codigo' => 'LOTE-VALOR-1', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 5, 'precio_costo' => 20,
    ]);

    $productoViejo = Producto::factory()->create(['precio_compra_producto' => 3]);
    $almacenViejo = Almacen::factory()->create();
    $productoViejo->almacenes()->attach($almacenViejo->id, ['cantidad' => 2]);

    return compact('producto', 'almacen', 'productoViejo', 'almacenViejo');
}

test('el capital financiero del dashboard suma el inventario a costo real por lote', function () {
    inventarioConProrrateoYCatalogoViejo();

    $resumen = app(DashboardStatsService::class)->getResumenFinancieroCompacto();

    expect($resumen['capital_financiero'])->toEqual(106);
});

test('el valor de stock bajo usa el costo del lote y excluye productos sin stock cuando se pide', function () {
    ['productoViejo' => $productoViejo] = inventarioConProrrateoYCatalogoViejo();
    $conLoteBajo = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $conLoteBajo->almacenes()->attach($almacen->id, ['cantidad' => 3]);
    LoteStock::create([
        'codigo' => 'LOTE-VALOR-BAJO', 'producto_id' => $conLoteBajo->id, 'almacen_id' => $almacen->id,
        'cantidad' => 3, 'precio_costo' => 20,
    ]);
    Producto::factory()->create(['precio_compra_producto' => 99]);
    $servicio = app(ValorInventarioService::class);

    $sinContarAgotados = $servicio->resumenStockBajo(5, incluirSinStock: false);
    $contandoAgotados = $servicio->resumenStockBajo(5, incluirSinStock: true);

    // 3*20 (lote, no 3*10 de la ficha) + 2*3 (fallback); el de 5 unidades no es stock bajo.
    expect($sinContarAgotados)->toBe(['cantidad' => 2, 'valor' => 66.0])
        ->and($contandoAgotados)->toBe(['cantidad' => 3, 'valor' => 66.0]);
});

test('el reporte de valor de inventario muestra el costo real por producto y almacén', function () {
    ['almacen' => $almacen, 'almacenViejo' => $almacenViejo] = inventarioConProrrateoYCatalogoViejo();
    $this->actingAs(User::factory()->admin()->create());

    $response = $this->get(route('reportes.valor_inventario'));

    $response->assertInertia(fn ($page) => $page
        ->where('valorTotal', 106)
        ->where('inventario', fn ($filas) => collect($filas)->sortBy('costo_unitario')->values()->map(fn ($f) => [
            $f['nombre_almacen'], $f['cantidad'], $f['costo_unitario'], $f['valor_total_costo'],
        ])->all() === [
            [$almacenViejo->nombre_almacen, 2, 3, 6],
            [$almacen->nombre_almacen, 5, 20, 100],
        ])
    );
});

test('la exportación a Excel usa el costo real del lote en ese almacén', function () {
    ['producto' => $producto, 'almacen' => $almacen] = inventarioConProrrateoYCatalogoViejo();
    $export = new ProductoExport($almacen->id);

    $fila = $export->map($export->collection()->firstWhere('id', $producto->id));

    expect($export->headings()[8])->toBe('Costo Unitario')
        ->and([$fila[8], $fila[9], $fila[10]])->toBe(['20.00', 5, '100.00']);
});

test('la exportación a Excel cae al costo de la ficha cuando el producto no tiene lotes', function () {
    ['productoViejo' => $productoViejo, 'almacenViejo' => $almacenViejo] = inventarioConProrrateoYCatalogoViejo();
    $export = new ProductoExport($almacenViejo->id);

    $fila = $export->map($export->collection()->firstWhere('id', $productoViejo->id));

    expect([$fila[8], $fila[9], $fila[10]])->toBe(['3.00', 2, '6.00']);
});

test('el valor total no cuenta las unidades que los lotes declaran de más frente al stock real', function () {
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 4]);
    LoteStock::create([
        'codigo' => 'LOTE-DE-MAS', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 10, 'precio_costo' => 20,
    ]);
    $servicio = app(ValorInventarioService::class);

    $fila = $servicio->filasPorProductoAlmacen()[0];

    // 4 unidades reales a $20 = 80 — no 10 unidades del lote × 20 = 200.
    expect($servicio->valorTotal())->toBe(80.0)
        ->and([$fila['cantidad'], $fila['costo_unitario'], $fila['valor_total_costo']])->toBe([4, 20.0, 80.0]);
});

test('el valor total valora al costo de la ficha las unidades que ningún lote respalda', function () {
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    $producto->almacenes()->attach($almacen->id, ['cantidad' => 5]);
    LoteStock::create([
        'codigo' => 'LOTE-DE-MENOS', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 3, 'precio_costo' => 20,
    ]);
    $servicio = app(ValorInventarioService::class);

    $fila = $servicio->filasPorProductoAlmacen()[0];

    // 3 unidades del lote a $20 + 2 sin lote a $10 de la ficha = 80 (antes se perdían esas 2 unidades: 60).
    expect($servicio->valorTotal())->toBe(80.0)
        ->and([$fila['cantidad'], $fila['costo_unitario'], $fila['valor_total_costo']])->toBe([5, 16.0, 80.0]);
});

test('el valor de un lote sin ninguna fila de stock no suma al total', function () {
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $almacen = Almacen::factory()->create();
    LoteStock::create([
        'codigo' => 'LOTE-HUERFANO', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 5, 'precio_costo' => 20,
    ]);

    expect(app(ValorInventarioService::class)->valorTotal())->toBe(0.0);
});
