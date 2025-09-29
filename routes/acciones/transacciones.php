<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // --- RUTAS DE DISTRIBUCIÓN DE COSTOS (EXISTENTES) ---

        // Vista principal de transacciones
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // Muestra el formulario para distribuir costos de una compra específica.
        Route::get('transacciones/distribuir-costos/{compra}', [TransaccionController::class, 'mostrarFormularioDistribucion'])
            ->name('transacciones.distribuir-costos.show');

        // Procesa la distribución manual.
        Route::post('transacciones/distribuir-costos-manual', [TransaccionController::class, 'distribuirCostosManual'])
            ->name('transacciones.distribuir-costos-manual');


        // --- RUTAS DE MOVIMIENTOS FINANCIEROS (NUEVAS) ---

        // Ruta para Gastos
        Route::post('transacciones/gastar', [TransaccionController::class, 'gastar'])
            ->name('transacciones.gastar');

        // Ruta para Ingreso
        Route::post('transacciones/ingresar', [TransaccionController::class, 'ingresar'])
            ->name('transacciones.ingresar');

        // Ruta para Transferencia
        Route::post('transacciones/transferir', [TransaccionController::class, 'transferir'])
            ->name('transacciones.transferir');
    }
);
