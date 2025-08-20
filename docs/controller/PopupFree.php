<?php

use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    // Ruta principal del punto de venta
    Route::get('/punto-venta', [VentaController::class, 'index'])->name('punto-venta.index');

    // Obtener almacenes del usuario
    Route::get('/ventas/almacenes', [VentaController::class, 'getAlmacenes'])->name('ventas.getAlmacenes');

    // Obtener productos de un almacén
    Route::get('/ventas/almacenes/{id}/productos', [VentaController::class, 'getProductosPorAlmacen'])->name('ventas.getProductosPorAlmacen');

    // Obtener clientes
    Route::get('/ventas/clientes', [VentaController::class, 'getClientes'])->name('ventas.getClientes');

    // Obtener cuentas
    Route::get('/ventas/cuentas', [VentaController::class, 'getCuentas'])->name('ventas.getCuentas');

    // Ruta para tasa de cambio USD
    Route::get('/ventas/tasausd', [VentaController::class, 'getTasaUSD'])->name('ventas.getTasaUSD');

    // Ruta para procesar venta
    Route::post('/ventas/procesar', [VentaController::class, 'procesarVenta'])->name('ventas.procesar');
});




// Cargar Almacenes
    public function getAlmacenes()
    {
        $user = Auth::user();
        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

        return response()->json($almacenes);
    }
    //  Cargar Productos por Almacenes
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();

        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $id)) {
            return response()->json(['error' => 'Acceso denegado al almacén'], 403);
        }

        $productos = Producto::whereHas('almacenes', function ($q) use ($id) {
            $q->where('almacens.id', $id);
        })
            ->with([
                'categoria',
                'vendedores' => function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
                },
                'almacenes' => function ($q) use ($id) {
                    $q->where('almacens.id', $id)
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad as stock_disponible');
                }
            ])
            ->get()
            ->map(function ($producto) {
                $vendedor = $producto->vendedores->first();
                $almacen = $producto->almacenes->first();

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'categoria_nombre' => $producto->categoria?->nombre_categoria ?? 'Sin categoría',
                    'precio_compra_producto' => $producto->precio_compra_producto,
                    'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
                ];
            });

        return response()->json($productos);
    }
    //  Cargar todos los Clientes
    public function getClientes()
    {
        $clientes = Cliente::select('id', 'nombre_cliente')->get();
        return response()->json($clientes);
    }
    // Cargar Todas las cuentas del Negocio
    public function getCuentas()
    {
        $cuentas = Cuenta::select('id', 'nombre_cuenta', 'tipo_moneda')->get();
        return response()->json($cuentas);
    }
    // Caragr datos de la Tasa de Cambio para USD
    public function getTasaUSD()
    {
        $tasaUSD = TasaCambio::select('id', 'tasa')->get();
        return response()->json($tasaUSD);
    }
