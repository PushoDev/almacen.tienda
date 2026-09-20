<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\LoteStock;
use App\Models\Moneda;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
use App\Models\VentaDetalle;
use Illuminate\Support\Facades\DB;

/**
 * Crea un producto con stock en un almacén y precio/comisión en producto_vendedors.
 */
function crearProductoConPrecio(Almacen $almacen, float $costo, float $precioVenta, float $comision = 0): array
{
    $producto = Producto::factory()->create(['precio_compra_producto' => $costo]);
    $codigo = ProductoCodigo::factory()->default()->create([
        'producto_id' => $producto->id,
        'cantidad' => 100,
    ]);

    AlmacenProducto::create([
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 100,
    ]);

    DB::table('producto_vendedors')->insert([
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'precio_venta' => $precioVenta,
        'venta_ganancia' => $precioVenta - $costo,
        'comision' => $comision,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return [$producto, $codigo];
}

function crearCuentaCup(float $saldo = 10000): Cuenta
{
    $moneda = Moneda::firstOrCreate(
        ['codigo_moneda' => 'CUP'],
        ['nombre_moneda' => 'Peso Cubano', 'simbolo_moneda' => 'CUP', 'tasa_cambio' => 365, 'estado' => true, 'principal' => false]
    );

    return Cuenta::create([
        'nombre_cuenta' => 'Cuenta CUP '.uniqid(),
        'saldo_cuenta' => $saldo,
        'tipo_cuenta' => 'permanentes',
        'tipo' => 'banco',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
}

function crearCuentaUsd(float $saldo = 10000): Cuenta
{
    $moneda = Moneda::firstOrCreate(
        ['codigo_moneda' => 'USD'],
        ['nombre_moneda' => 'Dólar', 'simbolo_moneda' => '$', 'tasa_cambio' => 1, 'estado' => true, 'principal' => true]
    );

    return Cuenta::create([
        'nombre_cuenta' => 'Cuenta USD '.uniqid(),
        'saldo_cuenta' => $saldo,
        'tipo_cuenta' => 'permanentes',
        'tipo' => 'banco',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
}

function payloadBaseVenta(Almacen $almacen, Producto $producto, ProductoCodigo $codigo, float $precioVenta, int $cantidad, Moneda $monedaPrincipal): array
{
    $subtotal = $precioVenta * $cantidad;

    return [
        'almacen_id' => $almacen->id,
        'cliente_id' => null,
        'moneda_cobro_id' => null,
        'items' => [
            [
                'producto_id' => $producto->id,
                'producto_codigo_id' => $codigo->id,
                'cantidad' => $cantidad,
                'precio_venta' => $precioVenta,
                'subtotal' => $subtotal,
            ],
        ],
        'total' => $subtotal,
        'pagos' => [],
        'moneda_principal_id' => $monedaPrincipal->id,
        'tasa_cambio_principal' => 1,
    ];
}

function crearDestinatario(Venta $venta): void
{
    $venta->destinatario()->create([
        'nombre' => 'Juan',
        'apellidos' => 'Pérez',
        'telefono_contacto' => '55512345',
    ]);
}

// ==========================================================================
// STOCK — se descuenta al crear (reserva), no al aprobar
// ==========================================================================

test('el stock se descuenta inmediatamente al crear una venta pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 20, cantidad: 3, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [];
    $payload['total'] = 0;
    $payload['items'][0]['subtotal'] = 60;
    $payload['total'] = 60;
    $payload['es_venta_especial'] = false;

    // La venta no especial requiere pagos, así que agregamos uno con cuenta.
    $cuenta = crearCuentaUsd();
    $payload['pagos'] = [[
        'metodo' => 'efectivo',
        'moneda_id' => $monedaUsd->id,
        'monto' => 60,
        'tasa_cambio' => 1,
        'monto_equivalente' => 60,
        'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);

    $response->assertOk();
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 97, // 100 - 3
    ]);

    $this->assertDatabaseHas('producto_codigos', [
        'id' => $codigo->id,
        'cantidad' => 97,
    ]);

    $venta = Venta::first();
    expect($venta->estado)->toBe('pendiente');

    // El saldo de la cuenta NO debe moverse todavía (financiero solo al aprobar)
    $this->assertDatabaseHas('cuentas', [
        'id' => $cuenta->id,
        'saldo_cuenta' => 10000,
    ]);
});

// ==========================================================================
// LOTES — consumo FIFO/manual y ganancia real por lote (2026-09-20)
// ==========================================================================

test('vender con lote_id explícito consume ese lote (no el más viejo) y calcula la ganancia con su costo real', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    // El costo global de la ficha (10) queda desactualizado a propósito frente a los lotes
    // reales — así la prueba distingue "usó el lote elegido" de "usó el campo global".
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 30, comision: 2);

    $loteViejo = LoteStock::create([
        'codigo' => 'LOTE-TEST-VIEJO', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 60, 'precio_costo' => 12,
    ]);
    $loteNuevo = LoteStock::create([
        'codigo' => 'LOTE-TEST-NUEVO', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 40, 'precio_costo' => 18,
    ]);

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 30, cantidad: 5, monedaPrincipal: $monedaUsd);
    $payload['items'][0]['lote_id'] = $loteNuevo->id;
    $cuenta = crearCuentaUsd();
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 150,
        'tasa_cambio' => 1, 'monto_equivalente' => 150, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertOk();

    // Se consumió el lote elegido a mano, no el más viejo.
    expect($loteNuevo->fresh()->cantidad_disponible)->toBe(35); // 40 - 5
    expect($loteViejo->fresh()->cantidad_disponible)->toBe(60); // intacto

    $detalle = VentaDetalle::where('producto_id', $producto->id)->sole();
    expect((float) $detalle->costo_unitario)->toBe(18.0); // costo del lote elegido, no el global (10)
    expect((float) $detalle->ganancia)->toBe((30 - 18) * 5.0);

    $this->assertDatabaseHas('venta_detalle_lotes', [
        'venta_detalle_id' => $detalle->id,
        'lote_stock_id' => $loteNuevo->id,
        'cantidad' => 5,
    ]);
});

test('vender sin elegir lote consume FIFO (el más viejo primero), pudiendo cruzar dos lotes', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 30, comision: 2);

    $loteViejo = LoteStock::create([
        'codigo' => 'LOTE-TEST-VIEJO', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 3, 'precio_costo' => 12, 'created_at' => now()->subDay(),
    ]);
    $loteNuevo = LoteStock::create([
        'codigo' => 'LOTE-TEST-NUEVO', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 40, 'precio_costo' => 18,
    ]);

    // Pide 5 — el lote viejo solo tiene 3, así que cruza al nuevo por las 2 restantes.
    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 30, cantidad: 5, monedaPrincipal: $monedaUsd);
    $cuenta = crearCuentaUsd();
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 150,
        'tasa_cambio' => 1, 'monto_equivalente' => 150, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertOk();

    expect($loteViejo->fresh()->cantidad_disponible)->toBe(0); // agotado primero
    expect($loteNuevo->fresh()->cantidad_disponible)->toBe(38); // 40 - 2

    $detalle = VentaDetalle::where('producto_id', $producto->id)->sole();
    // Costo ponderado: (3×12 + 2×18) / 5 = 14.40.
    expect((float) $detalle->costo_unitario)->toBe(14.4);

    expect(DB::table('venta_detalle_lotes')->where('venta_detalle_id', $detalle->id)->count())->toBe(2);
});

test('anular una venta con lote_id explícito revierte el consumo de ese lote', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 30, comision: 2);

    $lote = LoteStock::create([
        'codigo' => 'LOTE-TEST-ANULAR', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id,
        'cantidad' => 40, 'precio_costo' => 18,
    ]);

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 30, cantidad: 5, monedaPrincipal: $monedaUsd);
    $payload['items'][0]['lote_id'] = $lote->id;
    $cuenta = crearCuentaUsd();
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 150,
        'tasa_cambio' => 1, 'monto_equivalente' => 150, 'cuenta_id' => $cuenta->id,
    ]];

    $this->postJson(route('ventas.procesar'), $payload)->assertOk();
    expect($lote->fresh()->cantidad_disponible)->toBe(35);

    $venta = Venta::where('almacen_id', $almacen->id)->sole();
    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_precio']);
    $response->assertJson(['success' => true]);

    expect($lote->fresh()->cantidad_disponible)->toBe(40); // vuelve completo
});

test('rechaza la venta si no hay stock suficiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);
    $cuenta = crearCuentaUsd();

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 20, cantidad: 500, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 10000,
        'tasa_cambio' => 1, 'monto_equivalente' => 10000, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);

    // El controlador captura la excepción de negocio y responde 500 con success:false
    // (no es un error de framework — es el diseño actual de procesarVenta).
    $response->assertStatus(500);
    $response->assertJson(['success' => false]);
    expect($response->json('message'))->toContain('Stock insuficiente');

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 100, // sin cambios
    ]);
});

// ==========================================================================
// COMISIÓN VENDEDOR — fórmula precio >= base vs precio < base
// ==========================================================================

test('comisión unitaria = comisión base + markup cuando el precio de venta supera el precio base', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    // precio_base = 20, comision_base = 2 → vendiendo a 25 (5 de markup) => comision = 2 + 5 = 7
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    $cuenta = crearCuentaUsd();
    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 25, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 25,
        'tasa_cambio' => 1, 'monto_equivalente' => 25, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('venta_detalles', [
        'producto_id' => $producto->id,
        'comision_unitaria' => 7,
    ]);
    $this->assertDatabaseHas('ventas', [
        'id' => Venta::first()->id,
        'total_comision' => 7,
    ]);
});

test('el descuento por debajo del precio base absorbe la comisión del vendedor', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    // precio_base = 20, comision_base = 5. Precio mínimo permitido = 20 - 5 = 15.
    // Vendiendo a 17 (descuento de 3 sobre la base) => comision = max(0, 5 - 3) = 2
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 5);

    $cuenta = crearCuentaUsd();
    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 17, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 17,
        'tasa_cambio' => 1, 'monto_equivalente' => 17, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('venta_detalles', [
        'producto_id' => $producto->id,
        'comision_unitaria' => 2,
    ]);
});

test('no permite vender por debajo del precio mínimo (base - comisión) sin venta especial', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    // precio_base = 20, comision = 5 → mínimo permitido = 15. Intentamos vender a 14.
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 5);
    $cuenta = crearCuentaUsd();

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 14, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 14,
        'tasa_cambio' => 1, 'monto_equivalente' => 14, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);

    $response->assertJson(['success' => false]);
    expect($response->json('message'))->toContain('por debajo del mínimo permitido');

    $this->assertDatabaseCount('ventas', 0);
    // El stock reservado debe revertirse por el rollback de la transacción
    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $producto->id, 'cantidad' => 100]);
});

// ==========================================================================
// VENTA CON GESTOR — XOR con comisión vendedor
// ==========================================================================

test('una venta con gestor no genera comisión de vendedor (comisión unitaria = 0)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 5);

    $cuenta = crearCuentaUsd();
    $cuentaGestor = crearCuentaUsd(saldo: 500);

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 25, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 25,
        'tasa_cambio' => 1, 'monto_equivalente' => 25, 'cuenta_id' => $cuenta->id,
    ]];
    $payload['es_venta_gestor'] = true;
    $payload['gestor_monto'] = 25;
    $payload['gestor_cuenta_id'] = $cuentaGestor->id;
    $payload['tasa_aplicada_gestor'] = 1;

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('venta_detalles', [
        'producto_id' => $producto->id,
        'comision_unitaria' => 0,
    ]);
    $this->assertDatabaseHas('ventas', [
        'id' => Venta::first()->id,
        'total_comision' => 0,
        'es_venta_gestor' => true,
    ]);
});

test('aprobarVenta con gestor descuenta SOLO la cuenta del gestor, nunca la de comisión vendedor (XOR — bug B2)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 5);

    $cuentaPago = crearCuentaCup(saldo: 100000);
    $cuentaGestor = crearCuentaCup(saldo: 5000);
    $cuentaComision = crearCuentaCup(saldo: 5000);

    // Forzamos manualmente el estado tras la creación para simular una venta con
    // gestor Y con comision_cuenta_id seteado (caso límite que el bug B2 no filtraba).
    $venta = Venta::factory()->create([
        'user_id' => $admin->id,
        'almacen_id' => $almacen->id,
        'estado' => 'pendiente',
        'moneda_id' => $monedaCup->id,
        'total' => 100,
        'es_venta_gestor' => true,
        'gestor_cuenta_id' => $cuentaGestor->id,
        'gestor_monto' => 1000,
        'tasa_aplicada_gestor' => 365,
        // Campos de comisión vendedor también configurados (no deberían tocarse)
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_tasa' => 365,
        'total_comision' => 10, // si el guard XOR fallara, esto se descontaría también
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', [
        'id' => $cuentaGestor->id,
        'saldo_cuenta' => 5000 - 1000,
    ]);

    // La cuenta de comisión NO debe haberse tocado — es la regresión del bug B2
    $this->assertDatabaseHas('cuentas', [
        'id' => $cuentaComision->id,
        'saldo_cuenta' => 5000,
    ]);

    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'gestor_saldo_anterior' => 5000,
        'gestor_saldo_posterior' => 4000,
        'comision_saldo_anterior' => null,
        'comision_saldo_posterior' => null,
    ]);
});

test('aprobarVenta sin gestor descuenta la comisión del vendedor de su cuenta CUP', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    $cuentaComision = crearCuentaCup(saldo: 5000);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id,
        'almacen_id' => $almacen->id,
        'estado' => 'pendiente',
        'moneda_id' => $monedaCup->id,
        'total' => 100,
        'es_venta_gestor' => false,
        'total_comision' => 10,
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_tasa' => 365,
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', [
        'id' => $cuentaComision->id,
        'saldo_cuenta' => 5000 - (10 * 365), // 5000 - 3650
    ]);

    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'comision_saldo_anterior' => 5000,
        'comision_saldo_posterior' => 5000 - (10 * 365),
    ]);
});

test('aprobarVenta descuenta la comisión aunque la cuenta no tenga saldo suficiente, dejándola en deuda', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    $cuentaComision = crearCuentaCup(saldo: 100);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id,
        'almacen_id' => $almacen->id,
        'estado' => 'pendiente',
        'moneda_id' => $monedaCup->id,
        'total' => 100,
        'es_venta_gestor' => false,
        'total_comision' => 10,
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_tasa' => 365,
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', [
        'id' => $cuentaComision->id,
        'saldo_cuenta' => 100 - (10 * 365), // -3550, queda en deuda
    ]);

    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'comision_saldo_anterior' => 100,
        'comision_saldo_posterior' => 100 - (10 * 365),
    ]);
});

test('aprobarVenta descuenta al gestor aunque su cuenta no tenga saldo suficiente, dejándola en deuda', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    $cuentaGestor = crearCuentaCup(saldo: 100);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id,
        'almacen_id' => $almacen->id,
        'estado' => 'pendiente',
        'moneda_id' => $monedaCup->id,
        'total' => 100,
        'es_venta_gestor' => true,
        'gestor_cuenta_id' => $cuentaGestor->id,
        'gestor_monto' => 1000,
        'tasa_aplicada_gestor' => 365,
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', [
        'id' => $cuentaGestor->id,
        'saldo_cuenta' => 100 - 1000, // -900, queda en deuda
    ]);

    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'gestor_saldo_anterior' => 100,
        'gestor_saldo_posterior' => 100 - 1000,
    ]);
});

test('aprobarVenta guarda ganancia_neta = total_ganancia - total_comision + ganancia_perdida_cambiaria', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    $cuentaComision = crearCuentaCup(saldo: 5000);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id,
        'almacen_id' => $almacen->id,
        'estado' => 'pendiente',
        'moneda_id' => $monedaCup->id,
        'total' => 100,
        'es_venta_gestor' => false,
        'total_ganancia' => 50,
        'total_comision' => 10,
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_tasa' => 365,
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));
    $response->assertJson(['success' => true]);

    // Sin pagos en CUP registrados, ganancia_perdida_cambiaria queda en 0 — ganancia_neta = 50 - 10 + 0.
    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'ganancia_neta' => 40,
    ]);
});

// ==========================================================================
// APROBAR VENTA — saldos, deuda cliente, validaciones
// ==========================================================================

test('aprobarVenta acredita el saldo de la cuenta cuando el pago coincide en moneda', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = crearCuentaUsd(saldo: 100);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'estado' => 'pendiente',
        'moneda_id' => $monedaUsd->id, 'total' => 50,
    ]);
    crearDestinatario($venta);
    $pago = $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'cuenta_id' => $cuenta->id, 'monto' => 50,
        'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 50,
    ]);

    $this->postJson(route('ventas.aprobar', $venta))->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 150]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'completada']);
    $this->assertDatabaseHas('pago_ventas', [
        'id' => $pago->id,
        'saldo_anterior' => 100,
        'saldo_posterior' => 150,
    ]);
});

test('aprobarVenta acumula deuda de cliente cuando el pago tiene cliente_id en vez de cuenta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cliente = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 20]);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'estado' => 'pendiente',
        'moneda_id' => $monedaUsd->id, 'total' => 50,
    ]);
    crearDestinatario($venta);
    $pago = $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'cliente_id' => $cliente->id, 'monto' => 50,
        'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 50,
    ]);

    $this->postJson(route('ventas.aprobar', $venta))->assertJson(['success' => true]);

    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 70]);
    $this->assertDatabaseHas('pago_ventas', [
        'id' => $pago->id,
        'saldo_anterior' => 20,
        'saldo_posterior' => 70,
    ]);
});

test('no se puede aprobar una venta sin destinatario', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->create(['user_id' => $admin->id, 'estado' => 'pendiente']);

    $response = $this->postJson(route('ventas.aprobar', $venta));

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'pendiente']);
});

test('no se puede aprobar una venta que ya no está pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->completada()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.aprobar', $venta));

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('no se puede aprobar una venta con mensajero sin cuenta destino asignada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'estado' => 'pendiente',
        'mensajero_monto' => 100, 'mensajero_cuenta_id' => null,
    ]);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));

    $response->assertStatus(400);
    expect($response->json('message'))->toContain('mensajero');
});

// ==========================================================================
// MENSAJERO — pass-through, no afecta comisión ni ganancia cambiaria
// ==========================================================================

test('aprobarVenta con mensajero externo descuenta el monto final CUP de la cuenta mensajero', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuentaMensajero = crearCuentaCup(saldo: 10000);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'estado' => 'pendiente',
        'moneda_id' => $monedaUsd->id, 'total' => 50,
        'mensajero_monto' => 5, 'mensajero_tipo' => 'externo',
        'mensajero_cuenta_id' => $cuentaMensajero->id,
        'mensajero_monto_final_cup' => 1800,
        'mensajero_monto_original' => 1800,
    ]);
    crearDestinatario($venta);

    $this->postJson(route('ventas.aprobar', $venta))->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', ['id' => $cuentaMensajero->id, 'saldo_cuenta' => 10000 - 1800]);
    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'mensajero_saldo_anterior' => 10000,
        'mensajero_saldo_posterior' => 10000 - 1800,
    ]);
});

test('el mensajero no se incluye en el cálculo de ganancia cambiaria (pass-through)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 100]);
    $cuentaPago = crearCuentaCup(saldo: 100000);
    $cuentaMensajero = crearCuentaCup(saldo: 10000);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    // Producto vale 20 USD, se cobra a tasa oficial (100) = 2000 CUP de producto.
    // Mensajero: 5 USD → 500 CUP, pagado aparte, no debe alterar la ganancia cambiaria.
    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 20, cantidad: 1, monedaPrincipal: $monedaCup);
    $payload['moneda_cobro_id'] = $monedaCup->id;
    $payload['tasa_aplicada_venta'] = 100;
    $payload['mensajero_monto'] = 5;
    $payload['mensajero_tipo'] = 'externo';
    $payload['mensajero_cuenta_id'] = $cuentaMensajero->id;
    $payload['mensajero_tasa'] = 100; // 5 USD * 100 = 500 CUP
    $payload['total'] = 2500; // 2000 productos + 500 mensajero
    $payload['items'][0]['subtotal'] = 2000;
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaCup->id, 'monto' => 2500,
        'tasa_cambio' => 100, 'monto_equivalente' => 25, 'cuenta_id' => $cuentaPago->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertJson(['success' => true]);

    // monto_diferencia_cambiaria = (pagado CUP - mensajero CUP) - (usd_objetivo * tasa_oficial)
    // = (2500 - 500) - (20 * 100) = 2000 - 2000 = 0 → sin diferencia
    $this->assertDatabaseHas('ventas', [
        'id' => Venta::first()->id,
        'monto_diferencia_cambiaria' => 0,
    ]);
});

test('mensajero_tipo "propio" es rechazado — no está implementado, nunca mueve dinero al aprobar/anular', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 20, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['mensajero_monto'] = 5;
    $payload['mensajero_tipo'] = 'propio';

    $response = $this->postJson(route('ventas.procesar'), $payload);

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('mensajero_tipo');
    $this->assertDatabaseCount('ventas', 0);
});

// ==========================================================================
// ANULAR VENTA — revierte stock y saldos según el estado
// ==========================================================================

test('anularVenta pendiente revierte el stock sin tocar ningún saldo', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    AlmacenProducto::where('producto_id', $producto->id)->update(['cantidad' => 97]);
    $codigo->update(['cantidad' => 97]);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'estado' => 'pendiente',
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 3, 'precio_venta' => 20, 'subtotal' => 60,
        'costo_unitario' => 10, 'ganancia' => 30, 'comision_unitaria' => 0,
    ]);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_precio']);
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $producto->id, 'cantidad' => 100]);
    $this->assertDatabaseHas('producto_codigos', ['id' => $codigo->id, 'cantidad' => 100]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'cancelada']);
});

test('anularVenta completada revierte stock, saldo de cuenta y comisión (inverso de aprobar)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true, 'tasa_cambio' => 365]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);
    AlmacenProducto::where('producto_id', $producto->id)->update(['cantidad' => 97]);
    $codigo->update(['cantidad' => 97]);

    $cuentaPago = crearCuentaCup(saldo: 50000);
    $cuentaComision = crearCuentaCup(saldo: 5000);

    $venta = Venta::factory()->completada()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id,
        'moneda_id' => $monedaCup->id, 'total' => 7300,
        'total_comision' => 2, 'comision_cuenta_id' => $cuentaComision->id, 'comision_tasa' => 365,
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 3, 'precio_venta' => 20, 'subtotal' => 60,
        'costo_unitario' => 10, 'ganancia' => 30, 'comision_unitaria' => 0.67,
    ]);
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaCup->id,
        'cuenta_id' => $cuentaPago->id, 'monto' => 7300,
        'tasa_cambio_aplicada' => 365, 'monto_equivalente' => 20,
    ]);

    // Simulamos el estado post-aprobación: saldo ya incrementado y comisión ya descontada
    $cuentaPago->increment('saldo_cuenta', 7300);
    $cuentaComision->decrement('saldo_cuenta', 2 * 365);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'solicitud_cliente']);
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $producto->id, 'cantidad' => 100]);
    $this->assertDatabaseHas('cuentas', ['id' => $cuentaPago->id, 'saldo_cuenta' => 50000]);
    $this->assertDatabaseHas('cuentas', ['id' => $cuentaComision->id, 'saldo_cuenta' => 5000]);
    // Una venta COMPLETADA que se revierte queda como "devuelta", no "cancelada" —
    // esa palabra queda reservada para anular una venta que nunca movió dinero
    // (pendiente). Ver test siguiente.
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'devuelta']);
});

test('no se puede anular una venta ya anulada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->cancelada()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'otros', 'detalle_anulacion' => 'x']);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

test('no se puede procesar la devolución de una venta ya devuelta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->devuelta()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'otros', 'detalle_anulacion' => 'x']);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
});

// ==========================================================================
// PROTECCIÓN DE RUTAS — aprobar/anular/editar-pendiente: admin/moderador
// gestionan cualquier venta, un vendedor solo las suyas (mismo criterio que
// listadoVentas()).
// ==========================================================================

test('un vendedor no puede aprobar la venta de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente']);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'pendiente']);
});

test('un vendedor puede aprobar su propia venta', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $venta = Venta::factory()->create(['user_id' => $vendedor->id, 'estado' => 'pendiente']);
    crearDestinatario($venta);

    $response = $this->postJson(route('ventas.aprobar', $venta));

    $response->assertJson(['success' => true]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'completada']);
});

test('un vendedor no puede anular la venta de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente']);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_precio']);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'pendiente']);
});

test('un moderador puede anular la venta de cualquier vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente']);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'error_precio']);

    $response->assertJson(['success' => true]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'cancelada']);
});

test('un vendedor no puede editar la venta pendiente de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente']);

    $response = $this->postJson(route('ventas.editar.pendiente', $venta), ['pagos' => []]);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
});

test('un vendedor no puede guardar el destinatario de la venta pendiente de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente']);

    $response = $this->postJson(route('ventas.destinatario.store', $venta), [
        'nombre' => 'Juan', 'apellidos' => 'Pérez', 'telefono_contacto' => '55555555',
    ]);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseMissing('destinatarios_venta', ['venta_id' => $venta->id]);
});

test('un vendedor no puede marcar como notificada la decisión de la venta especial de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'decision_notificada' => false]);

    $response = $this->postJson(route('ventas.decision.notificada', $venta));

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'decision_notificada' => false]);
});

test('un vendedor no puede ver el detalle de la venta de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id]);

    $response = $this->get(route('ventas.show', $venta->id));

    $response->assertStatus(403);
});

test('un vendedor puede ver el detalle de su propia venta', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $venta = Venta::factory()->create(['user_id' => $vendedor->id]);

    $response = $this->get(route('ventas.show', $venta->id));

    $response->assertOk();
});

test('un moderador puede ver el detalle de la venta de cualquier vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $venta = Venta::factory()->create(['user_id' => $dueño->id]);

    $response = $this->get(route('ventas.show', $venta->id));

    $response->assertOk();
});

// ==========================================================================
// GUARDAR DISTRIBUCIÓN — bug B1 (saldo_disponible desde saldo_cuenta)
// ==========================================================================

test('guardarDistribucion devuelve saldo_disponible tomado de saldo_cuenta (regresión bug B1)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $cuentaComision = crearCuentaCup(saldo: 1234.56);

    $venta = Venta::factory()->create([
        'user_id' => $admin->id, 'estado' => 'pendiente', 'total' => 100,
    ]);

    $response = $this->postJson(route('ventas.distribucion.store', $venta), [
        'comision_cuenta_id' => $cuentaComision->id,
        'comision_tasa' => 365,
    ]);

    $response->assertJson(['success' => true]);
    expect($response->json('comision_pago.cuenta.saldo_disponible'))->toBe(1234.56);
});

test('guardarDistribucion solo permite modificar ventas pendientes', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->completada()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.distribucion.store', $venta), [
        'comision_tasa' => 365,
    ]);

    $response->assertStatus(422);
});

test('un vendedor no puede guardar la distribución de la venta pendiente de otro vendedor', function () {
    $dueño = User::factory()->vendedor()->create();
    crearTurnoActivo($dueño);
    $otroVendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($otroVendedor);
    $this->actingAs($otroVendedor);

    $venta = Venta::factory()->create(['user_id' => $dueño->id, 'estado' => 'pendiente', 'total' => 100]);

    $response = $this->postJson(route('ventas.distribucion.store', $venta), [
        'comision_tasa' => 365,
    ]);

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
});

// ==========================================================================
// VENTA ESPECIAL — flujo de solicitud/aprobación
// ==========================================================================

test('una venta especial permite precio por debajo del costo y no genera comisión', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 5);

    $cuenta = crearCuentaUsd();
    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 5, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['es_venta_especial'] = true;
    $payload['nota_venta_especial'] = 'Cliente frecuente, autorizado por gerencia';
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 5,
        'tasa_cambio' => 1, 'monto_equivalente' => 5, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);
    $response->assertJson(['success' => true]);

    $venta = Venta::first();
    expect($venta->estado)->toBe('solicitud_especial');

    $this->assertDatabaseHas('venta_detalles', [
        'producto_id' => $producto->id,
        'comision_unitaria' => 0,
    ]);
});

test('rechazarSolicitudEspecial revierte el stock reservado', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);
    AlmacenProducto::where('producto_id', $producto->id)->update(['cantidad' => 95]);
    $codigo->update(['cantidad' => 95]);

    $venta = Venta::factory()->especial()->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id,
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 5, 'precio_venta' => 5, 'subtotal' => 25,
        'costo_unitario' => 10, 'ganancia' => -25, 'comision_unitaria' => 0,
    ]);

    $response = $this->postJson(route('ventas.especial.rechazar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('almacen_producto', ['producto_id' => $producto->id, 'cantidad' => 100]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'rechazada']);
});

test('aprobarSolicitudEspecial pasa la venta de solicitud_especial a pendiente', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->especial()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.especial.aprobar', $venta));
    $response->assertJson(['success' => true]);

    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'pendiente']);
});

test('el vendedor dueño de la venta NO puede aprobar su propia solicitud especial — solo admin/moderador', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $venta = Venta::factory()->especial()->create(['user_id' => $vendedor->id]);

    $response = $this->postJson(route('ventas.especial.aprobar', $venta));

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'solicitud_especial']);
});

test('el vendedor dueño de la venta NO puede rechazar su propia solicitud especial — solo admin/moderador', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $venta = Venta::factory()->especial()->create(['user_id' => $vendedor->id]);

    $response = $this->postJson(route('ventas.especial.rechazar', $venta));

    $response->assertStatus(403);
    $response->assertJson(['success' => false]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'solicitud_especial']);
});

test('un moderador puede aprobar la solicitud especial de cualquier vendedor', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $venta = Venta::factory()->especial()->create(['user_id' => $vendedor->id]);

    $response = $this->postJson(route('ventas.especial.aprobar', $venta));

    $response->assertJson(['success' => true]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'pendiente']);
});

// ==========================================================================
// ACCESO POR ROL — vendedor limitado a sus almacenes
// ==========================================================================

test('un vendedor no puede crear una venta en un almacén que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create(); // no asignado al vendedor
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);
    $cuenta = crearCuentaUsd();

    $payload = payloadBaseVenta($almacen, $producto, $codigo, precioVenta: 20, cantidad: 1, monedaPrincipal: $monedaUsd);
    $payload['pagos'] = [[
        'metodo' => 'efectivo', 'moneda_id' => $monedaUsd->id, 'monto' => 20,
        'tasa_cambio' => 1, 'monto_equivalente' => 20, 'cuenta_id' => $cuenta->id,
    ]];

    $response = $this->postJson(route('ventas.procesar'), $payload);

    $response->assertJson(['success' => false]);
    expect($response->json('message'))->toContain('acceso a este almacén');
    $this->assertDatabaseCount('ventas', 0);
});

// ==========================================================================
// BUSCAR DESTINATARIOS — autocompletado, deduplicado por carnet
// ==========================================================================

test('buscarDestinatarios devuelve solo el registro más reciente cuando el mismo carnet se repite en varias ventas', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $ventaVieja = Venta::factory()->create(['user_id' => $admin->id]);
    $ventaVieja->destinatario()->create([
        'nombre' => 'Juan', 'apellidos' => 'Pérez', 'carnet_identidad' => '90010112345',
        'direccion_residencia' => 'Dirección vieja', 'telefono_contacto' => '55511111',
    ]);

    // Se crea después → mayor id → es la "más reciente", sin depender de la precisión
    // de updated_at (en SQLite dos inserts en el mismo segundo pueden empatar).
    $ventaNueva = Venta::factory()->create(['user_id' => $admin->id]);
    $ventaNueva->destinatario()->create([
        'nombre' => 'Juan', 'apellidos' => 'Pérez', 'carnet_identidad' => '90010112345',
        'direccion_residencia' => 'Dirección nueva', 'telefono_contacto' => '55522222',
    ]);

    $response = $this->getJson(route('ventas.destinatarios.buscar', ['q' => 'Juan']));

    $response->assertOk();
    $data = $response->json();
    expect($data)->toHaveCount(1);
    expect($data[0]['direccion_residencia'])->toBe('Dirección nueva');
});

test('buscarDestinatarios no mezcla personas distintas que comparten el mismo nombre', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta1 = Venta::factory()->create(['user_id' => $admin->id]);
    $venta1->destinatario()->create(['nombre' => 'Ana', 'apellidos' => 'Gómez', 'carnet_identidad' => '85010112345']);

    $venta2 = Venta::factory()->create(['user_id' => $admin->id]);
    $venta2->destinatario()->create(['nombre' => 'Ana', 'apellidos' => 'Gómez', 'carnet_identidad' => '92010154321']);

    $response = $this->getJson(route('ventas.destinatarios.buscar', ['q' => 'Ana']));

    $response->assertOk();
    expect($response->json())->toHaveCount(2);
});

test('buscarDestinatarios no busca con menos de 2 caracteres', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $response = $this->getJson(route('ventas.destinatarios.buscar', ['q' => 'A']));

    $response->assertOk();
    expect($response->json())->toBe([]);
});

// ==========================================================================
// IMPRIMIR — página de impresión (Ticket + Factura)
// ==========================================================================

test('guests are redirected to the login page al intentar imprimir una venta', function () {
    $venta = Venta::factory()->create();

    $this->get(route('ventas.imprimir', $venta))->assertRedirect('/login');
});

test('imprimir renderiza el ticket con la moneda principal cuando no hay parámetros de conversión', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    $venta = Venta::factory()->conMoneda($monedaUsd)->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'total' => 40,
    ]);
    crearDestinatario($venta);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 2, 'precio_venta' => 20, 'subtotal' => 40,
        'costo_unitario' => 10, 'ganancia' => 20, 'comision_unitaria' => 2,
    ]);
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'monto' => 40, 'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 40,
    ]);

    $response = $this->get(route('ventas.imprimir', $venta));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Vendor/Imprimir')
        ->where('venta.id', $venta->id)
        // Inertia serializa estos floats "redondos" (40.0) como enteros JSON (40),
        // así que el valor decodificado es int, no float — comparar contra int.
        ->where('venta.total', 40)
        ->where('venta.total_pagado', 40)
        ->where('venta.restante', 0)
        ->where('venta.moneda_principal.codigo', 'USD')
        ->where('venta.destinatario.nombre', 'Juan')
        ->where('venta.items.0.cantidad', 2)
        ->where('venta.items.0.subtotal', 40)
    );
});

test('imprimir manda atendido_por desde el turno asociado a la venta', function () {
    $vendedor = User::factory()->vendedor()->create(['name' => 'Cuenta POS Sucursal 1']);
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $vendedor->almacenes()->attach($almacen->id);
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $venta = Venta::factory()->conMoneda($monedaUsd)->create([
        'user_id' => $vendedor->id,
        'turno_vendedor_id' => $vendedor->turnoActivo()->id,
        'almacen_id' => $almacen->id,
        'total' => 0,
    ]);

    $response = $this->get(route('ventas.imprimir', $venta));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('venta.usuario.nombre', 'Cuenta POS Sucursal 1')
        ->where('venta.atendido_por', $vendedor->turnoActivo()->nombre_vendedor)
    );
});

test('imprimir cae al nombre de la cuenta como atendido_por cuando la venta no tiene turno asociado (admin)', function () {
    $admin = User::factory()->admin()->create(['name' => 'Luis Alberto']);
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $venta = Venta::factory()->conMoneda($monedaUsd)->create([
        'user_id' => $admin->id, 'turno_vendedor_id' => null, 'almacen_id' => $almacen->id, 'total' => 0,
    ]);

    $response = $this->get(route('ventas.imprimir', $venta));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('venta.atendido_por', 'Luis Alberto'));
});

test('imprimir no incluye datos de destinatario cuando la venta no tiene uno', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $venta = Venta::factory()->conMoneda($monedaUsd)->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'total' => 0,
    ]);

    $response = $this->get(route('ventas.imprimir', $venta));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('venta.destinatario', null));
});

test('imprimir aplica la tasa y moneda pasadas por query string a los totales e items', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->puntoVenta()->create();
    // nombre_moneda explícito en ambas — evita la colisión conocida de unicidad
    // cuando Faker genera el mismo nombre al azar para dos monedas en el mismo test.
    $monedaUsd = Moneda::factory()->create(['codigo_moneda' => 'USD', 'nombre_moneda' => 'Dólar Test', 'estado' => true]);
    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'nombre_moneda' => 'Peso Test', 'estado' => true, 'tasa_cambio' => 100]);
    [$producto, $codigo] = crearProductoConPrecio($almacen, costo: 10, precioVenta: 20, comision: 2);

    $venta = Venta::factory()->conMoneda($monedaUsd)->create([
        'user_id' => $admin->id, 'almacen_id' => $almacen->id, 'total' => 40,
    ]);
    $venta->detalles()->create([
        'producto_id' => $producto->id, 'producto_codigo_id' => $codigo->id,
        'cantidad' => 2, 'precio_venta' => 20, 'subtotal' => 40,
        'costo_unitario' => 10, 'ganancia' => 20, 'comision_unitaria' => 2,
    ]);
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'monto' => 40, 'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 40,
    ]);

    $response = $this->get(route('ventas.imprimir', [
        'venta' => $venta->id, 'moneda_id' => $monedaCup->id, 'tasa' => 100,
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('venta.total', 4000)
        ->where('venta.total_pagado', 4000)
        ->where('venta.restante', 0)
        ->where('venta.moneda_principal.codigo', 'CUP')
        ->where('venta.items.0.subtotal', 4000)
    );
});

// ==========================================================================
// TASA DE CAMBIO DEL REPORTE — corrección manual, no gatea por estado
// ==========================================================================

test('actualizarTasaReporte guarda la tasa y la moneda de cobro en la venta', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true]);
    $venta = Venta::factory()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.tasaReporte.store', $venta), [
        'moneda_cobro_id' => $monedaCup->id,
        'tasa' => 350,
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'tasa_aplicada_venta' => 350.0,
        'moneda_cobro' => ['codigo' => 'CUP'],
    ]);

    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'moneda_cobro_id' => $monedaCup->id,
        'tasa_aplicada_venta' => 350,
    ]);
});

test('actualizarTasaReporte rechaza el payload vacío — moneda_cobro_id y tasa son requeridos', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.tasaReporte.store', $venta), []);

    $response->assertJsonValidationErrors(['moneda_cobro_id', 'tasa']);
});

test('actualizarTasaReporte rechaza una tasa igual a 0', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true]);
    $venta = Venta::factory()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.tasaReporte.store', $venta), [
        'moneda_cobro_id' => $monedaCup->id,
        'tasa' => 0,
    ]);

    $response->assertJsonValidationErrors('tasa');
});

test('actualizarTasaReporte rechaza un moneda_cobro_id que no existe', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.tasaReporte.store', $venta), [
        'moneda_cobro_id' => 999999,
        'tasa' => 100,
    ]);

    $response->assertJsonValidationErrors('moneda_cobro_id');
});

test('actualizarTasaReporte funciona en una venta ya completada porque solo afecta el reporte, no mueve dinero', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $monedaCup = Moneda::factory()->create(['codigo_moneda' => 'CUP', 'estado' => true]);
    $venta = Venta::factory()->completada()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.tasaReporte.store', $venta), [
        'moneda_cobro_id' => $monedaCup->id,
        'tasa' => 120,
    ]);

    $response->assertJson(['success' => true]);
    $this->assertDatabaseHas('ventas', [
        'id' => $venta->id,
        'estado' => 'completada',
        'tasa_aplicada_venta' => 120,
    ]);
});

// ==========================================================================
// LISTADO DE VENTAS — Ganancia Agencia oculta a vendedor, Comisión Punto de
// Venta visible a cualquiera (es su propio dato).
// ==========================================================================

test('un vendedor no recibe la ganancia de la agencia en el listado, pero sí su propia comisión', function () {
    $vendedor = User::factory()->vendedor()->create();
    crearTurnoActivo($vendedor);
    $this->actingAs($vendedor);

    Venta::factory()->completada()->create([
        'user_id' => $vendedor->id,
        'total_ganancia' => 100,
        'total_comision' => 15,
        'ganancia_real_total' => 85,
        'ganancia_perdida_cambiaria' => 0,
    ]);

    $response = $this->get(route('ventas.listado'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('ventas.data.0.total_comision', 15)
        ->where('ventas.data.0.total_ganancia', null)
        ->where('ventas.data.0.ganancia_real_total', null)
        ->where('ventas.data.0.ganancia_perdida_cambiaria', null)
    );
});

test('un admin sí recibe la ganancia de la agencia en el listado', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    Venta::factory()->completada()->create([
        'user_id' => $admin->id,
        'total_ganancia' => 100,
        'total_comision' => 15,
        'ganancia_real_total' => 85,
        'ganancia_perdida_cambiaria' => 0,
    ]);

    $response = $this->get(route('ventas.listado'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->where('ventas.data.0.total_comision', 15)
        ->where('ventas.data.0.total_ganancia', '100.00')
        ->where('ventas.data.0.ganancia_real_total', '85.00')
    );
});

// ─── RBAC: endpoints de datos del POS (sin cobertura hasta ahora) ──────────

test('getAlmacenes() devuelve todos los almacenes a un admin, incluso uno sin asignar', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    Almacen::factory()->count(2)->create();

    $response = $this->getJson(route('ventas.getAlmacenes'));

    $response->assertOk();
    expect($response->json())->toHaveCount(2);
});

test('getAlmacenes() solo devuelve al vendedor los almacenes que tiene asignados', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $asignado = Almacen::factory()->create(['nombre_almacen' => 'Asignado']);
    Almacen::factory()->create(['nombre_almacen' => 'No Asignado']);
    $vendedor->almacenes()->attach($asignado->id);

    $response = $this->getJson(route('ventas.getAlmacenes'));

    $response->assertOk();
    $nombres = collect($response->json())->pluck('nombre_almacen');
    expect($nombres->all())->toBe(['Asignado']);
});

test('getCuentas() devuelve todas las cuentas a un admin', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    crearCuentaCup();
    crearCuentaCup();

    $response = $this->getJson(route('ventas.getCuentas'));

    $response->assertOk();
    expect($response->json())->toHaveCount(2);
});

test('getCuentas() solo devuelve al vendedor las cuentas que tiene asignadas', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $cuentaAsignada = crearCuentaCup();
    crearCuentaCup();
    $vendedor->cuentas()->attach($cuentaAsignada->id);

    $response = $this->getJson(route('ventas.getCuentas'));

    $response->assertOk();
    $ids = collect($response->json())->pluck('id');
    expect($ids->all())->toBe([$cuentaAsignada->id]);
});

test('getCuentasFiltradas() solo devuelve al vendedor sus propias cuentas, aunque otra coincida en moneda', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $monedaCup = Moneda::firstOrCreate(
        ['codigo_moneda' => 'CUP'],
        ['nombre_moneda' => 'Peso Cubano', 'simbolo_moneda' => 'CUP', 'tasa_cambio' => 365, 'estado' => true, 'principal' => false]
    );
    $cuentaAsignada = crearCuentaCup();
    $cuentaAjena = crearCuentaCup();
    $vendedor->cuentas()->attach($cuentaAsignada->id);

    $response = $this->getJson(route('ventas.getCuentasFiltradas', ['moneda_id' => $monedaCup->id]));

    $response->assertOk();
    $ids = collect($response->json())->pluck('id');
    expect($ids->all())->toBe([$cuentaAsignada->id]);
    expect($ids)->not->toContain($cuentaAjena->id);
});

test('getCuentasParaGestor() solo devuelve al vendedor sus propias cuentas', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $cuentaAsignada = crearCuentaCup();
    crearCuentaCup();
    $vendedor->cuentas()->attach($cuentaAsignada->id);

    $response = $this->getJson(route('ventas.getCuentasParaGestor'));

    $response->assertOk();
    $ids = collect($response->json())->pluck('id');
    expect($ids->all())->toBe([$cuentaAsignada->id]);
});

test('getProductosPorAlmacen() rechaza con 403 a un vendedor sin acceso al almacén', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->create();
    crearProductoConPrecio($almacen, 10, 20);

    $response = $this->getJson(route('ventas.getProductosPorAlmacen', $almacen->id));

    $response->assertStatus(403);
});

test('getProductosPorAlmacen() oculta precio_compra_producto a un vendedor con acceso al almacén', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->create();
    $vendedor->almacenes()->attach($almacen->id);
    crearProductoConPrecio($almacen, 10, 20);

    $response = $this->getJson(route('ventas.getProductosPorAlmacen', $almacen->id));

    $response->assertOk();
    expect($response->json('0.precio_compra_producto'))->toBeNull();
});

test('getProductosPorAlmacen() muestra precio_compra_producto real a admin y moderador', function () {
    $almacen = Almacen::factory()->create();
    crearProductoConPrecio($almacen, 10, 20);

    foreach (['admin', 'moderador'] as $rol) {
        $user = User::factory()->{$rol}()->create();
        $this->actingAs($user);

        $response = $this->getJson(route('ventas.getProductosPorAlmacen', $almacen->id));

        $response->assertOk();
        expect((float) $response->json('0.precio_compra_producto'))->toEqual(10.0);
    }
});

test('getProductosPorAlmacen() expone el precio de venta efectivo de cada lote ("Opción A")', function () {
    $almacen = Almacen::factory()->create();
    [$producto] = crearProductoConPrecio($almacen, 10, 20);

    $loteNormal = LoteStock::create([
        'codigo' => 'LOTE-POS-NORMAL',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 12,
    ]);
    $loteConOverride = LoteStock::create([
        'codigo' => 'LOTE-POS-OVERRIDE',
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 5,
        'precio_costo' => 18,
        'precio_venta' => 25,
    ]);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $response = $this->getJson(route('ventas.getProductosPorAlmacen', $almacen->id));

    $response->assertOk();
    $lotes = collect($response->json('0.lotes'))->keyBy('id');
    expect((float) $lotes[$loteNormal->id]['precio_venta'])->toBe(20.0); // hereda el del almacén
    expect((float) $lotes[$loteConOverride->id]['precio_venta'])->toBe(25.0); // su propio override
});

test('show() oculta costo_unitario a un vendedor, incluso en su propia venta', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->create();
    $vendedor->almacenes()->attach($almacen->id);
    [$producto, $codigo] = crearProductoConPrecio($almacen, 10, 20);

    $venta = Venta::factory()->create(['user_id' => $vendedor->id, 'almacen_id' => $almacen->id]);
    VentaDetalle::factory()->create([
        'venta_id' => $venta->id,
        'producto_id' => $producto->id,
        'producto_codigo_id' => $codigo->id,
        'costo_unitario' => 10,
    ]);

    $response = $this->get(route('ventas.show', $venta->id));

    $response->assertInertia(fn ($page) => $page->where('venta.items.0.costo_unitario', null));
});

test('show() muestra costo_unitario real a admin y moderador', function () {
    $almacen = Almacen::factory()->create();
    [$producto, $codigo] = crearProductoConPrecio($almacen, 10, 20);
    $venta = Venta::factory()->create(['almacen_id' => $almacen->id]);
    VentaDetalle::factory()->create([
        'venta_id' => $venta->id,
        'producto_id' => $producto->id,
        'producto_codigo_id' => $codigo->id,
        'costo_unitario' => 10,
    ]);

    foreach (['admin', 'moderador'] as $rol) {
        $user = User::factory()->{$rol}()->create();
        $this->actingAs($user);

        $response = $this->get(route('ventas.show', $venta->id));

        $response->assertInertia(fn ($page) => $page->where('venta.items.0.costo_unitario', 10));
    }
});
