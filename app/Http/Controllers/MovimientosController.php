<?php

namespace App\Http\Controllers;

use App\Models\AlmacenProducto;
use App\Models\Movimiento;
use App\Models\Almacen;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MovimientosController extends Controller
{
    /**
     * Productos por Almacen
     *
     * @return void
     */
    public function getProductosPorAlmacen($id)
    {
        $almacen = Almacen::findOrFail($id);
        return response()->json($almacen->getProductosConCantidad());
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('Movimientos/Index', []);
    }

    /**
     * Registrar Movimientos
     */
    public function store(Request $request)
    {
        // Validar los datos enviados desde el frontend
        $request->validate([
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'productos' => ['required', 'array'],
            'productos.*.producto_id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        // Iterar sobre los productos y realizar el movimiento
        foreach ($request->productos as $item) {
            $productoId = $item['producto_id'];
            $cantidad = $item['cantidad'];

            // Verificar si hay suficiente cantidad en el almacén emisor
            $almacenOrigen = AlmacenProducto::where('almacen_id', $request->almacen_origen_id)
                ->where('producto_id', $productoId)
                ->firstOrFail();

            if ($almacenOrigen->cantidad < $cantidad) {
                return response()->json(['error' => 'No hay suficiente cantidad en el almacén emisor.'], 400);
            }

            // Actualizar la cantidad en el almacén emisor
            $almacenOrigen->decrement('cantidad', $cantidad);

            // Obtener o crear el registro en el almacén receptor
            $almacenDestino = AlmacenProducto::firstOrCreate(
                [
                    'almacen_id' => $request->almacen_destino_id,
                    'producto_id' => $productoId,
                ],
                ['cantidad' => 0]
            );

            // Actualizar la cantidad en el almacén receptor
            $almacenDestino->increment('cantidad', $cantidad);
        }

        // Responder al frontend con éxito
        return response()->json(['message' => 'Movimiento registrado exitosamente.']);
    }
}
