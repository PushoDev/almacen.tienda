<?php

namespace App\Http\Controllers;

use App\Exports\PreciosVendedorExport;
use App\Imports\PreciosVendedorImport;
use App\Models\Almacen;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;
use App\Notifications\CambioPrecioVendedorNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

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

                // Fila de referencia del admin (precio oficial + comisión fija)
                $query->leftJoin('producto_vendedors as pv_admin', function ($join) {
                    $join->on('productos.id', '=', 'pv_admin.producto_id')
                        ->on('almacen_producto.almacen_id', '=', 'pv_admin.almacen_id')
                        ->where('pv_admin.user_id', 1);
                });

                // Fila propia del usuario logueado (si existe, su precio prevalece)
                $query->leftJoin('producto_vendedors as pv_user', function ($join) use ($user) {
                    $join->on('productos.id', '=', 'pv_user.producto_id')
                        ->on('almacen_producto.almacen_id', '=', 'pv_user.almacen_id')
                        ->where('pv_user.user_id', $user->id);
                });

                $query->select(
                    'productos.*',
                    DB::raw('COALESCE(pv_user.precio_venta, pv_admin.precio_venta) as precio_venta'),
                    DB::raw('COALESCE(pv_user.venta_ganancia, pv_admin.venta_ganancia) as venta_ganancia'),
                    // Si el usuario tiene su propia fila con precio, muestra su comisión; si no, la del admin
                    DB::raw('CASE WHEN pv_user.precio_venta IS NOT NULL THEN pv_user.comision ELSE pv_admin.comision END as comision')
                )->with('categoria');
            }
        ])->get();

        $almacenesTransformados = $almacenes->map(function ($almacen) {
            $productos = $almacen->productos->map(function ($producto) use ($almacen) {

                $stockAlmacen = $producto->pivot->cantidad;
                $precioVenta = $producto->precio_venta;
                $ganancia = $producto->venta_ganancia;
                $comision = $producto->comision;

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                    'imagen_producto' => $producto->imagen_producto,
                    'precio_compra' => $producto->precio_compra_producto,
                    'stock_almacen' => $stockAlmacen,
                    'precio_venta' => $precioVenta,
                    'ganancia' => $ganancia,
                    'comision' => $comision,
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
            'canViewSensitiveData' => in_array($user->role, ['admin', 'moderador']),
        ]);
    }

    /**
     * Actualizar precio y ganancia por Almacén.
     */
    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        // Admin/moderador guardan en la fila oficial (user_id=1); vendedores en la suya propia
        $saveUserId = in_array($user->role, ['admin', 'moderador']) ? 1 : $user->id;

        $validated = $request->validate([
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
            'almacen_id' => ['required', 'integer', 'exists:almacens,id'],
            'comision' => ['nullable', 'numeric', 'min:0'],
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
            ->where('almacen_id', $almacenId)
            ->where('user_id', $saveUserId)
            ->value('precio_venta');

        $precioCambio = $precioAnterior !== null &&
            round($precioAnterior, 2) != $precioVenta;

        $updateData = [
            'precio_venta' => $precioVenta,
            'venta_ganancia' => $ganancia,
            'updated_at' => now(),
        ];

        // Todos los usuarios pueden fijar su propia comisión
        if (isset($validated['comision'])) {
            $updateData['comision'] = round($validated['comision'], 2);
        }

        DB::table('producto_vendedors')->updateOrInsert(
            [
                'producto_id' => $productoId,
                'user_id' => $saveUserId,
                'almacen_id' => $almacenId,
            ],
            $updateData
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

            // Notificar al admin si el vendedor cambió el precio
            if (!in_array($user->role, ['admin', 'moderador'])) {
                $almacen = Almacen::find($almacenId);
                $admins = User::where('role', 'admin')->get();
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
            'success' => true,
            'message' => 'Precio actualizado correctamente',
            'new_profit' => $ganancia,
            'new_price' => $precioVenta,
            'new_comision' => $updateData['comision'] ?? null,
            'history_recorded' => $precioCambio,
        ]);
    }

    /**
     * Establecer precio base por administrador para un producto en un almacén.
     */
    public function setPreciosBase(Request $request, $productoId)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['admin', 'moderador'])) {
            return response()->json([
                'error' => 'No tienes permisos para establecer precios base.',
            ], 403);
        }

        $producto = Producto::findOrFail($productoId);

        $validated = $request->validate([
            'precio_admin' => ['required', 'numeric', 'min:0.01'],
            'almacen_id' => ['required', 'integer', 'exists:almacens,id'],
        ]);

        $almacenId = $validated['almacen_id'];
        $precioAdmin = round($validated['precio_admin'], 2);
        $gananciaAdmin = round($precioAdmin - $producto->precio_compra_producto, 2);

        DB::table('producto_vendedors')->updateOrInsert(
            [
                'producto_id' => $productoId,
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
            ],
            [
                'precio_admin' => $precioAdmin,
                'ganancia_admin' => $gananciaAdmin,
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Precio base establecido correctamente',
            'precio_admin' => $precioAdmin,
            'ganancia_admin' => $gananciaAdmin,
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

            // Fila del admin: precio de referencia y comisión fija
            $adminRow = DB::table('producto_vendedors')
                ->where('producto_id', $productoId)
                ->where('almacen_id', $almacenId)
                ->where('user_id', 1)
                ->select('precio_venta', 'comision')
                ->first();

            $precioAdmin = $adminRow ? round((float)$adminRow->precio_venta, 2) : null;
            $comisionFija = $adminRow ? round((float)$adminRow->comision, 2) : 0.00;

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
                    'producto_vendedors.comision',
                    'producto_vendedors.updated_at as ultima_actualizacion'
                )
                ->orderBy('producto_vendedors.precio_venta', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'user_id' => $item->user_id,
                        'vendedor' => $item->vendedor,
                        'email' => $item->email,
                        'es_admin' => $item->user_id == 1,
                        'precio_venta' => round((float)$item->precio_venta, 2),
                        'ganancia' => round((float)$item->venta_ganancia, 2),
                        // Cada usuario define su propia comisión al asignar el precio
                        'comision_real' => round((float)$item->comision, 2),
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
                'precio_admin' => $precioAdmin,
                'comision_fija' => $comisionFija,
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
     * Exportar precios del almacén a Excel.
     */
    public function exportExcel(Request $request, int $almacenId)
    {
        $user = Auth::user();

        $almacen = Almacen::findOrFail($almacenId);

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            abort(403, 'No tienes acceso a este almacén.');
        }

        $nombre = 'precios_' . str($almacen->nombre_almacen)->slug('_') . '_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(
            new PreciosVendedorExport($almacenId, $user->id, $user->role),
            $nombre
        );
    }

    /**
     * Importar precios desde Excel.
     */
    public function importExcel(Request $request, int $almacenId)
    {
        $user = Auth::user();

        $request->validate([
            'archivo' => ['required', 'file', 'mimes:xlsx,xls', 'max:5120'],
        ]);

        if (!in_array($user->role, ['admin', 'moderador']) && !$user->almacenes->contains($almacenId)) {
            return response()->json(['success' => false, 'error' => 'No tienes acceso a este almacén.'], 403);
        }

        try {
            $import = new PreciosVendedorImport($almacenId, $user->id, $user->role);
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
