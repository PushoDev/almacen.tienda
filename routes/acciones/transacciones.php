<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal de las Transacciones
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // Ruta para procesar la distribución de costos
        Route::post('transacciones/distribuir-costos', [TransaccionController::class, 'distribuirCostos'])->name('transacciones.distribuir-costos');

        // Rutas POST para las operaciones de movimiento de cuentas
        Route::post('transacciones/transferir', [TransaccionController::class, 'transferir'])->name('transacciones.transferir');
        Route::post('transacciones/retirar', [TransaccionController::class, 'retirar'])->name('transacciones.retirar');
        Route::post('transacciones/pagar-deuda', [TransaccionController::class, 'pagarDeuda'])->name('transacciones.pagar-deuda');
    }
);
