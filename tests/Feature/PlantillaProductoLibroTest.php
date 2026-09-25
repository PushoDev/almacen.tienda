<?php

use App\Models\Almacen;
use App\Models\ImportacionBorrador;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

beforeEach(function () {
    $this->actingAs(User::factory()->admin()->create());
});

function descargarPlantilla(): Spreadsheet
{
    $respuesta = test()->get(route('productos.template'));
    $respuesta->assertOk();

    return IOFactory::load($respuesta->baseResponse->getFile()->getPathname());
}

test('la plantilla trae la hoja Productos primero, vacía y con las columnas que espera el importador, y una hoja Instrucciones', function () {
    $libro = descargarPlantilla();

    expect($libro->getSheetNames())->toBe(['Productos', 'Instrucciones']);

    $productos = $libro->getSheetByName('Productos');
    expect(array_map(fn ($celda) => $productos->getCell($celda.'1')->getValue(), range('A', 'I')))
        ->toBe(['nombre_producto', 'categoria', 'marca', 'modelo', 'capacidad', 'color', 'precio_compra', 'cantidad', 'codigo_barras']);
    // Sin filas de ejemplo: lo que hubiera en esta hoja se importaría como stock real.
    expect($productos->getCell('A2')->getValue())->toBeNull();
});

test('la hoja Instrucciones explica las columnas, las reglas del import y trae un ejemplo lleno', function () {
    $texto = collect(descargarPlantilla()->getSheetByName('Instrucciones')->toArray())->flatten()->filter()->implode(' | ');

    expect($texto)
        ->toContain('Cómo llenar la plantilla')
        ->toContain('LOTE NUEVO')
        ->toContain('Importar nunca resta stock')
        ->toContain('Cable HDMI 2.0');
});

test('una plantilla llenada por el usuario se lee bien: el importador toma la hoja Productos aunque exista Instrucciones', function () {
    $libro = descargarPlantilla();
    $productos = $libro->getSheetByName('Productos');
    $productos->fromArray([
        ['Olla Plantilla', 'Cocina', 'Oster', 'X1', '5L', 'Rojo', 30, 4, ''],
        ['Solo Historial Plantilla', 'Cocina', '', '', '', '', '', 0, ''],
    ], null, 'A2', true);

    $ruta = tempnam(sys_get_temp_dir(), 'plantilla').'.xlsx';
    IOFactory::createWriter($libro, 'Xlsx')->save($ruta);

    $this->post(route('importaciones-borradores.preparar'), [
        'file' => new UploadedFile($ruta, 'plantilla.xlsx', null, null, true),
        'almacen_id' => Almacen::factory()->create()->id,
    ])->assertSessionHasNoErrors();

    $filas = ImportacionBorrador::firstOrFail()->filas;
    expect($filas)->toHaveCount(2);
    expect($filas[0]['nombre_producto'])->toBe('Olla Plantilla');
    expect($filas[0]['precio_compra'])->toBe('30');
    expect($filas[1]['cantidad'])->toBe('0');
});
