<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Vista principal de transacciones
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // NUEVA RUTA: Muestra el formulario para distribuir costos de una compra específica
        Route::get('transacciones/distribuir-costos/{compra}', [TransaccionController::class, 'mostrarFormularioDistribucion'])->name('transacciones.distribuir-costos.show');

        // Procesa la distribución manual
        Route::post('transacciones/distribuir-costos-manual', [TransaccionController::class, 'distribuirCostosManual'])->name('transacciones.distribuir-costos-manual');

        // Otras rutas de transacciones
        Route::post('transacciones/transferir', [TransaccionController::class, 'transferir'])->name('transacciones.transferir');
        Route::post('transacciones/retirar', [TransaccionController::class, 'retirar'])->name('transacciones.retirar');
        Route::post('transacciones/pagar-deuda', [TransaccionController::class, 'pagarDeuda'])->name('transacciones.pagar-deuda');
    }
);
