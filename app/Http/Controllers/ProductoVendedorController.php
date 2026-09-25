<?php

namespace App\Http\Controllers;

use App\Exports\PreciosVendedorExport;
use App\Imports\PreciosVendedorImport;
use App\Models\Almacen;
use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;
use App\Notifications\CambioPrecioVendedorNotification;
use App\Services\FichasHermanasService;
use App\Services\FusionLotesService;
use App\Services\ValorInventarioService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ProductoVendedorController extends Controller
{
    public function index(FichasHermanasService $fichasHermanas, ValorInventarioService $valorInventario)
    {
        $user = Auth::user();

        $almacenesQuery = Almacen::query();

        if (! in_array($user->role, ['admin', 'moderador'])) {
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
                    'pv.precio_de_grupo',
                    'pv.puesto_por_user_id',
                    DB::raw('u_puesto.name as puesto_por_nombre'),
                )->with('categoria');
            },
        ])->get();

        $puedeVerCosto = in_array($user->role, ['admin', 'moderador']);
        // Costo real por lote de cada producto+almacén, en una sola query (ver ValorInventarioService).
        $costosReales = $puedeVerCosto ? $valorInventario->costosPorProductoAlmacen() : [];

        // Lotes de las combinaciones producto+almacén con 2+ lotes con stock — aunque cuesten lo
        // mismo: el usuario puede querer fusionarlos (antes solo salían con costos distintos y los
        // de igual costo no ofrecían fusionar). Para el desglose por lote opcional.
        $lotesVariosLotes = $this->lotesConVariosLotes($puedeVerCosto);

        $almacenesTransformados = $almacenes->map(function ($almacen) use ($user, $fichasHermanas, $puedeVerCosto, $costosReales, $lotesVariosLotes) {
            // Fichas hermanas con stock en ESTE almacén (mismo producto repetido): comparten
            // `grupo_clave` para mostrarse juntas y usar el precio del grupo (actualizarPrecioGrupo()).
            $clavesRepetidas = $almacen->productos
                ->filter(fn ($p) => $p->pivot->cantidad > 0)
                ->map(fn ($p) => $fichasHermanas->clave($p))
                ->countBy()
                ->filter(fn ($veces) => $veces > 1);

            $productos = $almacen->productos->map(function ($producto) use ($almacen, $user, $fichasHermanas, $clavesRepetidas, $puedeVerCosto, $costosReales, $lotesVariosLotes) {
                $precioVenta = $producto->precio_venta;
                $clave = $fichasHermanas->clave($producto);

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'modelo_producto' => $producto->modelo_producto,
                    'capacidad_producto' => $producto->capacidad_producto,
                    'color_producto' => $producto->color_producto,
                    'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                    'imagen_producto' => $producto->imagen_producto,
                    'precio_compra' => in_array($user->role, ['admin', 'moderador']) ? $producto->precio_compra_producto : null,
                    'stock_almacen' => $producto->pivot->cantidad,
                    'precio_venta' => $precioVenta,
                    'ganancia' => $producto->venta_ganancia,
                    'comision' => round((float) ($producto->comision ?? 0), 2),
                    'tiene_precio' => ($precioVenta ?? 0) > 0,
                    'almacen_id' => $almacen->id,
                    'puesto_por_nombre' => $producto->puesto_por_nombre,
                    'grupo_clave' => $clavesRepetidas->has($clave) ? $clave : null,
                    'precio_de_grupo' => (bool) $producto->precio_de_grupo,
                    'costo_real' => $puedeVerCosto
                        ? ($costosReales[$producto->id.'-'.$almacen->id]['costo'] ?? (float) $producto->precio_compra_producto)
                        : null,
                    // null = un solo costo en este almacén (lo normal); si no, sus lotes con stock.
                    'lotes' => $lotesVariosLotes[$producto->id.'-'.$almacen->id] ?? null,
                ];
            });

            return [
                'almacen_id' => $almacen->id,
                'nombre_almacen' => $almacen->nombre_almacen,
                // Fichas con stock, más las agotadas que tienen precio (se muestran como "Agotado",
                // igual que el POS). Las que están en cero y sin precio son asignaciones viejas
                // sin uso y no se listan.
                'productos' => $productos->filter(fn ($p) => $p['stock_almacen'] > 0 || $p['tiene_precio'])->values(),
            ];
        });

        return Inertia::render('Productos/Vendor/Index', [
            'almacenes' => $almacenesTransformados->filter(fn ($a) => $a['productos']->isNotEmpty())->values(),
            'meta' => [
                'total_almacenes' => $almacenesTransformados->count(),
                'role_usuario' => $user->role,
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
            'almacen_id' => ['required', 'integer', 'exists:almacens,id'],
            'comision' => ['nullable', 'numeric', 'min:0'],
        ]);

        $almacenId = $validated['almacen_id'];

        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains($almacenId)) {
            return response()->json(['error' => 'No tienes acceso a este almacén.'], 403);
        }

        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);

        $registroActual = DB::table('producto_vendedors')
            ->where('producto_id', $productoId)
            ->where('almacen_id', $almacenId)
            ->first();

        $precioAnterior = $registroActual?->precio_venta;
        $precioCambio = $precioAnterior === null || round((float) $precioAnterior, 2) != $precioVenta;

        $updateData = [
            'precio_venta' => $precioVenta,
            'venta_ganancia' => $ganancia,
            // Precio puesto a mano para esta ficha: se separa del precio del grupo de fichas
            // hermanas (ver actualizarPrecioGrupo()), que ya no lo va a pisar.
            'precio_de_grupo' => false,
            'puesto_por_user_id' => $user->id,
            'updated_at' => now(),
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
                'producto_id' => $productoId,
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
                'precio_anterior' => $precioAnterior,
                'precio_nuevo' => $precioVenta,
                'comision' => $comisionRegistrada,
                'accion' => $precioAnterior === null
                    ? 'Primera asignación - Almacén ID '.$almacenId
                    : 'Actualización - Almacén ID '.$almacenId,
            ]);

            if (! in_array($user->role, ['admin', 'moderador'])) {
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
            'puesto_por_nombre' => $user->name,
        ]);
    }

    /**
     * "Fusionar lotes" global del almacén seleccionado: une TODOS los lotes de cada producto
     * elegido en uno solo (ver FusionLotesService::fusionarEnAlmacen()). Sigue con los demás si
     * alguno falla y devuelve el detalle. Solo admin/moderador (ruta).
     */
    public function fusionarLotesAlmacen(Request $request, Almacen $almacen, FusionLotesService $fusionLotes)
    {
        $validated = $request->validate([
            'producto_ids' => ['required', 'array', 'min:1'],
            'producto_ids.*' => ['integer', 'distinct', 'exists:productos,id'],
        ]);

        $resultado = $fusionLotes->fusionarEnAlmacen(array_map('intval', $validated['producto_ids']), $almacen->id, $request->user());

        $nombres = Producto::whereIn('id', $validated['producto_ids'])->pluck('nombre_producto', 'id');
        $conNombre = fn (array $filas) => array_map(fn ($fila) => $fila + ['nombre_producto' => $nombres[$fila['producto_id']] ?? ''], $filas);

        return response()->json([
            'success' => true,
            'message' => count($resultado['fusionados']).' producto(s) fusionado(s)'.(count($resultado['fallidos']) ? ', '.count($resultado['fallidos']).' no se pudieron fusionar.' : '.'),
            'fusionados' => $conNombre($resultado['fusionados']),
            'fallidos' => $conNombre($resultado['fallidos']),
        ]);
    }

    /**
     * Lotes con stock de cada combinación producto+almacén que tiene 2+ lotes con stock (con
     * el mismo costo o con costos distintos), más viejo primero (orden FIFO). `precio_venta` = precio propio del lote ("Opción A"), null =
     * hereda el precio del producto en el almacén.
     *
     * @return array<string, array<int, array{id: int, codigo: string, cantidad: int, costo: float|null, precio_venta: float|null, prorrateo_pendiente: bool}>> clave "producto_id-almacen_id"
     */
    private function lotesConVariosLotes(bool $puedeVerCosto): array
    {
        $combinaciones = DB::table('lotes_stock')
            ->where('cantidad_disponible', '>', 0)
            ->select('producto_id', 'almacen_id')
            ->groupBy('producto_id', 'almacen_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($combinaciones->isEmpty()) {
            return [];
        }

        $movimientosPendientes = DB::table('movimientos')
            ->where('requiere_prorrateo', true)
            ->whereNull('prorrateo_decision')
            ->pluck('id')
            ->all();

        return DB::table('lotes_stock')
            ->where('cantidad_disponible', '>', 0)
            ->where(function ($query) use ($combinaciones) {
                foreach ($combinaciones as $c) {
                    $query->orWhere(fn ($q) => $q->where('producto_id', $c->producto_id)->where('almacen_id', $c->almacen_id));
                }
            })
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->groupBy(fn ($lote) => $lote->producto_id.'-'.$lote->almacen_id)
            ->map(fn ($lotes) => $lotes->map(fn ($lote) => [
                'id' => $lote->id,
                'codigo' => $lote->codigo,
                'cantidad' => (int) $lote->cantidad_disponible,
                'costo' => $puedeVerCosto ? round((float) $lote->precio_costo, 2) : null,
                'precio_venta' => $lote->precio_venta !== null ? round((float) $lote->precio_venta, 2) : null,
                // Bloquea la fusión (FusionLotesService): el prorrateo no llegaría al lote resultante.
                'prorrateo_pendiente' => in_array($lote->movimiento_id, $movimientosPendientes),
            ])->values()->all())
            ->all();
    }

    /**
     * "Precio del grupo": mismo producto repetido como 2+ fichas con stock en este almacén
     * (fichas hermanas, ver FichasHermanasService) — se vende igual aunque el costo de cada ficha
     * sea distinto. Se aplica a las fichas sin precio y a las que ya siguen al grupo
     * (`precio_de_grupo`); una ficha con precio puesto a mano no se toca, salvo que
     * `incluir_con_precio_propio` lo pida explícitamente (y entonces vuelve a seguir al grupo).
     */
    public function actualizarPrecioGrupo(Request $request, FichasHermanasService $fichasHermanas)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            'almacen_id' => ['required', 'integer', 'exists:almacens,id'],
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
            'comision' => ['nullable', 'numeric', 'min:0'],
            'incluir_con_precio_propio' => ['sometimes', 'boolean'],
        ]);

        $almacenId = (int) $validated['almacen_id'];

        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains($almacenId)) {
            return response()->json(['error' => 'No tienes acceso a este almacén.'], 403);
        }

        $fichas = $fichasHermanas->hermanasConStockEnAlmacen(Producto::findOrFail($validated['producto_id']), $almacenId);

        if ($fichas->count() < 2) {
            return response()->json(['error' => 'Este producto no tiene otras fichas con stock en este almacén.'], 422);
        }

        $precioVenta = round($validated['precio_venta'], 2);
        $comision = isset($validated['comision']) ? round($validated['comision'], 2) : null;
        $incluirConPrecioPropio = (bool) ($validated['incluir_con_precio_propio'] ?? false);

        $resultado = DB::transaction(function () use ($fichas, $almacenId, $precioVenta, $comision, $incluirConPrecioPropio, $user) {
            return $fichas->map(function (Producto $ficha) use ($almacenId, $precioVenta, $comision, $incluirConPrecioPropio, $user) {
                $registroActual = DB::table('producto_vendedors')
                    ->where('producto_id', $ficha->id)
                    ->where('almacen_id', $almacenId)
                    ->first();

                $tienePrecioPropio = $registroActual && (float) $registroActual->precio_venta > 0 && ! $registroActual->precio_de_grupo;
                $aplicar = ! $tienePrecioPropio || $incluirConPrecioPropio;
                $costoReal = $ficha->costoEnAlmacen($almacenId);

                if ($aplicar) {
                    $precioAnterior = $registroActual?->precio_venta !== null ? round((float) $registroActual->precio_venta, 2) : null;
                    $comisionFinal = $comision ?? round((float) ($registroActual?->comision ?? 0), 2);

                    DB::table('producto_vendedors')->updateOrInsert(
                        ['producto_id' => $ficha->id, 'almacen_id' => $almacenId],
                        [
                            'precio_venta' => $precioVenta,
                            'venta_ganancia' => round($precioVenta - $costoReal, 2),
                            'comision' => $comisionFinal,
                            'precio_de_grupo' => true,
                            'puesto_por_user_id' => $user->id,
                            'updated_at' => now(),
                        ]
                    );

                    if ($precioAnterior !== $precioVenta) {
                        PrecioHistorial::create([
                            'producto_id' => $ficha->id,
                            'user_id' => $user->id,
                            'almacen_id' => $almacenId,
                            'precio_anterior' => $precioAnterior,
                            'precio_nuevo' => $precioVenta,
                            'comision' => $comisionFinal,
                            'accion' => 'Precio de grupo - Almacén ID '.$almacenId,
                        ]);
                    }
                }

                $precioFinal = $aplicar ? $precioVenta : round((float) $registroActual->precio_venta, 2);
                $comisionAplicada = $aplicar ? ($comision ?? round((float) ($registroActual?->comision ?? 0), 2)) : round((float) $registroActual->comision, 2);

                return [
                    'producto_id' => $ficha->id,
                    'aplicado' => $aplicar,
                    'precio_venta' => $precioFinal,
                    'precio_de_grupo' => $aplicar,
                    // Costo/margen solo para admin/moderador (mismo criterio que el resto de /disponibles).
                    'costo_real' => in_array($user->role, ['admin', 'moderador']) ? $costoReal : null,
                    'margen_unitario' => in_array($user->role, ['admin', 'moderador']) ? round($precioFinal - $comisionAplicada - $costoReal, 2) : null,
                    // El POS bloquea vender por debajo del costo real del lote (salvo venta especial).
                    'bajo_costo' => $precioFinal < $costoReal,
                ];
            })->values();
        });

        if (! in_array($user->role, ['admin', 'moderador'])) {
            $almacen = Almacen::find($almacenId);
            foreach (User::where('role', 'admin')->get() as $admin) {
                $admin->notify(new CambioPrecioVendedorNotification($fichas->first(), $almacen, $user, 0, $precioVenta));
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Precio del grupo aplicado a '.$resultado->where('aplicado', true)->count().' de '.$resultado->count().' fichas.',
            'fichas' => $resultado,
        ]);
    }

    /**
     * Aplica el mismo precio de venta (y comisión opcional) a varios almacenes
     * a la vez, para un mismo producto. Exclusivo admin (gate en la ruta, ver
     * routes/crud/productos.php, middleware 'admin.only').
     */
    public function updateBulk(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'producto_id' => ['required', 'integer', 'exists:productos,id'],
            'almacen_ids' => ['required', 'array', 'min:1'],
            'almacen_ids.*' => ['integer', 'exists:almacens,id', 'distinct'],
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
            'comision' => ['nullable', 'numeric', 'min:0'],
            'password_confirmacion' => ['required', 'string'],
        ]);

        if (! Hash::check($validated['password_confirmacion'], $user->password)) {
            return response()->json([
                'success' => false,
                'error' => 'Contraseña incorrecta. Los precios no fueron actualizados.',
            ], 422);
        }

        $producto = Producto::findOrFail($validated['producto_id']);
        $precioVenta = round($validated['precio_venta'], 2);
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);
        $comision = isset($validated['comision']) ? round($validated['comision'], 2) : null;

        $resultados = DB::transaction(function () use ($validated, $producto, $precioVenta, $ganancia, $comision, $user) {
            $resultados = [];

            foreach ($validated['almacen_ids'] as $almacenId) {
                $registroActual = DB::table('producto_vendedors')
                    ->where('producto_id', $producto->id)
                    ->where('almacen_id', $almacenId)
                    ->first();

                $precioAnterior = $registroActual?->precio_venta;
                $precioCambio = $precioAnterior === null || round((float) $precioAnterior, 2) != $precioVenta;

                $updateData = [
                    'precio_venta' => $precioVenta,
                    'venta_ganancia' => $ganancia,
                    'precio_de_grupo' => false,
                    'puesto_por_user_id' => $user->id,
                    'updated_at' => now(),
                ];

                if ($comision !== null) {
                    $updateData['comision'] = $comision;
                }

                DB::table('producto_vendedors')->updateOrInsert(
                    ['producto_id' => $producto->id, 'almacen_id' => $almacenId],
                    $updateData
                );

                if ($precioCambio) {
                    $comisionRegistrada = $comision ?? (float) ($registroActual?->comision ?? 0);

                    PrecioHistorial::create([
                        'producto_id' => $producto->id,
                        'user_id' => $user->id,
                        'almacen_id' => $almacenId,
                        'precio_anterior' => $precioAnterior,
                        'precio_nuevo' => $precioVenta,
                        'comision' => $comisionRegistrada,
                        'accion' => $precioAnterior === null
                            ? 'Primera asignación (masiva) - Almacén ID '.$almacenId
                            : 'Actualización masiva - Almacén ID '.$almacenId,
                    ]);
                }

                $resultados[] = [
                    'almacen_id' => $almacenId,
                    'precio_anterior' => $precioAnterior !== null ? round((float) $precioAnterior, 2) : null,
                    'precio_nuevo' => $precioVenta,
                    'history_recorded' => $precioCambio,
                ];
            }

            return $resultados;
        });

        return response()->json([
            'success' => true,
            'message' => 'Precio actualizado en '.count($resultados).' almacén(es).',
            'new_profit' => $ganancia,
            'new_price' => $precioVenta,
            'new_comision' => $comision,
            'resultados' => $resultados,
        ]);
    }

    public function setPreciosBase(Request $request, $productoId)
    {
        $user = Auth::user();

        if (! in_array($user->role, ['admin', 'moderador'])) {
            return response()->json(['error' => 'No tienes permisos para establecer precios base.'], 403);
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
            ['producto_id' => $productoId, 'almacen_id' => $almacenId],
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
     * Retorna el precio actual (con quién lo puso) y el historial completo de cambios.
     * Solo accesible para admin y moderador.
     */
    public function preciosPorVendedor($productoId, $almacenId)
    {
        $user = Auth::user();

        if (! in_array($user->role, ['admin', 'moderador'])) {
            return response()->json(['success' => false, 'error' => 'No tienes permisos para ver esta información.'], 403);
        }

        try {
            $producto = Producto::findOrFail($productoId);
            $almacen = Almacen::findOrFail($almacenId);

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
                        'id' => $item->id,
                        'usuario' => $item->usuario->name ?? 'Desconocido',
                        'precio_anterior' => $item->precio_anterior !== null ? round((float) $item->precio_anterior, 2) : null,
                        'precio_nuevo' => round((float) $item->precio_nuevo, 2),
                        'comision' => $item->comision !== null ? round((float) $item->comision, 2) : null,
                        'accion' => $item->accion ?? 'Actualización',
                        'fecha' => Carbon::parse($item->created_at)->format('d/m/Y H:i'),
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
                    'color' => $producto->color_producto,
                    'precio_compra' => round((float) $producto->precio_compra_producto, 2),
                ],
                'almacen' => [
                    'id' => $almacen->id,
                    'nombre' => $almacen->nombre_almacen,
                ],
                'precio_actual' => $precioActual ? [
                    'precio_venta' => round((float) $precioActual->precio_venta, 2),
                    'ganancia' => round((float) $precioActual->venta_ganancia, 2),
                    'comision' => round((float) $precioActual->comision, 2),
                    'puesto_por_nombre' => $precioActual->puesto_por_nombre ?? 'Desconocido',
                    'ultima_actualizacion' => Carbon::parse($precioActual->ultima_actualizacion)->format('d/m/Y H:i'),
                ] : null,
                'historial' => $historial,
                'total_cambios' => $historial->count(),
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json(['success' => false, 'error' => 'Producto o almacén no encontrado.'], 404);
        } catch (\Exception $e) {
            Log::error('Error al obtener historial de precios: '.$e->getMessage(), [
                'producto_id' => $productoId,
                'almacen_id' => $almacenId,
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Error al obtener el historial de precios.',
                'details' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Recalcula la ganancia de cada precio de vendedor asignado a este producto. Con
     * $almacenId, usa el costo real de ESE almacén (Producto::costoEnAlmacen(), promedio
     * ponderado de lotes_stock) en vez del costo global de la ficha — necesario desde que un
     * mismo producto puede costar distinto según el almacén (traslados prorrateados de forma
     * independiente, ver docs/ESTADO_DESARROLLO.md 2026-09-18). Sin $almacenId, mantiene el
     * comportamiento viejo (costo global, todos los almacenes) — usado por callers que todavía
     * no distinguen por almacén (ver TransaccionController).
     */
    public function actualizarGananciaPorCambioCosto($productoId, ?int $almacenId = null)
    {
        DB::beginTransaction();

        try {
            $producto = Producto::findOrFail($productoId);
            $nuevoCosto = $almacenId !== null ? $producto->costoEnAlmacen($almacenId) : $producto->precio_compra_producto;

            $query = DB::table('producto_vendedors')
                ->where('producto_id', $productoId)
                ->whereNotNull('precio_venta');

            if ($almacenId !== null) {
                $query->where('almacen_id', $almacenId);
            }

            $updatedCount = $query->update([
                'venta_ganancia' => DB::raw("ROUND(precio_venta - {$nuevoCosto}, 2)"),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Ganancias actualizadas para {$updatedCount} registros por almacén.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar ganancias por cambio de costo (ProductoID: '.$productoId.'): '.$e->getMessage());

            return response()->json([
                'error' => 'Error al actualizar las ganancias por cambio de costo.',
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
                    'id' => $item->id,
                    'producto' => $item->producto->nombre_producto,
                    'usuario' => $item->usuario->name,
                    'almacen' => $item->almacen->nombre_almacen ?? 'General',
                    'precio_anterior' => $item->precio_anterior,
                    'precio_nuevo' => $item->precio_nuevo,
                    'comision' => $item->comision,
                    'accion' => $item->accion ?? 'Desconocida',
                    'fecha' => $item->created_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
        ]);
    }

    public function exportExcel(Request $request, int $almacenId)
    {
        $user = Auth::user();
        $almacen = Almacen::findOrFail($almacenId);

        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains($almacenId)) {
            abort(403, 'No tienes acceso a este almacén.');
        }

        $nombre = 'precios_'.str($almacen->nombre_almacen)->slug('_').'_'.now()->format('Ymd_His').'.xlsx';

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
        if (! in_array($extension, ['xlsx', 'xls'])) {
            return response()->json(['success' => false, 'error' => 'Solo se aceptan archivos .xlsx o .xls'], 422);
        }

        if (! in_array($user->role, ['admin', 'moderador']) && ! $user->almacenes->contains($almacenId)) {
            return response()->json(['success' => false, 'error' => 'No tienes acceso a este almacén.'], 403);
        }

        try {
            $import = new PreciosVendedorImport($almacenId, $user->id);
            Excel::import($import, $request->file('archivo'));

            return response()->json([
                'success' => true,
                'actualizados' => $import->actualizados,
                'omitidos' => $import->omitidos,
                'errores' => $import->errores,
                'message' => "Se actualizaron {$import->actualizados} producto(s). {$import->omitidos} omitido(s) (sin cambios).",
            ]);
        } catch (\Exception $e) {
            Log::error('Error al importar precios: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Error al procesar el archivo. Asegúrate de que sea el Excel exportado desde este sistema.',
            ], 422);
        }
    }

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
