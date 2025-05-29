<?php


use App\Http\Controllers\MovimientosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal para la interfaz de movimientos
        Route::get('/movimientos', [MovimientosController::class, 'index'])
            ->name('movimientos.index');


        Route::get('/movimientos/almacenes', [MovimientosController::class, 'getAlmacenes']);


        // Registrar nuevos movimientos
        Route::post('/movimientos', [MovimientosController::class, 'store'])
            ->name('movimientos.store');

        // Obtener productos de un almacén (API)
        Route::get('/almacenes/{id}/productos', [MovimientosController::class, 'getProductosPorAlmacen'])
            ->name('movimientos.productos-por-almacen');
    }

);
