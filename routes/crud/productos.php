<?php

use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::resource('productos', ProductoController::class)->parameters([
            'productos' => 'producto',
        ]);

        // Rutas para importar/exportar
        // Exportar productos
        Route::get('/productos/exportar/excel', [ProductoController::class, 'export'])->name('productos.export');

        // Importar productos (con almacén opcional en request)
        Route::post('/productos/importar/excel', [ProductoController::class, 'import'])->name('productos.import');

        // Importar a almacén específico (ruta con parámetro)
        Route::post('/productos/importar/almacen/{almacenId}', [ProductoController::class, 'importToAlmacen'])->name('productos.import.almacen');

        // Plantilla (opcional)
        // Route::get('/productos/descargar/plantilla', [ProductoController::class, 'downloadTemplate'])->name('productos.template');

        // Ruta para agregar el precio de venta a los Productos
        Route::resource('disponibles', ProductoVendedorController::class);
    }
);
