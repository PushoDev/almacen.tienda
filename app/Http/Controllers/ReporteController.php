<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Venta;
use App\Services\DashboardStatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

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
                DB::raw('COUNT(compra_producto.compra_id) as veces_comprado')
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
            'proveedor_id' => 'nullable|exists:proveedors,id',
        ]);

        $query = DB::table('compras')
            ->join('proveedors', 'compras.proveedor_id', '=', 'proveedors.id')
            ->select(
                'compras.id',
                'compras.fecha_compra',
                'compras.total_compra',
                'proveedors.nombre_proveedor',
                'compras.tipo_compra'
            );

        if ($request->filled('start_date')) {
            $query->whereDate('compras.fecha_compra', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('compras.fecha_compra', '<=', $request->end_date);
        }

        if ($request->filled('proveedor_id')) {
            $query->where('compras.proveedor_id', $request->proveedor_id);
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
            ->join('proveedors', 'compras.proveedor_id', '=', 'proveedors.id')
            ->select(
                'compras.id',
                'compras.fecha_compra',
                'compras.total_compra',
                'compras.tipo_compra'
            );

        if ($proveedorId) {
            $query->where('compras.proveedor_id', $proveedorId);
        }

        $compras = $query->orderByDesc('compras.fecha_compra')->get();
        $proveedor = $proveedorId
            ? DB::table('proveedors')->find($proveedorId)
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
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getComprasVentasData(Request $request)
    {
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
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getFinancialStates(Request $request)
    {
        $usuarioId = $request->query('user_id');
        $currentUser = auth()->user();

        // Si el usuario actual es vendedor, solo mostrar sus cuentas asignadas
        if ($currentUser && $currentUser->role === 'vendedor') {
            $usuarioId = $currentUser->id;
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
                'cuentas.deuda',
                'cuentas.tipo_cuenta',
                'cuentas.estado as estado_cuenta',
                'monedas.id as moneda_id',
                'monedas.nombre_moneda',
                'monedas.codigo_moneda',
                'monedas.simbolo_moneda',
                'monedas.tasa_cambio',
                'monedas.commission',
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

        $data = $query->get();

        // Agrupar por cuenta para consolidar múltiples usuarios
        $cuentas = [];
        foreach ($data as $row) {
            $cuentaKey = $row->cuenta_id;

            if (!isset($cuentas[$cuentaKey])) {
                $cuentas[$cuentaKey] = [
                    'cuenta_id' => $row->cuenta_id,
                    'nombre_cuenta' => $row->nombre_cuenta,
                    'tipo' => $row->tipo,
                    'saldo_cuenta' => (float) $row->saldo_cuenta,
                    'deuda' => (float) $row->deuda,
                    'tipo_cuenta' => $row->tipo_cuenta,
                    'estado_cuenta' => $row->estado_cuenta,
                    'moneda' => [
                        'id' => $row->moneda_id,
                        'nombre_moneda' => $row->nombre_moneda,
                        'codigo_moneda' => $row->codigo_moneda,
                        'simbolo_moneda' => $row->simbolo_moneda,
                        'tasa_cambio' => (float) $row->tasa_cambio,
                        'commission' => (float) $row->commission,
                        'estado' => $row->estado_moneda,
                    ],
                    'usuarios' => []
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
     * @return \Illuminate\Http\JsonResponse
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
     * @return \Illuminate\Http\JsonResponse
     */
    public function getMonedas()
    {
        $monedas = DB::table('monedas')
            ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda', 'tasa_cambio', 'commission', 'estado', 'principal')
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
                    'tasa_cambio' => (float) $moneda->tasa_cambio,
                    'commission' => (float) $moneda->commission,
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
     * Obtener los productos más vendidos.
     */
    public function productosMasVendidos()
    {
        $productos = DB::table('venta_detalles')
            ->join('productos', 'venta_detalles.producto_id', '=', 'productos.id')
            ->select(
                'productos.nombre_producto',
                DB::raw('SUM(venta_detalles.cantidad) as total_vendido'),
                DB::raw('COUNT(venta_detalles.venta_id) as veces_vendido')
            )
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderByDesc('total_vendido')
            ->take(10)
            ->get();

        return Inertia::render('Reportes/Report/ProductosMasVendidos', [
            'productos' => $productos,
        ]);
    }

    /**
     * Reporte de Ventas por Período.
     */
    public function ventasPorPeriodo(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $query = Venta::with(['usuario', 'cliente', 'almacen'])
            ->where('estado', 'completada'); // Solo ventas completadas

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $ventas = $query->orderByDesc('created_at')->get();

        return Inertia::render('Reportes/Report/VentasPorPeriodo', [
            'ventas' => $ventas,
            'usuarios' => DB::table('users')->select('id', 'name')->get(),
        ]);
    }

    /**
     * Reporte de Ventas por Vendedor.
     */
    public function ventasPorVendedor()
    {
        $ventas = DB::table('ventas')
            ->join('users', 'ventas.user_id', '=', 'users.id')
            ->select(
                'users.name as vendedor',
                DB::raw('COUNT(ventas.id) as total_ventas'),
                DB::raw('SUM(ventas.total) as monto_total_vendido'),
                DB::raw('SUM(ventas.total_ganancia) as ganancia_operativa'),
                DB::raw('SUM(ventas.monto_diferencia_cambiaria) as diferencia_cambiaria')
            )
            ->where('ventas.estado', 'completada')
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('monto_total_vendido')
            ->get();

        return Inertia::render('Reportes/Report/VentasPorVendedor', [
            'ventas' => $ventas,
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
        if (!$user) {
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
     * Reporte de Ganancias (Optimizado).
     * Ahora utiliza los totales calculados en la tabla ventas.
     */
    public function reporteGanancias(Request $request)
    {
        $query = Venta::with(['usuario'])
            ->where('estado', 'completada');

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $ventas = $query->orderByDesc('created_at')->get()->map(function ($venta) {
            // Ganancia Real = Ganancia Producto + Diferencia Cambiaria
            $ganancia_real = ($venta->total_ganancia ?? 0) + ($venta->monto_diferencia_cambiaria ?? 0);

            return [
                'id' => $venta->id,
                'fecha' => $venta->created_at->format('Y-m-d H:i'),
                'vendedor' => $venta->usuario->name,
                'total_venta' => (float) $venta->total,
                'ganancia_producto' => (float) $venta->total_ganancia,
                'diferencia_cambiaria' => (float) $venta->monto_diferencia_cambiaria,
                'ganancia_total' => (float) $ganancia_real,
            ];
        });

        // Totales generales para el pie del reporte
        $totales = [
            'venta' => $ventas->sum('total_venta'),
            'ganancia' => $ventas->sum('ganancia_total'),
            'diferencia_cambiaria' => $ventas->sum('diferencia_cambiaria')
        ];

        return Inertia::render('Reportes/Report/ReporteGanancias', [
            'ventas' => $ventas,
            'totales' => $totales,
            'usuarios' => DB::table('users')->select('id', 'name')->get(),
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
     * Reporte del valor total del inventario.
     */
    public function valorInventario()
    {
        $inventario = DB::table('almacen_producto')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->select(
                'productos.nombre_producto',
                'almacen_producto.cantidad',
                'productos.precio_compra_producto'
            )
            ->where('almacen_producto.cantidad', '>', 0)
            ->get()
            ->map(function ($item) {
                return [
                    'nombre_producto' => $item->nombre_producto,
                    'cantidad' => $item->cantidad,
                    'costo_unitario' => $item->precio_compra_producto,
                    'valor_total_costo' => $item->cantidad * $item->precio_compra_producto,
                ];
            });

        $valorTotal = $inventario->sum('valor_total_costo');

        return Inertia::render('Reportes/Report/ValorInventario', [
            'inventario' => $inventario,
            'valorTotal' => $valorTotal,
        ]);
    }

    /**
     * Historial de cambios de precios.
     */
    public function historialPrecios()
    {
        $historial = DB::table('precio_historials')
            ->join('productos', 'precio_historials.producto_id', '=', 'productos.id')
            ->join('users', 'precio_historials.user_id', '=', 'users.id')
            ->join('almacens', 'precio_historials.almacen_id', '=', 'almacens.id')
            ->select(
                'precio_historials.id',
                'productos.nombre_producto as producto',
                'users.name as usuario',
                'almacens.nombre_almacen as almacen',
                'precio_historials.precio_anterior',
                'precio_historials.precio_nuevo',
                'precio_historials.created_at as fecha'
            )
            ->latest('precio_historials.created_at')
            ->get();

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
        ]);
    }

    /**
     * Historial de Movimientos Financieros.
     */
    public function movimientosFinancieros(Request $request)
    {
        $query = DB::table('movimientos_financieros')
            ->leftJoin('cuentas as c_origen', 'movimientos_financieros.cuenta_origen_id', '=', 'c_origen.id')
            ->leftJoin('cuentas as c_destino', 'movimientos_financieros.cuenta_destino_id', '=', 'c_destino.id')
            ->leftJoin('clientes as cl_origen', 'movimientos_financieros.cliente_origen_id', '=', 'cl_origen.id')
            ->leftJoin('clientes as cl_destino', 'movimientos_financieros.cliente_destino_id', '=', 'cl_destino.id')
            ->leftJoin('proveedors as p_destino', 'movimientos_financieros.proveedor_destino_id', '=', 'p_destino.id')
            ->join('tipos_movimiento_financiero', 'movimientos_financieros.tipo_movimiento_id', '=', 'tipos_movimiento_financiero.id')
            ->select(
                'movimientos_financieros.id',
                'tipos_movimiento_financiero.nombre as tipo_movimiento',
                'movimientos_financieros.monto',
                'movimientos_financieros.moneda',
                'movimientos_financieros.descripcion',
                'movimientos_financieros.fecha_operacion',
                DB::raw("COALESCE(c_origen.nombre_cuenta, cl_origen.nombre_cliente) as origen"),
                DB::raw("COALESCE(c_destino.nombre_cuenta, cl_destino.nombre_cliente, p_destino.nombre_proveedor) as destino")
            );

        if ($request->filled('start_date')) {
            $query->whereDate('fecha_operacion', '>=', $request->start_date);
        }

        if ($request->filled('end_date')) {
            $query->whereDate('fecha_operacion', '<=', $request->end_date);
        }

        if ($request->filled('tipo_movimiento_id')) {
            $query->where('tipo_movimiento_id', $request->tipo_movimiento_id);
        }

        $movimientos = $query->orderByDesc('fecha_operacion')->get();

        return Inertia::render('Reportes/Report/MovimientosFinancieros', [
            'movimientos' => $movimientos,
            'tipos' => DB::table('tipos_movimiento_financiero')->get(),
        ]);
    }

    /**
     * Reporte de Rastreo de Operaciones (Auditoría General).
     */
    public function rastreoOperaciones(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
            'tipo_operacion' => 'nullable|string',
        ]);

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $userId = $request->input('user_id');
        $tipoOperacion = $request->input('tipo_operacion');

        // Subconsulta de Ventas
        $ventas = DB::table('ventas')
            ->join('users', 'ventas.user_id', '=', 'users.id')
            ->select(
                'ventas.id',
                'ventas.created_at as fecha',
                DB::raw("'Venta' as tipo"),
                'ventas.total as monto',
                'users.name as usuario',
                'ventas.user_id',
                DB::raw("CONCAT('Venta #', ventas.id) as referencia"),
                'ventas.estado as descripcion'
            );

        // Subconsulta de Compras
        $compras = DB::table('compras')
            ->leftJoin('proveedors', 'compras.proveedor_id', '=', 'proveedors.id')
            ->select(
                'compras.id',
                'compras.fecha_compra as fecha',
                DB::raw("'Compra' as tipo"),
                'compras.total_compra as monto',
                DB::raw("'Admin/Sistema' as usuario"),
                DB::raw("NULL as user_id"),
                DB::raw("CONCAT('Compra #', compras.id) as referencia"),
                DB::raw("COALESCE(proveedors.nombre_proveedor, 'S/P') as descripcion")
            );

        // Subconsulta de Movimientos Financieros
        $movimientos = DB::table('movimientos_financieros')
            ->join('users', 'movimientos_financieros.user_id', '=', 'users.id')
            ->join('tipos_movimiento_financiero', 'movimientos_financieros.tipo_movimiento_id', '=', 'tipos_movimiento_financiero.id')
            ->select(
                'movimientos_financieros.id',
                'movimientos_financieros.fecha_operacion as fecha',
                DB::raw("'Finanzas' as tipo"),
                'movimientos_financieros.monto',
                'users.name as usuario',
                'movimientos_financieros.user_id',
                'tipos_movimiento_financiero.nombre as referencia',
                'movimientos_financieros.descripcion'
            );

        // Subconsulta de Cierres de Caja
        $cierres = DB::table('cierre_cajas')
            ->join('users', 'cierre_cajas.user_id', '=', 'users.id')
            ->select(
                'cierre_cajas.id',
                'cierre_cajas.fecha_cierre as fecha',
                DB::raw("'Cierre' as tipo"),
                'cierre_cajas.saldo_contado as monto',
                'users.name as usuario',
                'cierre_cajas.user_id',
                DB::raw("CONCAT('Cierre #', cierre_cajas.id) as referencia"),
                'cierre_cajas.estado as descripcion'
            );

        // Aplicar filtros a cada subconsulta si es necesario (excepto tipo_operacion que se filtra al final)
        if ($startDate) {
            $ventas->whereDate('ventas.created_at', '>=', $startDate);
            $compras->whereDate('compras.fecha_compra', '>=', $startDate);
            $movimientos->whereDate('movimientos_financieros.fecha_operacion', '>=', $startDate);
            $cierres->whereDate('cierre_cajas.fecha_cierre', '>=', $startDate);
        }
        if ($endDate) {
            $ventas->whereDate('ventas.created_at', '<=', $endDate);
            $compras->whereDate('compras.fecha_compra', '<=', $endDate);
            $movimientos->whereDate('movimientos_financieros.fecha_operacion', '<=', $endDate);
            $cierres->whereDate('cierre_cajas.fecha_cierre', '<=', $endDate);
        }
        if ($userId) {
            $ventas->where('ventas.user_id', $userId);
            // Compras no tiene user_id, así que se vacía si hay filtro por usuario específico
            if ($userId != 0) $compras->whereRaw('1=0'); 
            $movimientos->where('movimientos_financieros.user_id', $userId);
            $cierres->where('cierre_cajas.user_id', $userId);
        }

        // Combinar todo
        $query = $ventas->unionAll($compras)
            ->unionAll($movimientos)
            ->unionAll($cierres);

        // Envolver en una subconsulta para ordenar y filtrar por tipo globalmente
        $finalQuery = DB::table(DB::raw("({$query->toSql()}) as operaciones"))
            ->mergeBindings($query);

        if ($tipoOperacion) {
            $finalQuery->where('tipo', $tipoOperacion);
        }

        $operaciones = $finalQuery->orderByDesc('fecha')->get();

        return Inertia::render('Reportes/Report/RastreoOperaciones', [
            'operaciones' => $operaciones,
            'usuarios' => DB::table('users')->select('id', 'name')->get(),
            'filtros' => $request->all(),
        ]);
    }
}
