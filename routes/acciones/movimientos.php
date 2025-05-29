<?php


use App\Http\Controllers\MovimientosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        /**
         * Ruta de Moviientos
         */
        Route::resource('movimientos', MovimientosController::class);

        /**
         * Interactuar Api para los Almacenes
         */
        Route::prefix('movimientos')->name('movimientos')->group(
            function () {
                // Ruta de seleccion de almacen
                Route::get('/almacen', [MovimientosController::class, 'getAlmacen']);
            }
        );
    }

);
