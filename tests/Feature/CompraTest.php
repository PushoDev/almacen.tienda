<?php

use App\Http\Controllers\CompraController;
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
use App\Models\TipoMovimientoFinanciero;
use App\Models\User;
use Illuminate\Http\Request;

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

test('el mismo producto en dos almacenes distintos dentro de la misma compra, a precios distintos, comparte una sola ficha con el costo aislado por lote', function () {
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

    // El precio NO es parte de la identidad (desde 2026-09-20): nombre+categoría+marca+modelo+
    // capacidad coinciden, así que la segunda línea reusa la ficha de la primera — una sola fila
    // en productos, dos líneas de compra_producto, cada una con su propio costo.
    $producto = Producto::where('nombre_producto', 'Producto Repetido')->sole();

    expect(CompraProducto::where('producto_id', $producto->id)->count())->toBe(2);

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

    // El stock queda diferido hasta aprobar — todavía no existe en ningún almacén.
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $producto->id]);

    $compra = Compra::whereHas('productos', fn ($q) => $q->where('nombre_producto', 'Producto Repetido'))->firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    // Al aprobar, el stock queda correcto por almacén — mismo producto_id en ambos.
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

    // El costo real de cada almacén queda aislado por lote, aunque compartan ficha.
    expect($producto->costoEnAlmacen($almacenA->id))->toBe(10.0);
    expect($producto->costoEnAlmacen($almacenB->id))->toBe(12.0);
});

// ─── Acceso: admin y moderador (vendedor no tiene acceso a Compras) ────

test('las rutas comprar.create/edit/update/destroy ya no existen (el controller nunca las implementó)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    expect(fn () => route('comprar.create'))->toThrow(Exception::class);
    expect(fn () => route('comprar.edit', ['comprar' => 1]))->toThrow(Exception::class);
    expect(fn () => route('comprar.update', ['comprar' => 1]))->toThrow(Exception::class);
    expect(fn () => route('comprar.destroy', ['comprar' => 1]))->toThrow(Exception::class);

    // Antes con Route::resource() esta URL llamaba a CompraController::create() (inexistente)
    // y daba 500 — ahora simplemente no matchea con ninguna ruta real.
    $this->get('/comprar/create')->assertNotFound();
});

test('un admin sí puede acceder a la vista de Compras', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertOk();
});

test('un moderador sí puede acceder a la vista de Compras', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertOk();
});

test('un vendedor no puede acceder a la vista de Compras (403)', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $response = $this->get(route('comprar.index'), ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});

test('un moderador sí puede registrar una compra', function () {
    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Moderador',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacen->id,
                'producto' => 'Producto Moderador',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 1,
                'precio' => 10,
            ],
        ],
    ], ['X-Inertia' => 'true']);

    $response->assertSessionHasNoErrors();
    expect(Compra::count())->toBe(1);
});

// ─── Captura de turno en Compras (moderador ya tiene acceso, admin nunca captura turno) ───

test('una compra registrada por un moderador con turno activo guarda el turno_vendedor_id', function () {
    $moderador = User::factory()->moderador()->create();
    $turno = crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Turno',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-09',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Turno', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ], ['X-Inertia' => 'true'])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', '!=', null)->latest('id')->first();
    expect($compra->turno_vendedor_id)->toBe($turno->id);
});

test('una compra registrada por admin no guarda turno_vendedor_id (admin nunca captura turno)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Admin Sin Turno',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-09',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Admin Sin Turno', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ], ['X-Inertia' => 'true'])->assertSessionHasNoErrors();

    $compra = Compra::latest('id')->first();
    expect($compra->turno_vendedor_id)->toBeNull();
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

test('una compra del mismo producto a un precio distinto reusa la ficha existente, sin pisar el costo real del almacén viejo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $almacenViejo = Almacen::factory()->create();
    $almacenNuevo = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Stock viejo con su propio lote real (no un AlmacenProducto suelto) — para que el aislamiento
    // por almacén sea una comparación justa contra costoEnAlmacen(), no solo contra el campo global.
    $producto = Producto::factory()->create([
        'nombre_producto' => 'Producto Costo',
        'categoria_id' => $categoria->id,
        'marca_producto' => null,
        'modelo_producto' => null,
        'capacidad_producto' => null,
        'precio_compra_producto' => 10,
    ]);
    AlmacenProducto::create(['almacen_id' => $almacenViejo->id, 'producto_id' => $producto->id, 'cantidad' => 4]);
    LoteStock::create([
        'codigo' => 'LOTE-TEST-VIEJO',
        'producto_id' => $producto->id,
        'almacen_id' => $almacenViejo->id,
        'cantidad' => 4,
        'precio_costo' => 10,
    ]);

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Costo',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-08-11',
        'productos' => [
            [
                'almacen_id' => $almacenNuevo->id,
                'producto' => 'Producto Costo',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 2,
                'precio' => 15,
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    // Misma ficha reusada — no aparece una segunda.
    expect(Producto::where('nombre_producto', 'Producto Costo')->count())->toBe(1);

    // El campo global se actualiza como "última referencia de costo conocida"...
    expect($producto->refresh()->precio_compra_producto)->toEqual('15.00');

    // ...pero el costo REAL de cada almacén queda aislado por lote: el almacén viejo no se
    // entera de esta compra nueva.
    expect($producto->costoEnAlmacen($almacenViejo->id))->toBe(10.0);
    expect($producto->costoEnAlmacen($almacenNuevo->id))->toBe(15.0);
});

test('comprar el mismo producto dos veces en una misma compra, al mismo almacén y a precios distintos, deja dos lotes bajo una sola ficha', function () {
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

    $producto = Producto::where('nombre_producto', 'Producto Contenedor')->sole();

    $compra = Compra::whereHas('productos', fn ($q) => $q->where('productos.id', $producto->id))->firstOrFail();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    // Un mismo almacén, dos lotes a precio distinto bajo la misma ficha — exactamente el
    // escenario real reportado (ver Manzanillo/Bejucal, 2026-09-20).
    $lotes = $producto->lotesActivosEnAlmacen($almacen->id);
    expect($lotes)->toHaveCount(2);
    expect($lotes->pluck('precio_costo')->map(fn ($p) => (float) $p)->sort()->values()->all())->toBe([20.0, 25.0]);

    $this->assertDatabaseHas('almacen_producto', [
        'almacen_id' => $almacen->id,
        'producto_id' => $producto->id,
        'cantidad' => 8,
    ]);

    // Promedio ponderado real: (3×20 + 5×25) / 8 = 23.13.
    expect($producto->costoEnAlmacen($almacen->id))->toBe(23.13);
});

test('una compra con el mismo costo que ya tenía el producto también reusa la ficha existente', function () {
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

    // El precio no es parte de la identidad — coincida o no con el que ya tenía la ficha, se
    // reusa igual. El aislamiento de costo real ya no depende de duplicar el catálogo (ver
    // LoteStock::idsConDescendientes() / DistribucionCostosController).
    expect(Producto::where('nombre_producto', 'Producto Costo Igual')->count())->toBe(1);
    expect(CompraProducto::where('producto_id', $producto->id)->count())->toBe(1);
});

test('prorratear una compra nueva no toca el costo del lote de otra compra vieja del mismo producto — regresión del bug real reportado por el cliente', function () {
    // El bug original (2026-09-18): una compra nueva del "mismo" producto reutilizaba la ficha
    // existente, y prorratear esa compra nueva mutaba precio_compra_producto en esa ficha
    // compartida — cambiando también el costo del stock viejo que ya estaba ahí, que nunca fue
    // parte de esta compra ni de este prorrateo. El fix original evitó esto duplicando la ficha
    // por cada compra; desde 2026-09-20 el catálogo vuelve a reusar fichas, pero el aislamiento
    // ahora es real: DistribucionCostosController::distribuirLoteCompras() solo toca los lotes
    // que descienden de la línea de ESTA compra (ver LoteStock::idsConDescendientes()), nunca
    // "todos los lotes de este producto_id".
    TipoMovimientoFinanciero::firstOrCreate(['id' => 1], ['nombre' => 'Gasto Operativo', 'efecto' => 'egreso']);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacenViejo = Almacen::factory()->create();
    $almacenNuevo = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Compra vieja real, aprobada — con su propio lote.
    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Regresion Viejo',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-01',
        'productos' => [
            [
                'almacen_id' => $almacenViejo->id,
                'producto' => 'Producto Regresion Prorrateo',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 5,
                'precio' => 10,
            ],
        ],
    ])->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Producto Regresion Prorrateo')->sole();
    $compraVieja = Compra::latest('id')->first();
    $this->post(route('comprar.aprobar', $compraVieja->id))->assertSessionHasNoErrors();
    $loteViejo = LoteStock::where('compra_producto_id', $compraVieja->productos->first()->pivot->id)->sole();

    // Compra nueva del "mismo" producto — reusa la misma ficha (misma identidad), pero es su
    // propia línea/lote, en otro almacén.
    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Regresion Nuevo',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-18',
        'productos' => [
            [
                'almacen_id' => $almacenNuevo->id,
                'producto' => 'Producto Regresion Prorrateo',
                'categoria' => $categoria->nombre_categoria,
                'cantidad' => 5,
                'precio' => 10,
            ],
        ],
    ])->assertSessionHasNoErrors();

    expect(Producto::where('nombre_producto', 'Producto Regresion Prorrateo')->count())->toBe(1);

    $compraNueva = Compra::latest('id')->first();
    $this->post(route('comprar.aprobar', $compraNueva->id))->assertSessionHasNoErrors();
    $loteNuevo = LoteStock::where('compra_producto_id', $compraNueva->productos->first()->pivot->id)->sole();

    $cuenta = Cuenta::factory()
        ->for(Moneda::factory()->state(['codigo_moneda' => 'USD', 'estado' => true]), 'moneda')
        ->create(['saldo_cuenta' => 1000]);

    // Prorratear SOLO la compra nueva.
    $this->post(route('distribucion-costos.distribuir'), [
        'purchase_ids' => [$compraNueva->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'Prorrateo de prueba — regresión',
    ])->assertRedirect(route('distribucion-costos.index'));

    // El lote de la compra nueva (la que se prorrateó) sí cambia de costo.
    expect((float) $loteNuevo->fresh()->precio_costo)->not->toEqual(10.0);

    // El lote de la compra vieja — que nunca fue parte de esta compra ni de este prorrateo —
    // queda intacto, aunque comparta ficha con la nueva.
    expect((float) $loteViejo->fresh()->precio_costo)->toEqual(10.0);
    expect($producto->costoEnAlmacen($almacenViejo->id))->toBe(10.0);

    // La compra prorrateada queda decidida ("aplicado"); la otra sigue sin decidir.
    expect($compraNueva->fresh()->prorrateo_decision)->toBe('aplicado');
    expect($compraVieja->fresh()->prorrateo_decision)->toBeNull();
});

test('no se puede prorratear costos de una compra que sigue pendiente (sin aprobar)', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Sin Aprobar',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-18',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Sin Aprobar', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::latest('id')->first();
    expect($compra->estado)->toBe('pendiente');
    $producto = Producto::where('nombre_producto', 'Producto Sin Aprobar')->firstOrFail();

    $cuenta = Cuenta::factory()
        ->for(Moneda::factory()->state(['codigo_moneda' => 'USD', 'estado' => true]), 'moneda')
        ->create(['saldo_cuenta' => 1000]);

    // Ni el formulario...
    $this->get(route('distribucion-costos.formulario', ['compras' => [$compra->id]]))
        ->assertStatus(422);

    // ...ni el endpoint que aplica el prorrateo lo permiten.
    $response = $this->post(route('distribucion-costos.distribuir'), [
        'purchase_ids' => [$compra->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 50]],
        'exchange_rate' => 400,
        'details' => 'No debería aplicarse',
    ]);
    $response->assertSessionHas('error');

    expect((float) $producto->fresh()->precio_compra_producto)->toEqual(10.0);
});

test('prorratear una compra aprobada sincroniza el lote_stock que aprobar() ya había creado, no solo el costo global', function () {
    // Antes de este fix, ejecutarProrrateoAutomatico() solo actualizaba Producto.precio_compra_producto
    // — el lote_stock que aprobar() crea al aprobar la compra quedaba con el costo viejo, así que
    // costoEnAlmacen()/Show.tsx hubieran mostrado un número desincronizado del que ve Edit.tsx.
    TipoMovimientoFinanciero::firstOrCreate(['id' => 1], ['nombre' => 'Gasto Operativo', 'efecto' => 'egreso']);

    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Sync Lote',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-18',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Sync Lote', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::latest('id')->first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Producto Sync Lote')->firstOrFail();
    $lote = LoteStock::where('producto_id', $producto->id)->firstOrFail();
    expect((float) $lote->precio_costo)->toEqual(10.0);

    $cuenta = Cuenta::factory()
        ->for(Moneda::factory()->state(['codigo_moneda' => 'USD', 'estado' => true]), 'moneda')
        ->create(['saldo_cuenta' => 1000]);

    $this->post(route('distribucion-costos.distribuir'), [
        'purchase_ids' => [$compra->id],
        'cuentas' => [['account_id' => $cuenta->id, 'monto' => 25]],
        'exchange_rate' => 400,
        'details' => 'Prorrateo sincroniza lote',
    ])->assertRedirect(route('distribucion-costos.index'));

    // peso=1 (único producto) → incremento_unitario = 25/5 = 5 → nuevo_costo = 15, en los dos lados.
    expect((float) $producto->fresh()->precio_compra_producto)->toEqual(15.0);
    expect((float) $lote->fresh()->precio_costo)->toEqual(15.0);
    expect($producto->fresh()->costoEnAlmacen($almacen->id))->toEqual(15.0);
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

test('pago_cash con permitir_deuda_parcial y tipo_proveedor cliente: el faltante decrementa deuda_pago_cliente del cliente correcto (no el que paga)', function () {
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

    // El faltante (10 - 3 - 3 = 4) queda como deuda del negocio hacia el cliente-proveedor de la
    // compra (mismo signo que el proveedor real: negativo = el negocio debe), no al que pagó.
    $this->assertDatabaseHas('clientes', ['id' => $clienteProveedor->id, 'deuda_pago_cliente' => -4]);
    // El que pagó se descuenta solo por lo que pagó (-3, comportamiento preexistente de "pagos con
    // clientes" — no relacionado con este cambio), nunca por el faltante que le tocó al otro cliente.
    $this->assertDatabaseHas('clientes', ['id' => $clientePagador->id, 'deuda_pago_cliente' => -3]);

    $compra = Compra::where('cliente_id', $clienteProveedor->id)->firstOrFail();
    $this->assertDatabaseHas('compras', [
        'id' => $compra->id,
        'receptor_saldo_anterior' => 0,
        'receptor_saldo_posterior' => -4,
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

test('deuda_proveedor pura con tipo_proveedor cliente: decrementa deuda_pago_cliente igual que un proveedor real', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    // Mismo signo que saldo_proveedor: negativo = el negocio le debe a esa entidad. Comprar a
    // crédito de un cliente registrado (en vez de un proveedor) debe mover el saldo hacia negativo
    // exactamente igual, nunca hacia positivo (que significaría "el cliente le debe al negocio").
    $cliente = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $response = $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $cliente->nombre_cliente,
        'tipo_proveedor' => 'cliente',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Deuda Cliente', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'deuda_pago_cliente' => -50]);

    $compra = Compra::where('cliente_id', $cliente->id)->firstOrFail();
    $this->assertDatabaseHas('compras', [
        'id' => $compra->id,
        'receptor_saldo_anterior' => 0,
        'receptor_saldo_posterior' => -50,
    ]);
});

test('anular con reversión una compra deuda_proveedor pura con tipo_proveedor cliente: la deuda vuelve a 0', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $cliente = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $cliente->nombre_cliente,
        'tipo_proveedor' => 'cliente',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Anular Deuda Cliente', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 5, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('cliente_id', $cliente->id)->firstOrFail();
    expect($cliente->fresh()->deuda_pago_cliente)->toEqual('-50.00');

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'reversion',
        'motivo_anulacion' => 'El cliente-proveedor no pudo entregar',
    ])->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('anulada');
    expect($cliente->fresh()->deuda_pago_cliente)->toEqual('0.00');
});

test('anular como fondo una compra pago_cash parcial con tipo_proveedor cliente: la porción de deuda se revierte a 0, solo la porción pagada se convierte en fondo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $cliente = Cliente::factory()->create(['tipo_cliente' => 'fisico', 'deuda_pago_cliente' => 0]);
    $moneda = Moneda::factory()->create(['codigo_moneda' => 'USD', 'estado' => true]);
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta Anular Fondo Parcial Cliente',
        'saldo_cuenta' => 100,
        'tipo_cuenta' => 'permanentes',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    // Total 10, paga 6 con cuenta, 4 queda como deuda parcial al cliente-proveedor.
    $this->post(route('comprar.store'), [
        'compra' => 'pago_cash',
        'proveedor' => $cliente->nombre_cliente,
        'tipo_proveedor' => 'cliente',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Fondo Parcial Cliente', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
        'pagos' => [['cuenta_id' => $cuenta->id, 'monto' => 6]],
        'permitir_deuda_parcial' => true,
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('cliente_id', $cliente->id)->firstOrFail();
    expect($cliente->fresh()->deuda_pago_cliente)->toEqual('-4.00');
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('94.00');

    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'fondo',
        'motivo_anulacion' => 'Suspendida, lo pagado queda como crédito',
    ])->assertSessionHasNoErrors();

    // La cuenta no recupera los 6 pagados.
    expect($cuenta->fresh()->saldo_cuenta)->toEqual('94.00');
    // Neto en deuda_pago_cliente: la deuda de 4 se revierte (+4) y los 6 pagados se convierten en
    // fondo (+6) => de -4 pasa a +6. Mismo neto que el equivalente con proveedor real.
    expect($cliente->fresh()->deuda_pago_cliente)->toEqual('6.00');
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

    // Cada línea de compra crea siempre una ficha nueva — la edición reemplaza también las
    // fichas, no solo el pivot. La ficha de la versión anterior ("100 unidades") queda huérfana
    // (esta misma compra era su única referencia, y nunca tuvo stock por seguir pendiente) y
    // actualizar() la limpia — no debe quedar un duplicado fantasma en el catálogo.
    expect(Producto::where('nombre_producto', 'Producto Editar')->count())->toBe(1);
    $productoOriginal = Producto::where('nombre_producto', 'Producto Editar')->firstOrFail();
    $productoNuevo = Producto::where('nombre_producto', 'Producto Editar Nuevo')->firstOrFail();

    expect(CompraProducto::where('compra_id', $compra->id)->count())->toBe(2);
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'producto_id' => $productoOriginal->id, 'cantidad' => 60]);
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'producto_id' => $productoNuevo->id, 'cantidad' => 10]);

    // El stock sigue sin tocarse — la compra editada sigue pendiente de aprobación.
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoOriginal->id]);
    $this->assertDatabaseMissing('almacen_producto', ['producto_id' => $productoNuevo->id]);
});

test('editar una compra pendiente varias veces no acumula fichas huérfanas en el catálogo', function () {
    $user = User::factory()->admin()->create();
    $this->actingAs($user);

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 1000]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-18',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Huerfano', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 100, 'precio' => 5],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    // 3 correcciones seguidas de la misma compra, todavía pendiente.
    foreach ([80, 70, 60] as $cantidad) {
        $this->post(route('comprar.actualizar', $compra->id), [
            'productos' => [
                ['almacen_id' => $almacen->id, 'producto' => 'Producto Huerfano', 'categoria' => $categoria->nombre_categoria, 'cantidad' => $cantidad, 'precio' => 5],
            ],
            'nota' => "Corrección a {$cantidad} unidades",
        ])->assertSessionHasNoErrors();
    }

    // Ninguna de las 3 fichas intermedias quedó abandonada — solo sobrevive la última.
    expect(Producto::where('nombre_producto', 'Producto Huerfano')->count())->toBe(1);
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'cantidad' => 60]);
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

test('un moderador sí puede editar el código de un lote', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);

    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();

    $this->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => 'Proveedor Lote Moderador',
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Lote Moderador', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    $compra = Compra::first();
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();
    $lote = LoteStock::firstOrFail();

    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $this->post(route('lotes-stock.actualizar-codigo', $lote->id), ['codigo' => 'LOTE-MOD-EDITADO'], ['X-Inertia' => 'true'])
        ->assertSessionHasNoErrors();
    expect($lote->fresh()->codigo)->toBe('LOTE-MOD-EDITADO');
});

// ─── Permisos: vendedor no accede a aprobar/anular/actualizar (moderador sí, igual que admin) ───

test('un vendedor no puede aprobar/anular/editar una compra por bypass directo (403)', function () {
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

    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);

    $this->post(route('comprar.aprobar', $compra->id), [], ['X-Inertia' => 'true'])->assertStatus(403);
    $this->post(route('comprar.anular', $compra->id), ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'x'], ['X-Inertia' => 'true'])->assertStatus(403);
    $this->post(route('comprar.actualizar', $compra->id), ['productos' => []], ['X-Inertia' => 'true'])->assertStatus(403);

    expect($compra->fresh()->estado)->toBe('pendiente');
});

test('un moderador sí puede aprobar/anular/editar una compra, igual que admin', function () {
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
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Moderador Estado', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 1, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();
    $compra = Compra::where('proveedor_id', $proveedor->id)->firstOrFail();

    $moderador = User::factory()->moderador()->create();
    crearTurnoActivo($moderador);
    $this->actingAs($moderador);

    $this->post(route('comprar.aprobar', $compra->id), [], ['X-Inertia' => 'true'])->assertSessionHasNoErrors();

    expect($compra->fresh()->estado)->toBe('aprobada');
});

// ─── Doble petición: la segunda ve la compra con el estado viejo ───────────
//
// Con un doble clic (o aprobar contra anular/editar) dos peticiones cargan la compra como
// "pendiente" y ambas pasan la primera revisión. Se reproduce sin concurrencia real: la
// petición "ganadora" cambia el estado y la "perdedora" entra al controlador con el modelo
// que cargó antes — por eso se llama al controlador directo con esa copia obsoleta.

function crearCompraPendienteConDeuda(Proveedor $proveedor, Almacen $almacen, Categoria $categoria, string $nombreProducto): Compra
{
    test()->post(route('comprar.store'), [
        'compra' => 'deuda_proveedor',
        'proveedor' => $proveedor->nombre_proveedor,
        'tipo_proveedor' => 'proveedor',
        'fecha' => '2026-09-07',
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => $nombreProducto, 'categoria' => $categoria->nombre_categoria, 'codigo_barras' => 'BARCODE-DOBLE', 'cantidad' => 2, 'precio' => 10],
        ],
    ])->assertSessionHasNoErrors();

    return Compra::where('proveedor_id', $proveedor->id)->firstOrFail();
}

test('aprobar con el estado desactualizado (otra petición ya la aprobó) no duplica stock, código ni lote', function () {
    $this->actingAs(User::factory()->admin()->create());

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $compra = crearCompraPendienteConDeuda($proveedor, $almacen, Categoria::factory()->create(), 'Producto Doble Clic Aprobar');

    $copiaObsoleta = Compra::findOrFail($compra->id);
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $respuesta = app(CompraController::class)->aprobar($copiaObsoleta);

    expect($respuesta->getSession()->get('errors')->first('error'))->toBe('Solo se puede aprobar una compra pendiente.');
    $producto = Producto::where('nombre_producto', 'Producto Doble Clic Aprobar')->firstOrFail();
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 2]);
    $this->assertDatabaseHas('producto_codigos', ['producto_id' => $producto->id, 'cantidad' => 2]);
    expect(LoteStock::where('producto_id', $producto->id)->count())->toBe(1);
});

test('anular con el estado desactualizado (otra petición ya la anuló) no devuelve el dinero dos veces', function () {
    $this->actingAs(User::factory()->admin()->create());

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $compra = crearCompraPendienteConDeuda($proveedor, Almacen::factory()->create(), Categoria::factory()->create(), 'Producto Doble Clic Anular');
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('480.00');

    $copiaObsoleta = Compra::findOrFail($compra->id);
    $this->post(route('comprar.anular', $compra->id), [
        'tipo_anulacion' => 'reversion',
        'motivo_anulacion' => 'Primer clic',
    ])->assertSessionHasNoErrors();
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('500.00');

    $peticion = Request::create('/', 'POST', ['tipo_anulacion' => 'reversion', 'motivo_anulacion' => 'Segundo clic']);
    $respuesta = app(CompraController::class)->anular($peticion, $copiaObsoleta);

    expect($respuesta->getSession()->get('errors')->first('error'))->toBe('Solo se puede anular una compra pendiente.');
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('500.00');
    expect($compra->fresh()->motivo_anulacion)->toBe('Primer clic');
});

test('editar con el estado desactualizado (otra petición ya la aprobó) no reemplaza las líneas ni toca el dinero', function () {
    $this->actingAs(User::factory()->admin()->create());

    $proveedor = Proveedor::factory()->create(['saldo_proveedor' => 500]);
    $almacen = Almacen::factory()->create();
    $categoria = Categoria::factory()->create();
    $compra = crearCompraPendienteConDeuda($proveedor, $almacen, $categoria, 'Producto Doble Clic Editar');

    $copiaObsoleta = Compra::findOrFail($compra->id);
    $this->post(route('comprar.aprobar', $compra->id))->assertSessionHasNoErrors();

    $peticion = Request::create('/', 'POST', [
        'productos' => [
            ['almacen_id' => $almacen->id, 'producto' => 'Producto Doble Clic Editar', 'categoria' => $categoria->nombre_categoria, 'cantidad' => 9, 'precio' => 10],
        ],
        'nota' => 'Edición tardía',
    ]);
    $respuesta = app(CompraController::class)->actualizar($peticion, $copiaObsoleta);

    expect($respuesta->getSession()->get('errors')->first('error'))->toBe('Solo se puede editar una compra pendiente.');
    $this->assertDatabaseHas('compra_producto', ['compra_id' => $compra->id, 'cantidad' => 2]);
    expect($compra->fresh()->total_compra)->toEqual('20.00');
    expect($proveedor->fresh()->saldo_proveedor)->toEqual('480.00');
    expect(CompraEdicion::where('compra_id', $compra->id)->count())->toBe(0);
});

// ─── Eliminar compras de la lista de prorrateos (sin prorratear) y acumular sus lotes ────────

/**
 * Compra aprobada con su lote (como lo deja aprobar()), sin pasar por todo el flujo de registro.
 *
 * @return array{0: Compra, 1: LoteStock}
 */
function compraAprobadaConLote(Producto $producto, Almacen $almacen, int $cantidad, float $costo, string $estado = 'aprobada'): array
{
    $compra = Compra::factory()->create(['estado' => $estado, 'tipo_compra' => 'deuda_proveedor']);
    $compra->productos()->attach($producto->id, ['cantidad' => $cantidad, 'precio' => $costo, 'almacen_id' => $almacen->id]);
    $lote = LoteStock::create([
        'codigo' => LoteStock::generarCodigo($compra->id, 1),
        'compra_producto_id' => CompraProducto::where('compra_id', $compra->id)->firstOrFail()->id,
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => $cantidad,
        'precio_costo' => $costo,
    ]);

    return [$compra, $lote];
}

test('eliminar una compra de la lista la marca omitida, la oculta y acumula su lote al lote idéntico del almacén', function () {
    $admin = User::factory()->admin()->create();
    $this->actingAs($admin);
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $existente = LoteStock::create(['codigo' => 'AJUSTE-LEGADO-X', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 5, 'precio_costo' => 10]);
    [$compra, $loteDeLaCompra] = compraAprobadaConLote($producto, $almacen, cantidad: 8, costo: 10);

    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$compra->id]])
        ->assertSessionHas('success', fn (string $mensaje) => str_contains($mensaje, '1 lote(s) se acumularon'));

    $compra->refresh();
    expect($compra->prorrateo_decision)->toBe('omitido');
    expect($compra->prorrateo_decidido_por)->toBe($admin->id);
    expect($existente->fresh()->cantidad_disponible)->toBe(13);
    expect($loteDeLaCompra->fresh()->cantidad_disponible)->toBe(0);
    expect($loteDeLaCompra->fresh()->fusionado_en_lote_id)->toBe($existente->id);
    $this->get(route('distribucion-costos.index'))
        ->assertInertia(fn ($page) => $page->where('compras.data', fn ($compras) => ! collect($compras)->pluck('id')->contains($compra->id)));
});

test('eliminar una compra de la lista NO acumula si el lote del almacén no es idéntico: otro costo, precio propio o de otra compra sin decidir', function (string $caso) {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    [$compra, $loteDeLaCompra] = compraAprobadaConLote($producto, $almacen, cantidad: 8, costo: 10);

    if ($caso === 'de otra compra sin decidir') {
        [, $existente] = compraAprobadaConLote($producto, $almacen, cantidad: 5, costo: 10); // aprobada, sin prorratear todavía
    } else {
        $existente = LoteStock::create([
            'codigo' => 'AJUSTE-LEGADO-X', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 5,
            'precio_costo' => $caso === 'otro costo' ? 9 : 10, 'precio_venta' => $caso === 'precio propio' ? 30 : null,
        ]);
    }

    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$compra->id]])->assertSessionHasNoErrors();

    expect($compra->fresh()->prorrateo_decision)->toBe('omitido');
    expect($existente->fresh()->cantidad_disponible)->toBe(5);
    expect($loteDeLaCompra->fresh()->cantidad_disponible)->toBe(8);
    expect($loteDeLaCompra->fresh()->fusionado_en_lote_id)->toBeNull();
})->with(['otro costo', 'precio propio', 'de otra compra sin decidir']);

test('no se elimina de la lista una compra pendiente ni una ya prorrateada; una anulada sí (sin lotes que mover)', function () {
    $this->actingAs(User::factory()->admin()->create());
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create();
    [$pendiente] = compraAprobadaConLote($producto, $almacen, cantidad: 2, costo: 10, estado: 'pendiente');
    [$prorrateada] = compraAprobadaConLote($producto, $almacen, cantidad: 2, costo: 10);
    $prorrateada->update(['prorrateo_decision' => 'aplicado']);
    [$anulada] = compraAprobadaConLote($producto, $almacen, cantidad: 2, costo: 10, estado: 'anulada');

    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$pendiente->id, $prorrateada->id]])->assertSessionHas('error');
    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$anulada->id]])->assertSessionHasNoErrors();

    expect($pendiente->fresh()->prorrateo_decision)->toBeNull();
    expect($prorrateada->fresh()->prorrateo_decision)->toBe('aplicado');
    expect($anulada->fresh()->prorrateo_decision)->toBe('omitido');
});

test('un moderador sí puede eliminar compras de la lista de prorrateos, ve el botón y se acumulan como con el admin', function () {
    $moderador = User::factory()->moderador()->create();
    $this->actingAs($moderador);
    crearTurnoActivo($moderador); // sin turno capturado, RequireTurnoActivo bloquea las escrituras del moderador
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create(['precio_compra_producto' => 10]);
    $existente = LoteStock::create(['codigo' => 'AJUSTE-LEGADO-X', 'producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'cantidad' => 5, 'precio_costo' => 10]);
    [$compra] = compraAprobadaConLote($producto, $almacen, cantidad: 8, costo: 10);

    $this->get(route('distribucion-costos.index'))->assertInertia(fn ($page) => $page->where('puedeEliminarPendientes', true));
    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$compra->id]])->assertSessionHasNoErrors();

    expect($compra->fresh()->prorrateo_decision)->toBe('omitido');
    expect($compra->fresh()->prorrateo_decidido_por)->toBe($moderador->id);
    expect($existente->fresh()->cantidad_disponible)->toBe(13);
});

test('un vendedor no puede eliminar compras de la lista de prorrateos (403) y no ve el botón', function () {
    $vendedor = User::factory()->vendedor()->create();
    $this->actingAs($vendedor);
    $almacen = Almacen::factory()->create();
    [$compra, $lote] = compraAprobadaConLote(Producto::factory()->create(), $almacen, cantidad: 2, costo: 10);

    $this->post(route('distribucion-costos.compras.omitir'), ['compra_ids' => [$compra->id]])->assertForbidden();
    $this->get(route('distribucion-costos.index'))->assertInertia(fn ($page) => $page->where('puedeEliminarPendientes', false));

    expect($compra->fresh()->prorrateo_decision)->toBeNull();
    expect($lote->fresh()->cantidad_disponible)->toBe(2);
});
