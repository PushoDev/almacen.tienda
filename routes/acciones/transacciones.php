<?php

use App\Http\Controllers\TransaccionController;
use App\Http\Controllers\GastoController;
use App\Http\Controllers\IngresoController;
use App\Http\Controllers\TransferenciaController;
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

        Route::post('/transacciones/distribuir-costos', [TransaccionController::class, 'distribuirCostosManual'])
            ->name('distribuir.costos.manual');


        // --- RUTAS DE MOVIMIENTOS FINANCIEROS INDEPENDIENTES ---

        // Gasto
        Route::post('transacciones/gastar', [GastoController::class, 'store'])
            ->name('transacciones.gastar');

        // Ingreso
        Route::get('transacciones/ingreso/data', [IngresoController::class, 'formData'])
            ->name('transacciones.ingreso.data');
        Route::post('transacciones/ingresar', [IngresoController::class, 'store'])
            ->name('transacciones.ingresar');

        // Transferencia
        Route::get('transacciones/transferencia/data', [TransferenciaController::class, 'formData'])
            ->name('transacciones.transferencia.data');
        Route::post('transacciones/transferir', [TransferenciaController::class, 'store'])
            ->name('transacciones.transferir');

        // ✅ Detalles de transacción
        Route::get('transacciones/{movimiento}', [TransaccionController::class, 'show'])
            ->name('transacciones.show');

        // ✅ Gastos por Transportación
        Route::post('transacciones/gasto-transportacion', [TransaccionController::class, 'gastoTransportacion'])
            ->name('transacciones.gasto-transportacion');
    }
);
