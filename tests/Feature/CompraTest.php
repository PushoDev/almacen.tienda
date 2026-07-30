<?php

use App\Models\User;
use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Proveedor;
use App\Models\Compra;
use App\Models\CompraPago;
use App\Models\AlmacenProducto;

test('puede crear compra con precio 0.50 usando pago_cash con cuenta USD', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create([
        'codigo_moneda' => 'USD',
        'estado' => true,
    ]);

    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Test USD',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor Test',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-07-30',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Test',
                'marca' => 'Marca X',
                'modelo' => 'Modelo Y',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'TEST001',
                'cantidad' => 2,
                'precio' => 0.50,
            ],
        ],
        'pagos' => [
            [
                'cuenta_id' => $cuenta->id,
                'monto' => 1.00,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('compras', [
        'total_compra' => 1.00,
        'tipo_compra' => 'pago_cash',
    ]);

    $compra = Compra::first();
    expect($compra)->not->toBeNull();

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'cantidad' => 2,
    ]);

    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 1.00,
        'tipo_pago' => 'cuenta',
    ]);

    $this->assertDatabaseHas('cuentas', [
        'id' => $cuenta->id,
        'saldo_cuenta' => 99.00,
    ]);
});

test('puede crear compra como deuda a proveedor con precio 0.50', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create([
        'saldo_proveedor' => 500,
    ]);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-07-30',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Deuda',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'TEST002',
                'cantidad' => 5,
                'precio' => 0.50,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('compras', [
        'total_compra' => 2.50,
        'tipo_compra' => 'deuda_proveedor',
    ]);

    $this->assertDatabaseHas('proveedors', [
        'id' => $proveedor->id,
        'saldo_proveedor' => 497.50,
    ]);
});

test('rechaza precio de compra en 0', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create([
        'codigo_moneda' => 'USD',
        'estado' => true,
    ]);

    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Test USD',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-07-30',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'TEST003',
                'cantidad' => 1,
                'precio' => 0,
            ],
        ],
        'pagos' => [
            [
                'cuenta_id' => $cuenta->id,
                'monto' => 0,
            ],
        ],
    ]);

    $response->assertSessionHasErrors(['productos.0.precio']);
});

test('rechaza precio de compra negativo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create([
        'codigo_moneda' => 'USD',
        'estado' => true,
    ]);

    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Test USD',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-07-30',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'TEST004',
                'cantidad' => 1,
                'precio' => -5,
            ],
        ],
        'pagos' => [
            [
                'cuenta_id' => $cuenta->id,
                'monto' => 0,
            ],
        ],
    ]);

    $response->assertSessionHasErrors(['productos.0.precio']);
});
