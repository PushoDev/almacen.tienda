<?php

use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Detección y fusión de productos duplicados (DEBE ir ANTES del resource)
        Route::get('/listado-productos/duplicados', [ProductoController::class, 'duplicados'])->name('productos.duplicados');
        Route::post('/listado-productos/normalizar-duplicados', [ProductoController::class, 'normalizarDuplicados'])->name('productos.normalizar');
        Route::post('/listado-productos/fusionar-duplicados', [ProductoController::class, 'fusionarDuplicados'])->name('productos.fusionar');

        Route::resource('listado-productos', ProductoController::class)->parameters([
            'listado-productos' => 'producto',
        ])->names([
            'index' => 'productos.index',
            'create' => 'productos.create',
            'store' => 'productos.store',
            'show' => 'productos.show',
            'edit' => 'productos.edit',
            'update' => 'productos.update',
            'destroy' => 'productos.destroy',
        ]);

        // Ruta para transferir cantidad entre códigos o agregar un nuevo código escaneado
        Route::post('/listado-productos/{producto}/transferir-codigo', [ProductoController::class, 'transferirCodigo'])
            ->name('productos.transferir-codigo');

        // Override opcional de precio de venta por lote puntual ("Opción A", ver Edit.tsx/Show.tsx)
        Route::put('/listado-productos/{producto}/lotes/{lote}/precio-venta', [ProductoController::class, 'actualizarPrecioVentaLote'])
            ->name('productos.lotes.precio-venta');

        // Rutas para importar/exportar
        // Exportar productos
        Route::get('/listado-productos/exportar/excel', [ProductoController::class, 'export'])->name('productos.export');

        // Importar productos (con almacén opcional en request)
        Route::post('/listado-productos/importar/excel', [ProductoController::class, 'import'])->name('productos.import');

        // Importar a almacén específico (ruta con parámetro)
        Route::post('/listado-productos/importar/almacen/{almacenId}', [ProductoController::class, 'importToAlmacen'])->name('productos.import.almacen');

        // Plantilla de importación
        Route::get('/listado-productos/descargar/plantilla', [ProductoController::class, 'downloadTemplate'])->name('productos.template');

        // Actualizar precio/comisión en varios almacenes a la vez (exclusivo admin).
        // Debe ir ANTES del resource para que no la intercepte PUT /disponibles/{disponible}.
        Route::put('/disponibles/bulk-actualizar', [ProductoVendedorController::class, 'updateBulk'])
            ->middleware('admin.only')
            ->name('disponibles.bulk-actualizar');

        // Ruta para agregar el precio de venta a los Productos
        Route::resource('disponibles', ProductoVendedorController::class);

        // 🆕 NUEVA RUTA: Ver precios de vendedores para un producto en un almacén específico
        // IMPORTANTE: Esta debe ir ANTES del resource para que no sea interceptada por {disponible}
        Route::get(
            '/disponibles/{producto}/precios-vendedores/{almacen}',
            [ProductoVendedorController::class, 'preciosPorVendedor']
        )->name('disponibles.precios-vendedores');

        // 🆕 NUEVA RUTA: Establecer precio base por administrador
        Route::post(
            '/disponibles/{producto}/precios-base',
            [ProductoVendedorController::class, 'setPreciosBase']
        )->name('disponibles.precios-base');

        // Exportar/importar precios de vendedor por almacén
        Route::get('/disponibles/almacen/{almacen}/exportar', [ProductoVendedorController::class, 'exportExcel'])->name('disponibles.exportar');
        Route::post('/disponibles/almacen/{almacen}/importar', [ProductoVendedorController::class, 'importExcel'])->name('disponibles.importar');
    }
);
