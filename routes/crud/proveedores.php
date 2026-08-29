<?php

use App\Http\Controllers\ProveedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::resource('proveedores', ProveedorController::class)->parameters([
            'proveedores' => 'proveedor',
        ])->except(['edit', 'update', 'destroy']);

        // Editar/eliminar — admin-only (mismo criterio que Cuentas: crear queda
        // abierto a cualquier rol, pero editar/eliminar sí queda restringido).
        Route::middleware(['admin.only'])->group(function () {
            Route::get('proveedores/{proveedor}/edit', [ProveedorController::class, 'edit'])->name('proveedores.edit');
            Route::put('proveedores/{proveedor}', [ProveedorController::class, 'update'])->name('proveedores.update');
            Route::patch('proveedores/{proveedor}', [ProveedorController::class, 'update']);
            Route::delete('proveedores/{proveedor}', [ProveedorController::class, 'destroy'])->name('proveedores.destroy');
        });
    }
);
