<?php

use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Ruta principal del punto de venta
    Route::get('/punto-venta', [VentaController::class, 'index'])->name('punto-venta.index');

    // Obtener almacenes del usuario
    Route::get('/ventas/almacenes', [VentaController::class, 'getAlmacenes'])->name('ventas.getAlmacenes');

    // Obtener productos de un almacén
    Route::get('/ventas/almacenes/{id}/productos', [VentaController::class, 'getProductosPorAlmacen'])->name('ventas.getProductosPorAlmacen');
});
