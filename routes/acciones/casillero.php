<?php

use App\Http\Controllers\CasilleroController;
use Illuminate\Support\Facades\Route;

// Casillero de Compras: solo el administrador (decisión del cliente, 2026-10-19). El moderador y
// el vendedor no lo ven. Ver docs/plan-casillero-de-compras.md.
Route::middleware(['auth', 'verified', 'admin.only'])->prefix('casillero')->name('casillero.')->group(function () {
    Route::get('/', [CasilleroController::class, 'index'])->name('index');
    Route::post('/cargos', [CasilleroController::class, 'storeCargo'])->name('cargos.store');
    Route::post('/cargos/{cargo}/anular', [CasilleroController::class, 'anularCargo'])->name('cargos.anular');
    Route::post('/compras/{compra}/llegada-panama', [CasilleroController::class, 'llegadaPanama'])->name('compras.llegada-panama');
});
