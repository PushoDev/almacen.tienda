<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Venta;
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
     * Productos por Almacen
     */
    public function productosPorAlmacen()
    {
        $almacenes = DB::table('compra_producto')
            ->join('compras', 'compra_producto.compra_id', '=', 'compras.id')
            ->join('almacens', 'compras.almacen_id', '=', 'almacens.id')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->select(
                'almacens.id as almacen_id',
                'almacens.nombre_almacen',
                DB::raw('SUM(compra_producto.cantidad) as total_productos'),
                DB::raw('COUNT(DISTINCT productos.id) as productos_unicos')
            )
            ->groupBy('almacens.id', 'almacens.nombre_almacen')
            ->orderByDesc('total_productos')
            ->get();

        return Inertia::render('Reportes/Report/ProductosPorAlmacen', [
            'almacenes' => $almacenes,
        ]);
    }

    /**
     * Detalles de los Prloductos por Almacen
     */
    public function productosPorAlmacenDetalle()
    {
        $datos = DB::table('compra_producto')
            ->join('compras', 'compra_producto.compra_id', '=', 'compras.id')
            ->join('almacens', 'compras.almacen_id', '=', 'almacens.id')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->select(
                'almacens.id as almacen_id',
                'almacens.nombre_almacen',
                'productos.id as producto_id',
                'productos.nombre_producto',
                DB::raw('SUM(compra_producto.cantidad) as cantidad_total')
            )
            ->groupBy('almacens.id', 'almacens.nombre_almacen', 'productos.id', 'productos.nombre_producto')
            ->orderBy('almacens.id')
            ->orderBy('productos.nombre_producto')
            ->get();

        return Inertia::render(
            'Reportes/Report/ProductosPorAlmacenDetalle',
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
}
