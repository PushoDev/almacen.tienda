<?php

use App\Http\Controllers\MonedaController;
use Illuminate\Support\Facades\Route;

// 'admin.only' (EnsureUserIsAdminOnly) exige estrictamente el rol 'admin' — coincide con lo
// que el sidebar ya asume (roles: ['admin']), moderador y vendedor quedan fuera.
Route::middleware(['auth', 'verified', 'admin.only'])->group(function () {
    Route::resource('monedas', MonedaController::class)->parameters([
        'monedas' => 'moneda',
    ]);

    // Rutas adicionales para acciones específicas
    Route::patch('monedas/{moneda}/cambiar-estado', [MonedaController::class, 'cambiarEstado'])
        ->name('monedas.cambiar-estado');
    Route::patch('monedas/{moneda}/establecer-principal', [MonedaController::class, 'establecerPrincipal'])
        ->name('monedas.establecer-principal');
});
