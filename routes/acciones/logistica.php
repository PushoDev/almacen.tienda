<?php

use App\Http\Controllers\LogisticaController;
use Illuminate\Support\Facades\Route;

// Antes `Route::resource('logistica', LogisticaController::class)` — registraba también
// create/edit/update/destroy/store/show, pero el controller solo implementa index() (esta
// pantalla es puramente informativa, un dashboard). Los otros 6 daban 500 si se accedían
// directo por URL, y los 3 archivos Create/Edit/Show.tsx que existían eran el mismo
// boilerplate de scaffold sin modificar, sin ningún enlace real desde el resto del proyecto
// (confirmado por grep) — se borraron junto con este cambio.
Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::get('/logistica', [LogisticaController::class, 'index'])->name('logistica.index');
    }
);
