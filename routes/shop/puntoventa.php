<?php

use App\Http\Controllers\VentaController;
use App\Http\Controllers\CierreCajaController; // Importar nuevo controlador
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
    Route::get('/ventas/destinatarios/buscar', [VentaController::class, 'buscarDestinatarios'])->name('ventas.destinatarios.buscar');

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

    // Rutas de Compras: ver routes/acciones/compras.php (única fuente, ya no duplicadas acá — 2026-08-15).
});
