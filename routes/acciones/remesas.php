<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Ruta principal para control de remesas
        Route::get('remesas', function () {
            return Inertia::render('Remesas/Index', []);
        })->name('remesas');
    }
);
