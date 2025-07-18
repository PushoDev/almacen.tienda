<?php


use App\Http\Controllers\CompraController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        /**
         * Iniciar Compra
         */
        Route::resource('comprar', CompraController::class);

        /**
         * Interactuar Api para los Select
         */
        Route::prefix('compras')->name('compras')->group(function () {
            // Rutas para los Select
            Route::get('/almacenes', [CompraController::class, 'getAlmacen']);
            Route::get('/proveedores', [CompraController::class, 'getProveedor']);
            Route::get('/categorias', [CompraController::class, 'getCategorias']);
            Route::get('/clientes/fisicos', [CompraController::class, 'getClientesFisicos']);


            // Ruta para obtener cuentas
            Route::get('/cuentas/pago', [CompraController::class, 'getCuentas']);

            // Rutas para cargar datos iniciales
            Route::get('/datos', [CompraController::class, 'cargarDatos'])->name('compras.datos');
            Route::post('/registrar', [CompraController::class, 'registrarCompra'])->name('compras.registrar');

            // Api: Ruta para obtener productos por almacén
            Route::get('/almacenes/{id}/productos', [CompraController::class, 'getProductos']);
        });
    }
);
