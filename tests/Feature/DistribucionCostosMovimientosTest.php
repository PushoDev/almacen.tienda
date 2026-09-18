<?php

use App\Models\Almacen;
use App\Models\Compra;
use App\Models\CostDistribution;
use App\Models\Cuenta;
use App\Models\LoteStock;
use App\Models\Moneda;
use App\Models\Movimiento;
use App\Models\Producto;
use App\Models\TipoMovimientoFinanciero;
use App\Models\User;

/**
 * ejecutarProrrateoAutomatico() registra un MovimientoFinanciero con tipo_movimiento_id=1
 * (hardcodeado, mismo comportamiento que ya tenía el flujo de compras) — sin seeder de
 * referencia en los tests (RefreshDatabase no la trae), hace falta la fila id=1 a mano.
 */
function asegurarTipoMovimientoFinancieroGasto(): void
{
    TipoMovimientoFinanciero::firstOrCreate(['id' => 1], ['nombre' => 'Gasto Operativo', 'efecto' => 'egreso']);
}

function crearCuentaUsdParaProrrateo(float $saldo): Cuenta
{
    return Cuenta::factory()
        ->for(Moneda::factory()->state(['codigo_moneda' => 'USD', 'estado' => true]), 'moneda')
        ->create(['saldo_cuenta' => $saldo]);
}

function crearMovimientoConDetalle(Almacen $origen, Almacen $destino, User $creador, Producto $producto, int $cantidadDespachada): Movimiento
{
    $movimiento = Movimiento::factory()->enTransito()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $creador->id,
        'requiere_prorrateo' => true,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id,
        'cantidad_solicitada' => $cantidadDespachada,
        'cantidad_despachada' => $cantidadDespachada,
    ]);

    return $movimiento;
}

/**
 * Simula lo que MovimientosController::recibir() crea desde 2026-09-18: un lote_stock en el
 * almacén destino, con el costo de origen (sin prorratear todavía). El prorrateo, cuando se
 * aplica, incrementa ESTE lote — nunca el costo global de la ficha (ver
 * distribuirLoteMovimientos()). Se crea a mano en vez de llamar recibir() para aislar la prueba
 * del prorrateo de la del flujo de recepción, que ya tiene su propia cobertura.
 */
function crearLoteStockRecibido(Movimiento $movimiento, Producto $producto, Almacen $destino, int $cantidad): LoteStock
{
    return LoteStock::create([
        'codigo' => LoteStock::generarCodigoMovimiento($movimiento->id, 1),
        'movimiento_id' => $movimiento->id,
        'producto_id' => $producto->id,
        'almacen_id' => $destino->id,
        'cantidad' => $cantidad,
        'precio_costo' => $producto->precio_compra_producto,
    ]);
}

// ==========================================================================
// DISTRIBUIR — lote de movimientos aplica la misma fórmula automática que compras
// ==========================================================================

test('admin distribuye un lote de un movimiento: aplica la fórmula, actualiza el costo y marca la decisión', function () {
    asegurarTipoMovimientoFinancieroGasto();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);
    $movimiento = crearMovimientoConDetalle($origen, $destino, $admin, $producto, cantidadDespachada: 10);
    $lote = crearLoteStockRecibido($movimiento, $producto, $destino, 10);
    $cuenta = crearCuentaUsdParaProrrateo(1000);

    $response = $this->post(route('distribucion-costos.distribuir'), [
        'movimiento_ids' => [$movimiento->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'Prorrateo de prueba',
    ]);

    $response->assertRedirect(route('distribucion-costos.index'));

    // peso=1 (único producto) → monto_asignado=50 → incremento_unitario=5 → nuevo_costo=105.
    // Va al lote del almacén destino de ESTE movimiento — el costo global de la ficha NO se
    // toca (a diferencia de Compras): un movimiento no es dueño exclusivo del producto, el
    // almacén de origen nunca incurrió este transporte.
    $this->assertEquals(105.0, (float) $lote->fresh()->precio_costo);
    $this->assertEquals(100.0, (float) $producto->fresh()->precio_compra_producto);
    $this->assertEquals(105.0, $producto->fresh()->costoEnAlmacen($destino->id));

    $this->assertDatabaseHas('movimientos', [
        'id' => $movimiento->id,
        'prorrateo_decision' => 'aplicado',
        'prorrateo_decidido_por' => $admin->id,
    ]);
    $this->assertNotNull($movimiento->fresh()->prorrateo_decidido_en);

    $distribution = CostDistribution::first();
    expect($distribution)->not->toBeNull();
    expect($distribution->purchase_id)->toBeNull();
    $this->assertDatabaseHas('cost_distribution_movimientos', [
        'cost_distribution_id' => $distribution->id,
        'movimiento_id' => $movimiento->id,
    ]);
});

test('lote de varios movimientos reparte proporcionalmente: mismo % de aumento para cada producto', function () {
    asegurarTipoMovimientoFinancieroGasto();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();

    $productoA = Producto::factory()->create(['precio_compra_producto' => 100]);
    $productoB = Producto::factory()->create(['precio_compra_producto' => 50]);

    // línea A = 100 x 10 = 1000, línea B = 50 x 20 = 1000, total lote = 2000
    $mov1 = crearMovimientoConDetalle($origen, $destino, $admin, $productoA, cantidadDespachada: 10);
    $mov2 = crearMovimientoConDetalle($origen, $destino, $admin, $productoB, cantidadDespachada: 20);
    $loteA = crearLoteStockRecibido($mov1, $productoA, $destino, 10);
    $loteB = crearLoteStockRecibido($mov2, $productoB, $destino, 20);

    $cuenta = crearCuentaUsdParaProrrateo(1000);

    $this->post(route('distribucion-costos.distribuir'), [
        'movimiento_ids' => [$mov1->id, $mov2->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 200]],
        'exchange_rate' => 400,
        'details' => 'Prorrateo lote',
    ])->assertRedirect(route('distribucion-costos.index'));

    // peso 0.5 cada uno → monto 100 cada uno → A: +10 (110, +10%) / B: +5 (55, +10%) — en los
    // lotes del destino, la ficha global de cada producto no se toca.
    $this->assertEquals(110.0, (float) $loteA->fresh()->precio_costo);
    $this->assertEquals(55.0, (float) $loteB->fresh()->precio_costo);
    $this->assertEquals(100.0, (float) $productoA->fresh()->precio_compra_producto);
    $this->assertEquals(50.0, (float) $productoB->fresh()->precio_compra_producto);

    $this->assertDatabaseHas('movimientos', ['id' => $mov1->id, 'prorrateo_decision' => 'aplicado']);
    $this->assertDatabaseHas('movimientos', ['id' => $mov2->id, 'prorrateo_decision' => 'aplicado']);
});

test('un vendedor no puede distribuir costos de un lote de movimientos (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);
    $movimiento = crearMovimientoConDetalle($origen, $destino, $vendedor, $producto, cantidadDespachada: 10);
    $cuenta = crearCuentaUsdParaProrrateo(1000);
    $vendedor->cuentas()->attach($cuenta->id);

    $this->post(route('distribucion-costos.distribuir'), [
        'movimiento_ids' => [$movimiento->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'no debería pasar',
    ])->assertForbidden();

    $this->assertEquals(100.0, (float) $producto->fresh()->precio_compra_producto);
});

test('el formulario de un lote de movimientos también es admin/moderador-only (403 para vendedor)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $movimiento = crearMovimientoConDetalle($origen, $destino, $vendedor, $producto, cantidadDespachada: 10);

    $this->get(route('distribucion-costos.formulario', ['movimientos' => [$movimiento->id]]))
        ->assertForbidden();
});

test('mezclar purchase_ids y movimiento_ids en el mismo request se rechaza por validación', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $compra = Compra::factory()->create();
    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $movimiento = crearMovimientoConDetalle($origen, $destino, $admin, $producto, cantidadDespachada: 10);
    $cuenta = crearCuentaUsdParaProrrateo(1000);

    $response = $this->post(route('distribucion-costos.distribuir'), [
        'purchase_ids' => [$compra->id],
        'movimiento_ids' => [$movimiento->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'no debería pasar',
    ]);

    $response->assertSessionHasErrors();
    $this->assertDatabaseCount('cost_distributions', 0);
});

// ==========================================================================
// SIN GATE — un movimiento ya recibido sigue siendo prorrateable; uno rechazado/cancelado no
// ==========================================================================

test('un movimiento ya recibido (recibido_completo) sigue apareciendo pendiente y es prorrateable', function () {
    asegurarTipoMovimientoFinancieroGasto();
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);

    $movimiento = Movimiento::factory()->recibidoCompleto()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $admin->id,
        'requiere_prorrateo' => true,
    ]);
    $movimiento->detalles()->create([
        'producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10, 'cantidad_recibida' => 10,
    ]);
    $lote = crearLoteStockRecibido($movimiento, $producto, $destino, 10);

    // Aparece en la cola de pendientes del index() a pesar de ya estar recibido.
    $this->get(route('distribucion-costos.index'))->assertInertia(
        fn ($page) => $page->where('movimientosPendientes.data.0.id', $movimiento->id)
    );

    // Y se puede prorratear normalmente.
    $cuenta = crearCuentaUsdParaProrrateo(1000);
    $this->post(route('distribucion-costos.distribuir'), [
        'movimiento_ids' => [$movimiento->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'Prorrateo post-recepción',
    ])->assertRedirect(route('distribucion-costos.index'));

    $this->assertEquals(105.0, (float) $lote->fresh()->precio_costo);
    $this->assertEquals(100.0, (float) $producto->fresh()->precio_compra_producto);
});

test('un movimiento rechazado no aparece como pendiente y no se puede prorratear', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);

    $movimiento = Movimiento::factory()->create([
        'almacen_origen_id' => $origen->id,
        'almacen_destino_id' => $destino->id,
        'user_id' => $admin->id,
        'estado' => 'rechazado',
        'requiere_prorrateo' => true,
    ]);
    $movimiento->detalles()->create(['producto_id' => $producto->id, 'cantidad_solicitada' => 10, 'cantidad_despachada' => 10]);

    $this->get(route('distribucion-costos.index'))->assertInertia(
        fn ($page) => $page->where('movimientosPendientes.data', [])
    );

    $cuenta = crearCuentaUsdParaProrrateo(1000);
    $this->post(route('distribucion-costos.distribuir'), [
        'movimiento_ids' => [$movimiento->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'no debería aplicar',
    ])->assertSessionHas('error');

    $this->assertEquals(100.0, (float) $producto->fresh()->precio_compra_producto);
});

// ==========================================================================
// OMITIR — housekeeping en lote, sin cálculo ni cambio de costo
// ==========================================================================

test('admin omite el prorrateo de varios movimientos en lote: solo marca la decisión, no toca costos', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 100]);
    $mov1 = crearMovimientoConDetalle($origen, $destino, $admin, $producto, cantidadDespachada: 10);
    $mov2 = crearMovimientoConDetalle($origen, $destino, $admin, $producto, cantidadDespachada: 5);

    $response = $this->post(route('distribucion-costos.movimientos.omitir'), [
        'movimiento_ids' => [$mov1->id, $mov2->id],
    ]);

    $response->assertRedirect(route('distribucion-costos.index'));

    $this->assertDatabaseHas('movimientos', ['id' => $mov1->id, 'prorrateo_decision' => 'omitido', 'prorrateo_decidido_por' => $admin->id]);
    $this->assertDatabaseHas('movimientos', ['id' => $mov2->id, 'prorrateo_decision' => 'omitido', 'prorrateo_decidido_por' => $admin->id]);
    $this->assertDatabaseCount('cost_distributions', 0);
    $this->assertEquals(100.0, (float) $producto->fresh()->precio_compra_producto);
});

test('un vendedor no puede omitir el prorrateo de un movimiento (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $origen = Almacen::factory()->almacen()->create();
    $destino = Almacen::factory()->almacen()->create();
    $producto = Producto::factory()->create();
    $movimiento = crearMovimientoConDetalle($origen, $destino, $vendedor, $producto, cantidadDespachada: 10);

    $this->post(route('distribucion-costos.movimientos.omitir'), [
        'movimiento_ids' => [$movimiento->id],
    ])->assertForbidden();

    $this->assertDatabaseHas('movimientos', ['id' => $movimiento->id, 'prorrateo_decision' => null]);
});
