<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Producto;
use Illuminate\Http\Request;
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

    $productos = $almacen->productos()
      ->where('activo', true)
      ->select(
        'productos.id',
        'productos.nombre_producto',
        'productos.descripcion_producto',
        'productos.precio_venta_actualizado',
        'productos.imagen_producto'
      )
      ->paginate(12);

    return response()->json($productos);
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
