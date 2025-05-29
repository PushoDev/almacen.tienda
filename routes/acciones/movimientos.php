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
         * Interactuar con los productos de los almacenes
         */
        Route::get('/almacenes/{id}/productos', [MovimientosController::class, 'getProductosPorAlmacen']);
    }

);
