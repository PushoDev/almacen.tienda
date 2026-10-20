<?php

use App\Http\Controllers\CasilleroController;
use App\Http\Controllers\ContenedorController;
use Illuminate\Support\Facades\Route;

// Casillero de Compras: solo el administrador (decisión del cliente, 2026-10-19). El moderador y
// el vendedor no lo ven. Ver docs/plan-casillero-de-compras.md.
Route::middleware(['auth', 'verified', 'admin.only'])->prefix('casillero')->name('casillero.')->group(function () {
    Route::get('/', [CasilleroController::class, 'index'])->name('index');
    Route::post('/cargos', [CasilleroController::class, 'storeCargo'])->name('cargos.store');
    Route::post('/cargos/{cargo}/anular', [CasilleroController::class, 'anularCargo'])->name('cargos.anular');
    Route::post('/compras/{compra}/llegada-panama', [CasilleroController::class, 'llegadaPanama'])->name('compras.llegada-panama');

    // Contenedores (Fase 2): se arman con parte del casillero y llevan sus propios cargos.
    Route::prefix('contenedores')->name('contenedores.')->group(function () {
        Route::get('/', [ContenedorController::class, 'index'])->name('index');
        Route::post('/', [ContenedorController::class, 'store'])->name('store');
        Route::put('/{contenedor}', [ContenedorController::class, 'update'])->name('update');
        Route::put('/{contenedor}/unidades', [ContenedorController::class, 'asignarUnidades'])->name('unidades');
        Route::post('/{contenedor}/cargos', [ContenedorController::class, 'storeCargo'])->name('cargos.store');
        Route::post('/{contenedor}/cancelar', [ContenedorController::class, 'cancelar'])->name('cancelar');
    });
});
