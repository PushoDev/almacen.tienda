<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\HistorialPrecioCosto;
use App\Models\Venta;
use App\Services\CatalogoTarjetasService;
use App\Services\DashboardStatsService;
use App\Services\ValorInventarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ReporteController extends Controller
{
    /**
     * Inicio de los Reportes
     *
     * @return void
     */
    public function index()
    {
        return Inertia::render('Reportes/Index', []);
    }

    /**
     * Obtener los productos mas comprados.
     */
    public function productosMasComprados()
    {
        $productos = DB::table('compra_producto')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->select(
                'productos.nombre_producto',
                DB::raw('SUM(compra_producto.cantidad) as total_cantidad'),
                // DISTINCT: un producto puede tener varias líneas en la misma compra (distintos
                // almacenes/colores) — "veces comprado" cuenta compras, no líneas.
                DB::raw('COUNT(DISTINCT compra_producto.compra_id) as veces_comprado')
            )
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderByDesc('total_cantidad')
            ->take(10)
            ->get();

        return Inertia::render('Reportes/Report/ProductosMasComprados', [
            'productos' => $productos,
        ]);
    }

    /**
     * Compras por Periodo
     */
    public function comprasPorPeriodo(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'proveedor_id' => 'nullable|exists:clientes,id',
        ]);

        // El proveedor de una compra es un cliente; `proveedor_id` es el id de ese cliente
        $query = DB::table('compras')
            ->join('clientes', 'compras.cliente_id', '=', 'clientes.id')
            ->select(
                'compras.id',
                'compras.fecha_compra',
                'compras.total_compra',
                'clientes.nombre_cliente as nombre_proveedor',
                'compras.tipo_compra'
            );

        if ($request->filled('start_date')) {
            $query->whereDate('compras.fecha_compra', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('compras.fecha_compra', '<=', $request->end_date);
        }

        if ($request->filled('proveedor_id')) {
            $query->where('compras.cliente_id', $request->proveedor_id);
        }

        $compras = $query->orderByDesc('compras.fecha_compra')->get();

        return Inertia::render('Reportes/Report/CompraPorPeriodo', [
            'compras' => $compras,
        ]);
    }

    /**
     * Balance Mensual
     */
    public function balanceGastosMensuales()
    {
        $gastos = DB::table('compras')
            ->select(
                DB::raw("DATE_FORMAT(compras.fecha_compra, '%Y-%m') as mes_anio"),
                DB::raw('SUM(compras.total_compra) as total'),
                DB::raw('COUNT(compras.id) as cantidad_compras')
            )
            ->groupBy('mes_anio')
            ->orderByDesc('mes_anio')
            ->get();

        return Inertia::render('Reportes/Report/BalanceGastosMensauales', [
            'gastos' => $gastos,
        ]);
    }

    /**
     * Compras por Proveedor
     */
    public function comprasPorProveedor($proveedorId = null)
    {
        $query = DB::table('compras')
            ->join('clientes', 'compras.cliente_id', '=', 'clientes.id')
            ->select(
                'compras.id',
                'compras.fecha_compra',
                'compras.total_compra',
                'compras.tipo_compra'
            );

        if ($proveedorId) {
            $query->where('compras.cliente_id', $proveedorId);
        }

        $compras = $query->orderByDesc('compras.fecha_compra')->get();
        $proveedor = $proveedorId
            ? DB::table('clientes')->select('id', 'nombre_cliente as nombre_proveedor')->where('id', $proveedorId)->first()
            : null;

        return Inertia::render('Reportes/Report/ComprasPorProveedor', [
            'compras' => $compras,
            'proveedor' => $proveedor,
        ]);
    }

    /**
     * Reporte de inventario actual por Almacén.
     * Muestra cantidades totales y productos únicos por almacén.
     */
    public function inventarioPorAlmacen()
    {
        $almacenes = DB::table('almacen_producto')
            ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
            ->select(
                'almacens.id as almacen_id',
                'almacens.nombre_almacen',
                DB::raw('SUM(almacen_producto.cantidad) as total_productos'),
                DB::raw('COUNT(almacen_producto.producto_id) as productos_unicos')
            )
            ->groupBy('almacens.id', 'almacens.nombre_almacen')
            ->orderByDesc('total_productos')
            ->get();

        return Inertia::render('Reportes/Report/InventarioPorAlmacen', [
            'almacenes' => $almacenes,
        ]);
    }

    /**
     * Reporte detallado del inventario actual por Almacén.
     * Muestra cada producto y su cantidad por almacén.
     */
    public function inventarioDetalladoPorAlmacen()
    {
        $datos = DB::table('almacen_producto')
            ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->select(
                'almacens.id as almacen_id',
                'almacens.nombre_almacen',
                'productos.id as producto_id',
                'productos.nombre_producto',
                'almacen_producto.cantidad as cantidad_total'
            )
            ->where('almacen_producto.cantidad', '>', 0) // Solo mostrar productos con stock
            ->orderBy('almacens.nombre_almacen')
            ->orderBy('productos.nombre_producto')
            ->get();

        return Inertia::render(
            'Reportes/Report/InventarioDetalladoPorAlmacen',
            [
                'datos' => $datos,
            ]
        );
    }

    /**
     * Obtiene datos de compras y ventas para un gráfico en un rango de tiempo.
     *
     * @return JsonResponse
     */
    public function getComprasVentasData(Request $request)
    {
        // Compras es admin-only en el resto del sistema (routes/acciones/compras.php,
        // middleware admin.only) — este endpoint agrega totales de Compras de todo el
        // negocio, así que necesita el mismo gate, aunque viva fuera de ese grupo de rutas.
        if (! in_array(auth()->user()->role, ['admin', 'moderador'])) {
            abort(403);
        }

        // Define el rango de tiempo. Por defecto, 90 días.
        $timeRange = $request->query('timeRange', '90d');

        // Lógica para filtrar por un solo día o un rango
        if ($timeRange === '1d') {
            $startDate = Carbon::now()->startOfDay();
            $endDate = Carbon::now()->endOfDay();
        } elseif ($timeRange === '2d') {
            $startDate = Carbon::now()->subDay()->startOfDay();
            $endDate = Carbon::now()->subDay()->endOfDay();
        } elseif ($timeRange === '3d') {
            $startDate = Carbon::now()->subDays(2)->startOfDay();
            $endDate = Carbon::now()->subDays(2)->endOfDay();
        } else {
            $days = (int) substr($timeRange, 0, -1);
            $startDate = Carbon::now()->subDays($days);
            $endDate = Carbon::now()->endOfDay();
        }

        // Consulta de compras
        $compras = Compra::select(
            DB::raw('DATE(fecha_compra) as date'),
            DB::raw('SUM(total_compra) as total')
        )
            ->whereBetween('fecha_compra', [$startDate, $endDate])
            ->groupBy('date')
            ->get();

        // Consulta de ventas
        $ventas = Venta::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(total) as total')
        )
            ->whereBetween('created_at', [$startDate, $endDate])
            ->groupBy('date')
            ->get();

        // Combinar los resultados de compras y ventas por fecha
        $combinedData = [];
        foreach ($compras as $compra) {
            $date = $compra->date;
            $combinedData[$date]['compras'] = $compra->total;
            $combinedData[$date]['ventas'] = 0; // Inicializar ventas a 0
        }

        foreach ($ventas as $venta) {
            $date = $venta->date;
            // Si ya hay una compra para esta fecha, suma las ventas
            if (isset($combinedData[$date])) {
                $combinedData[$date]['ventas'] = $venta->total;
            } else {
                // Si no hay compras para esta fecha, crear una nueva entrada
                $combinedData[$date]['compras'] = 0;
                $combinedData[$date]['ventas'] = $venta->total;
            }
        }

        // Convertir el array asociativo a una lista de objetos para el gráfico
        $formattedData = [];
        foreach ($combinedData as $date => $values) {
            $formattedData[] = [
                'date' => $date,
                'compras' => $values['compras'] ?? 0,
                'ventas' => $values['ventas'] ?? 0,
            ];
        }

        // Asegurar que los datos estén ordenados por fecha
        usort($formattedData, function ($a, $b) {
            return strtotime($a['date']) - strtotime($b['date']);
        });

        return response()->json($formattedData);
    }

    /**
     * Obtiene los estados financieros (Cuentas) con información de Monedas y Usuarios
     *
     * @return JsonResponse
     */
    public function getFinancialStates(Request $request)
    {
        $usuarioId = $request->query('user_id');
        $currentUser = auth()->user();
        $esVendedorViendoLoSuyo = false;

        // Si el usuario actual es vendedor, solo mostrar sus cuentas asignadas
        if ($currentUser && $currentUser->role === 'vendedor') {
            $usuarioId = $currentUser->id;
            $esVendedorViendoLoSuyo = true;
        }

        $query = DB::table('cuentas')
            ->join('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
            ->leftJoin('user_cuentas', 'cuentas.id', '=', 'user_cuentas.cuenta_id')
            ->leftJoin('users', 'user_cuentas.user_id', '=', 'users.id')
            ->select(
                'cuentas.id as cuenta_id',
                'cuentas.nombre_cuenta',
                'cuentas.tipo',
                'cuentas.saldo_cuenta',
                'cuentas.tipo_cuenta',
                'cuentas.estado as estado_cuenta',
                'monedas.id as moneda_id',
                'monedas.nombre_moneda',
                'monedas.codigo_moneda',
                'monedas.simbolo_moneda',
                'monedas.tasa_cambio',
                'monedas.estado as estado_moneda',
                'users.id as usuario_id',
                'users.name as usuario_nombre',
                'users.email as usuario_email',
                'users.role'
            )
            ->orderBy('monedas.nombre_moneda')
            ->orderBy('cuentas.nombre_cuenta');

        if ($usuarioId) {
            $query->where('users.id', $usuarioId);
        }

        // Un vendedor viendo su propio resumen no debe ver el saldo de las cuentas
        // que solo tiene para cobrar (acceso 'cobro'), solo las suyas ('completo').
        if ($esVendedorViendoLoSuyo) {
            $query->where('user_cuentas.acceso', Cuenta::ACCESO_COMPLETO);
        }

        $data = $query->get();

        // Agrupar por cuenta para consolidar múltiples usuarios
        $cuentas = [];
        foreach ($data as $row) {
            $cuentaKey = $row->cuenta_id;

            if (! isset($cuentas[$cuentaKey])) {
                $cuentas[$cuentaKey] = [
                    'cuenta_id' => $row->cuenta_id,
                    'nombre_cuenta' => $row->nombre_cuenta,
                    'tipo' => $row->tipo,
                    'saldo_cuenta' => (float) $row->saldo_cuenta,
                    'tipo_cuenta' => $row->tipo_cuenta,
                    'estado_cuenta' => $row->estado_cuenta,
                    'moneda' => [
                        'id' => $row->moneda_id,
                        'nombre_moneda' => $row->nombre_moneda,
                        'codigo_moneda' => $row->codigo_moneda,
                        'simbolo_moneda' => $row->simbolo_moneda,
                        'tasa_cambio' => (float) $row->tasa_cambio,
                        'estado' => $row->estado_moneda,
                    ],
                    'usuarios' => [],
                ];
            }

            // Agregar usuario si existe
            if ($row->usuario_id) {
                $cuentas[$cuentaKey]['usuarios'][] = [
                    'id' => $row->usuario_id,
                    'name' => $row->usuario_nombre,
                    'email' => $row->usuario_email,
                    'role' => $row->role,
                ];
            }
        }

        return response()->json(array_values($cuentas));
    }

    /**
     * Obtiene la lista de usuarios para el filtro del dashboard
     *
     * @return JsonResponse
     */
    public function getUsuarios()
    {
        $usuarios = DB::table('users')
            ->select('id', 'name', 'email', 'role')
            ->orderBy('name')
            ->get();

        return response()->json($usuarios);
    }

    /**
     * Obtiene todas las monedas activas con sus tasas de cambio
     *
     * @return JsonResponse
     */
    public function getMonedas()
    {
        $monedas = DB::table('monedas')
            ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda', 'imagen', 'tasa_cambio', 'estado', 'principal')
            ->where('estado', true)
            ->orderBy('principal', 'desc')
            ->orderBy('nombre_moneda')
            ->get()
            ->map(function ($moneda) {
                return [
                    'id' => $moneda->id,
                    'nombre_moneda' => $moneda->nombre_moneda,
                    'codigo_moneda' => $moneda->codigo_moneda,
                    'simbolo_moneda' => $moneda->simbolo_moneda,
                    'imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($moneda->imagen)['imagen_url'] ?? null,
                    'tasa_cambio' => (float) $moneda->tasa_cambio,
                    'estado' => (bool) $moneda->estado,
                    'principal' => (bool) $moneda->principal,
                ];
            });

        return response()->json($monedas);
    }

    // ========================================================================
    // NUEVOS REPORTES AÑADIDOS
    // ========================================================================

    /**
     * Top 10 de productos con más unidades vendidas, con filtros. Solo cuenta ventas completadas
     * (las canceladas, devueltas, rechazadas y pendientes no son ventas hechas). Los totales
     * cubren TODO lo que cumple los filtros, no solo el top 10.
     */
    public function productosMasVendidos(Request $request)
    {
        $filtros = $request->validate([
            'almacen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $base = DB::table('venta_detalles')
            ->join('ventas', 'ventas.id', '=', 'venta_detalles.venta_id')
            ->join('productos', 'productos.id', '=', 'venta_detalles.producto_id')
            ->where('ventas.estado', 'completada')
            ->when($filtros['almacen_id'] ?? null, fn ($q, $almacenId) => $q->where('ventas.almacen_id', $almacenId))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('ventas.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('ventas.created_at', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->where(fn ($q) => $q->where('productos.nombre_producto', 'like', $like)
                    ->orWhere('productos.marca_producto', 'like', $like)
                    ->orWhere('productos.modelo_producto', 'like', $like));
            });

        $productos = (clone $base)
            ->select(
                'productos.id',
                'productos.nombre_producto',
                'productos.marca_producto',
                'productos.modelo_producto',
                'productos.capacidad_producto',
                'productos.color_producto',
                DB::raw('SUM(venta_detalles.cantidad) as total_vendido'),
                DB::raw('COUNT(DISTINCT venta_detalles.venta_id) as veces_vendido'),
                DB::raw('SUM(venta_detalles.subtotal) as ingresos'),
                DB::raw('SUM(venta_detalles.ganancia) as ganancia'),
            )
            ->groupBy(
                'productos.id',
                'productos.nombre_producto',
                'productos.marca_producto',
                'productos.modelo_producto',
                'productos.capacidad_producto',
                'productos.color_producto',
            )
            ->orderByDesc('total_vendido')
            ->orderBy('productos.nombre_producto')
            ->limit(10)
            ->get()
            ->map(fn ($p) => [
                'id' => (int) $p->id,
                'nombre_producto' => $p->nombre_producto,
                'marca_producto' => $p->marca_producto,
                'modelo_producto' => $p->modelo_producto,
                'capacidad_producto' => $p->capacidad_producto,
                'color_producto' => $p->color_producto,
                'total_vendido' => (int) $p->total_vendido,
                'veces_vendido' => (int) $p->veces_vendido,
                'ingresos' => round((float) $p->ingresos, 2),
                'ganancia' => round((float) $p->ganancia, 2),
            ]);

        $totales = (clone $base)
            ->selectRaw('COALESCE(SUM(venta_detalles.cantidad), 0) as unidades, COUNT(DISTINCT venta_detalles.producto_id) as productos, COUNT(DISTINCT venta_detalles.venta_id) as ventas, COALESCE(SUM(venta_detalles.subtotal), 0) as ingresos')
            ->first();

        return Inertia::render('Reportes/Report/ProductosMasVendidos', [
            'productos' => $productos,
            'totales' => [
                'unidades' => (int) $totales->unidades,
                'productos' => (int) $totales->productos,
                'ventas' => (int) $totales->ventas,
                'ingresos' => round((float) $totales->ingresos, 2),
            ],
            'almacenes' => Almacen::select('id', 'nombre_almacen')->orderBy('nombre_almacen')->get(),
            'filtros' => [
                'almacen_id' => $filtros['almacen_id'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
                'buscar' => $filtros['buscar'] ?? '',
            ],
        ]);
    }

    /**
     * Reporte de Ventas por Período: ventas completadas, paginadas, con filtros y el receptor de
     * cada una. Los totales cubren todo lo que cumple los filtros, no solo la página.
     */
    public function ventasPorPeriodo(Request $request)
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'almacen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $consulta = Venta::query()
            ->where('ventas.estado', 'completada')
            ->when($filtros['user_id'] ?? null, fn ($q, $userId) => $q->where('ventas.user_id', $userId))
            ->when($filtros['almacen_id'] ?? null, fn ($q, $almacenId) => $q->where('ventas.almacen_id', $almacenId))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('ventas.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('ventas.created_at', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->where(function ($q) use ($buscar, $like) {
                    if (ctype_digit($buscar)) {
                        $q->orWhere('ventas.id', (int) $buscar);
                    }

                    $q->orWhereHas('usuario', fn ($q) => $q->where('name', 'like', $like))
                        ->orWhereHas('destinatario', fn ($q) => $q->where('nombre', 'like', $like)
                            ->orWhere('apellidos', 'like', $like)
                            ->orWhere('telefono_contacto', 'like', $like));
                });
            });

        $totales = (clone $consulta)
            ->selectRaw('COUNT(*) as ventas, COALESCE(SUM(ventas.total), 0) as total, COALESCE(SUM(ventas.total_ganancia), 0) as ganancia')
            ->first();

        $ventas = (clone $consulta)
            ->select('ventas.id', 'ventas.user_id', 'ventas.almacen_id', 'ventas.total', 'ventas.total_ganancia', 'ventas.es_venta_especial', 'ventas.es_venta_sin_comision', 'ventas.created_at')
            ->with([
                'usuario:id,name',
                'almacen:id,nombre_almacen',
                'destinatario:id,venta_id,nombre,apellidos,telefono_contacto',
            ])
            ->orderByDesc('ventas.created_at')
            ->orderByDesc('ventas.id')
            ->paginate(15)
            ->withQueryString();

        $cantidad = (int) $totales->ventas;

        return Inertia::render('Reportes/Report/VentasPorPeriodo', [
            'ventas' => $ventas,
            'totales' => [
                'ventas' => $cantidad,
                'total' => round((float) $totales->total, 2),
                'ganancia' => round((float) $totales->ganancia, 2),
                'promedio' => $cantidad > 0 ? round((float) $totales->total / $cantidad, 2) : 0.0,
            ],
            'usuarios' => DB::table('users')
                ->whereIn('id', DB::table('ventas')->where('estado', 'completada')->select('user_id'))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'almacenes' => Almacen::select('id', 'nombre_almacen')->orderBy('nombre_almacen')->get(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'user_id' => $filtros['user_id'] ?? '',
                'almacen_id' => $filtros['almacen_id'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Reporte de Ventas por Vendedor: ventas completadas agrupadas por quien las hizo, con
     * periodo opcional. Los admin y moderadores que venden también aparecen, con su rol.
     */
    public function ventasPorVendedor(Request $request)
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $vendedores = DB::table('ventas')
            ->join('users', 'ventas.user_id', '=', 'users.id')
            ->where('ventas.estado', 'completada')
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('ventas.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('ventas.created_at', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, fn ($q, $buscar) => $q->where('users.name', 'like', '%'.$buscar.'%'))
            ->select(
                'users.id',
                'users.name as vendedor',
                'users.role as rol',
                DB::raw('COUNT(ventas.id) as total_ventas'),
                DB::raw('COALESCE(SUM(ventas.total), 0) as monto_total_vendido'),
                DB::raw('COALESCE(SUM(ventas.total_ganancia), 0) as ganancia'),
                DB::raw('COALESCE(SUM(ventas.total_comision), 0) as comision'),
            )
            ->groupBy('users.id', 'users.name', 'users.role')
            ->orderByDesc('monto_total_vendido')
            ->orderBy('users.name')
            ->get()
            ->map(fn ($v) => [
                'id' => (int) $v->id,
                'vendedor' => $v->vendedor,
                'rol' => $v->rol,
                'total_ventas' => (int) $v->total_ventas,
                'monto_total_vendido' => round((float) $v->monto_total_vendido, 2),
                'ganancia' => round((float) $v->ganancia, 2),
                'comision' => round((float) $v->comision, 2),
            ]);

        return Inertia::render('Reportes/Report/VentasPorVendedor', [
            'vendedores' => $vendedores,
            'totales' => [
                'vendedores' => $vendedores->count(),
                'ventas' => $vendedores->sum('total_ventas'),
                'total' => round($vendedores->sum('monto_total_vendido'), 2),
                'ganancia' => round($vendedores->sum('ganancia'), 2),
                'comision' => round($vendedores->sum('comision'), 2),
            ],
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Resumen de KPIs de Ventas y Compras (Dashboard).
     * Reemplaza y expande la lógica de VentaController::getVentasReporte
     */
    public function kpiResumen(Request $request, DashboardStatsService $dashboardStatsService)
    {
        $request->validate([
            'periodo' => 'required|in:diario,semanal,mensual',
        ]);

        $user = auth()->user();
        if (! $user) {
            return response()->json(['message' => 'No autenticado'], 401);
        }

        $periodo = $request->input('periodo');
        $kpis = $dashboardStatsService->getPeriodKpis($user, $periodo);

        return response()->json([
            'ventas' => $kpis['ventas'],
            'compras' => $kpis['compras'],
        ]);
    }

    /**
     * Reporte de Ganancias: rentabilidad de cada venta completada, paginada y con filtros. La
     * ganancia neta es la de los productos, más el resultado cambiario, menos la comisión: se
     * muestra la cadena completa para que no haya que adivinar de dónde sale cada número. Los
     * totales cubren todo lo que cumple los filtros, no solo la página.
     */
    public function reporteGanancias(Request $request)
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $consulta = Venta::query()
            ->where('ventas.estado', 'completada')
            ->when($filtros['user_id'] ?? null, fn ($q, $userId) => $q->where('ventas.user_id', $userId))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('ventas.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('ventas.created_at', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $q->where(function ($q) use ($buscar) {
                    if (ctype_digit($buscar)) {
                        $q->orWhere('ventas.id', (int) $buscar);
                    }

                    $q->orWhereHas('usuario', fn ($q) => $q->where('name', 'like', '%'.$buscar.'%'));
                });
            });

        $totales = (clone $consulta)
            ->selectRaw('COUNT(*) as ventas, COALESCE(SUM(ventas.total), 0) as total, COALESCE(SUM(ventas.total_ganancia), 0) as productos, COALESCE(SUM(ventas.ganancia_perdida_cambiaria), 0) as cambiaria, COALESCE(SUM(ventas.total_comision), 0) as comision, COALESCE(SUM(ventas.ganancia_neta), 0) as neta')
            ->first();

        $ventas = (clone $consulta)
            ->select('ventas.id', 'ventas.user_id', 'ventas.total', 'ventas.total_ganancia', 'ventas.ganancia_perdida_cambiaria', 'ventas.total_comision', 'ventas.ganancia_neta', 'ventas.created_at')
            ->with('usuario:id,name')
            ->orderByDesc('ventas.created_at')
            ->orderByDesc('ventas.id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Reportes/Report/ReporteGanancias', [
            'ventas' => $ventas,
            'totales' => [
                'ventas' => (int) $totales->ventas,
                'total' => round((float) $totales->total, 2),
                'productos' => round((float) $totales->productos, 2),
                'cambiaria' => round((float) $totales->cambiaria, 2),
                'comision' => round((float) $totales->comision, 2),
                'neta' => round((float) $totales->neta, 2),
            ],
            'usuarios' => DB::table('users')
                ->whereIn('id', DB::table('ventas')->where('estado', 'completada')->select('user_id'))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'user_id' => $filtros['user_id'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Reporte de productos con stock bajo.
     */
    public function reporteStockBajo()
    {
        $stockBajo = DB::table('almacen_producto')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
            ->select('productos.nombre_producto', 'almacens.nombre_almacen', 'almacen_producto.cantidad')
            ->where('almacen_producto.cantidad', '<=', 5) // Umbral de stock bajo
            ->orderBy('almacens.nombre_almacen')
            ->orderBy('almacen_producto.cantidad')
            ->get();

        return Inertia::render('Reportes/Report/ReporteStockBajo', [
            'productos' => $stockBajo,
        ]);
    }

    /**
     * Reporte del valor total del inventario — una fila por producto+almacén con su costo real
     * por lote (ver ValorInventarioService), mismo total que Productos y el Dashboard.
     */
    public function valorInventario(ValorInventarioService $valorInventario)
    {
        $inventario = $valorInventario->filasPorProductoAlmacen();

        return Inertia::render('Reportes/Report/ValorInventario', [
            'inventario' => $inventario,
            'valorTotal' => $valorInventario->valorTotal(),
        ]);
    }

    /**
     * Historial de cambios de precio de venta, paginado y con filtros. La columna `accion` guarda
     * "Tipo - Almacén ID N"; aquí se muestra solo el tipo y el almacén por su nombre.
     */
    public function historialPrecios(Request $request)
    {
        $tiposAccion = [
            'primera' => ['etiqueta' => 'Primera asignación', 'like' => 'Primera asignación%'],
            'actualizacion' => ['etiqueta' => 'Actualización', 'like' => 'Actualización - %'],
            'masiva' => ['etiqueta' => 'Actualización masiva', 'like' => 'Actualización masiva%'],
            'grupo' => ['etiqueta' => 'Precio de grupo', 'like' => 'Precio de grupo%'],
            'fusion' => ['etiqueta' => 'Fusión de productos', 'like' => 'Fusión%'],
        ];

        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'almacen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'tipo' => ['nullable', 'in:'.implode(',', array_keys($tiposAccion))],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $base = DB::table('precio_historials')
            ->join('productos', 'precio_historials.producto_id', '=', 'productos.id')
            ->join('users', 'precio_historials.user_id', '=', 'users.id')
            ->join('almacens', 'precio_historials.almacen_id', '=', 'almacens.id')
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->where(fn ($q) => $q->where('productos.nombre_producto', 'like', $like)
                    ->orWhere('productos.marca_producto', 'like', $like)
                    ->orWhere('productos.modelo_producto', 'like', $like));
            })
            ->when($filtros['user_id'] ?? null, fn ($q, $userId) => $q->where('precio_historials.user_id', $userId))
            ->when($filtros['almacen_id'] ?? null, fn ($q, $almacenId) => $q->where('precio_historials.almacen_id', $almacenId))
            ->when($filtros['tipo'] ?? null, fn ($q, $tipo) => $q->where('precio_historials.accion', 'like', $tiposAccion[$tipo]['like']))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('precio_historials.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('precio_historials.created_at', '<=', $hasta));

        $totales = (clone $base)
            ->selectRaw('COUNT(*) as cambios, COUNT(DISTINCT precio_historials.producto_id) as productos, COALESCE(SUM(precio_historials.precio_anterior IS NOT NULL AND precio_historials.precio_nuevo > precio_historials.precio_anterior), 0) as subidas, COALESCE(SUM(precio_historials.precio_anterior IS NOT NULL AND precio_historials.precio_nuevo < precio_historials.precio_anterior), 0) as bajadas, COALESCE(SUM(precio_historials.precio_anterior IS NULL), 0) as primeras')
            ->first();

        $historial = (clone $base)
            ->select(
                'precio_historials.id',
                'productos.nombre_producto as producto',
                'productos.marca_producto as marca',
                'productos.modelo_producto as modelo',
                'users.name as usuario',
                'almacens.nombre_almacen as almacen',
                'precio_historials.accion',
                'precio_historials.precio_anterior',
                'precio_historials.precio_nuevo',
                'precio_historials.comision',
                'precio_historials.created_at as fecha',
            )
            ->orderByDesc('precio_historials.created_at')
            ->orderByDesc('precio_historials.id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($fila) => [
                'id' => (int) $fila->id,
                'producto' => $fila->producto,
                'marca' => $fila->marca,
                'modelo' => $fila->modelo,
                'usuario' => $fila->usuario,
                'almacen' => $fila->almacen,
                'accion' => trim(Str::before((string) $fila->accion, ' - Almacén')),
                'precio_anterior' => $fila->precio_anterior !== null ? (float) $fila->precio_anterior : null,
                'precio_nuevo' => (float) $fila->precio_nuevo,
                'comision' => $fila->comision !== null ? (float) $fila->comision : null,
                'fecha' => $fila->fecha,
            ]);

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
            'totales' => [
                'cambios' => (int) $totales->cambios,
                'productos' => (int) $totales->productos,
                'subidas' => (int) $totales->subidas,
                'bajadas' => (int) $totales->bajadas,
                'primeras' => (int) $totales->primeras,
            ],
            'usuarios' => DB::table('users')
                ->whereIn('id', DB::table('precio_historials')->select('user_id'))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'almacenes' => Almacen::select('id', 'nombre_almacen')->orderBy('nombre_almacen')->get(),
            'tipos' => collect($tiposAccion)->map(fn ($tipo, $clave) => ['clave' => $clave, 'etiqueta' => $tipo['etiqueta']])->values(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'user_id' => $filtros['user_id'] ?? '',
                'almacen_id' => $filtros['almacen_id'] ?? '',
                'tipo' => $filtros['tipo'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Historial de cambios de precio de costo con el impacto financiero estimado ("en papel"),
     * paginado y con filtros. Las estadísticas cubren todo lo que cumple los filtros.
     */
    public function historialCostoPrecio(Request $request)
    {
        if (! in_array(auth()->user()->role, ['admin', 'moderador'])) {
            abort(403);
        }

        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'almacen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'resultado' => ['nullable', 'in:ganancia,perdida,sin_impacto'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $consulta = HistorialPrecioCosto::query()
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->whereHas('producto', fn ($q) => $q->where('nombre_producto', 'like', $like)
                    ->orWhere('marca_producto', 'like', $like)
                    ->orWhere('modelo_producto', 'like', $like));
            })
            ->when($filtros['user_id'] ?? null, fn ($q, $userId) => $q->where('historial_precio_costos.user_id', $userId))
            ->when($filtros['almacen_id'] ?? null, fn ($q, $almacenId) => $q->where('historial_precio_costos.almacen_id', $almacenId))
            ->when($filtros['resultado'] ?? null, fn ($q, $resultado) => match ($resultado) {
                'ganancia' => $q->where('historial_precio_costos.impacto_financiero', '>', 0),
                'perdida' => $q->where('historial_precio_costos.impacto_financiero', '<', 0),
                default => $q->where('historial_precio_costos.impacto_financiero', 0),
            })
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('historial_precio_costos.created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('historial_precio_costos.created_at', '<=', $hasta));

        $stats = (clone $consulta)
            ->selectRaw('COUNT(*) as cambios, COALESCE(SUM(CASE WHEN impacto_financiero > 0 THEN impacto_financiero ELSE 0 END), 0) as ganancias, COALESCE(SUM(CASE WHEN impacto_financiero < 0 THEN impacto_financiero ELSE 0 END), 0) as perdidas, COALESCE(SUM(impacto_financiero), 0) as neto, COALESCE(SUM(impacto_financiero > 0), 0) as con_ganancia, COALESCE(SUM(impacto_financiero < 0), 0) as con_perdida')
            ->first();

        $historial = (clone $consulta)
            ->with([
                'producto:id,nombre_producto,marca_producto,modelo_producto',
                'user:id,name',
                'almacen:id,nombre_almacen',
            ])
            ->orderByDesc('historial_precio_costos.created_at')
            ->orderByDesc('historial_precio_costos.id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($item) => [
                'id' => $item->id,
                'producto' => $item->producto->nombre_producto ?? '-',
                'marca' => $item->producto->marca_producto ?? '',
                'modelo' => $item->producto->modelo_producto ?? '',
                'almacen' => $item->almacen->nombre_almacen ?? '-',
                'usuario' => $item->user->name ?? '-',
                'precio_anterior' => (float) $item->precio_anterior,
                'precio_nuevo' => (float) $item->precio_nuevo,
                'diferencia' => (float) $item->diferencia,
                'stock_momento' => (int) $item->stock_momento,
                'impacto_financiero' => (float) $item->impacto_financiero,
                'motivo' => $item->motivo,
                'fecha' => $item->created_at->toIso8601String(),
            ]);

        return Inertia::render('Reportes/Report/HistorialCostoPrecio', [
            'historial' => $historial,
            'stats' => [
                'cambios' => (int) $stats->cambios,
                'total_ganancias' => round((float) $stats->ganancias, 2),
                'total_perdidas' => round(abs((float) $stats->perdidas), 2),
                'neto_impacto' => round((float) $stats->neto, 2),
                'cambios_con_ganancia' => (int) $stats->con_ganancia,
                'cambios_con_perdida' => (int) $stats->con_perdida,
            ],
            'usuarios' => DB::table('users')
                ->whereIn('id', DB::table('historial_precio_costos')->select('user_id'))
                ->select('id', 'name')
                ->orderBy('name')
                ->get(),
            'almacenes' => Almacen::select('id', 'nombre_almacen')->orderBy('nombre_almacen')->get(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'user_id' => $filtros['user_id'] ?? '',
                'almacen_id' => $filtros['almacen_id'] ?? '',
                'resultado' => $filtros['resultado'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Historial de Movimientos Financieros, paginado y con filtros. Muestra también los cancelados
     * (con su estado), pero los totales solo cuentan los completados: un movimiento cancelado no
     * movió dinero. `monto_usd` permite sumar entre monedas.
     */
    public function movimientosFinancieros(Request $request)
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'tipo_movimiento_id' => ['nullable', 'integer', 'exists:tipos_movimiento_financiero,id'],
            'estado' => ['nullable', 'in:completado,cancelado'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $base = DB::table('movimientos_financieros')
            ->leftJoin('cuentas as c_origen', 'movimientos_financieros.cuenta_origen_id', '=', 'c_origen.id')
            ->leftJoin('cuentas as c_destino', 'movimientos_financieros.cuenta_destino_id', '=', 'c_destino.id')
            ->leftJoin('clientes as cl_origen', 'movimientos_financieros.cliente_origen_id', '=', 'cl_origen.id')
            ->leftJoin('clientes as cl_destino', 'movimientos_financieros.cliente_destino_id', '=', 'cl_destino.id')
            // Proveedores ya no se ofrecen en operaciones nuevas, pero el historial viejo sigue apuntando a ellos.
            ->leftJoin('proveedors as p_destino', 'movimientos_financieros.proveedor_destino_id', '=', 'p_destino.id')
            ->join('tipos_movimiento_financiero', 'movimientos_financieros.tipo_movimiento_id', '=', 'tipos_movimiento_financiero.id')
            ->when($filtros['tipo_movimiento_id'] ?? null, fn ($q, $tipo) => $q->where('movimientos_financieros.tipo_movimiento_id', $tipo))
            ->when($filtros['estado'] ?? null, fn ($q, $estado) => $q->where('movimientos_financieros.estado', $estado))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('movimientos_financieros.fecha_operacion', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('movimientos_financieros.fecha_operacion', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->where(function ($q) use ($buscar, $like) {
                    if (ctype_digit($buscar)) {
                        $q->orWhere('movimientos_financieros.id', (int) $buscar);
                    }

                    $q->orWhere('movimientos_financieros.descripcion', 'like', $like)
                        ->orWhere('c_origen.nombre_cuenta', 'like', $like)
                        ->orWhere('c_destino.nombre_cuenta', 'like', $like)
                        ->orWhere('cl_origen.nombre_cliente', 'like', $like)
                        ->orWhere('cl_destino.nombre_cliente', 'like', $like)
                        ->orWhere('p_destino.nombre_proveedor', 'like', $like);
                });
            });

        $porTipo = (clone $base)
            ->where('movimientos_financieros.estado', 'completado')
            ->selectRaw('tipos_movimiento_financiero.id as tipo_id, tipos_movimiento_financiero.nombre as nombre, tipos_movimiento_financiero.efecto as efecto, COUNT(*) as movimientos, COALESCE(SUM(movimientos_financieros.monto_usd), 0) as monto_usd')
            ->groupBy('tipos_movimiento_financiero.id', 'tipos_movimiento_financiero.nombre', 'tipos_movimiento_financiero.efecto')
            ->orderBy('tipos_movimiento_financiero.id')
            ->get()
            ->map(fn ($t) => [
                'tipo_id' => (int) $t->tipo_id,
                'nombre' => $t->nombre,
                'efecto' => $t->efecto,
                'movimientos' => (int) $t->movimientos,
                'monto_usd' => round((float) $t->monto_usd, 2),
            ]);

        $cancelados = (clone $base)->where('movimientos_financieros.estado', 'cancelado')->count();

        $movimientos = (clone $base)
            ->select(
                'movimientos_financieros.id',
                'tipos_movimiento_financiero.nombre as tipo_movimiento',
                'tipos_movimiento_financiero.efecto as efecto',
                'movimientos_financieros.monto',
                'movimientos_financieros.monto_usd',
                'movimientos_financieros.moneda',
                'movimientos_financieros.descripcion',
                'movimientos_financieros.fecha_operacion',
                'movimientos_financieros.estado',
                DB::raw('COALESCE(c_origen.nombre_cuenta, cl_origen.nombre_cliente) as origen'),
                DB::raw('COALESCE(c_destino.nombre_cuenta, cl_destino.nombre_cliente, p_destino.nombre_proveedor) as destino')
            )
            ->orderByDesc('movimientos_financieros.fecha_operacion')
            ->orderByDesc('movimientos_financieros.id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Reportes/Report/MovimientosFinancieros', [
            'movimientos' => $movimientos,
            'porTipo' => $porTipo,
            'totales' => [
                'movimientos' => $porTipo->sum('movimientos'),
                'cancelados' => $cancelados,
            ],
            'tipos' => DB::table('tipos_movimiento_financiero')->select('id', 'nombre')->orderBy('id')->get(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'tipo_movimiento_id' => $filtros['tipo_movimiento_id'] ?? '',
                'estado' => $filtros['estado'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }
}
