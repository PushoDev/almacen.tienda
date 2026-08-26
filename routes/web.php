<?php

use App\Http\Controllers\ReporteController;
use App\Http\Controllers\EcommerceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AdminController;

// ============================================
// COMERCIO ELECTRONICO - Catálogo de Tiendas
// ============================================

// Página principal del ecommerce con selector de almacén
// Route::get('/', [EcommerceController::class, 'index'])->name('Inicio');

// Productos (mismo ecommerce)
// Route::get('/productos', [EcommerceController::class, 'index'])->name('productos');

// Carrito (mismo ecommerce)
// Route::get('/carrito', [EcommerceController::class, 'index'])->name('Carrito');

// API público de catálogo de tienda (sin autenticación)
Route::prefix('api/tienda')->middleware('throttle:60,1')->group(function () {
    Route::get('almacenes', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'indexAlmacenes']);
    Route::get('almacenes/{id}', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'showAlmacen']);
    Route::get('almacenes/{id}/productos', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'productosPorAlmacen']);
    Route::get('productos', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'searchProductos']);
    Route::get('productos/{id}', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'showProducto']);
    Route::get('productos/{id}/stock', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'stockPorProducto']);
    Route::get('categorias', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'indexCategorias']);
    Route::get('docs/openapi.json', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'openApiSpec']);
    Route::get('docs', [\App\Http\Controllers\Api\CatalogoPublicoController::class, 'swaggerUi']);
});

// API Routes para Ecommerce (sin autenticación)
// Route::prefix('api/ecommerce')->group(function () {
//     Route::get('/puntos-venta', [EcommerceController::class, 'getPuntosVenta'])->name('api.ecommerce.puntos-venta');
//     Route::post('/almacen/select', [EcommerceController::class, 'setAlmacenSesion'])->name('api.ecommerce.select-almacen');
//     Route::get('/almacen/actual', [EcommerceController::class, 'getAlmacenSesion'])->name('api.ecommerce.almacen-actual');
//     Route::get('/almacen/productos', [EcommerceController::class, 'getProductosAlmacen'])->name('api.ecommerce.productos');
// });

/**
 * Entrada al Panel Administradtivo
 */
// Sistema de Logistica
Route::get('/', function () {
    return Inertia::render('auth/login');
})->name('home');



Route::middleware(['auth', 'verified'])->group(function () {

    /**
     * Dashboard para todos los usuarios
     */
    Route::get('dashboard', [AdminController::class, 'index'])->name('dashboard');
    Route::post('dashboard/update-tasa', [AdminController::class, 'update'])->name('dashboard.update')->middleware('admin');
    Route::post('dashboard/update-tasa-mlc', [AdminController::class, 'updateMLC'])->name('dashboard.update-mlc')->middleware('admin');
    Route::get('/dashboard/chart-data', [ReporteController::class, 'getComprasVentasData'])->name('dashboard.chart.data');
    Route::get('/dashboard/financial-states', [ReporteController::class, 'getFinancialStates'])->name('dashboard.financial.states');
    Route::get('/dashboard/usuarios', [ReporteController::class, 'getUsuarios'])->name('dashboard.usuarios')->middleware('admin');
    Route::get('/dashboard/monedas', [ReporteController::class, 'getMonedas'])->name('dashboard.monedas');
    Route::get('/dashboard/historial-comparaciones', [AdminController::class, 'getHistorialComparaciones'])->name('dashboard.historial.comparaciones');
    Route::get('/dashboard/estadisticas-costo-precio', [AdminController::class, 'getEstadisticasCostoPrecio'])->name('dashboard.estadisticas.costo_precio');
    Route::get('/dashboard/historial-comparaciones/view', function () {
        return Inertia::render('dashboard/historial-comparaciones');
    })->name('dashboard.historial.comparaciones.view');

    /**
     * Notificaciones
     */
    Route::get('/notifications', [App\Http\Controllers\NotificationController::class, 'index'])->name('notifications.index');
    Route::get('/notifications/history', [App\Http\Controllers\NotificationController::class, 'history'])->name('notifications.history');
    Route::post('/notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
    Route::post('/notifications/mark-all-read', [App\Http\Controllers\NotificationController::class, 'markAllAsRead'])->name('notifications.markAllAsRead');

    /**
     * Rutas Principales
     */
    // Empleados
    require __DIR__ . '/empleados/empleados.php';
    // Categorias
    require __DIR__ . '/crud/categorias.php';
    // Productos
    require __DIR__ . '/crud/productos.php';
    // Almacen
    require __DIR__ . '/crud/almacenes.php';
    // Proveedores
    require __DIR__ . '/crud/proveedores.php';
    // Cuentas
    require __DIR__ . '/crud/cuentas.php';
    // Clientes
    require __DIR__ . '/crud/clientes.php';
    // Monedas
    require __DIR__ . '/crud/monedas.php';

    /**
     * Rutas de las Acciones Generales
     */
    // Logistica
    require __DIR__ . '/acciones/logistica.php';
    // Comprar Productos
    require __DIR__ . '/acciones/compras.php';

    // Transacciones
    require __DIR__ . '/acciones/transacciones.php';

    // Distribución de Costos
    require __DIR__ . '/acciones/distribucion-costos.php';

    //    Remesas
    require __DIR__ . '/acciones/remesas.php';

    // Venta Productos
    require __DIR__ . '/shop/puntoventa.php';
    // Reportes
    require __DIR__ . '/acciones/reportes.php';
    // Movimientos
    require __DIR__ . '/acciones/movimientos.php';
    // Calendario de Historial
    require __DIR__ . '/acciones/calendario.php';
});


require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
