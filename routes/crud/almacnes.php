<?php

use App\Http\Controllers\AlmacenController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal de los Almacenes con Inertia.js
        Route::resource('almacenes', AlmacenController::class)->names('almacenes');
    }
);
