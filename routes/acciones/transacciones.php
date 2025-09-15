<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal de las Transacciones
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // Nueva ruta para procesar la distribución de costos
        Route::post('transacciones/distribuir-costos', [TransaccionController::class, 'distribuirCostos'])->name('transacciones.distribuir-costos');
    }
);
