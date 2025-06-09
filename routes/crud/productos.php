<?php

use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::resource('productos', ProductoController::class)->parameters([
            'productos' => 'producto',
        ]);

        // Para las Ventas
        Route::resource('disponibles', ProductoVendedorController::class);

        // Ruta específica para actualizar precio
        Route::patch('/disponibles/{producto}', [ProductoVendedorController::class, 'update'])
            ->name('disponibles.update');
    }
);
