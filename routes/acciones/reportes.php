<?php

use App\Http\Controllers\ReporteController;
use App\Http\Controllers\Reportes\RastreoOperacionesController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::prefix('reportes')->name('reportes.')->group(function () {
        // --- PAGINA PRINCIPAL ---
        Route::get('/', [ReporteController::class, 'index'])->name('index');

        // --- REPORTES DE COMPRAS E INVENTARIO ---
        Route::get('/productos-mas-comprados', [ReporteController::class, 'productosMasComprados'])->name('productos_mas_comprados');
        Route::get('/compras-por-periodo', [ReporteController::class, 'comprasPorPeriodo'])->name('compras_por_periodo');
        Route::get('/balance-gastos-mensuales', [ReporteController::class, 'balanceGastosMensuales'])->name('balance_gastos_mensuales');
        Route::get('/compras-por-proveedor/{proveedorId?}', [ReporteController::class, 'comprasPorProveedor'])->name('compras_por_proveedor');
        Route::get('/inventario-por-almacen', [ReporteController::class, 'inventarioPorAlmacen'])->name('inventario_por_almacen');
        Route::get('/inventario-detallado-por-almacen', [ReporteController::class, 'inventarioDetalladoPorAlmacen'])->name('inventario_detallado_por_almacen');
        Route::get('/reporte-stock-bajo', [ReporteController::class, 'reporteStockBajo'])->name('reporte_stock_bajo');
        Route::get('/valor-inventario', [ReporteController::class, 'valorInventario'])->name('valor_inventario');

        // --- REPORTES DE VENTAS Y RENTABILIDAD ---
        Route::get('/productos-mas-vendidos', [ReporteController::class, 'productosMasVendidos'])->name('productos_mas_vendidos');
        Route::get('/ventas-por-periodo', [ReporteController::class, 'ventasPorPeriodo'])->name('ventas_por_periodo');
        Route::get('/ventas-por-vendedor', [ReporteController::class, 'ventasPorVendedor'])->name('ventas_por_vendedor');
        Route::get('/reporte-ganancias', [ReporteController::class, 'reporteGanancias'])->name('reporte_ganancias');

        // --- REPORTES FINANCIEROS Y OTROS ---
        Route::get('/historial-precios', [ReporteController::class, 'historialPrecios'])->name('historial_precios');
        Route::get('/historial-costo-precio', [ReporteController::class, 'historialCostoPrecio'])->name('historial_costo_precio');
        Route::get('/movimientos-financieros', [ReporteController::class, 'movimientosFinancieros'])->name('movimientos_financieros');
        Route::get('/rastreo-operaciones', RastreoOperacionesController::class)->name('rastreo_operaciones');
    });
});
