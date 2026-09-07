<?php

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CompraEdicion;
use App\Models\CompraPago;
use App\Models\CompraProducto;
use App\Models\Cuenta;
use App\Models\HistorialPrecioCosto;
use App\Models\LoteStock;
use App\Models\Moneda;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\Proveedor;
use App\Models\User;

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
    expect($compra->estado)->toBe('pendiente');

    // El stock queda diferido hasta que la compra se apruebe — todavía no existe.
    $this->assertDatabaseMissing('almacen_producto', [
        'almacen_id' => $almacen->id,
    ]);

    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('aprobada');
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'cantidad' => 2,
    ]);

    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 1.00,
        'tipo_pago' => 'cuenta',
        'saldo_anterior' => 100.00,
        'saldo_posterior' => 99.00,
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

    $this->assertDatabaseHas('compras', [
        'id' => Compra::first()->id,
        'receptor_saldo_anterior' => 500,
        'receptor_saldo_posterior' => 497.50,
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

test('el mismo producto en dos almacenes distintos dentro de la misma compra, a precios distintos, queda en dos fichas separadas', function () {
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

    // El precio es parte de la identidad: al no coincidir (10 vs 12), son dos fichas
    // de Producto distintas, cada una con su propia línea de pivot — no una fusionada.
    $fichas = Producto::where('nombre_producto', 'Producto Repetido')->get();
    expect($fichas)->toHaveCount(2);

    $productoA = $fichas->firstWhere('precio_compra_producto', '10.00');
    $productoB = $fichas->firstWhere('precio_compra_producto', '12.00');
    expect($productoA)->not->toBeNull();
    expect($productoB)->not->toBeNull();

    expect(CompraProducto::where('producto_id', $productoA->id)->count())->toBe(1);
    expect(CompraProducto::where('producto_id', $productoB->id)->count())->toBe(1);

    $this->assertDatabaseHas('compra_producto', [
        'producto_id' => $productoA->id,
        'almacen_id' => $almacenA->id,
        'cantidad' => 5,
        'precio' => 10,
    ]);

    $this->assertDatabaseHas('compra_producto', [
        'producto_id' => $productoB->id,
        'almacen_id' => $almacenB->id,
        'cantidad' => 3,
        'precio' => 12,
    ]);

    // El stock queda diferido hasta aprobar — todavía no existe en ningún almacén.
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoA->id]);
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoB->id]);

    $compra = Compra::whereHas('productos', fn ($q) => $q->where('nombre_producto', 'Producto Repetido'))->firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    // Al aprobar, el stock queda correcto por almacén, cada ficha en el suyo.
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacenA->id,
        'producto_id' => $productoA->id,
        'cantidad' => 5,
    ]);

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacenB->id,
        'producto_id' => $productoB->id,
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

// ─── Identidad de producto por precio (precio_compra_producto es parte del match) ──

test('una compra del mismo producto a un precio distinto crea una ficha nueva, sin pisar el costo de la existente', function () {
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

    // La ficha original no se toca.
    expect($producto->refresh()->precio_compra_producto)->toEqual('10.00');

    // Se creó una ficha nueva, separada, con el precio de esta compra.
    $productoNuevo = Producto::where('nombre_producto', 'Producto Costo')
        ->where('id', '!=', $producto->id)
        ->first();
    expect($productoNuevo)->not->toBeNull();
    expect($productoNuevo->precio_compra_producto)->toEqual('15.00');

    // El match por precio hace que este camino ya no pise costos existentes,
    // así que tampoco debe quedar rastro en historial_precio_costos.
    expect(HistorialPrecioCosto::where('producto_id', $producto->id)->count())->toBe(0);
});

test('comprar el mismo producto dos veces en una misma compra, a precios distintos, crea dos fichas separadas', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Contenedor',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Contenedor',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 3,
                'precio' => 20,
            ],
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Contenedor',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 5,
                'precio' => 25,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $fichas = Producto::where('nombre_producto', 'Producto Contenedor')->get();
    expect($fichas)->toHaveCount(2);
    expect($fichas->pluck('precio_compra_producto')->map(fn ($p) => (string) $p)->sort()->values()->all())
        ->toBe(['20.00', '25.00']);
});

test('una compra con el mismo costo que ya tenía el producto reutiliza la misma ficha, no crea una nueva', function () {
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

    expect(Producto::where('nombre_producto', 'Producto Costo Igual')->count())->toBe(1);
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

    // La compra guarda el snapshot del saldo del receptor (proveedor) antes/después del faltante.
    $this->assertDatabaseHas('compras', [
        'id' => $compra->id,
        'receptor_saldo_anterior' => 500,
        'receptor_saldo_posterior' => 496,
    ]);

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
        'saldo_anterior' => 100,
        'saldo_posterior' => 94,
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
    $clienteProveedor = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);
    $clientePagador = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);

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

    $compra = Compra::where('cliente_id', $clienteProveedor->id)->firstOrFail();
    $this->assertDatabaseHas('compras', [
        'id' => $compra->id,
        'receptor_saldo_anterior' => 0,
        'receptor_saldo_posterior' => 4,
    ]);
    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cliente_id' => $clientePagador->id,
        'monto' => 3,
        'tipo_pago' => 'cliente',
        'saldo_anterior' => 0,
        'saldo_posterior' => -3,
    ]);
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

// ─── Estado pendiente/aprobada/anulada — stock y códigos diferidos hasta aprobar() ──

test('aprobar una compra pendiente crea el ProductoCodigo real y suma el stock, no antes', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Aprobar',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Con Codigo',
                'categoria' => $categoria->nombre_categoria,
                'codigo_barras' => 'BARCODE-001',
                'cantidad' => 4,
                'precio' => 10,
            ],
        ],
    ]);
    $response->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Producto Con Codigo')->firstOrFail();
    $compra = Compra::first();

    // Antes de aprobar: ni el código de barras ni el stock existen todavía.
    expect(ProductoCodigo::where('producto_id', $producto->id)->count())->toBe(0);
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $producto->id]);

    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('aprobada');
    $this->assertDatabaseHas('producto_codigos', [
        'producto_id' => $producto->id,
        'codigo_barras' => 'BARCODE-001',
        'cantidad' => 4,
        'es_default' => 1,
    ]);
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 4,
    ]);
});

test('no se puede aprobar una compra que ya está aprobada', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Doble Aprobar',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Doble Aprobar', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 2, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    // Segunda aprobación: rechazada, y el stock no se duplica.
    $response = $this->post(route('comprar.aprobar', $compra->id));
    $response->assertSessionHasErrors('error');

    $producto = Producto::where('nombre_producto', 'Producto Doble Aprobar')->firstOrFail();
    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 2,
    ]);
});

// ─── Anulación — reversión total ──────────────────────────────────────────

test('anular con reversión una compra deuda_proveedor pura: la deuda vuelve a 0', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Anular Deuda', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('450.00');

    $response = $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'reversion',
        'motivo_anulacion' => 'El proveedor no pudo entregar',
    ]);
    $response->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('anulada');
    expect($compra->fresh()->tipo_anulacion)->toBe('reversion');
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('500.00');

    // La fila de compra_pago NO se borra al anular — queda como registro de qué se pagó
    // originalmente, para que el detalle de la compra anulada lo pueda mostrar.
    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'monto' => 50,
        'tipo_pago' => 'deuda_proveedor',
    ]);
});

test('anular con reversión una compra pago_cash: la cuenta recupera exactamente lo descontado', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Anular Reversion',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor Anular Cash',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Anular Cash', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 10]],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('90.00');

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'reversion',
        'motivo_anulacion' => 'Cambio de decisión antes de aprobar',
    ])->assertSessionHasNoErrors();

    expect($cuenta->fresh()->saldo_cuenta)->toEqual('100.00');
    expect($compra->fresh()->estado)->toBe('anulada');
});

// ─── Anulación — conversión a fondo ────────────────────────────────────────

test('una compra 100% deuda_proveedor no puede anularse como fondo (rechazado)', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Fondo Rechazado', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    $response = $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'fondo',
        'motivo_anulacion' => 'Intento inválido',
    ]);

    $response->assertSessionHasErrors('tipo_anulacion');
    expect($compra->fresh()->estado)->toBe('pendiente');
    // El saldo no se tocó — ni se revirtió ni se convirtió en fondo, la anulación no se aplicó.
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('450.00');
});

test('anular como fondo una compra pago_cash completa: la cuenta NO recupera el dinero, el proveedor queda con fondo a favor', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);
    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Anular Fondo',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Fondo Cash', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 30],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 30]],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('70.00');

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'fondo',
        'motivo_anulacion' => 'El proveedor suspendió la entrega, queda como crédito',
    ])->assertSessionHasNoErrors();

    // La cuenta se queda como está — el dinero no vuelve.
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('70.00');
    // El proveedor ahora tiene fondo a favor por el monto pagado.
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('30.00');
    expect($compra->fresh()->estado)->toBe('anulada');
    expect($compra->fresh()->tipo_anulacion)->toBe('fondo');

    // La fila de compra_pago tampoco se borra en la variante fondo — el detalle sigue
    // mostrando de dónde salió el dinero originalmente.
    $this->assertDatabaseHas('compra_pago', [
        'compra_id' => $compra->id,
        'cuenta_id' => $cuenta->id,
        'monto' => 30,
        'tipo_pago' => 'cuenta',
    ]);
});

test('anular como fondo una compra pago_cash parcial: la porción de deuda se revierte a 0, solo la porción pagada se convierte en fondo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 0]);
    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Anular Fondo Parcial',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Total 10, paga 6 con cuenta, 4 queda como deuda parcial al proveedor.
    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Fondo Parcial', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 6]],
        'permitir_deuda_parcial' => true,
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('-4.00');
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('94.00');

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'fondo',
        'motivo_anulacion' => 'Suspendida, lo pagado queda como crédito',
    ])->assertSessionHasNoErrors();

    // La cuenta no recupera los 6 pagados.
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('94.00');
    // Neto en saldo_proveedor: la deuda de 4 se revierte (+4) y los 6 pagados se convierten en
    // fondo (+6) => de -4 pasa a +6.
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('6.00');
});

test('anular como fondo con tipo_proveedor cliente: el fondo se acredita en deuda_pago_cliente del cliente-fuente correcto', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Fondo Cliente',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();
    $clienteFuente = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);

    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $clienteFuente->nombre_cliente,
        'tipo_proveedor' => 'cliente',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Fondo Cliente', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 20],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 20]],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('cliente_id', $clienteFuente->id)->firstOrFail();

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'fondo',
        'motivo_anulacion' => 'Cliente-proveedor no entregó',
    ])->assertSessionHasNoErrors();

    expect($cuenta->fresh()->saldo_cuenta)->toEqual('80.00');
    expect($clienteFuente->fresh()->deuda_pago_cliente)->toEqual('20.00');
});

test('no se puede anular una compra que ya está aprobada', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto No Anular Aprobada', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $response = $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'reversion',
        'motivo_anulacion' => 'Ya no se puede',
    ]);

    $response->assertSessionHasErrors('error');
    expect($compra->fresh()->estado)->toBe('aprobada');
    // La deuda sigue como quedó al aprobar, no se tocó.
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('490.00');
});

// ─── Edición de compra pendiente — "tratarla como nueva" ───────────────────

test('editar una compra pendiente reemplaza por completo las líneas de producto (100 -> 60 unidades)', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 1000]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 100, 'precio' => 5],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    expect($compra->total_compra)->toEqual('500.00');
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('500.00');

    // Editar: baja a 60 unidades del mismo producto y agrega uno nuevo.
    $response = $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 60, 'precio' => 5],
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar Nuevo', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 10, 'precio' => 8],
        ],
        'nota' => 'El proveedor solo tenía 60 unidades y trajo un producto extra',
    ]);
    $response->assertSessionHasNoErrors();

    $compra->refresh();
    expect($compra->total_compra)->toEqual('380.00'); // 60*5 + 10*8
    expect($compra->estado)->toBe('pendiente');

    // La deuda con el proveedor se recalculó desde cero sobre el total nuevo, no se acumuló.
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('620.00'); // 1000 - 380

    $productoOriginal = Producto::where('nombre_producto', 'Producto Editar')->firstOrFail();
    $productoNuevo = Producto::where('nombre_producto', 'Producto Editar Nuevo')->firstOrFail();

    expect(CompraProducto::where('compra_id', $compra->id)->count())->toBe(2);
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'producto_id' => $productoOriginal->id, 'cantidad' => 60]);
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'producto_id' => $productoNuevo->id, 'cantidad' => 10]);

    // El stock sigue sin tocarse — la compra editada sigue pendiente de aprobación.
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoOriginal->id]);
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoNuevo->id]);
});

test('editar una compra pendiente pago_cash vuelve a procesar los pagos desde cero', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuentaA = Cuenta::create(['nombre_cuenta' => 'Cuenta Editar A', 'saldo_cuenta' => 100, 'tipo_cuenta' => 'permanentes', 'moneda_id' => $moneda->id, 'estado' => 'activa']);
    $cuentaB = Cuenta::create(['nombre_cuenta' => 'Cuenta Editar B', 'saldo_cuenta' => 100, 'tipo_cuenta' => 'permanentes', 'moneda_id' => $moneda->id, 'estado' => 'activa']);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => 'Proveedor Editar Cash',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar Cash', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuentaA->id, 'monto' => 10]],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    expect($cuentaA->fresh()->saldo_cuenta)->toEqual('90.00');

    // Editar: ahora paga con la cuenta B en vez de la A, mismo producto.
    $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar Cash', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuentaB->id, 'monto' => 10]],
        'nota' => 'La cuenta A se quedó sin fondos, se cambió a la B',
    ])->assertSessionHasNoErrors();

    // La cuenta A recuperó su dinero (se revirtió antes de reprocesar), la B ahora paga.
    expect($cuentaA->fresh()->saldo_cuenta)->toEqual('100.00');
    expect($cuentaB->fresh()->saldo_cuenta)->toEqual('90.00');
    expect(CompraPago::where('compra_id', $compra->id)->where('cuenta_id', $cuentaA->id)->count())->toBe(0);
    expect(CompraPago::where('compra_id', $compra->id)->where('cuenta_id', $cuentaB->id)->count())->toBe(1);
});

test('editar una compra pendiente sin escribir una nota: falla validación, nada cambia', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar Sin Nota', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 10, 'precio' => 5],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    $response = $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Editar Sin Nota', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 5],
        ],
        // sin 'nota'
    ]);

    $response->assertSessionHasErrors('nota');
    expect($compra->fresh()->total_compra)->toEqual('50.00');
    expect(CompraEdicion::where('compra_id', $compra->id)->count())->toBe(0);
});

test('cada edición de una compra pendiente queda auditada en compra_ediciones', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Auditoria Edicion', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 10, 'precio' => 5],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Auditoria Edicion', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 7, 'precio' => 5],
        ],
        'nota' => 'El proveedor solo trajo 7 unidades',
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('compra_ediciones', [
        'compra_id' => $compra->id,
        'user_id' => $user->id,
        'total_anterior' => 50.00,
        'total_nuevo' => 35.00,
        'motivo' => 'El proveedor solo trajo 7 unidades',
    ]);

    // Una segunda edición agrega otra fila, no pisa la primera.
    $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Auditoria Edicion', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 8, 'precio' => 5],
        ],
        'nota' => 'En realidad sí llegaron 8',
    ])->assertSessionHasNoErrors();

    expect(CompraEdicion::where('compra_id', $compra->id)->count())->toBe(2);
    $this->assertDatabaseHas('compra_ediciones', [
        'compra_id' => $compra->id,
        'total_anterior' => 35.00,
        'total_nuevo' => 40.00,
        'motivo' => 'En realidad sí llegaron 8',
    ]);
});

test('no se puede editar una compra que ya está aprobada', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto No Editar Aprobada', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $response = $this->post(route('comprar.actualizar', $compra->id), [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto No Editar Aprobada', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 99, 'precio' => 10],
        ],
    ]);

    $response->assertSessionHasErrors('error');
    expect(Compra::find($compra->id)->total_compra)->toEqual('10.00');
});

// ─── Lotes de stock — trazabilidad al aprobar, código autogenerado pero editable ──

test('aprobar una compra con 2 líneas crea un LoteStock por línea, con código autogenerado', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacenA = Almacen::factory()->create();
    $almacenB = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Lotes',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacenA->id, 'producto' => 'Producto Lote 1', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
            ['almacen_id' => $almacenB->id, 'producto' => 'Producto Lote 2', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 8, 'precio' => 20],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();

    // Antes de aprobar, no existe ningún lote todavía.
    expect(LoteStock::count())->toBe(0);

    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    expect(LoteStock::count())->toBe(2);

    $productoUno = Producto::where('nombre_producto', 'Producto Lote 1')->firstOrFail();
    $productoDos = Producto::where('nombre_producto', 'Producto Lote 2')->firstOrFail();

    $this->assertDatabaseHas('lotes_stock', [
        'codigo' => "LOTE-{$compra->id}-001",
        'producto_id' => $productoUno->id,
        'almacen_id' => $almacenA->id,
        'cantidad' => 5,
        'precio_costo' => 10.00,
    ]);
    $this->assertDatabaseHas('lotes_stock', [
        'codigo' => "LOTE-{$compra->id}-002",
        'producto_id' => $productoDos->id,
        'almacen_id' => $almacenB->id,
        'cantidad' => 8,
        'precio_costo' => 20.00,
    ]);
});

test('el código de un lote se puede editar a mano después de generado', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Lote Editable',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Lote Editable', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 3, 'precio' => 15],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $lote = LoteStock::firstOrFail();
    expect($lote->codigo)->toBe("LOTE-{$compra->id}-001");

    $response = $this->post(route('lotes-stock.actualizar-codigo', $lote->id), [
        'codigo' => 'REF-PROVEEDOR-9988',
    ]);
    $response->assertSessionHasNoErrors();

    expect($lote->fresh()->codigo)->toBe('REF-PROVEEDOR-9988');
    // Cantidad/precio/producto/almacén no se tocan por este endpoint.
    expect($lote->fresh()->cantidad)->toBe(3);
});

test('no se puede editar el código de un lote con uno que ya usa otro lote', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Lote Duplicado',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Lote Dup A', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Lote Dup B', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $loteUno = LoteStock::where('codigo', "LOTE-{$compra->id}-001")->firstOrFail();
    $loteDos = LoteStock::where('codigo', "LOTE-{$compra->id}-002")->firstOrFail();

    $response = $this->post(route('lotes-stock.actualizar-codigo', $loteDos->id), [
        'codigo' => $loteUno->codigo,
    ]);

    $response->assertSessionHasErrors('codigo');
    expect($loteDos->fresh()->codigo)->toBe("LOTE-{$compra->id}-002");
});

test('un moderador no puede editar el código de un lote (403)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Lote Bypass',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Lote Bypass', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();
    $lote = LoteStock::firstOrFail();

    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $this->post(route('lotes-stock.actualizar-codigo', $lote->id), ['codigo' => 'HACKEO'], ['X-Inertia' => 'true'])
        ->assertStatus(403);
    expect($lote->fresh()->codigo)->not->toBe('HACKEO');
});

// ─── Permisos: moderador/vendedor no acceden a aprobar/anular/actualizar ───

test('un moderador no puede aprobar/anular/editar una compra por bypass directo (403)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Bypass Estado', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();
    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $this->post(route('comprar.aprobar', $compra->id), [], ['X-Inertia' => 'true'])->assertStatus(403);
    $this->post(route('comprar.anular', $compra->id), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'x'], ['X-Inertia' => 'true'])->assertStatus(403);
    $this->post(route('comprar.actualizar', $compra->id), ['productos' => []], ['X-Inertia' => 'true'])->assertStatus(403);

    expect($compra->fresh()->estado)->toBe('pendiente');
});
