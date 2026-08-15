<?php

use App\Http\Controllers\CompraController;
use Illuminate\Support\Facades\Route;

// 'admin.only' (EnsureUserIsAdminOnly) — a diferencia del alias 'admin' usado en Reportes,
// este exige estrictamente role === 'admin'; moderador y vendedor no tienen acceso a Compras.
Route::middleware(['auth', 'verified', 'admin.only'])->group(
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
            Route::get('/almacenes', [CompraController::class, 'getAlmacenes'])->name('almacenes');

            // ✅ NUEVA: Ruta para crear almacén durante compra
            Route::post('/almacenes', [CompraController::class, 'storeAlmacenForCompra'])->name('almacen.store');

            Route::get('/proveedores', [CompraController::class, 'getProveedor'])->name('proveedores');
            // ✅ NUEVA: Ruta para crear proveedor durante compra
            Route::post('/proveedores', [CompraController::class, 'storeProveedor'])->name('proveedor.store');

            Route::get('/categorias', [CompraController::class, 'getCategorias'])->name('categorias');
            // ✅ NUEVA: Ruta para crear categoría durante compra
            Route::post('/categorias', [CompraController::class, 'storeCategoria'])->name('categoria.store');

            // NUEVA: Autocompletado de productos existentes al agregar un producto a la compra
            Route::get('/productos/buscar', [CompraController::class, 'buscarProductosExistentes'])->name('productos.buscar');

            // Ruta MEJORADA para obtener clientes (ahora acepta parámetro search)
            Route::get('/clientes/fisicos', [CompraController::class, 'getClientesFisicos'])->name('clientes.fisicos');

            // NUEVA: Ruta para búsqueda rápida de clientes (opcional, pero útil para autocomplete)
            Route::get('/clientes/buscar', [CompraController::class, 'buscarClienteRapido'])->name('clientes.buscar');

            // Ruta para crear un cliente nuevo durante la compra (YA EXISTE)
            Route::post('/clientes', [CompraController::class, 'storeClienteForCompra'])->name('cliente.store');

            // Resto de rutas existentes...
            Route::get('/cuentas/pago', [CompraController::class, 'getCuentas'])->name('cuentas.pago');
            Route::get('/almacenes/{id}/productos', [CompraController::class, 'getProductos'])->name('getProductos');
        });
    }
);
