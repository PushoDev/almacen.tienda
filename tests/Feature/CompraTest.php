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
use App\Models\HistorialPrecioCosto;
use App\Models\Producto;

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

test('el mismo producto en dos almacenes distintos dentro de la misma compra queda en dos líneas separadas, sin fusionar precio ni cantidad', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-10',
        'productos' => [
            [
                'almacen_id' => $almacenA->id,
                'producto' => 'Producto Repetido',
                'marca' => 'Marca X',
                'modelo' => 'Modelo Y',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'DUP-A',
                'cantidad' => 5,
                'precio' => 10,
            ],
            [
                'almacen_id' => $almacenB->id,
                'producto' => 'Producto Repetido',
                'marca' => 'Marca X',
                'modelo' => 'Modelo Y',
                'categoria' => $categoria->nombre_categoria,
                'codigo' => 'DUP-B',
                'cantidad' => 3,
                'precio' => 12,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $producto = \App\Models\Producto::where('nombre_producto', 'Producto Repetido')->firstOrFail();

    // Dos líneas reales en el pivot, no una fusionada — sin promediar precio ni sumar cantidad.
    expect(\App\Models\CompraProducto::where('producto_id', $producto->id)->count())->toBe(2);

    $this->assertDatabaseHas('compra_producto', [
        'producto_id' => $producto->id,
        'almacen_id' => $almacenA->id,
        'cantidad' => 5,
        'precio' => 10,
    ]);

    $this->assertDatabaseHas('compra_producto', [
        'producto_id' => $producto->id,
        'almacen_id' => $almacenB->id,
        'cantidad' => 3,
        'precio' => 12,
    ]);

    // El stock sí queda correcto por almacén, independiente del fix del pivot.
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacenA->id,
        'producto_id' => $producto->id,
        'cantidad' => 5,
    ]);

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacenB->id,
        'producto_id' => $producto->id,
        'cantidad' => 3,
    ]);
});

// ─── Acceso: solo admin (moderador y vendedor no tienen acceso a Compras) ────

test('un admin sí puede acceder a la vista de Compras', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertOk();
});

test('un moderador no puede acceder a la vista de Compras (403)', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un vendedor no puede acceder a la vista de Compras (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un moderador no puede registrar una compra por bypass directo de URL (403), y no se crea nada', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Bypass',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Bypass Moderador',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 1,
                'precio' => 10,
            ],
        ],
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect(Compra::count())->toBe(0);
});

test('un vendedor no puede registrar una compra por bypass directo de URL (403), y no se crea nada', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Bypass',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Bypass Vendedor',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 1,
                'precio' => 10,
            ],
        ],
    ], ['X-Inertia' => 'true']);

    $response->assertStatus(403);
    expect(Compra::count())->toBe(0);
});

// ─── Historial de costo (historial_precio_costos) ─────────────────────────────

test('una compra que cambia el costo de un producto existente deja rastro en historial_precio_costos', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $producto = Producto::factory()->create([
        'nombre_producto' => 'Producto Costo',
        'categoria_id' => $categoria->id,
        'marca_producto' => null,
        'modelo_producto' => null,
        'capacidad_producto' => null,
        'precio_compra_producto' => 10,
    ]);

    // Stock previo a esta compra — debe ser el que se registre como stock_momento,
    // no el stock ya incluyendo las unidades que esta misma compra está agregando.
    AlmacenProducto::create([
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 4,
    ]);

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Costo',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Costo',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 2,
                'precio' => 15,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('historial_precio_costos', [
        'producto_id' => $producto->id,
        'user_id' => $user->id,
        'precio_anterior' => 10.0000,
        'precio_nuevo' => 15.0000,
        'diferencia' => 5.0000,
        'stock_momento' => 4,
        'impacto_financiero' => 20.0000,
        'es_perdida' => false,
    ]);
});

test('una compra con el mismo costo que ya tenía el producto no crea entrada en historial_precio_costos', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $producto = Producto::factory()->create([
        'nombre_producto' => 'Producto Costo Igual',
        'categoria_id' => $categoria->id,
        'marca_producto' => null,
        'modelo_producto' => null,
        'capacidad_producto' => null,
        'precio_compra_producto' => 10,
    ]);

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Costo Igual',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Costo Igual',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 2,
                'precio' => 10,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    expect(HistorialPrecioCosto::where('producto_id', $producto->id)->count())->toBe(0);
});

test('una compra que da de alta un producto nuevo no crea entrada en historial_precio_costos', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Producto Nuevo',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Totalmente Nuevo',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 1,
                'precio' => 20,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Producto Totalmente Nuevo')->firstOrFail();
    expect(HistorialPrecioCosto::where('producto_id', $producto->id)->count())->toBe(0);
});
