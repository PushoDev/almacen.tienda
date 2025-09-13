<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class ReporteController extends Controller
{
    /**
     * Inicio de los Reportes
     *
     * @return void
     */
    public function index()
    {
        return Inertia::render('Reportes/Index');
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
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getComprasVentasData(Request $request)
    {
        // Define el rango de tiempo. Por defecto, 90 días.
        $timeRange = $request->query('timeRange', '90d');
        $days = (int) substr($timeRange, 0, -1);
        $startDate = now()->subDays($days);

        // Subconsulta para ventas
        $ventasQuery = DB::table('ventas')
            ->select(DB::raw('DATE(fecha_venta) as date'), DB::raw('SUM(total_venta) as total_ventas'))
            ->whereDate('fecha_venta', '>=', $startDate)
            ->groupBy('date');

        // Subconsulta para compras
        $comprasQuery = DB::table('compras')
            ->select(DB::raw('DATE(fecha_compra) as date'), DB::raw('SUM(total_compra) as total_compras'))
            ->whereDate('fecha_compra', '>=', $startDate)
            ->groupBy('date');

        // Combinar ambas consultas para obtener un solo conjunto de datos
        // Se usa RIGHT JOIN para incluir días con compras pero sin ventas (o viceversa)
        $data = DB::query()
            ->fromSub($ventasQuery, 'ventas')
            ->rightJoinSub($comprasQuery, 'compras', 'ventas.date', '=', 'compras.date')
            ->select(
                DB::raw("COALESCE(ventas.date, compras.date) as date"),
                DB::raw("COALESCE(ventas.total_ventas, 0) as ventas"),
                DB::raw("COALESCE(compras.total_compras, 0) as compras")
            )
            ->union(
                DB::query()
                    ->fromSub($comprasQuery, 'compras')
                    ->rightJoinSub($ventasQuery, 'ventas', 'compras.date', '=', 'ventas.date')
                    ->select(
                        DB::raw("COALESCE(compras.date, ventas.date) as date"),
                        DB::raw("COALESCE(ventas.total_ventas, 0) as ventas"),
                        DB::raw("COALESCE(compras.total_compras, 0) as compras")
                    )
            )
            ->orderBy('date')
            ->get();

        // Asegurar que solo haya un registro por fecha en caso de duplicados
        $uniqueData = $data->unique('date')->values()->all();

        return response()->json($uniqueData);
    }
}
