<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('auth/login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    /**
     * Administrador
     */
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');
    /**
     * Vendedor
     */
    Route::get('vendedor', function () {
        return Inertia::render('vendor');
    })->name('vendedor');

    /**
     * Rutas Principales
     */
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

    /**
     * Rutas de las Acciones Generales
     */
    // Logistica
    require __DIR__ . '/acciones/logistica.php';
    // Comprar Productos
    require __DIR__ . '/acciones/compras.php';
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
