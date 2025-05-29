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
     * Para seleccionar almacenes desde API
     *
     * @return void
     */
    // Alamcenes
    public function getAlmacen()
    {
        return response()->json(Almacen::select('id', 'nombre_almacen')->get());
    }
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('Movimientos/Index', []);
    }

    public function store(Request $request)
    {
        // Validaciones
        $request->validate([
            'producto_id' => ['required', 'exists:productos,id'],
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'cantidad' => ['required', 'integer', 'min:1'],
        ]);

        // Verificar si hay suficiente cantidad en el almacén de origen
        $almacenOrigen = AlmacenProducto::where('almacen_id', $request->almacen_origen_id)
            ->where('producto_id', $request->producto_id)
            ->firstOrFail();

        if ($almacenOrigen->cantidad < $request->cantidad) {
            return redirect()->back()->withErrors(['cantidad' => 'No hay suficiente cantidad en el almacén de origen.']);
        }

        // Actualizar la cantidad en el almacén de origen
        $almacenOrigen->decrement('cantidad', $request->cantidad);

        // Obtener o crear el registro en el almacén de destino
        $almacenDestino = AlmacenProducto::firstOrCreate(
            [
                'almacen_id' => $request->almacen_destino_id,
                'producto_id' => $request->producto_id,
            ],
            ['cantidad' => 0]
        );

        // Actualizar la cantidad en el almacén de destino
        $almacenDestino->increment('cantidad', $request->cantidad);

        // Registrar el movimiento
        Movimiento::create([
            'producto_id' => $request->producto_id,
            'almacen_origen_id' => $request->almacen_origen_id,
            'almacen_destino_id' => $request->almacen_destino_id,
            'cantidad' => $request->cantidad,
        ]);

        // Redirigir al usuario
        return redirect()->route('movimientos.index')->with('success', 'Movimiento registrado exitosamente.');
    }
}
