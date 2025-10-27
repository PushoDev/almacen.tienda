<?php

use App\Http\Controllers\ReporteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\AdminController;

// Comercio Electronico
Route::get('/', function () {
    return Inertia::render('Ecommerce/Index');
})->name('Inicio');


// Sistema de Logistica
Route::get('/sistema', function () {
    return Inertia::render('auth/login');
})->name('home');



Route::middleware(['auth', 'verified'])->group(function () {

    /**
     * Administrador
     */
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::get('dashboard', [AdminController::class, 'index'])->name('dashboard');
        Route::post('dashboard/update-tasa', [AdminController::class, 'update'])->name('dashboard.update');
        Route::post('dashboard/update-tasa-mlc', [AdminController::class, 'updateMLC'])->name('dashboard.update-mlc');
        // Reporte Chatjs de Compra y Venta
        Route::get('/dashboard/chart-data', [ReporteController::class, 'getComprasVentasData'])->name('dashboard.chart.data');
    });
    /**
     * Vendedor
     */
    Route::get('vendedor', function () {
        return Inertia::render('vendor');
    })->name('vendedor');

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

    //    Remesas
    require __DIR__ . '/acciones/remesas.php';

    // Venta Productos
    require __DIR__ . '/shop/puntoventa.php';
    // Reportes
    require __DIR__ . '/acciones/reportes.php';
    // Movimientos
    require __DIR__ . '/acciones/movimientos.php';

    /**
     * Punto de Venta
     */
    require __DIR__ . '/vendor/vendedor.php';


    /**
     * Rutas de Errores
     */
    // 404

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
