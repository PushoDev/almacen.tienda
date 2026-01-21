<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\PrecioHistorial;
use App\Models\Almacen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con precios de vendedor, agrupados por almacén.
     */
    public function index()
    {
        $user = Auth::user();

        $almacenesQuery = Almacen::query();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            $almacenesIds = $user->almacenes->pluck('id');
            $almacenesQuery->whereIn('id', $almacenesIds);
        }

        $almacenes = $almacenesQuery->with([
            'productos' => function ($query) use ($user) {
                $query->withPivot('cantidad');

                $query->leftJoin('producto_vendedors', function ($join) use ($user) {
                    $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                        ->on('almacen_producto.almacen_id', '=', 'producto_vendedors.almacen_id')
                        ->where('producto_vendedors.user_id', $user->id);
                })
                    ->select(
                        'productos.*',
                        'producto_vendedors.precio_venta',
                        'producto_vendedors.venta_ganancia'
                    )
                    ->with('categoria');
            }
        ])->get();

        $almacenesTransformados = $almacenes->map(function ($almacen) {
            $productos = $almacen->productos->map(function ($producto) use ($almacen) {

                $stockAlmacen = $producto->pivot->cantidad;
                $precioVenta = $producto->precio_venta;
                $ganancia = $producto->venta_ganancia;

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                    'precio_compra' => $producto->precio_compra_producto,
                    'stock_almacen' => $stockAlmacen,
                    'precio_venta' => $precioVenta,
                    'ganancia' => $ganancia,
                    'tiene_precio' => ($precioVenta ?? 0) > 0,
                    'almacen_id' => $almacen->id,
                ];
            });

            return [
                'almacen_id' => $almacen->id,
                'nombre_almacen' => $almacen->nombre_almacen,
                'productos' => $productos->filter(fn($p) => $p['stock_almacen'] > 0)->values(),
            ];
        });

        return Inertia::render('Productos/Vendor/Index', [
            'almacenes' => $almacenesTransformados->filter(fn($a) => $a['productos']->isNotEmpty())->values(),
            'meta' => [
                'total_almacenes' => $almacenesTransformados->count(),
                'role_usuario' => $user->role,
            ],
        ]);
    }

    /**
     * Actualizar precio y ganancia por Almacén.
     */
    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        $validated = $request->validate([
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
            'almacen_id' => ['required', 'integer', 'exists:almacens,id'],
        ]);

        $almacenId = $validated['almacen_id'];

        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            return response()->json([
                'error' => 'No tienes acceso a este almacén.',
            ], 403);
        }

        $precioAnterior = DB::table('producto_vendedors')
            ->where('producto_id', $productoId)
            ->where('user_id', $user->id)
            ->where('almacen_id', $almacenId)
            ->value('precio_venta');

        $precioCambio = $precioAnterior !== null &&
            round($precioAnterior, 2) != $precioVenta;

        DB::table('producto_vendedors')->updateOrInsert(
            [
                'producto_id' => $productoId,
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
            ],
            [
                'precio_venta' => $precioVenta,
                'venta_ganancia' => $ganancia,
                'updated_at' => now(),
            ]
        );

        if ($precioCambio) {
            PrecioHistorial::create([
                'producto_id' => $productoId,
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
                'precio_anterior' => $precioAnterior ?? 0.00,
                'precio_nuevo' => $precioVenta,
                'accion' => 'Venta Manual - Almacén ID ' . $almacenId,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Precio actualizado correctamente',
            'new_profit' => $ganancia,
            'new_price' => $precioVenta,
            'history_recorded' => $precioCambio,
        ]);
    }

    /**
     * 🆕 NUEVO MÉTODO: Obtener precios de vendedores para un producto en un almacén específico
     * Solo accesible para admin y moderador
     */
    public function preciosPorVendedor($productoId, $almacenId)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            return response()->json([
                'success' => false,
                'error' => 'No tienes permisos para ver esta información.'
            ], 403);
        }

        try {
            $producto = Producto::findOrFail($productoId);
            $almacen = Almacen::findOrFail($almacenId);

            $precios = DB::table('producto_vendedors')
                ->join('users', 'producto_vendedors.user_id', '=', 'users.id')
                ->where('producto_vendedors.producto_id', $productoId)
                ->where('producto_vendedors.almacen_id', $almacenId)
                ->where('producto_vendedors.precio_venta', '>', 0)
                ->select(
                    'users.id as user_id',
                    'users.name as vendedor',
                    'users.email as email',
                    'producto_vendedors.precio_venta',
                    'producto_vendedors.venta_ganancia',
                    'producto_vendedors.updated_at as ultima_actualizacion'
                )
                ->orderBy('producto_vendedors.precio_venta', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'user_id' => $item->user_id,
                        'vendedor' => $item->vendedor,
                        'email' => $item->email,
                        'precio_venta' => round((float)$item->precio_venta, 2),
                        'ganancia' => round((float)$item->venta_ganancia, 2),
                        'ultima_actualizacion' => \Carbon\Carbon::parse($item->ultima_actualizacion)->format('d/m/Y H:i'),
                    ];
                });

            return response()->json([
                'success' => true,
                'producto' => [
                    'id' => $producto->id,
                    'nombre' => $producto->nombre_producto,
                    'marca' => $producto->marca_producto,
                    'modelo' => $producto->modelo_producto,
                    'capacidad' => $producto->capacidad_producto,
                    'precio_compra' => round((float)$producto->precio_compra_producto, 2),
                ],
                'almacen' => [
                    'id' => $almacen->id,
                    'nombre' => $almacen->nombre_almacen,
                ],
                'precios' => $precios,
                'total_vendedores' => $precios->count(),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'error' => 'Producto o almacén no encontrado.',
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error al obtener precios por vendedor: ' . $e->getMessage(), [
                'producto_id' => $productoId,
                'almacen_id' => $almacenId,
                'user_id' => $user->id,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener los precios de vendedores.',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Recalcula la ganancia (venta_ganancia) para todos los vendedores
     * que tienen un precio de venta establecido para un producto cuyo
     * precio de compra (costo) ha cambiado, A TRAVÉS DE TODOS LOS ALMACENES.
     *
     * @param int $productoId
     * @return \Illuminate\Http\JsonResponse
     */
    public function actualizarGananciaPorCambioCosto($productoId)
    {
        DB::beginTransaction();

        try {
            $producto = Producto::findOrFail($productoId);
            $nuevoCosto = $producto->precio_compra_producto;

            $updatedCount = DB::table('producto_vendedors')
                ->where('producto_id', $productoId)
                ->whereNotNull('precio_venta')
                ->update([
                    'venta_ganancia' => DB::raw("ROUND(precio_venta - {$nuevoCosto}, 2)"),
                    'updated_at' => now(),
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Ganancias actualizadas para {$updatedCount} registros de vendedor por almacén.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar ganancias por cambio de costo (ProductoID: ' . $productoId . '): ' . $e->getMessage());

            return response()->json([
                'error' => 'Error al actualizar las ganancias por cambio de costo.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Historial de Precios
     */
    public function historial($productoId)
    {
        $historial = PrecioHistorial::with(['usuario', 'producto', 'almacen'])
            ->where('producto_id', $productoId)
            ->latest()
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'producto' => $item->producto->nombre_producto,
                    'usuario' => $item->usuario->name,
                    'almacen' => $item->almacen->nombre_almacen ?? 'General',
                    'precio_anterior' => $item->precio_anterior,
                    'precio_nuevo' => $item->precio_nuevo,
                    'accion' => $item->accion ?? 'Desconocida',
                    'fecha' => $item->created_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
        ]);
    }

    /**
     * Métodos no implementados (seguridad)
     */
    public function create()
    {
        abort(404);
    }

    public function store(Request $request)
    {
        abort(405, 'Método no permitido');
    }

    public function show($id)
    {
        abort(404);
    }

    public function edit($id)
    {
        abort(404);
    }

    public function destroy($id)
    {
        abort(405, 'Método no permitido');
    }
}
