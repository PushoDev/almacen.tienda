<?php

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Services\ValorInventarioService;
use Illuminate\Support\Facades\DB;

/**
 * Escenario del resumen por almacén (todo en ALMACEN RESUMEN):
 *  - A: 5 u. con lote a $20 (ficha $10), precio de venta $30, 2 u. en tránsito → costo 100, venta 150.
 *  - B y B2: la misma ficha repetida, sin lotes ni precio, ficha $3, 2 u. y 1 u. → costo 6 y 3.
 *  - C: asignado sin unidades.
 *  - D: 10 u. en dos lotes a distinto costo (4 × $10 y 6 × $12) en otra categoría, sin precio → costo 112.
 *
 * @return array{almacen: Almacen, a: Producto, d: Producto}
 */
function escenarioResumenAlmacen(): array
{
    $bebidas = Categoria::factory()->create(['nombre_categoria' => 'Bebidas']);
    $ferreteria = Categoria::factory()->create(['nombre_categoria' => 'Ferreteria']);
    $almacen = Almacen::factory()->create(['nombre_almacen' => 'ALMACEN RESUMEN']);
    $sinDetalles = ['marca_producto' => null, 'modelo_producto' => null, 'capacidad_producto' => null, 'color_producto' => null];

    $a = Producto::factory()->for($bebidas)->create(['nombre_producto' => 'Producto A', 'precio_compra_producto' => 10] + $sinDetalles);
    $a->almacenes()->attach($almacen->id, ['cantidad' => 5, 'cantidad_en_transito' => 2]);
    LoteStock::create([
        'codigo' => 'LOTE-RESUMEN-A', 'producto_id' => $a->id, 'almacen_id' => $almacen->id,
        'cantidad' => 5, 'precio_costo' => 20,
    ]);
    DB::table('producto_vendedors')->insert([
        'producto_id' => $a->id, 'almacen_id' => $almacen->id, 'precio_venta' => 30, 'venta_ganancia' => 10,
        'created_at' => now(), 'updated_at' => now(),
    ]);

    foreach ([2, 1] as $cantidad) {
        Producto::factory()->for($bebidas)->create(['nombre_producto' => 'Producto B', 'precio_compra_producto' => 3] + $sinDetalles)
            ->almacenes()->attach($almacen->id, ['cantidad' => $cantidad]);
    }

    Producto::factory()->for($bebidas)->create(['nombre_producto' => 'Producto C', 'precio_compra_producto' => 5] + $sinDetalles)
        ->almacenes()->attach($almacen->id, ['cantidad' => 0]);

    $d = Producto::factory()->for($ferreteria)->create(['nombre_producto' => 'Producto D', 'precio_compra_producto' => 9] + $sinDetalles);
    $d->almacenes()->attach($almacen->id, ['cantidad' => 10]);
    foreach ([['LOTE-RESUMEN-D1', 4, 10], ['LOTE-RESUMEN-D2', 6, 12]] as [$codigo, $cantidad, $costo]) {
        LoteStock::create([
            'codigo' => $codigo, 'producto_id' => $d->id, 'almacen_id' => $almacen->id,
            'cantidad' => $cantidad, 'precio_costo' => $costo,
        ]);
    }

    return compact('almacen', 'a', 'd');
}

test('el resumen de un almacén calcula valor, precios y estado con la misma regla que el Valor Total', function () {
    ['almacen' => $almacen] = escenarioResumenAlmacen();
    Movimiento::factory()->enTransito()->create(['almacen_origen_id' => $almacen->id]);
    Movimiento::factory()->create(['almacen_destino_id' => $almacen->id, 'estado' => 'pendiente_confirmacion']);
    Movimiento::factory()->create(['almacen_origen_id' => $almacen->id, 'estado' => 'recibido_completo']);
    $this->actingAs(User::factory()->admin()->create());

    $respuesta = $this->getJson(route('logistica.almacen.resumen', $almacen))->assertOk();

    $respuesta->assertJsonPath('almacen.nombre', 'ALMACEN RESUMEN')
        ->assertJsonPath('kpis', [
            'productos' => 4, 'unidades' => 18, 'valor_costo' => 221, 'valor_venta' => 150,
            'costo_con_precio' => 100, 'margen' => 50, 'margen_porcentaje' => 33.3,
        ])
        ->assertJsonPath('precios', ['con_precio' => 1, 'sin_precio' => 3, 'unidades_sin_precio' => 13, 'costo_sin_precio' => 121])
        ->assertJsonPath('estado', [
            'stock_bajo' => ['productos' => 2, 'unidades' => 3],
            'sin_stock' => 1,
            'en_transito' => ['unidades' => 2, 'movimientos_abiertos' => 2],
        ])
        ->assertJsonPath('fusionables', ['productos_con_varios_costos' => 1, 'grupos_de_fichas_repetidas' => 1])
        ->assertJsonPath('categorias', [
            ['categoria' => 'Ferreteria', 'costo' => 112, 'unidades' => 10],
            ['categoria' => 'Bebidas', 'costo' => 109, 'unidades' => 8],
        ]);
});

test('el resumen suma por día solo las ventas completadas del almacén, con los días sin ventas en cero', function () {
    ['almacen' => $almacen, 'a' => $a] = escenarioResumenAlmacen();
    $this->travelTo('2026-09-23 12:00:00');
    $ventas = [
        ['completada', $almacen->id, '2026-09-20 10:00:00', 2, 30, 20],
        ['completada', $almacen->id, '2026-09-22 09:00:00', 1, 30, 20],
        ['cancelada', $almacen->id, '2026-09-21 09:00:00', 4, 30, 20],
        ['completada', Almacen::factory()->create()->id, '2026-09-21 11:00:00', 3, 30, 20],
    ];
    foreach ($ventas as [$estado, $almacenId, $fecha, $cantidad, $precio, $costo]) {
        $venta = Venta::factory()->{$estado}()->create(['almacen_id' => $almacenId, 'created_at' => $fecha]);
        VentaDetalle::factory()->create([
            'venta_id' => $venta->id, 'producto_id' => $a->id, 'cantidad' => $cantidad,
            'precio_venta' => $precio, 'subtotal' => $cantidad * $precio, 'costo_unitario' => $costo,
        ]);
    }
    $this->actingAs(User::factory()->admin()->create());

    $respuesta = $this->getJson(route('logistica.almacen.resumen', $almacen))->assertOk();

    $respuesta->assertJsonPath('ventas_por_dia', [
        ['fecha' => '2026-09-20', 'venta' => 60, 'costo' => 40, 'ganancia' => 20],
        ['fecha' => '2026-09-21', 'venta' => 0, 'costo' => 0, 'ganancia' => 0],
        ['fecha' => '2026-09-22', 'venta' => 30, 'costo' => 20, 'ganancia' => 10],
        ['fecha' => '2026-09-23', 'venta' => 0, 'costo' => 0, 'ganancia' => 0],
    ])->assertJsonPath('ventas_resumen', ['venta' => 90, 'ganancia' => 30, 'dias' => 4]);
});

test('un almacén sin ventas devuelve el gráfico de ventas vacío', function () {
    ['almacen' => $almacen] = escenarioResumenAlmacen();
    $this->actingAs(User::factory()->admin()->create());

    $this->getJson(route('logistica.almacen.resumen', $almacen))
        ->assertOk()
        ->assertJsonPath('ventas_por_dia', [])
        ->assertJsonPath('ventas_resumen.dias', 0);
});

test('la suma del valor a costo de todos los almacenes es igual al Valor Total del inventario', function () {
    ['almacen' => $almacen, 'a' => $a] = escenarioResumenAlmacen();
    $otro = Almacen::factory()->create();
    $a->almacenes()->attach($otro->id, ['cantidad' => 3]);
    $this->actingAs(User::factory()->admin()->create());

    $suma = collect([$almacen, $otro])->sum(fn (Almacen $unAlmacen) => $this->getJson(route('logistica.almacen.resumen', $unAlmacen))->json('kpis.valor_costo'));

    expect($suma)->toEqual(app(ValorInventarioService::class)->valorTotal());
});

test('un moderador puede ver el resumen de un almacén', function () {
    ['almacen' => $almacen] = escenarioResumenAlmacen();
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $this->getJson(route('logistica.almacen.resumen', $almacen))->assertOk();
});

test('un vendedor no puede ver el resumen de un almacén', function () {
    ['almacen' => $almacen] = escenarioResumenAlmacen();
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $this->getJson(route('logistica.almacen.resumen', $almacen))->assertForbidden();
});

test('sin sesión el resumen de un almacén pide iniciar sesión', function () {
    ['almacen' => $almacen] = escenarioResumenAlmacen();

    $this->getJson(route('logistica.almacen.resumen', $almacen))->assertUnauthorized();
});
