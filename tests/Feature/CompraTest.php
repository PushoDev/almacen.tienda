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

test('pago_cash sin permitir_deuda_parcial y con pagos insuficientes: rechaza la compra, no crea nada', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Parcial Test',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor Parcial Sin Flag',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Parcial 1', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 6]],
        // sin permitir_deuda_parcial — se comporta exactamente como antes de este cambio
    ]);

    $response->assertSessionHasErrors('error');
    $this->assertDatabaseMissing('compras', ['proveedor_id' => null, 'total_compra' => 10]);
    $this->assertDatabaseCount('compras', 0);
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 100]);
});

test('pago_cash con permitir_deuda_parcial y pagos insuficientes: completa la compra, el faltante queda como deuda al proveedor', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Parcial Test 2',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Parcial 2', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 6]],
        'permitir_deuda_parcial' => true,
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('compras', ['total_compra' => 10, 'tipo_compra' => 'pago_cash']);
    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    // La cuenta se descuenta solo por lo que realmente pagó, no por el total.
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 94]);

    // El faltante (10 - 6 = 4) queda como deuda del proveedor.
    $this->assertDatabaseHas('proveedors', ['id' => $proveedor->id, 'saldo_proveedor' => 496]);

    // Y queda registrado como un pago más, mismo tipo que una compra 100% a deuda.
    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cuenta_id' => null,
        'cliente_id' => null,
        'monto' => 4,
        'tipo_pago' => 'deuda_proveedor',
    ]);
    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 6,
        'tipo_pago' => 'cuenta',
    ]);
});

test('pago_cash con permitir_deuda_parcial y tipo_proveedor cliente: el faltante incrementa deuda_pago_cliente del cliente correcto (no el que paga)', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Parcial Test 3',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Dos clientes distintos: uno es "el proveedor" de esta compra (a quien se le compra), el otro
    // es quien además pone plata como método de pago — este test existe justo para confirmar que la
    // reasignación de $cliente dentro del foreach de pagosClientes no pisa a quién se le carga la deuda.
    $clienteProveedor = \App\Models\Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);
    $clientePagador = \App\Models\Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $clienteProveedor->nombre_cliente,
        'tipo_proveedor' => 'cliente',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Parcial 3', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 3]],
        'pagos_clientes' => [['cliente_id' => $clientePagador->id, 'monto' => 3]],
        'permitir_deuda_parcial' => true,
    ]);

    $response->assertSessionHasNoErrors();

    // El faltante (10 - 3 - 3 = 4) va al cliente-proveedor de la compra, no al que pagó.
    $this->assertDatabaseHas('clientes', ['id' => $clienteProveedor->id, 'deuda_pago_cliente' => 4]);
    // El que pagó se descuenta solo por lo que pagó (-3, comportamiento preexistente de "pagos con
    // clientes" — no relacionado con este cambio), nunca por el faltante que le tocó al otro cliente.
    $this->assertDatabaseHas('clientes', ['id' => $clientePagador->id, 'deuda_pago_cliente' => -3]);
});

test('el historial de compras marca es_parcial solo en la compra que quedó con deuda parcial, no en las demás', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Historial Test',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Compra 1: pago_cash completo, sin deuda parcial.
    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Historial 1', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 10]],
    ])->assertSessionHasNoErrors();

    // Compra 2: pago_cash con deuda parcial — esta es la que debe salir es_parcial=true.
    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Historial 2', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 6]],
        'permitir_deuda_parcial' => true,
    ])->assertSessionHasNoErrors();

    // Compra 3: 100% a deuda (tipo_compra=deuda_proveedor) — no debe marcarse como parcial, es crédito completo.
    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Historial 3', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra1 = Compra::whereHas('productos', fn ($q) => $q->where('nombre_producto', 'Producto Historial 1'))->firstOrFail();
    $compra2 = Compra::whereHas('productos', fn ($q) => $q->where('nombre_producto', 'Producto Historial 2'))->firstOrFail();
    $compra3 = Compra::whereHas('productos', fn ($q) => $q->where('nombre_producto', 'Producto Historial 3'))->firstOrFail();

    $response = $this->get(route('comprar.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('compras_recientes', function ($compras) use ($compra1, $compra2, $compra3) {
            $porId = collect($compras)->keyBy('id');

            return $porId[$compra1->id]['es_parcial'] === false
                && $porId[$compra2->id]['es_parcial'] === true
                && $porId[$compra3->id]['es_parcial'] === false;
        })
    );
});

test('pago_cash con permitir_deuda_parcial pero pagando de más: sigue rechazando la compra', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Sobrepago Test',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor Sobrepago',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-15',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Sobrepago', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 15]],
        'permitir_deuda_parcial' => true,
    ]);

    $response->assertSessionHasErrors('error');
    $this->assertDatabaseCount('compras', 0);
    $this->assertDatabaseHas('cuentas', ['id' => $cuenta->id, 'saldo_cuenta' => 100]);
});
