<?php

use App\Http\Controllers\VentaController;
use App\Http\Controllers\CompraController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Rutas para Ventas (actualizadas)
    Route::get('/punto-venta', [VentaController::class, 'index'])->name('punto-venta.index');
    Route::get('/ventas/{id}/show', [VentaController::class, 'show'])->name('ventas.show');
    Route::get('/ventas/almacenes', [VentaController::class, 'getAlmacenes'])->name('ventas.getAlmacenes');
    Route::get('/ventas/almacenes/{id}/productos', [VentaController::class, 'getProductosPorAlmacen'])->name('ventas.getProductosPorAlmacen');
    Route::get('/ventas/clientes', [VentaController::class, 'getClientes'])->name('ventas.getClientes');
    Route::get('/ventas/cuentas', [VentaController::class, 'getCuentas'])->name('ventas.getCuentas');
    Route::get('/ventas/cuentas/filtradas', [VentaController::class, 'getCuentasFiltradas'])->name('ventas.getCuentasFiltradas');
    Route::get('/ventas/monedas', [VentaController::class, 'getMonedas'])->name('ventas.getMonedas');
    Route::post('/ventas/procesar', [VentaController::class, 'procesarVenta'])->name('ventas.procesar');
    Route::post('/ventas/validar-stock', [VentaController::class, 'validarStock'])->name('ventas.validarStock');

    // Estado de las Ventas
    Route::get('/ventas/listado', [VentaController::class, 'listadoVentas'])->name('ventas.listado');
    Route::post('/ventas/{venta}/aprobar', [VentaController::class, 'aprobarVenta'])->name('ventas.aprobar');
    Route::post('/ventas/{venta}/anular', [VentaController::class, 'anularVenta'])->name('ventas.anular');

    // Rutas para Compras (mantenidas)
    Route::get('/compras/almacenes', [CompraController::class, 'getAlmacen'])->name('compras.almacenes');
    Route::get('/compras/proveedores', [CompraController::class, 'getProveedor'])->name('compras.proveedores');
    Route::get('/compras/categorias', [CompraController::class, 'getCategorias'])->name('compras.categorias');
    Route::get('/compras/cuentas/pago', [CompraController::class, 'getCuentas'])->name('compras.cuentas.pago');
    Route::get('/compras/clientes/fisicos', [CompraController::class, 'getClientesFisicos'])->name('compras.clientes.fisicos');
    Route::post('/comprar', [CompraController::class, 'store'])->name('comprar.store');
    Route::get('/compras/almacenes/{id}/productos', [CompraController::class, 'getProductos'])->name('compras.getProductos');
});
