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
        Route::prefix('compras')->name('compras.')->group(function () {
            // Rutas para los Select
            // ✅ MEJORADA: Ruta para obtener almacenes con búsqueda
            Route::get('/almacenes', [CompraController::class, 'getAlmacenes']);

            // ✅ NUEVA: Ruta para crear almacén durante compra
            Route::post('/almacenes', [CompraController::class, 'storeAlmacenForCompra'])->name('almacen.store');

            Route::get('/proveedores', [CompraController::class, 'getProveedor']);
            // ✅ NUEVA: Ruta para crear proveedor durante compra
            Route::post('/proveedores', [CompraController::class, 'storeProveedor'])->name('proveedor.store');

            Route::get('/categorias', [CompraController::class, 'getCategorias']);
            // ✅ NUEVA: Ruta para crear categoría durante compra
            Route::post('/categorias', [CompraController::class, 'storeCategoria'])->name('categoria.store');

            // NUEVA: Autocompletado de productos existentes al agregar un producto a la compra
            Route::get('/productos/buscar', [CompraController::class, 'buscarProductosExistentes'])->name('productos.buscar');

            // Ruta MEJORADA para obtener clientes (ahora acepta parámetro search)
            Route::get('/clientes/fisicos', [CompraController::class, 'getClientesFisicos']);

            // NUEVA: Ruta para búsqueda rápida de clientes (opcional, pero útil para autocomplete)
            Route::get('/clientes/buscar', [CompraController::class, 'buscarClienteRapido'])->name('clientes.buscar');

            // Ruta para crear un cliente nuevo durante la compra (YA EXISTE)
            Route::post('/clientes', [CompraController::class, 'storeClienteForCompra'])->name('cliente.store');

            // Resto de rutas existentes...
            Route::get('/cuentas/pago', [CompraController::class, 'getCuentas']);
            Route::get('/datos', [CompraController::class, 'cargarDatos'])->name('compras.datos');
            Route::post('/registrar', [CompraController::class, 'registrarCompra'])->name('compras.registrar');
            Route::get('/almacenes/{id}/productos', [CompraController::class, 'getProductos']);
        });
    }
);
