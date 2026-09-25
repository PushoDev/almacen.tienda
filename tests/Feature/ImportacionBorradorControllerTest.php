<?php

use App\Models\Almacen;
use App\Models\ImportacionBorrador;
use App\Models\ImportacionProducto;
use App\Models\LoteStock;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;

function prepararBorrador(array $filas, Almacen $almacen): TestResponse
{
    return test()->post(route('importaciones-borradores.preparar'), [
        'file' => crearExcelImportacion($filas),
        'almacen_id' => $almacen->id,
    ]);
}

function filaBorrador(array $cambios = []): array
{
    return $cambios + [
        'nombre_producto' => 'Producto Hoja',
        'categoria' => 'Cocina',
        'marca' => '',
        'modelo' => '',
        'capacidad' => '',
        'color' => '',
        'precio_compra' => '10',
        'cantidad' => '3',
        'codigo_barras' => '',
    ];
}

beforeEach(function () {
    $this->actingAs(User::factory()->admin()->create());
});

test('subir un Excel crea un borrador con sus filas y no toca el inventario', function () {
    $almacen = Almacen::factory()->create();

    $respuesta = prepararBorrador([
        ['Olla Borrador', 'Cocina', null, null, null, null, 12.5, 4, 'BAR-BOR'],
        [null, null, null, null, null, null, null, null, null],
        ['Sin Stock Borrador', 'Cocina', null, null, null, null, null, 0, null],
    ], $almacen);

    $borrador = ImportacionBorrador::firstOrFail();
    $respuesta->assertRedirect(route('importaciones-borradores.show', $borrador->id));
    expect($borrador->almacen_id)->toBe($almacen->id);
    expect($borrador->nombre_archivo)->toBe('productos.xlsx');
    // La fila completamente vacía se descarta; los números llegan como texto.
    expect($borrador->filas)->toHaveCount(2);
    expect($borrador->filas[0])->toEqual(filaBorrador(['nombre_producto' => 'Olla Borrador', 'precio_compra' => '12.5', 'cantidad' => '4', 'codigo_barras' => 'BAR-BOR']));
    expect(Producto::count())->toBe(0);
    expect(LoteStock::count())->toBe(0);
    expect(ImportacionProducto::count())->toBe(0);
});

test('un archivo sin filas con datos, o que no es un Excel, no crea borrador y explica el motivo', function () {
    $almacen = Almacen::factory()->create();

    prepararBorrador([[null, null, null, null, null, null, null, null, null]], $almacen)
        ->assertSessionHasErrors(['file' => 'El archivo no tiene filas con datos para importar']);

    $this->post(route('importaciones-borradores.preparar'), [
        'file' => UploadedFile::fake()->create('notas.txt', 5, 'text/plain'),
        'almacen_id' => $almacen->id,
    ])->assertSessionHasErrors('file');

    expect(ImportacionBorrador::count())->toBe(0);
});

test('la vista de revisión muestra las filas del borrador a su dueño', function () {
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create();

    $this->get(route('importaciones-borradores.show', $borrador->id))
        ->assertInertia(fn ($page) => $page
            ->component('Productos/Importaciones/Revisar')
            ->where('borrador.id', $borrador->id)
            ->where('borrador.almacen', $borrador->almacen->nombre_almacen)
            ->has('filas', 1)
            ->where('filas.0.nombre_producto', 'Producto de borrador'));
});

test('un borrador solo lo ve y lo modifica su dueño (o un admin); otro moderador recibe 403', function () {
    $borrador = ImportacionBorrador::factory()->create(['user_id' => User::factory()->moderador()]);

    // Un admin puede ver el de cualquiera.
    $this->get(route('importaciones-borradores.show', $borrador->id))->assertOk();

    $this->actingAs(User::factory()->moderador()->create());
    $this->get(route('importaciones-borradores.show', $borrador->id))->assertForbidden();
    $this->put(route('importaciones-borradores.guardar', $borrador->id), ['filas' => [filaBorrador()]])->assertForbidden();
    $this->post(route('importaciones-borradores.confirmar', $borrador->id), ['filas' => [filaBorrador()]])->assertForbidden();
    $this->delete(route('importaciones-borradores.descartar', $borrador->id))->assertForbidden();

    expect(ImportacionBorrador::count())->toBe(1);
});

test('un vendedor no entra al flujo de revisión de importaciones (403)', function () {
    $this->actingAs(User::factory()->vendedor()->create());

    prepararBorrador([['Olla', 'Cocina', null, null, null, null, 10, 3, null]], Almacen::factory()->create())->assertForbidden();

    expect(ImportacionBorrador::count())->toBe(0);
});

test('guardar el borrador conserva las ediciones sin importar nada', function () {
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create();

    $this->put(route('importaciones-borradores.guardar', $borrador->id), [
        'filas' => [filaBorrador(['nombre_producto' => 'Corregido a mano', 'cantidad' => 7]), filaBorrador(['nombre_producto' => 'Fila agregada']), array_fill_keys(array_keys(filaBorrador()), '')],
    ])->assertSessionHasNoErrors();

    $filas = $borrador->fresh()->filas;
    expect($filas)->toHaveCount(2);
    expect($filas[0]['nombre_producto'])->toBe('Corregido a mano');
    expect($filas[0]['cantidad'])->toBe('7');
    expect(LoteStock::count())->toBe(0);
});

test('confirmar importa lo que hay en la hoja, con historial, y elimina el borrador', function () {
    $almacen = Almacen::factory()->create();
    prepararBorrador([['Olla Original', 'Cocina', null, null, null, null, 10, 3, null]], $almacen);
    $borrador = ImportacionBorrador::firstOrFail();

    // El usuario corrige la cantidad, agrega una fila a mano y otra sin stock.
    $respuesta = $this->post(route('importaciones-borradores.confirmar', $borrador->id), [
        'filas' => [
            filaBorrador(['nombre_producto' => 'Olla Original', 'cantidad' => '5']),
            filaBorrador(['nombre_producto' => 'Fila A Mano', 'precio_compra' => '8', 'cantidad' => '2']),
            filaBorrador(['nombre_producto' => 'Solo Historial', 'precio_compra' => '', 'cantidad' => '']),
        ],
    ]);

    $respuesta->assertRedirect(route('productos.index'));
    $respuesta->assertSessionHas('importacion_resultado', fn (array $r) => $r['lotes_creados'] === 2 && $r['unidades_importadas'] === 7 && $r['productos_sin_stock'] === 1);
    $olla = Producto::where('nombre_producto', 'Olla Original')->firstOrFail();
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => $olla->id, 'cantidad' => 5]);
    $this->assertDatabaseHas('lotes_stock', ['producto_id' => $olla->id, 'cantidad' => 5, 'precio_costo' => 10]);
    $this->assertDatabaseHas('almacen_producto', ['almacen_id' => $almacen->id, 'producto_id' => Producto::where('nombre_producto', 'Solo Historial')->value('id'), 'cantidad' => 0]);
    expect(LoteStock::count())->toBe(2);
    $importacion = ImportacionProducto::firstOrFail();
    expect($importacion->nombre_archivo)->toBe('productos.xlsx');
    expect($importacion->hash_archivo)->toBe($borrador->hash_archivo);
    expect(ImportacionBorrador::count())->toBe(0);
});

test('las filas con error de la hoja se omiten con su motivo y no impiden importar las demás', function () {
    $almacen = Almacen::factory()->create();
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create(['almacen_id' => $almacen->id]);

    $this->post(route('importaciones-borradores.confirmar', $borrador->id), [
        'filas' => [
            filaBorrador(['nombre_producto' => 'Fila Buena']),
            filaBorrador(['nombre_producto' => 'Sin Precio', 'precio_compra' => '', 'cantidad' => '4']),
        ],
    ])->assertSessionHasNoErrors();

    expect(LoteStock::count())->toBe(1);
    $this->assertDatabaseHas('importaciones_producto_filas', ['nombre_producto' => 'Sin Precio', 'resultado' => 'omitida', 'fila' => 3]);
    expect(ImportacionProducto::firstOrFail()->estado)->toBe('con_omitidas');
});

test('confirmar sin ninguna fila con datos, o con un nombre demasiado largo, falla con un mensaje y conserva el borrador', function () {
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create();

    $this->post(route('importaciones-borradores.confirmar', $borrador->id), ['filas' => [filaBorrador(['nombre_producto' => '', 'precio_compra' => '', 'cantidad' => '', 'categoria' => ''])]])
        ->assertSessionHasErrors(['filas' => 'No hay filas con datos para importar']);

    $this->post(route('importaciones-borradores.confirmar', $borrador->id), ['filas' => [filaBorrador(), filaBorrador(['nombre_producto' => str_repeat('x', 300)])]])
        ->assertSessionHasErrors(['filas.1.nombre_producto' => 'La fila 2 tiene un nombre de más de 255 caracteres']);

    expect(ImportacionBorrador::count())->toBe(1);
    expect(ImportacionProducto::count())->toBe(0);
});

test('confirmar un archivo que ya se importó en ese almacén avisa, y sigue solo si el usuario lo confirma', function () {
    $almacen = Almacen::factory()->create();
    $previa = ImportacionProducto::factory()->create(['almacen_id' => $almacen->id, 'hash_archivo' => 'abc']);
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create(['almacen_id' => $almacen->id, 'hash_archivo' => 'abc']);
    $datos = ['filas' => [filaBorrador()]];

    $this->post(route('importaciones-borradores.confirmar', $borrador->id), $datos)
        ->assertSessionHas('importacion_repetida', fn (array $aviso) => $aviso['id'] === $previa->id);
    expect(LoteStock::count())->toBe(0);
    expect(ImportacionBorrador::count())->toBe(1);

    $this->post(route('importaciones-borradores.confirmar', $borrador->id), $datos + ['confirmar_repetido' => true])
        ->assertSessionMissing('importacion_repetida')
        ->assertRedirect(route('productos.index'));
    expect(LoteStock::count())->toBe(1);
});

test('descartar elimina el borrador sin importar nada', function () {
    $borrador = ImportacionBorrador::factory()->for(auth()->user())->create();

    $this->delete(route('importaciones-borradores.descartar', $borrador->id))->assertRedirect(route('importaciones-productos.index'));

    expect(ImportacionBorrador::count())->toBe(0);
    expect(LoteStock::count())->toBe(0);
});

test('el historial lista los borradores pendientes del propio usuario, no los de otros', function () {
    $propio = ImportacionBorrador::factory()->for(auth()->user())->create();
    ImportacionBorrador::factory()->create(['user_id' => User::factory()->moderador()]);

    $this->get(route('importaciones-productos.index'))
        ->assertInertia(fn ($page) => $page->has('borradores', 1)->where('borradores.0.id', $propio->id)->where('borradores.0.filas', 1));
});
