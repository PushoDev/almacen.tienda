<?php

namespace App\Http\Controllers;

use App\Exports\PreciosVendedorExport;
use App\Imports\PreciosVendedorImport;
use App\Models\Almacen;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;
use App\Notifications\CambioPrecioVendedorNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ProductoVendedorController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        $almacenesQuery = Almacen::query();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            $almacenesIds = $user->almacenes->pluck('id');
            $almacenesQuery->whereIn('id', $almacenesIds);
        }

        $almacenes = $almacenesQuery->with([
            'productos' => function ($query) {
                $query->withPivot('cantidad');

                $query->leftJoin('producto_vendedors as pv', function ($join) {
                    $join->on('productos.id', '=', 'pv.producto_id')
                        ->on('almacen_producto.almacen_id', '=', 'pv.almacen_id');
                });

                $query->leftJoin('users as u_puesto', 'pv.puesto_por_user_id', '=', 'u_puesto.id');

                $query->select(
                    'productos.*',
                    'pv.precio_venta',
                    'pv.venta_ganancia',
                    'pv.comision',
                    'pv.puesto_por_user_id',
                    DB::raw('u_puesto.name as puesto_por_nombre'),
                )->with('categoria');
            }
        ])->get();

        $user = Auth::user();

        $almacenesTransformados = $almacenes->map(function ($almacen) use ($user) {
            $productos = $almacen->productos->map(function ($producto) use ($almacen, $user) {
                $precioVenta = $producto->precio_venta;

                return [
                    'id'                   => $producto->id,
                    'nombre_producto'      => $producto->nombre_producto,
                    'marca_producto'       => $producto->marca_producto,
                    'modelo_producto'      => $producto->modelo_producto,
                    'capacidad_producto'   => $producto->capacidad_producto,
                    'categoria'            => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                    'imagen_producto'      => $producto->imagen_producto,
                    'precio_compra'        => in_array($user->role, ['admin', 'moderador']) ? $producto->precio_compra_producto : null,
                    'stock_almacen'        => $producto->pivot->cantidad,
                    'precio_venta'         => $precioVenta,
                    'ganancia'             => $producto->venta_ganancia,
                    'comision'             => round((float) ($producto->comision ?? 0), 2),
                    'tiene_precio'         => ($precioVenta ?? 0) > 0,
                    'almacen_id'           => $almacen->id,
                    'puesto_por_nombre'    => $producto->puesto_por_nombre,
                ];
            });

            return [
                'almacen_id'     => $almacen->id,
                'nombre_almacen' => $almacen->nombre_almacen,
                'productos'      => $productos->filter(fn($p) => $p['stock_almacen'] > 0)->values(),
            ];
        });

        return Inertia::render('Productos/Vendor/Index', [
            'almacenes' => $almacenesTransformados->filter(fn($a) => $a['productos']->isNotEmpty())->values(),
            'meta' => [
                'total_almacenes' => $almacenesTransformados->count(),
                'role_usuario'    => $user->role,
            ],
            'canViewSensitiveData' => in_array($user->role, ['admin', 'moderador']),
        ]);
    }

    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        $validated = $request->validate([
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
            'almacen_id'   => ['required', 'integer', 'exists:almacens,id'],
            'comision'     => ['nullable', 'numeric', 'min:0'],
        ]);

        $almacenId = $validated['almacen_id'];

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            return response()->json(['error' => 'No tienes acceso a este almacén.'], 403);
        }

        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia    = round($precioVenta - $producto->precio_compra_producto, 2);

        $registroActual = DB::table('producto_vendedors')
            ->where('producto_id', $productoId)
            ->where('almacen_id', $almacenId)
            ->first();

        $precioAnterior = $registroActual?->precio_venta;
        $precioCambio   = $precioAnterior === null || round((float) $precioAnterior, 2) != $precioVenta;

        $updateData = [
            'precio_venta'       => $precioVenta,
            'venta_ganancia'     => $ganancia,
            'puesto_por_user_id' => $user->id,
            'updated_at'         => now(),
        ];

        if (isset($validated['comision'])) {
            $updateData['comision'] = round($validated['comision'], 2);
        }

        DB::table('producto_vendedors')->updateOrInsert(
            ['producto_id' => $productoId, 'almacen_id' => $almacenId],
            $updateData
        );

        if ($precioCambio) {
            $comisionRegistrada = $updateData['comision'] ?? (float) ($registroActual?->comision ?? 0);

            PrecioHistorial::create([
                'producto_id'    => $productoId,
                'user_id'        => $user->id,
                'almacen_id'     => $almacenId,
                'precio_anterior' => $precioAnterior,
                'precio_nuevo'   => $precioVenta,
                'comision'       => $comisionRegistrada,
                'accion'         => $precioAnterior === null
                    ? 'Primera asignación - Almacén ID ' . $almacenId
                    : 'Actualización - Almacén ID ' . $almacenId,
            ]);

            if (!in_array($user->role, ['admin', 'moderador'])) {
                $almacen = Almacen::find($almacenId);
                $admins  = User::where('role', 'admin')->get();
                foreach ($admins as $admin) {
                    $admin->notify(new CambioPrecioVendedorNotification(
                        $producto,
                        $almacen,
                        $user,
                        $precioAnterior ?? 0,
                        $precioVenta
                    ));
                }
            }
        }

        return response()->json([
            'success'          => true,
            'message'          => 'Precio actualizado correctamente',
            'new_profit'       => $ganancia,
            'new_price'        => $precioVenta,
            'new_comision'     => $updateData['comision'] ?? null,
            'history_recorded' => $precioCambio,
            'puesto_por_nombre' => $user->name,
        ]);
    }

    public function setPreciosBase(Request $request, $productoId)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            return response()->json(['error' => 'No tienes permisos para establecer precios base.'], 403);
        }

        $producto = Producto::findOrFail($productoId);

        $validated = $request->validate([
            'precio_admin' => ['required', 'numeric', 'min:0.01'],
            'almacen_id'   => ['required', 'integer', 'exists:almacens,id'],
        ]);

        $almacenId    = $validated['almacen_id'];
        $precioAdmin  = round($validated['precio_admin'], 2);
        $gananciaAdmin = round($precioAdmin - $producto->precio_compra_producto, 2);

        DB::table('producto_vendedors')->updateOrInsert(
            ['producto_id' => $productoId, 'almacen_id' => $almacenId],
            [
                'precio_admin'  => $precioAdmin,
                'ganancia_admin' => $gananciaAdmin,
                'updated_at'    => now(),
            ]
        );

        return response()->json([
            'success'       => true,
            'message'       => 'Precio base establecido correctamente',
            'precio_admin'  => $precioAdmin,
            'ganancia_admin' => $gananciaAdmin,
        ]);
    }

    /**
     * Retorna el precio actual (con quién lo puso) y el historial completo de cambios.
     * Solo accesible para admin y moderador.
     */
    public function preciosPorVendedor($productoId, $almacenId)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            return response()->json(['success' => false, 'error' => 'No tienes permisos para ver esta información.'], 403);
        }

        try {
            $producto = Producto::findOrFail($productoId);
            $almacen  = Almacen::findOrFail($almacenId);

            $precioActual = DB::table('producto_vendedors')
                ->leftJoin('users', 'producto_vendedors.puesto_por_user_id', '=', 'users.id')
                ->where('producto_vendedors.producto_id', $productoId)
                ->where('producto_vendedors.almacen_id', $almacenId)
                ->select(
                    'producto_vendedors.precio_venta',
                    'producto_vendedors.venta_ganancia',
                    'producto_vendedors.comision',
                    'users.name as puesto_por_nombre',
                    'producto_vendedors.updated_at as ultima_actualizacion'
                )
                ->first();

            $historial = PrecioHistorial::with('usuario')
                ->where('producto_id', $productoId)
                ->where('almacen_id', $almacenId)
                ->latest()
                ->get()
                ->map(function ($item) {
                    return [
                        'id'              => $item->id,
                        'usuario'         => $item->usuario->name ?? 'Desconocido',
                        'precio_anterior' => $item->precio_anterior !== null ? round((float) $item->precio_anterior, 2) : null,
                        'precio_nuevo'    => round((float) $item->precio_nuevo, 2),
                        'comision'        => $item->comision !== null ? round((float) $item->comision, 2) : null,
                        'accion'          => $item->accion ?? 'Actualización',
                        'fecha'           => Carbon::parse($item->created_at)->format('d/m/Y H:i'),
                    ];
                });

            return response()->json([
                'success' => true,
                'producto' => [
                    'id'           => $producto->id,
                    'nombre'       => $producto->nombre_producto,
                    'marca'        => $producto->marca_producto,
                    'modelo'       => $producto->modelo_producto,
                    'capacidad'    => $producto->capacidad_producto,
                    'precio_compra' => round((float) $producto->precio_compra_producto, 2),
                ],
                'almacen' => [
                    'id'     => $almacen->id,
                    'nombre' => $almacen->nombre_almacen,
                ],
                'precio_actual' => $precioActual ? [
                    'precio_venta'         => round((float) $precioActual->precio_venta, 2),
                    'ganancia'             => round((float) $precioActual->venta_ganancia, 2),
                    'comision'             => round((float) $precioActual->comision, 2),
                    'puesto_por_nombre'    => $precioActual->puesto_por_nombre ?? 'Desconocido',
                    'ultima_actualizacion' => Carbon::parse($precioActual->ultima_actualizacion)->format('d/m/Y H:i'),
                ] : null,
                'historial'     => $historial,
                'total_cambios' => $historial->count(),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['success' => false, 'error' => 'Producto o almacén no encontrado.'], 404);
        } catch (\Exception $e) {
            Log::error('Error al obtener historial de precios: ' . $e->getMessage(), [
                'producto_id' => $productoId,
                'almacen_id'  => $almacenId,
            ]);
            return response()->json([
                'success' => false,
                'error'   => 'Error al obtener el historial de precios.',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function actualizarGananciaPorCambioCosto($productoId)
    {
        DB::beginTransaction();

        try {
            $producto   = Producto::findOrFail($productoId);
            $nuevoCosto = $producto->precio_compra_producto;

            $updatedCount = DB::table('producto_vendedors')
                ->where('producto_id', $productoId)
                ->whereNotNull('precio_venta')
                ->update([
                    'venta_ganancia' => DB::raw("ROUND(precio_venta - {$nuevoCosto}, 2)"),
                    'updated_at'     => now(),
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Ganancias actualizadas para {$updatedCount} registros por almacén.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar ganancias por cambio de costo (ProductoID: ' . $productoId . '): ' . $e->getMessage());
            return response()->json([
                'error'   => 'Error al actualizar las ganancias por cambio de costo.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    public function historial($productoId)
    {
        $historial = PrecioHistorial::with(['usuario', 'producto', 'almacen'])
            ->where('producto_id', $productoId)
            ->latest()
            ->get()
            ->map(function ($item) {
                return [
                    'id'              => $item->id,
                    'producto'        => $item->producto->nombre_producto,
                    'usuario'         => $item->usuario->name,
                    'almacen'         => $item->almacen->nombre_almacen ?? 'General',
                    'precio_anterior' => $item->precio_anterior,
                    'precio_nuevo'    => $item->precio_nuevo,
                    'comision'        => $item->comision,
                    'accion'          => $item->accion ?? 'Desconocida',
                    'fecha'           => $item->created_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
        ]);
    }

    public function exportExcel(Request $request, int $almacenId)
    {
        $user    = Auth::user();
        $almacen = Almacen::findOrFail($almacenId);

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            abort(403, 'No tienes acceso a este almacén.');
        }

        $nombre = 'precios_' . str($almacen->nombre_almacen)->slug('_') . '_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new PreciosVendedorExport($almacenId), $nombre);
    }

    public function importExcel(Request $request, int $almacenId)
    {
        $user = Auth::user();

        $request->validate([
            'archivo' => [
                'required', 'file', 'max:5120',
                'mimetypes:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/octet-stream,application/zip,application/x-zip-compressed',
            ],
        ]);

        $extension = strtolower($request->file('archivo')->getClientOriginalExtension());
        if (!in_array($extension, ['xlsx', 'xls'])) {
            return response()->json(['success' => false, 'error' => 'Solo se aceptan archivos .xlsx o .xls'], 422);
        }

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            return response()->json(['success' => false, 'error' => 'No tienes acceso a este almacén.'], 403);
        }

        try {
            $import = new PreciosVendedorImport($almacenId, $user->id);
            Excel::import($import, $request->file('archivo'));

            return response()->json([
                'success'     => true,
                'actualizados' => $import->actualizados,
                'omitidos'    => $import->omitidos,
                'errores'     => $import->errores,
                'message'     => "Se actualizaron {$import->actualizados} producto(s). {$import->omitidos} omitido(s) (sin cambios).",
            ]);
        } catch (\Exception $e) {
            Log::error('Error al importar precios: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error'   => 'Error al procesar el archivo. Asegúrate de que sea el Excel exportado desde este sistema.',
            ], 422);
        }
    }

    public function create()  { abort(404); }
    public function store(Request $request) { abort(405, 'Método no permitido'); }
    public function show($id) { abort(404); }
    public function edit($id) { abort(404); }
    public function destroy($id) { abort(405, 'Método no permitido'); }
}
