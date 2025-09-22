<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Vista principal
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // Distribución automática (la que ya existe)
        Route::post('transacciones/distribuir-costos', [TransaccionController::class, 'distribuirCostos'])->name('transacciones.distribuir-costos');

        // Distribución manual (nueva)
        Route::post('transacciones/distribuir-costos-manual', [TransaccionController::class, 'distribuirCostosManual'])->name('transacciones.distribuir-costos-manual');

        // Movimientos de cuentas
        Route::post('transacciones/transferir', [TransaccionController::class, 'transferir'])->name('transacciones.transferir');
        Route::post('transacciones/retirar', [TransaccionController::class, 'retirar'])->name('transacciones.retirar');
        Route::post('transacciones/pagar-deuda', [TransaccionController::class, 'pagarDeuda'])->name('transacciones.pagar-deuda');
    }
);
