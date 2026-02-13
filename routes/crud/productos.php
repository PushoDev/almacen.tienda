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

        // Ruta para regenerar código de barras desde la UI (Inertia)
        Route::post('/listado-productos/{producto}/regenerar-barcode', [ProductoController::class, 'regenerarBarcode'])
            ->name('productos.regenerar-barcode');

        // Rutas para importar/exportar
        // Exportar productos
        Route::get('/listado-productos/exportar/excel', [ProductoController::class, 'export'])->name('productos.export');

        // Importar productos (con almacén opcional en request)
        Route::post('/listado-productos/importar/excel', [ProductoController::class, 'import'])->name('productos.import');

        // Importar a almacén específico (ruta con parámetro)
        Route::post('/listado-productos/importar/almacen/{almacenId}', [ProductoController::class, 'importToAlmacen'])->name('productos.import.almacen');

        // Plantilla (opcional)
        // Route::get('/productos/descargar/plantilla', [ProductoController::class, 'downloadTemplate'])->name('productos.template');

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
    }
);
