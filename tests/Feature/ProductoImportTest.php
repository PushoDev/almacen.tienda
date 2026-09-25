<?php

use App\Http\Controllers\ImportacionProductoController;
use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\AlmacenProductoCodigo;
use App\Models\ImportacionProducto;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Services\CodigoStockService;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;

function importarExcel(array $filas, Almacen $almacen, bool $confirmarRepetido = false): TestResponse
{
    return test()->post(route('productos.import'), [
        'file' => crearExcelImportacion($filas),
        'almacen_id' => $almacen->id,
        'confirmar_repetido' => $confirmarRepetido,
    ]);
}

beforeEach(function () {
    $this->actingAs(User::factory()->admin()->create());
});

test('importar un producto nuevo crea su ficha, el stock del almacén y un lote al costo de la fila', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([['Olla Importada', 'Cocina', null, null, null, null, 12.5, 4, 'BAR-IMP-1']], $almacen)
        ->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Olla Importada')->firstOrFail();
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 4]);
    $this->assertDatabaseHas('lotes_stock', [
        'codigo' => "IMP-{$producto->id}-{$almacen->id}-1",
        'producto_id' => $producto->id,
        'almacen_id' => $almacen->id,
        'cantidad' => 4,
        'cantidad_disponible' => 4,
        'precio_costo' => 12.5,
        'compra_producto_id' => null,
        'movimiento_id' => null,
    ]);
});

test('importar un producto que ya existe con el mismo costo crea otro lote y no suma al anterior', function () {
    $almacen = Almacen::factory()->create();
    $fila = ['Olla Repetida', 'Cocina', null, null, null, null, 10, 3, 'BAR-REP'];

    importarExcel([$fila], $almacen)->assertSessionHasNoErrors();
    importarExcel([$fila], $almacen, confirmarRepetido: true)->assertSessionHasNoErrors();

    expect(Producto::where('nombre_producto', 'Olla Repetida')->count())->toBe(1);
    $producto = Producto::where('nombre_producto', 'Olla Repetida')->firstOrFail();

    $lotes = LoteStock::where('producto_id', $producto->id)->orderBy('id')->get();
    expect($lotes)->toHaveCount(2);
    expect($lotes->pluck('cantidad')->all())->toBe([3, 3]);
    expect($lotes->pluck('codigo')->all())->toBe(["IMP-{$producto->id}-{$almacen->id}-1", "IMP-{$producto->id}-{$almacen->id}-2"]);
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 6]);
});

test('importar un producto existente a otro costo no pisa el costo de la ficha: el costo nuevo queda en el lote', function () {
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create([
        'nombre_producto' => 'Olla Costo Ficha',
        'marca_producto' => null,
        'modelo_producto' => null,
        'capacidad_producto' => null,
        'color_producto' => null,
        'precio_compra_producto' => 5,
    ]);

    importarExcel([['Olla Costo Ficha', 'Cocina', null, null, null, null, 8, 2, 'BAR-COSTO']], $almacen)
        ->assertSessionHasNoErrors();

    expect($producto->fresh()->precio_compra_producto)->toEqual('5.00');
    $this->assertDatabaseHas('lotes_stock', ['producto_id' => $producto->id, 'almacen_id' => $almacen->id, 'precio_costo' => 8]);
});

test('el mismo producto importado en dos almacenes crea un lote por almacén', function () {
    $almacenUno = Almacen::factory()->create();
    $almacenDos = Almacen::factory()->create();
    $fila = ['Olla Dos Almacenes', 'Cocina', null, null, null, null, 10, 5, 'BAR-2ALM'];

    importarExcel([$fila], $almacenUno)->assertSessionHasNoErrors();
    importarExcel([$fila], $almacenDos)->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Olla Dos Almacenes')->firstOrFail();
    $this->assertDatabaseHas('lotes_stock', ['producto_id' => $producto->id, 'almacen_id' => $almacenUno->id, 'cantidad' => 5]);
    $this->assertDatabaseHas('lotes_stock', ['producto_id' => $producto->id, 'almacen_id' => $almacenDos->id, 'cantidad' => 5]);
    expect(LoteStock::where('producto_id', $producto->id)->count())->toBe(2);
});

test('una fila con cantidad 0 crea la ficha y el registro de almacén pero ningún lote', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([['Olla Sin Unidades', 'Cocina', null, null, null, null, 10, 0, null]], $almacen)
        ->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Olla Sin Unidades')->firstOrFail();
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 0]);
    expect(LoteStock::where('producto_id', $producto->id)->count())->toBe(0);
});

test('una fila con unidades pero sin precio_compra se omite completa: no crea ficha, stock ni lote', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([['Olla Sin Precio', 'Cocina', null, null, null, null, null, 5, null]], $almacen);

    expect(Producto::where('nombre_producto', 'Olla Sin Precio')->exists())->toBeFalse();
    expect(LoteStock::count())->toBe(0);
    $this->assertDatabaseHas('importaciones_producto_filas', [
        'nombre_producto' => 'Olla Sin Precio',
        'resultado' => 'omitida',
        'motivo' => 'Falta el precio de compra o no es válido (obligatorio cuando hay unidades)',
    ]);
});

test('una cantidad o un precio negativos se omiten con su motivo: importar nunca resta stock ni crea lotes inválidos', function () {
    $almacen = Almacen::factory()->create();
    importarExcel([['Olla Negativos', 'Cocina', null, null, null, null, 10, 5, 'BAR-NEG']], $almacen)->assertSessionHasNoErrors();
    $producto = Producto::where('nombre_producto', 'Olla Negativos')->firstOrFail();

    importarExcel([
        ['Olla Negativos', 'Cocina', null, null, null, null, 10, -3, null],
        ['Olla Precio Negativo', 'Cocina', null, null, null, null, -8, 2, null],
    ], $almacen)->assertSessionHasNoErrors();

    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 5]);
    expect(Producto::where('nombre_producto', 'Olla Precio Negativo')->exists())->toBeFalse();
    expect(LoteStock::count())->toBe(1);
    $this->assertDatabaseHas('importaciones_producto_filas', ['fila' => 2, 'resultado' => 'omitida', 'motivo' => 'La cantidad no puede ser negativa']);
    $this->assertDatabaseHas('importaciones_producto_filas', ['fila' => 3, 'resultado' => 'omitida', 'motivo' => 'El precio de compra no puede ser negativo']);
});

test('una fila sin stock y sin precio se registra como solo catálogo: ficha con costo 0, registro de almacén en 0 y ningún lote', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([['Producto Solo Catalogo', 'Cocina', null, null, null, null, null, null, null]], $almacen)
        ->assertSessionHasNoErrors();

    $producto = Producto::where('nombre_producto', 'Producto Solo Catalogo')->firstOrFail();
    expect($producto->precio_compra_producto)->toEqual('0.00');
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 0]);
    expect(LoteStock::count())->toBe(0);
    $this->assertDatabaseHas('importaciones_producto_filas', [
        'producto_id' => $producto->id,
        'resultado' => 'solo_catalogo',
        'producto_nuevo' => 1,
    ]);
    $this->assertDatabaseHas('importaciones_productos', ['almacen_id' => $almacen->id, 'productos_sin_stock' => 1, 'lotes_creados' => 0, 'filas_omitidas' => 0]);
});

test('una fila en 0 sobre un producto que ya tiene stock no lo resta: el import solo suma', function () {
    $almacen = Almacen::factory()->create();
    importarExcel([['Olla Con Stock', 'Cocina', null, null, null, null, 10, 7, 'BAR-STOCK']], $almacen)->assertSessionHasNoErrors();
    $producto = Producto::where('nombre_producto', 'Olla Con Stock')->firstOrFail();

    importarExcel([['Olla Con Stock', 'Cocina', null, null, null, null, null, 0, null]], $almacen)->assertSessionHasNoErrors();

    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $producto->id, 'cantidad' => 7]);
    expect(LoteStock::where('producto_id', $producto->id)->count())->toBe(1);
    $this->assertDatabaseHas('importaciones_producto_filas', [
        'producto_id' => $producto->id,
        'resultado' => 'solo_catalogo',
        'motivo' => 'El producto ya existía: su stock no cambia (el import solo suma)',
    ]);
});

test('cada importación queda en el historial con sus contadores y el detalle de cada fila, incluidas las omitidas', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([
        ['Producto Con Stock', 'Cocina', null, null, null, null, 10, 3, 'BAR-H1'],
        ['Producto Sin Stock', 'Cocina', null, null, null, null, null, 0, null],
        [null, 'Cocina', null, null, null, null, 10, 2, null],
    ], $almacen)->assertSessionHasNoErrors();

    $importacion = ImportacionProducto::firstOrFail();
    expect($importacion->only(['user_id', 'almacen_id', 'nombre_archivo', 'estado', 'filas_procesadas', 'productos_creados', 'productos_sin_stock', 'lotes_creados', 'unidades_importadas', 'filas_omitidas']))
        ->toBe([
            'user_id' => auth()->id(),
            'almacen_id' => $almacen->id,
            'nombre_archivo' => 'productos.xlsx',
            'estado' => 'con_omitidas',
            'filas_procesadas' => 3,
            'productos_creados' => 2,
            'productos_sin_stock' => 1,
            'lotes_creados' => 1,
            'unidades_importadas' => 3,
            'filas_omitidas' => 1,
        ]);
    expect($importacion->hash_archivo)->toHaveLength(64);

    $filas = $importacion->filas()->orderBy('fila')->get();
    expect($filas->pluck('fila')->all())->toBe([2, 3, 4]);
    expect($filas->pluck('resultado')->all())->toBe(['importada', 'solo_catalogo', 'omitida']);
    expect($filas[0]->lote_codigo)->toStartWith('IMP-');
    expect($filas[2]->motivo)->toBe('Falta el nombre del producto');
});

test('subir otra vez el mismo archivo al mismo almacén avisa y no importa nada hasta que el usuario confirme', function () {
    $almacen = Almacen::factory()->create();
    $fila = ['Olla Doble Archivo', 'Cocina', null, null, null, null, 10, 3, 'BAR-DOBLE-A'];
    importarExcel([$fila], $almacen)->assertSessionHasNoErrors();
    $primera = ImportacionProducto::firstOrFail();

    $respuesta = importarExcel([$fila], $almacen);

    $respuesta->assertSessionHas('importacion_repetida', fn ($aviso) => $aviso['id'] === $primera->id && $aviso['nombre_archivo'] === 'productos.xlsx');
    expect(LoteStock::count())->toBe(1);
    expect(ImportacionProducto::count())->toBe(1);

    importarExcel([$fila], $almacen, confirmarRepetido: true)->assertSessionMissing('importacion_repetida');
    expect(LoteStock::count())->toBe(2);
});

test('el aviso de archivo repetido no salta en otro almacén ni si la importación anterior falló o se revirtió', function () {
    $almacen = Almacen::factory()->create();
    $otroAlmacen = Almacen::factory()->create();
    $fila = ['Olla Otro Almacen', 'Cocina', null, null, null, null, 10, 3, 'BAR-OTRO'];
    importarExcel([$fila], $almacen)->assertSessionHasNoErrors();

    importarExcel([$fila], $otroAlmacen)->assertSessionMissing('importacion_repetida');
    expect(LoteStock::count())->toBe(2);

    ImportacionProducto::query()->update(['estado' => 'revertida']);
    importarExcel([$fila], $almacen)->assertSessionMissing('importacion_repetida');
    expect(LoteStock::count())->toBe(3);
});

test('una importación que falla queda en el historial como fallida y no deja nada a medias', function () {
    $almacen = Almacen::factory()->create();

    // Un nombre de más de 255 caracteres incumple la validación del archivo y tumba toda la importación.
    $respuesta = importarExcel([
        ['Producto Bueno', 'Cocina', null, null, null, null, 10, 3, 'BAR-BUENO'],
        [str_repeat('x', 300), 'Cocina', null, null, null, null, 10, 3, null],
    ], $almacen);

    $respuesta->assertSessionHasErrors();
    expect(Producto::where('nombre_producto', 'Producto Bueno')->exists())->toBeFalse();
    expect(LoteStock::count())->toBe(0);
    $importacion = ImportacionProducto::firstOrFail();
    expect($importacion->estado)->toBe('fallida');
    expect($importacion->mensaje_error)->not->toBeEmpty();
    expect($importacion->filas()->count())->toBe(0);
});

test('si una fila falla a mitad de camino se descarta entera y las demás filas se importan', function () {
    $almacen = Almacen::factory()->create();

    // La primera llamada al reparto por almacén (justo después de crear ficha y código) falla.
    $llamadas = 0;
    $this->partialMock(CodigoStockService::class, function ($mock) use (&$llamadas) {
        $mock->shouldReceive('agregar')->andReturnUsing(function () use (&$llamadas) {
            if (++$llamadas === 1) {
                throw new RuntimeException('fallo simulado');
            }
        });
    });

    importarExcel([
        ['Olla Que Falla', 'Cocina', null, null, null, null, 10, 3, 'BAR-FALLA'],
        ['Olla Que Sigue', 'Cocina', null, null, null, null, 10, 2, 'BAR-SIGUE'],
    ], $almacen)->assertSessionHasNoErrors();

    expect(Producto::where('nombre_producto', 'Olla Que Falla')->exists())->toBeFalse();
    expect(ProductoCodigo::where('codigo_barras', 'BAR-FALLA')->exists())->toBeFalse();
    expect(AlmacenProducto::count())->toBe(1);
    expect(LoteStock::count())->toBe(1);

    $sigue = Producto::where('nombre_producto', 'Olla Que Sigue')->firstOrFail();
    $this->assertDatabaseHas('lotes_stock', ['producto_id' => $sigue->id, 'cantidad' => 2]);
});

test('el correlativo del código IMP no repite un código existente aunque se hayan borrado lotes intermedios', function () {
    $almacen = Almacen::factory()->create();
    $producto = Producto::factory()->create();
    foreach ([1, 3] as $numero) {
        LoteStock::create([
            'codigo' => "IMP-{$producto->id}-{$almacen->id}-{$numero}",
            'producto_id' => $producto->id,
            'almacen_id' => $almacen->id,
            'cantidad' => 1,
            'precio_costo' => 1,
        ]);
    }

    // Hay 2 lotes IMP (contar daría 3, que ya existe): el siguiente libre es el 4.
    expect(LoteStock::generarCodigoImportacion($producto->id, $almacen->id))->toBe("IMP-{$producto->id}-{$almacen->id}-4");
});

// ─── Deshacer una importación completa ─────────────────────────────────────

/**
 * Importa 2 filas con stock (una con código de barras), 1 solo catálogo y 1 omitida, y devuelve la importación.
 */
function importarParaDeshacer(Almacen $almacen): ImportacionProducto
{
    importarExcel([
        ['Producto Deshacer A', 'Cocina', null, null, null, null, 10, 3, 'BAR-DES-A'],
        ['Producto Deshacer B', 'Cocina', null, null, null, null, 20, 5, null],
        ['Producto Solo Catalogo Des', 'Cocina', null, null, null, null, null, 0, null],
        [null, 'Cocina', null, null, null, null, 5, 1, null],
    ], $almacen)->assertSessionHasNoErrors();

    return ImportacionProducto::firstOrFail();
}

function deshacerImportacion(ImportacionProducto $importacion, array $datos = []): TestResponse
{
    return test()->post(route('importaciones-productos.revertir', $importacion->id), $datos + [
        'motivo_reversion' => 'Se subió el archivo al almacén equivocado',
        'password_confirmacion' => 'password',
    ]);
}

test('deshacer una importación quita stock, código y lotes, conserva las fichas y deja constancia', function () {
    $almacen = Almacen::factory()->create();
    $importacion = importarParaDeshacer($almacen);
    $productoA = Producto::where('nombre_producto', 'Producto Deshacer A')->firstOrFail();
    $productoB = Producto::where('nombre_producto', 'Producto Deshacer B')->firstOrFail();
    $codigoA = ProductoCodigo::where('producto_id', $productoA->id)->firstOrFail();
    expect(AlmacenProductoCodigo::where('producto_codigo_id', $codigoA->id)->value('cantidad'))->toBe(3);

    deshacerImportacion($importacion)->assertSessionHasNoErrors();

    expect(LoteStock::count())->toBe(0);
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $productoA->id, 'cantidad' => 0]);
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $productoB->id, 'cantidad' => 0]);
    expect($codigoA->fresh()->cantidad)->toBe(0);
    expect(AlmacenProductoCodigo::where('producto_codigo_id', $codigoA->id)->value('cantidad'))->toBe(0);
    expect(Producto::whereIn('id', [$productoA->id, $productoB->id])->count())->toBe(2);

    $importacion->refresh();
    expect($importacion->estado)->toBe('revertida');
    expect($importacion->revertida_por)->toBe(auth()->id());
    expect($importacion->revertida_at)->not->toBeNull();
    expect($importacion->motivo_reversion)->toBe('Se subió el archivo al almacén equivocado');
    $fila = $importacion->filas()->where('producto_id', $productoA->id)->firstOrFail();
    expect($fila->lote_id)->toBeNull();
    expect($fila->lote_codigo)->toStartWith('IMP-');
});

test('si algo de lo importado ya se movió no se revierte nada y se listan los bloqueos', function (string $caso, Closure $modificar, string $fragmento) {
    $almacen = Almacen::factory()->create();
    $importacion = importarParaDeshacer($almacen);
    $productoA = Producto::where('nombre_producto', 'Producto Deshacer A')->firstOrFail();
    $modificar($productoA, $almacen);
    $lotesAntes = LoteStock::count();
    $stockB = AlmacenProducto::where('almacen_id', $almacen->id)->where('producto_id', Producto::where('nombre_producto', 'Producto Deshacer B')->value('id'))->value('cantidad');

    $respuesta = deshacerImportacion($importacion);

    $respuesta->assertSessionHasErrors('revertir');
    $respuesta->assertSessionHas('bloqueos_reversion', fn (array $bloqueos) => str_contains(implode(' ', $bloqueos), $fragmento));
    expect($importacion->fresh()->estado)->toBe('con_omitidas');
    expect(LoteStock::count())->toBe($lotesAntes);
    // El producto B no tenía problemas, pero por ser todo o nada tampoco se tocó.
    expect(AlmacenProducto::where('almacen_id', $almacen->id)->where('producto_id', Producto::where('nombre_producto', 'Producto Deshacer B')->value('id'))->value('cantidad'))->toBe($stockB);
})->with([
    'unidades ya vendidas o trasladadas' => [
        'consumido',
        fn (Producto $producto) => LoteStock::where('producto_id', $producto->id)->update(['cantidad_disponible' => 1]),
        'ya se usaron 2 de 3 unidades',
    ],
    'lote fusionado con otro' => [
        'fusionado',
        function (Producto $producto) {
            $destino = LoteStock::create(['codigo' => 'FUSION-X', 'producto_id' => $producto->id, 'almacen_id' => LoteStock::where('producto_id', $producto->id)->value('almacen_id'), 'cantidad' => 3, 'precio_costo' => 10]);
            LoteStock::where('codigo', 'like', 'IMP-%')->where('producto_id', $producto->id)->update(['fusionado_en_lote_id' => $destino->id]);
        },
        'se fusionó con otro',
    ],
    'lote eliminado a mano' => [
        'eliminado',
        fn (Producto $producto) => LoteStock::where('producto_id', $producto->id)->delete(),
        'ya no existe',
    ],
    'stock del almacén menor que lo importado' => [
        'stock',
        fn (Producto $producto, Almacen $almacen) => AlmacenProducto::where('almacen_id', $almacen->id)->where('producto_id', $producto->id)->update(['cantidad' => 1]),
        'es menor que lo importado (3)',
    ],
]);

test('deshacer pide el motivo y la contraseña del usuario, y con una contraseña incorrecta no cambia nada', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());

    deshacerImportacion($importacion, ['motivo_reversion' => ''])->assertSessionHasErrors('motivo_reversion');
    deshacerImportacion($importacion, ['password_confirmacion' => 'incorrecta'])->assertSessionHasErrors('password_confirmacion');

    expect($importacion->fresh()->estado)->toBe('con_omitidas');
    expect(LoteStock::count())->toBe(2);
});

test('solo un admin puede deshacer una importación: un moderador recibe 403 y no se revierte nada', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());
    $this->actingAs(User::factory()->moderador()->create());

    deshacerImportacion($importacion)->assertForbidden();

    expect($importacion->fresh()->estado)->toBe('con_omitidas');
    expect(LoteStock::count())->toBe(2);
});

test('una importación fallida o ya revertida no se puede deshacer', function (string $estado) {
    $importacion = ImportacionProducto::factory()->create(['estado' => $estado]);

    deshacerImportacion($importacion)->assertSessionHasErrors('revertir');

    expect($importacion->fresh()->estado)->toBe($estado);
})->with(['fallida', 'revertida']);

test('deshacer con el estado desactualizado (otra petición ya la revirtió) no descuenta el stock dos veces', function () {
    $almacen = Almacen::factory()->create();
    $importacion = importarParaDeshacer($almacen);
    $productoB = Producto::where('nombre_producto', 'Producto Deshacer B')->firstOrFail();
    // Stock que ya existía antes de la importación: no debe tocarse.
    AlmacenProducto::where('almacen_id', $almacen->id)->where('producto_id', $productoB->id)->increment('cantidad', 4);

    $copiaObsoleta = ImportacionProducto::findOrFail($importacion->id);
    deshacerImportacion($importacion)->assertSessionHasNoErrors();

    $peticion = Request::create('/', 'POST', ['motivo_reversion' => 'Segundo clic', 'password_confirmacion' => 'password']);
    $peticion->setUserResolver(fn () => auth()->user());
    $respuesta = app(ImportacionProductoController::class)->revertir($peticion, $copiaObsoleta);

    expect($respuesta->getSession()->get('errors')->first('revertir'))->toBe('Esta importación ya fue revertida por otra solicitud.');
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $productoB->id, 'cantidad' => 4]);
    expect($importacion->fresh()->motivo_reversion)->toBe('Se subió el archivo al almacén equivocado');
});

// ─── Historial: listado, detalle y vista previa de deshacer ────────────────

test('el historial lista las importaciones de la más reciente a la más vieja y se filtra por almacén', function () {
    $almacenUno = Almacen::factory()->create();
    $almacenDos = Almacen::factory()->create();
    importarExcel([['Producto Historial Uno', 'Cocina', null, null, null, null, 10, 3, null]], $almacenUno)->assertSessionHasNoErrors();
    importarExcel([['Producto Historial Dos', 'Cocina', null, null, null, null, 10, 4, null]], $almacenDos)->assertSessionHasNoErrors();

    $this->get(route('importaciones-productos.index'))
        ->assertInertia(fn ($page) => $page
            ->component('Productos/Importaciones/Index')
            ->has('importaciones.data', 2)
            ->where('importaciones.data.0.almacen', $almacenDos->nombre_almacen)
            ->where('importaciones.data.0.unidades_importadas', 4)
            ->where('importaciones.data.1.almacen', $almacenUno->nombre_almacen));

    $this->get(route('importaciones-productos.index', ['almacen_id' => $almacenUno->id]))
        ->assertInertia(fn ($page) => $page->has('importaciones.data', 1)->where('importaciones.data.0.almacen', $almacenUno->nombre_almacen));
});

test('un moderador ve el historial y su detalle, pero un vendedor es redirigido', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());

    $this->actingAs(User::factory()->moderador()->create());
    $this->get(route('importaciones-productos.index'))->assertOk();
    $this->get(route('importaciones-productos.show', $importacion->id))->assertOk();

    $this->actingAs(User::factory()->vendedor()->create());
    $this->get(route('importaciones-productos.index'))->assertRedirect(route('dashboard'));
    $this->get(route('importaciones-productos.show', $importacion->id))->assertRedirect(route('dashboard'));
});

test('el detalle muestra cada fila con su resultado y se filtra por resultado', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());

    $this->get(route('importaciones-productos.show', $importacion->id))
        ->assertInertia(fn ($page) => $page
            ->component('Productos/Importaciones/Show')
            ->where('importacion.estado', 'con_omitidas')
            ->where('puedeRevertir', true)
            ->has('filas.data', 4)
            ->where('filas.data.0.resultado', 'importada')
            ->where('filas.data.3.motivo', 'Falta el nombre del producto'));

    $this->get(route('importaciones-productos.show', ['importacion' => $importacion->id, 'resultado' => 'omitida']))
        ->assertInertia(fn ($page) => $page->has('filas.data', 1)->where('filas.data.0.resultado', 'omitida'));
});

test('el detalle no ofrece deshacer a un moderador ni cuando la importación ya no es revertible', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());

    $this->actingAs(User::factory()->moderador()->create());
    $this->get(route('importaciones-productos.show', $importacion->id))->assertInertia(fn ($page) => $page->where('puedeRevertir', false));

    $this->actingAs(User::factory()->admin()->create());
    $importacion->update(['estado' => 'revertida']);
    $this->get(route('importaciones-productos.show', $importacion->id))->assertInertia(fn ($page) => $page->where('puedeRevertir', false));
});

test('la vista previa de deshacer cuenta lotes y unidades sin modificar nada', function () {
    $almacen = Almacen::factory()->create();
    $importacion = importarParaDeshacer($almacen);

    $this->getJson(route('importaciones-productos.vista-previa-reversion', $importacion->id))
        ->assertOk()
        ->assertExactJson(['revertible' => true, 'lotes' => 2, 'unidades' => 8, 'bloqueos' => []]);

    expect(LoteStock::count())->toBe(2);
    expect($importacion->fresh()->estado)->toBe('con_omitidas');
});

test('la vista previa de deshacer lista los bloqueos cuando parte de lo importado ya se movió', function () {
    $importacion = importarParaDeshacer(Almacen::factory()->create());
    LoteStock::where('producto_id', Producto::where('nombre_producto', 'Producto Deshacer A')->value('id'))->update(['cantidad_disponible' => 1]);

    $this->getJson(route('importaciones-productos.vista-previa-reversion', $importacion->id))
        ->assertOk()
        ->assertJsonPath('revertible', false)
        ->assertJsonPath('bloqueos.0', fn (string $bloqueo) => str_contains($bloqueo, 'ya se usaron 2 de 3 unidades'));
});

test('la vista previa de una importación fallida o ya revertida dice que no se puede deshacer', function (string $estado) {
    $importacion = ImportacionProducto::factory()->create(['estado' => $estado]);

    $this->getJson(route('importaciones-productos.vista-previa-reversion', $importacion->id))
        ->assertOk()
        ->assertJsonPath('revertible', false)
        ->assertJsonPath('bloqueos.0', 'Solo se puede deshacer una importación completada.');
})->with(['fallida', 'revertida']);

test('al importar bien, el resultado estructurado llega al frontend con contadores y filas omitidas', function () {
    $almacen = Almacen::factory()->create();

    importarExcel([
        ['Producto Resultado', 'Cocina', null, null, null, null, 10, 3, null],
        [null, 'Cocina', null, null, null, null, 10, 2, null],
    ], $almacen)->assertSessionHas('importacion_resultado', fn (array $resultado) => $resultado['lotes_creados'] === 1
        && $resultado['unidades_importadas'] === 3
        && $resultado['filas_omitidas'] === 1
        && $resultado['almacen'] === $almacen->nombre_almacen
        && $resultado['omitidas'][0]['motivo'] === 'Falta el nombre del producto');
});
