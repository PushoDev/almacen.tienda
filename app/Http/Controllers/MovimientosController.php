<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\Movimiento;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class MovimientosController extends Controller
{
    /**
     * Obtiene almacenes según rol del usuario
     *
     * @return \Illuminate\Database\Eloquent\Collection
     */
    private function getPermittedAlmacenes()
    {
        $user = Auth::user();

        return $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();
    }

    /**
     * Muestra la interfaz principal de movimientos
     *
     * @return \Inertia\Response
     */
    public function index()
    {
        return Inertia::render('Movimientos/Index', [
            'almacenes' => $this->getPermittedAlmacenes(),
        ]);
    }

    /**
     * Obtiene productos de un almacén con verificación de permisos
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();
        $almacen = Almacen::findOrFail($id);

        // Verificar permisos para vendedores
        if ($user->role !== 'admin') {
            $userAlmacenesIds = $user->almacenes->pluck('id');
            if (!$userAlmacenesIds->contains($almacen->id)) {
                abort(403, 'Acceso denegado a este almacén');
            }
        }

        // Obtener productos con cantidad disponible
        $productos = $almacen->productos()
            ->select('productos.id', 'productos.nombre_producto', 'almacen_producto.cantidad')
            ->get()
            ->map(function ($producto) {
                return [
                    'producto_id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'cantidad' => $producto->pivot->cantidad,
                ];
            });

        return response()->json($productos);
    }

    /**
     * Obtiene todos los almacenes permitidos
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAlmacenes()
    {
        return response()->json($this->getPermittedAlmacenes());
    }

    /**
     * Registra un nuevo movimiento entre almacenes
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\RedirectResponse
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        $almacenesPermitidosIds = $this->getPermittedAlmacenes()->pluck('id');

        // Validación básica
        $request->validate([
            'almacen_origen_id' => ['required', 'exists:almacens,id'],
            'almacen_destino_id' => ['required', 'exists:almacens,id', 'different:almacen_origen_id'],
            'productos' => ['required', 'array', 'min:1'],
            'productos.*.producto_id' => ['required', 'exists:productos,id'],
            'productos.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        // Validación adicional de permisos
        if ($user->role !== 'admin') {
            if (!$almacenesPermitidosIds->contains($request->almacen_origen_id)) {
                throw ValidationException::withMessages([
                    'almacen_origen_id' => 'No tienes permisos sobre este almacén de origen'
                ]);
            }

            if (!$almacenesPermitidosIds->contains($request->almacen_destino_id)) {
                throw ValidationException::withMessages([
                    'almacen_destino_id' => 'No tienes permisos sobre este almacén de destino'
                ]);
            }
        }

        DB::beginTransaction();

        try {
            foreach ($request->productos as $item) {
                $productoId = $item['producto_id'];
                $cantidad = $item['cantidad'];

                // Verificar stock en origen con bloqueo
                $almacenOrigen = AlmacenProducto::where([
                    'almacen_id' => $request->almacen_origen_id,
                    'producto_id' => $productoId,
                ])->lockForUpdate()->first();

                if (!$almacenOrigen) {
                    throw new \Exception("El producto ID {$productoId} no existe en el almacén de origen");
                }

                if ($almacenOrigen->cantidad < $cantidad) {
                    throw new \Exception("Stock insuficiente para el producto ID: {$productoId}");
                }

                // Actualizar almacén origen
                $almacenOrigen->decrement('cantidad', $cantidad);

                // Actualizar almacén destino
                $almacenDestino = AlmacenProducto::firstOrCreate(
                    ['almacen_id' => $request->almacen_destino_id, 'producto_id' => $productoId],
                    ['cantidad' => 0]
                );
                $almacenDestino->increment('cantidad', $cantidad);

                // Registrar movimiento
                Movimiento::create([
                    'producto_id' => $productoId,
                    'almacen_emisor_id' => $request->almacen_origen_id,
                    'almacen_receptor_id' => $request->almacen_destino_id,
                    'cantidad' => $cantidad,
                    'user_id' => $user->id, // Registrar usuario responsable
                ]);
            }

            DB::commit();

            return redirect()->route('movimientos.index')->with('success', 'Movimiento registrado exitosamente!');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error en movimiento - Usuario: {$user->id} - Error: {$e->getMessage()}");

            return back()->withErrors(['general' => 'Error: ' . $e->getMessage()])->withInput();
        }
    }
}
