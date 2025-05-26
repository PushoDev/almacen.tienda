<?php

use App\Http\Controllers\ReporteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('reportes')->name('reportes.')->group(function () {
        // Página principal del panel de reportes
        Route::get('/', [ReporteController::class, 'index'])->name('index');

        // Reporte: Productos Más Comprados
        Route::get('/productos-mas-comprados', [ReporteController::class, 'productosMasComprados'])
            ->name('productos_mas_comprados');

        // Reporte: Compras por Período
        Route::get('/compras-por-periodo', [ReporteController::class, 'comprasPorPeriodo'])
            ->name('compras_por_periodo');

        // Reporte: Balance Mensual
        Route::get('/balance-gastos-mensuales', [ReporteController::class, 'balanceGastosMensuales'])
            ->name('balance_gastos_mensuales');

        // Reporte: Compras por Proveedor
        Route::get('/compras-por-proveedor/{proveedorId?}', [ReporteController::class, 'comprasPorProveedor'])
            ->name('compras_por_proveedor');

        // Cantidad de Productos por Almacén
        Route::get('/productos-por-almacen', [ReporteController::class, 'productosPorAlmacen'])
            ->name('productos_por_almacen');

        // Lista detallada de productos por almacén
        Route::get('/productos-por-almacen-detalle', [ReporteController::class, 'productosPorAlmacenDetalle'])
            ->name('productos_por_almacen_detalle');
    });
});
