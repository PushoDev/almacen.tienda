<?php

use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
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

        // Rutas para importar/exportar
        // Exportar productos
        Route::get('/listado-productos/exportar/excel', [ProductoController::class, 'export'])->name('productos.export');

        // Importar productos (con almacén opcional en request)
        Route::post('/listado-productos/importar/excel', [ProductoController::class, 'import'])->name('productos.import');

        // Importar a almacén específico (ruta con parámetro)
        Route::post('/listado-productos/importar/almacen/{almacenId}', [ProductoController::class, 'importToAlmacen'])->name('productos.import.almacen');

        // Plantilla de importación
        Route::get('/listado-productos/descargar/plantilla', [ProductoController::class, 'downloadTemplate'])->name('productos.template');

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
