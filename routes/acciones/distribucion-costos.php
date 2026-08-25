<?php

use App\Http\Controllers\DistribucionCostosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('distribucion-costos', [DistribucionCostosController::class, 'index'])
        ->name('distribucion-costos.index');

    // Sin {compra} en el segmento de ruta a propósito — recibe una o varias compras por query
    // string (?compras[]=10&compras[]=11), ver DistribucionCostosController::mostrarFormularioDistribucion().
    Route::get('distribucion-costos/formulario', [DistribucionCostosController::class, 'mostrarFormularioDistribucion'])
        ->name('distribucion-costos.formulario');

    Route::post('distribucion-costos/distribuir', [DistribucionCostosController::class, 'distribuirCostosManual'])
        ->name('distribucion-costos.distribuir');

    // Omitir prorrateo de uno o varios movimientos en lote (housekeeping, sin cálculo) —
    // admin/moderador-only, chequeado inline en el controller.
    Route::post('distribucion-costos/movimientos/omitir', [DistribucionCostosController::class, 'omitirProrrateo'])
        ->name('distribucion-costos.movimientos.omitir');

    // Registradas antes de la ruta con {distribucion} para que "historial" nunca se intente
    // resolver como un ID de distribución.
    Route::get('distribucion-costos/historial', [DistribucionCostosController::class, 'historial'])
        ->name('distribucion-costos.historial');

    Route::get('distribucion-costos/{distribucion}', [DistribucionCostosController::class, 'show'])
        ->whereNumber('distribucion')
        ->name('distribucion-costos.show');
});
