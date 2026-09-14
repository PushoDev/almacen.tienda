<?php

use App\Http\Controllers\GastoController;
use App\Http\Controllers\IngresoController;
use App\Http\Controllers\RemesaController;
use App\Http\Controllers\TransaccionController;
use App\Http\Controllers\TransferenciaController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Vista principal de transacciones (hub de Gasto/Ingreso/Transferencia — la distribución
        // de costos se movió a Distribución de Costos, ver routes/acciones/distribucion-costos.php)
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

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

        // Remesas — solo admin/moderador (mueve dinero por 3 vías: entrada/salida/mensajero).
        Route::middleware('admin')->group(function () {
            Route::get('transacciones/remesa/data', [RemesaController::class, 'formData'])
                ->name('transacciones.remesa.data');
            Route::post('transacciones/remesa', [RemesaController::class, 'store'])
                ->name('transacciones.remesa.store');
        });
    }
);
