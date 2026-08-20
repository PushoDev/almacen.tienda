<?php

use App\Http\Controllers\DistribucionCostosController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('distribucion-costos', [DistribucionCostosController::class, 'index'])
        ->name('distribucion-costos.index');
});
