<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
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
        'nombre_cuenta' => 'Cuenta CUP ' . uniqid(),
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
        'nombre_cuenta' => 'Cuenta USD ' . uniqid(),
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
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'cuenta_id' => $cuenta->id, 'monto' => 50,
        'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 50,
    ]);

    $this->postJson(route('ventas.aprobar', $venta))->assertJson(['success' => true]);

    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 150]);
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'completada']);
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
    $venta->pagos()->create([
        'tipo_pago' => 'efectivo', 'moneda_id' => $monedaUsd->id,
        'cliente_id' => $cliente->id, 'monto' => 50,
        'tasa_cambio_aplicada' => 1, 'monto_equivalente' => 50,
    ]);

    $this->postJson(route('ventas.aprobar', $venta))->assertJson(['success' => true]);

    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => 70]);
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
    $this->assertDatabaseHas('ventas', ['id' => $venta->id, 'estado' => 'cancelada']);
});

test('no se puede anular una venta ya anulada', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $venta = Venta::factory()->cancelada()->create(['user_id' => $admin->id]);

    $response = $this->postJson(route('ventas.anular', $venta), ['motivo_anulacion' => 'otros', 'detalle_anulacion' => 'x']);

    $response->assertStatus(400);
    $response->assertJson(['success' => false]);
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

// ==========================================================================
// ACCESO POR ROL — vendedor limitado a sus almacenes
// ==========================================================================

test('un vendedor no puede crear una venta en un almacén que no tiene asignado', function () {
    $vendedor = User::factory()->vendedor()->create();
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
