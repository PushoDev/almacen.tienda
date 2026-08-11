<?php

use App\Http\Controllers\VentaController;
use App\Http\Controllers\CierreCajaController; // Importar nuevo controlador
use App\Http\Controllers\CompraController; // Asegúrate de importar el controlador de Compras
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // ========================================================================
    // VISTAS PRINCIPALES
    // ========================================================================

    Route::get('/punto-venta', [VentaController::class, 'index'])->name('punto-venta.index');
    Route::get('/ventas/listado', [VentaController::class, 'listadoVentas'])->name('ventas.listado');
    Route::get('/ventas/{id}/show', [VentaController::class, 'show'])->name('ventas.show');
    // Rutas de Cierres (Sin verified para evitar 403 accidentales)
    Route::get('/vendor/cierres', [CierreCajaController::class, 'index'])->name('ventas.cierres');
    Route::get('/vendor/cierres/crear', [CierreCajaController::class, 'create'])->name('ventas.cierres.create');
    Route::post('/vendor/cierres', [CierreCajaController::class, 'store'])->name('ventas.cierres.store');
    Route::get('/vendor/cierres/{id}', [CierreCajaController::class, 'show'])->name('ventas.cierres.show');
    Route::post('/vendor/cierres/{id}/aprobar', [CierreCajaController::class, 'aprobar'])->name('ventas.cierres.aprobar');
    Route::get('/ventas/reporte-diario', [VentaController::class, 'showReporteDiarioView'])->name('ventas.reporte.diario');

    // ========================================================================
    // DATOS PARA FORMULARIOS (APIs)
    // ========================================================================

    Route::get('/ventas/reporte-data', [VentaController::class, 'getVentasReporte'])->name('ventas.reporte.data');
    Route::post('/ventas/clientes/store', [VentaController::class, 'storeClienteForVenta'])->name('ventas.cliente.store');
    Route::get('/ventas/almacenes', [VentaController::class, 'getAlmacenes'])->name('ventas.getAlmacenes');
    Route::get('/ventas/almacenes/{id}/productos', [VentaController::class, 'getProductosPorAlmacen'])->name('ventas.getProductosPorAlmacen');
    Route::get('/ventas/cuentas', [VentaController::class, 'getCuentas'])->name('ventas.getCuentas');
    Route::get('/ventas/cuentas/filtradas', [VentaController::class, 'getCuentasFiltradas'])->name('ventas.getCuentasFiltradas');
    Route::get('/ventas/cuentas/gestor', [VentaController::class, 'getCuentasParaGestor'])->name('ventas.getCuentasParaGestor');
    Route::get('/ventas/monedas', [VentaController::class, 'getMonedas'])->name('ventas.getMonedas');

    Route::get('/ventas/clientes', [VentaController::class, 'getClientes'])->name('ventas.getClientes');
    // ✅ NUEVA RUTA PARA CLIENTES FÍSICOS EN PAGOS
    Route::get('/ventas/clientes-fisicos-pago', [VentaController::class, 'getClientesFisicosParaPago'])->name('ventas.getClientesFisicosParaPago');

    // ========================================================================
    // PROCESAMIENTO DE VENTAS
    // ========================================================================

    Route::post('/ventas/procesar', [VentaController::class, 'procesarVenta'])->name('ventas.procesar');
    Route::post('/ventas/validar-stock', [VentaController::class, 'validarStock'])->name('ventas.validarStock');
    Route::post('/ventas/actualizar-tasas', [VentaController::class, 'actualizarTasas'])->name('ventas.actualizarTasas');

    // ========================================================================
    // GESTIÓN DE DESTINATARIOS
    // ========================================================================

    Route::post('/ventas/{venta}/destinatario', [VentaController::class, 'guardarDestinatario'])->name('ventas.destinatario.store');

    // ========================================================================
    // ESTADO Y GESTIÓN DE VENTAS
    // ========================================================================

    Route::post('/ventas/{venta}/aprobar', [VentaController::class, 'aprobarVenta'])->name('ventas.aprobar');
    Route::post('/ventas/{venta}/anular', [VentaController::class, 'anularVenta'])->name('ventas.anular');
    Route::post('/ventas/{venta}/editar-pendiente', [VentaController::class, 'editarVentaPendiente'])->name('ventas.editar.pendiente');
    Route::post('/ventas/{venta}/distribucion', [VentaController::class, 'guardarDistribucion'])->name('ventas.distribucion.store');

    // ========================================================================
    // VENTAS ESPECIALES
    // ========================================================================
    Route::post('/ventas/{venta}/especial/aprobar', [VentaController::class, 'aprobarSolicitudEspecial'])->name('ventas.especial.aprobar');
    Route::post('/ventas/{venta}/especial/rechazar', [VentaController::class, 'rechazarSolicitudEspecial'])->name('ventas.especial.rechazar');
    Route::post('/ventas/{venta}/decision-notificada', [VentaController::class, 'marcarDecisionNotificada'])->name('ventas.decision.notificada');

    // Rutas para Compras (nuevas) — solo admin, mismo criterio que routes/acciones/compras.php
    Route::middleware('admin.only')->group(function () {
        Route::get('/compras/almacenes', [CompraController::class, 'getAlmacen'])->name('compras.almacenes');
        Route::get('/compras/proveedores', [CompraController::class, 'getProveedor'])->name('compras.proveedores');
        Route::get('/compras/categorias', [CompraController::class, 'getCategorias'])->name('compras.categorias');
        Route::get('/compras/cuentas/pago', [CompraController::class, 'getCuentas'])->name('compras.cuentas.pago');
        Route::get('/compras/clientes/fisicos', [CompraController::class, 'getClientesFisicos'])->name('compras.clientes.fisicos');
        Route::post('/comprar', [CompraController::class, 'store'])->name('comprar.store');

        // Ruta adicional para obtener productos de compras (si es necesaria)
        Route::get('/compras/almacenes/{id}/productos', [CompraController::class, 'getProductos'])->name('compras.getProductos');
    });
});
