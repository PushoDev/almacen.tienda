<?php

use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Solo el admin gestiona empleados: sin este control, un vendedor podía cambiar su propio rol a admin
// y asignarse cuentas (el menú ya lo ocultaba, pero las rutas no lo exigían).
Route::middleware(['auth', 'verified', 'admin.only'])->group(
    function () {
        Route::resource('empleados', UserController::class);
    }
);
