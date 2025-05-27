<?php


use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::get('vendedor', function () {
            return Inertia::render('vendor');
        })->name('vendedor');
    }
);
