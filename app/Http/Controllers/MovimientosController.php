<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Movimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MovimientosController extends Controller
{
    /**
     * Muestra la interfaz principal de movimientos.
     */
    public function index()
    {
        return Inertia::render('Movimientos/Index', [
            'almacenes' => Almacen::select('id', 'nombre_almacen')->get(),
        ]);
    }

    /**
     * Obtiene productos de un almacén específico.
     */
    public function getProductosPorAlmacen($id)
    {
        $almacen = Almacen::findOrFail($id);

        // Obtener productos con cantidad disponible en el almacén
        $productos = $almacen->productos()->withPivot('cantidad')->get()->map(function ($producto) {
            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'cantidad' => $producto->pivot->cantidad,
            ];
        });

        return response()->json($productos);
    }

    /**
     * Obtiene todos los almacenes disponibles.
     */
    public function getAlmacenes()
    {
        return response()->json(
            Almacen::select('id', 'nombre_almacen')->get()
        );
    }

    /**
     * Registra un nuevo movimiento entre almacenes.
     */
    public function store(Request $request)
    {
        // Validación de datos
        $request->validate([
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.producto_id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        DB::beginTransaction();

        try {
            // Iterar sobre cada producto en el movimiento
            foreach ($request->productos as $item) {
                $productoId = $item['producto_id'];
                $cantidad = $item['cantidad'];

                // Verificar stock en el almacén de origen
                $almacenOrigen = AlmacenProducto::where([
                    'almacen_id' => $request->almacen_origen_id,
                    'producto_id' => $productoId,
                ])->firstOrFail();

                if ($almacenOrigen->cantidad < $cantidad) {
                    throw new \Exception("Stock insuficiente para el producto ID: {$productoId}");
                }

                // Actualizar stock en el almacén de origen
                $almacenOrigen->decrement('cantidad', $cantidad);

                // Actualizar stock en el almacén de destino
                $almacenDestino = AlmacenProducto::firstOrCreate(
                    [
                        'almacen_id' => $request->almacen_destino_id,
                        'producto_id' => $productoId,
                    ],
                    [
                        'cantidad' => 0, // Valor inicial si no existe el registro
                    ]
                );
                $almacenDestino->increment('cantidad', $cantidad);

                // Registrar el movimiento
                Movimiento::create([
                    'producto_id' => $productoId,
                    'almacen_origen_id' => $request->almacen_origen_id,
                    'almacen_destino_id' => $request->almacen_destino_id,
                    'cantidad' => $cantidad,
                ]);
            }

            // Confirmar la transacción
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => '¡Movimiento registrado exitosamente!',
            ]);
        } catch (\Exception $e) {
            // Revertir la transacción en caso de error
            DB::rollBack();

            return response()->json([
                'error' => true,
                'message' => 'Error: ' . $e->getMessage(),
            ], 500);
        }
    }
}
