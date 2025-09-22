<?php

use App\Http\Controllers\TransaccionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Vista principal de transacciones
        Route::get('transacciones', [TransaccionController::class, 'index'])->name('transacciones');

        // Muestra el formulario para distribuir costos de una compra específica.
        // Esta es la ruta GET que te permite navegar a la vista 'DistribuirCostosView'.
        Route::get('transacciones/distribuir-costos/{compra}', [TransaccionController::class, 'mostrarFormularioDistribucion'])
            ->name('transacciones.distribuir-costos.show');


        Route::get('transacciones/distribuir-costos/{compra}', [TransaccionController::class, 'mostrarFormularioDistribucion'])
            ->name('transacciones.distribuir-costos.show');

        // Procesa la distribución manual. Esta ruta es POST, para enviar datos.
        Route::post('transacciones/distribuir-costos-manual', [TransaccionController::class, 'distribuirCostosManual'])
            ->name('transacciones.distribuir-costos-manual');
    }
);
