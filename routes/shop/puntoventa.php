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

    // Obtener clientes
    Route::get('/ventas/clientes', [VentaController::class, 'getClientes'])->name('ventas.getClientes');

    // Obtener cuentas
    Route::get('/ventas/cuentas', [VentaController::class, 'getCuentas'])->name('ventas.getCuentas');

    // Ruta para tasa de cambio USD
    Route::get('/ventas/tasausd', [VentaController::class, 'getTasaUSD'])->name('ventas.getTasaUSD');

    // Ruta para procesar venta
    Route::post('/ventas/procesar', [VentaController::class, 'procesarVenta'])->name('ventas.procesar');
});
