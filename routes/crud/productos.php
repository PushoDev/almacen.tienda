<?php

use App\Http\Controllers\ImportacionBorradorController;
use App\Http\Controllers\ImportacionProductoController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(
    function () {
        // Detección y fusión de productos duplicados (DEBE ir ANTES del resource). Solo admin/moderador
        // (middleware 'admin'): la fusión reescribe fichas, stock y precios de todo el catálogo.
        Route::middleware('admin')->group(function () {
            Route::get('/listado-productos/duplicados', [ProductoController::class, 'duplicados'])->name('productos.duplicados');
            Route::post('/listado-productos/normalizar-duplicados', [ProductoController::class, 'normalizarDuplicados'])->name('productos.normalizar');
            Route::post('/listado-productos/fusionar-duplicados', [ProductoController::class, 'fusionarDuplicados'])->name('productos.fusionar');

            // Historial de importaciones de Excel: listado, detalle fila por fila y vista previa de "deshacer".
            Route::get('/importaciones-productos', [ImportacionProductoController::class, 'index'])->name('importaciones-productos.index');
            Route::get('/importaciones-productos/{importacion}', [ImportacionProductoController::class, 'show'])->name('importaciones-productos.show');
            Route::get('/importaciones-productos/{importacion}/vista-previa-reversion', [ImportacionProductoController::class, 'vistaPreviaReversion'])->name('importaciones-productos.vista-previa-reversion');

            // Importar en dos pasos: el Excel se lee a un borrador que se revisa y edita en una hoja
            // de cálculo antes de guardarlo en el inventario.
            Route::post('/importaciones-borradores', [ImportacionBorradorController::class, 'preparar'])->name('importaciones-borradores.preparar');
            Route::get('/importaciones-borradores/{borrador}', [ImportacionBorradorController::class, 'show'])->name('importaciones-borradores.show');
            Route::put('/importaciones-borradores/{borrador}', [ImportacionBorradorController::class, 'guardar'])->name('importaciones-borradores.guardar');
            Route::post('/importaciones-borradores/{borrador}/confirmar', [ImportacionBorradorController::class, 'confirmar'])->name('importaciones-borradores.confirmar');
            Route::delete('/importaciones-borradores/{borrador}', [ImportacionBorradorController::class, 'descartar'])->name('importaciones-borradores.descartar');
        });

        Route::resource('listado-productos', ProductoController::class)->parameters([
            'listado-productos' => 'producto',
        ])->names([
            'index' => 'productos.index',
            'create' => 'productos.create',
            'store' => 'productos.store',
            'show' => 'productos.show',
            'edit' => 'productos.edit',
            'update' => 'productos.update',
            'destroy' => 'productos.destroy',
        ]);

        // Ruta para transferir cantidad entre códigos o agregar un nuevo código escaneado
        Route::post('/listado-productos/{producto}/transferir-codigo', [ProductoController::class, 'transferirCodigo'])
            ->name('productos.transferir-codigo');

        // Fusionar 2+ lotes de un producto en un almacén en uno solo (admin/moderador).
        Route::post('/listado-productos/{producto}/lotes/fusionar', [ProductoController::class, 'fusionarLotes'])
            ->middleware('admin')
            ->name('productos.lotes.fusionar');

        // Override opcional de precio de venta por lote puntual ("Opción A", ver Edit.tsx/Show.tsx)
        Route::put('/listado-productos/{producto}/lotes/{lote}/precio-venta', [ProductoController::class, 'actualizarPrecioVentaLote'])
            ->name('productos.lotes.precio-venta');

        // Comisión propia de un lote puntual (2026-09-26): la comisión afecta lo que cobra el vendedor,
        // así que solo la fijan admin/moderador (el precio propio sí lo puede poner el vendedor del almacén).
        Route::put('/listado-productos/{producto}/lotes/{lote}/comision', [ProductoController::class, 'actualizarComisionLote'])
            ->middleware('admin')
            ->name('productos.lotes.comision');

        // Rutas para importar/exportar
        // Exportar productos
        Route::get('/listado-productos/exportar/excel', [ProductoController::class, 'export'])->name('productos.export');

        // Exportar el listado general: lo mismo que muestra la tabla (con sus filtros), sin paginar
        Route::get('/listado-productos/exportar/general', [ProductoController::class, 'exportGeneral'])->name('productos.export-general');

        // Importar productos (con almacén opcional en request)
        Route::post('/listado-productos/importar/excel', [ProductoController::class, 'import'])->name('productos.import');

        // Importar a almacén específico (ruta con parámetro)
        Route::post('/listado-productos/importar/almacen/{almacenId}', [ProductoController::class, 'importToAlmacen'])->name('productos.import.almacen');

        // Deshacer una importación completa (solo admin: descuenta stock, códigos y lotes)
        Route::post('/importaciones-productos/{importacion}/revertir', [ImportacionProductoController::class, 'revertir'])
            ->middleware('admin.only')
            ->name('importaciones-productos.revertir');

        // Plantilla de importación
        Route::get('/listado-productos/descargar/plantilla', [ProductoController::class, 'downloadTemplate'])->name('productos.template');

        // Actualizar precio/comisión en varios almacenes a la vez (exclusivo admin).
        // Debe ir ANTES del resource para que no la intercepte PUT /disponibles/{disponible}.
        Route::put('/disponibles/bulk-actualizar', [ProductoVendedorController::class, 'updateBulk'])
            ->middleware('admin.only')
            ->name('disponibles.bulk-actualizar');

        // "Precio del grupo" de fichas hermanas en un almacén. Debe ir ANTES del resource.
        Route::put('/disponibles/precio-grupo', [ProductoVendedorController::class, 'actualizarPrecioGrupo'])
            ->name('disponibles.precio-grupo');

        // Ruta para agregar el precio de venta a los Productos
        Route::resource('disponibles', ProductoVendedorController::class);

        // 🆕 NUEVA RUTA: Ver precios de vendedores para un producto en un almacén específico
        // IMPORTANTE: Esta debe ir ANTES del resource para que no sea interceptada por {disponible}
        Route::get(
            '/disponibles/{producto}/precios-vendedores/{almacen}',
            [ProductoVendedorController::class, 'preciosPorVendedor']
        )->name('disponibles.precios-vendedores');

        // 🆕 NUEVA RUTA: Establecer precio base por administrador
        Route::post(
            '/disponibles/{producto}/precios-base',
            [ProductoVendedorController::class, 'setPreciosBase']
        )->name('disponibles.precios-base');

        // "Fusionar lotes" global del almacén seleccionado (admin/moderador)
        Route::post('/disponibles/almacen/{almacen}/fusionar-lotes', [ProductoVendedorController::class, 'fusionarLotesAlmacen'])
            ->middleware('admin')
            ->name('disponibles.fusionar-lotes');

        // Exportar/importar precios de vendedor por almacén
        Route::get('/disponibles/almacen/{almacen}/exportar', [ProductoVendedorController::class, 'exportExcel'])->name('disponibles.exportar');
        Route::post('/disponibles/almacen/{almacen}/importar', [ProductoVendedorController::class, 'importExcel'])->name('disponibles.importar');
    }
);
