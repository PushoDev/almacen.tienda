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

        // Ruta para registrar un Gasto (egreso de una sola cuenta)
        Route::post('movimientos/gasto', [TransaccionController::class, 'registrarGasto'])
            ->name('movimientos.gasto.store');

        // Ruta para registrar un Ingreso/Ganancia (ingreso a una sola cuenta)
        Route::post('movimientos/ingreso', [TransaccionController::class, 'registrarIngreso'])
            ->name('movimientos.ingreso.store');

        // Ruta para registrar una Transferencia Interna (origen y destino)
        Route::post('movimientos/transferencia', [TransaccionController::class, 'registrarTransferencia'])
            ->name('movimientos.transferencia.store');
    }
);
