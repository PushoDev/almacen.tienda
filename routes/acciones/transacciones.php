<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal de las Transacciones
        Route::get('transacciones', function () {
            return Inertia::render('Transacciones/Index', []);
        })->name('transacciones');
    }
);
