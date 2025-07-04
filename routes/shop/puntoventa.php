<?php

use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal de los Almacenes con Inertia.js
        Route::resource('punto-venta', VentaController::class)->parameters([
            'ventas' => 'venta',
        ]);
    }
);
