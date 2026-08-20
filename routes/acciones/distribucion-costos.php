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
});
