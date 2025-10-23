<?php

use App\Http\Controllers\ClienteController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\CompraController;
use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('clientes', ClienteController::class);

    // Rutas para ver detalles de operaciones específicas
    Route::get('ventas/{venta}', [VentaController::class, 'show'])->name('ventas.show');
    Route::get('compras/{compra}', [CompraController::class, 'show'])->name('compras.show');
    Route::get('transacciones/{movimiento}', [TransaccionController::class, 'show'])->name('transacciones.show');
});
