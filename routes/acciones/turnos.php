<?php

use App\Http\Controllers\TurnoVendedorController;
use Illuminate\Support\Facades\Route;

Route::post('/turno-vendedor', [TurnoVendedorController::class, 'store'])->name('turno-vendedor.store');
