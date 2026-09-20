<?php

use App\Http\Controllers\CuentaController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        Route::resource('cuentas', CuentaController::class, [
            'except' => ['show', 'edit', 'update', 'destroy'],
        ]);

        // show() valida acceso internamente (admin/moderador siempre, vendedor solo sus cuentas)
        Route::get('cuentas/{cuenta}', [CuentaController::class, 'show'])->name('cuentas.show');

        Route::middleware(['check.cuenta.permission'])->group(function () {
            Route::get('cuentas/{cuenta}/edit', [CuentaController::class, 'edit'])->name('cuentas.edit');
            Route::put('cuentas/{cuenta}', [CuentaController::class, 'update'])->name('cuentas.update');
            Route::patch('cuentas/{cuenta}', [CuentaController::class, 'update']);
            Route::delete('cuentas/{cuenta}', [CuentaController::class, 'destroy'])->name('cuentas.destroy');
        });
    }
);
