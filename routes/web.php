<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('auth/login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

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
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
