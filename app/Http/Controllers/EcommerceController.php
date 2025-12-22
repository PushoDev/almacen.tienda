<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class EcommerceController extends Controller
{
    /**
     * Obtiene los almacenes tipo punto-venta
     */
    public function getPuntosVenta()
    {
        $almacenes = Almacen::where('tipo_almacen', 'punto_venta')
            ->select('id', 'nombre_almacen', 'ciudad_almacen', 'provincia_almacen', 'telefono_almacen', 'correo_almacen')
            ->get();

        return response()->json($almacenes);
    }

    /**
     * Establece el almacén seleccionado en sesión
     */
    public function setAlmacenSesion(Request $request)
    {
        $validated = $request->validate([
            'almacen_id' => 'required|exists:almacens,id'
        ]);

        session(['almacen_seleccionado' => $validated['almacen_id']]);

        return response()->json([
            'success' => true,
            'message' => 'Almacén seleccionado correctamente'
        ]);
    }

    /**
     * Obtiene el almacén seleccionado en sesión
     */
    public function getAlmacenSesion()
    {
        $almacenId = session('almacen_seleccionado');

        if (!$almacenId) {
            return response()->json([
                'almacen' => null,
                'hasSelection' => false
            ]);
        }

        $almacen = Almacen::find($almacenId);

        return response()->json([
            'almacen' => $almacen,
            'hasSelection' => true
        ]);
    }

    /**
     * Obtiene los productos disponibles en el almacén seleccionado
     */
    public function getProductosAlmacen(Request $request)
    {
        $almacenId = session('almacen_seleccionado');

        if (!$almacenId) {
            return response()->json([
                'error' => 'No hay almacén seleccionado'
            ], 400);
        }

        $almacen = Almacen::find($almacenId);

        if (!$almacen) {
            return response()->json([
                'error' => 'Almacén no encontrado'
            ], 404);
        }

        try {
            // Obtener el primer vendedor asignado como el "responsable" de este almacén
            $userResponsable = $almacen->usuarios()->first();
            $vendedorId = $userResponsable ? $userResponsable->id : 0;

            $productos = Producto::join('almacen_producto', 'productos.id', '=', 'almacen_producto.producto_id')
                ->where('almacen_producto.almacen_id', (int)$almacenId)
                ->where('productos.activo', true)
                ->leftJoin('producto_vendedors', function ($join) use ($almacenId, $vendedorId) {
                    $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                        ->where('producto_vendedors.almacen_id', '=', (int)$almacenId)
                        ->where('producto_vendedors.user_id', '=', (int)$vendedorId);
                })
                ->select(
                    'productos.id',
                    'productos.nombre_producto',
                    'productos.descripcion_producto',
                    'productos.imagen_producto',
                    'almacen_producto.cantidad as stock_actual',
                    DB::raw('COALESCE(producto_vendedors.precio_venta, 0.00) as precio_venta_actualizado')
                )
                ->paginate(12);

            return response()->json($productos);
        } catch (\Exception $e) {
            Log::error('Error en EcommerceController@getProductosAlmacen: ' . $e->getMessage());
            return response()->json([
                'error' => 'Error al obtener productos',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Renderiza la página del ecommerce
     */
    public function index()
    {
        $almacenId = session('almacen_seleccionado');
        $almacen = $almacenId ? Almacen::find($almacenId) : null;

        return Inertia::render('Ecommerce/Index', [
            'almacenSeleccionado' => $almacen,
            'hasSelection' => (bool) $almacenId
        ]);
    }
}
