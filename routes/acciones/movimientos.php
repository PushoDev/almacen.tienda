<?php


use App\Http\Controllers\MovimientosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal para la interfaz de movimientos
        Route::get('/movimientos', [MovimientosController::class, 'index'])
            ->name('movimientos.index');

        // Obtener todos los almacenes disponibles (API)
        Route::get('/movimientos/almacenes', [MovimientosController::class, 'getAlmacenes'])
            ->name('movimientos.almacenes');

        // Obtener productos de un almacén específico (API)
        Route::get('/movimientos/almacenes/{id}/productos', [MovimientosController::class, 'getProductosPorAlmacen'])
            ->name('movimientos.productos-por-almacen');

        // Registrar nuevos movimientos (API)
        Route::post('/movimientos', [MovimientosController::class, 'store'])
            ->name('movimientos.store');
    }

);
