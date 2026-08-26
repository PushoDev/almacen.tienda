<?php

use App\Http\Controllers\CalendarioController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', 'admin.only'])->group(function () {
    Route::get('/calendario', [CalendarioController::class, 'index'])->name('calendario.index');
});
