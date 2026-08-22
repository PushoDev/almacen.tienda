<?php

use App\Http\Controllers\MovimientosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
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

    // Editar productos/cantidades — solo mientras esté pendiente_confirmacion (antes de enviar)
    Route::post('/movimientos/{movimiento}/actualizar', [MovimientosController::class, 'actualizar'])
        ->name('movimientos.actualizar');

    // Acciones adicionales para el flujo de estados
    Route::post('/movimientos/{movimiento}/aprobar', [MovimientosController::class, 'aprobar'])
        ->name('movimientos.aprobar');

    Route::post('/movimientos/{movimiento}/enviar', [MovimientosController::class, 'enviar'])
        ->name('movimientos.enviar');

    Route::post('/movimientos/{movimiento}/recibir', [MovimientosController::class, 'recibir'])
        ->name('movimientos.recibir');

    Route::post('/movimientos/{movimiento}/rechazar', [MovimientosController::class, 'rechazar'])
        ->name('movimientos.rechazar');

    Route::get('/movimientos/{movimiento}/seguimiento', [MovimientosController::class, 'seguimiento'])
        ->name('movimientos.seguimiento');

    Route::get('/movimientos/reportes/discrepancias', [MovimientosController::class, 'reporteDiscrepancias'])
        ->name('movimientos.reportes.discrepancias');

    Route::get('/movimientos/{movimiento}', [MovimientosController::class, 'show'])
        ->name('movimientos.show');
});
