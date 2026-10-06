<?php

use App\Http\Controllers\MonedaController;
use Illuminate\Support\Facades\Route;

// Crear y eliminar monedas: solo 'admin'. 'admin.only' (EnsureUserIsAdminOnly) exige estrictamente
// ese rol. Va PRIMERO a propósito: `monedas/create` tiene que registrarse antes de `monedas/{moneda}`
// (show), si no Laravel lo toma como una moneda llamada "create".
Route::middleware(['auth', 'verified', 'admin.only'])->group(function () {
    Route::resource('monedas', MonedaController::class)
        ->parameters(['monedas' => 'moneda'])
        ->only(['create', 'store', 'destroy']);
});

// Ver y editar (incluye activar/desactivar y marcar como principal, que son parte de editar): admin y
// moderador. 'admin' (EnsureUserIsAdmin) deja pasar a ambos roles; el vendedor queda fuera.
Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    Route::resource('monedas', MonedaController::class)
        ->parameters(['monedas' => 'moneda'])
        ->only(['index', 'show', 'edit', 'update']);

    // Rutas adicionales para acciones específicas
    Route::patch('monedas/{moneda}/cambiar-estado', [MonedaController::class, 'cambiarEstado'])
        ->name('monedas.cambiar-estado');
    Route::patch('monedas/{moneda}/establecer-principal', [MonedaController::class, 'establecerPrincipal'])
        ->name('monedas.establecer-principal');
});
