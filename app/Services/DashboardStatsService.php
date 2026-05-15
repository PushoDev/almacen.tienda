<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DashboardStatsService
{
    /**
     * Obtiene las estadísticas del dashboard logístico según el rol.
     */
    public function getLogisticaStats(User $user): array
    {
        $isVendor = !in_array($user->role, ['admin', 'moderador'], true);
        $canViewFinance = !$isVendor;

        $totalProductos = $isVendor
            ? $this->countProductosVendedor($user->id)
            : $this->countProductos();
        $totalUnidades = $isVendor
            ? $this->sumUnidadesProductosVendedor($user->id)
            : $this->sumUnidadesProductos();
        $totalCategorias = $isVendor
            ? $this->countCategoriasVendedor($user->id)
            : $this->countCategorias();
        $totalAlmacenes = $isVendor
            ? (int) $user->almacenes()->count()
            : $this->countAlmacenes();

        $categoriasActivas = $isVendor ? 0 : $this->countCategoriasActivas();
        $totalProveedores = $isVendor ? 0 : $this->countProveedores();
        $totalClientes = $isVendor ? 0 : $this->countClientes();

        $inversionTotal = $canViewFinance ? $this->calculateInversionTotal() : 0.0;
        $totalCuentas = $canViewFinance ? $this->countCuentas() : 0;
        $saldoCuentas = $canViewFinance ? $this->sumSaldoCuentas() : 0.0;
        $balances = $canViewFinance ? $this->getBalancesPorMoneda() : [];

        $sumaDisponible = $canViewFinance ? $this->calculateTotalConvertidoBase($balances, 0.0) : 0.0;
        $montoGeneralInvertido = $canViewFinance ? ($sumaDisponible + $inversionTotal) : 0.0;

        $deudaClienteFisico = $canViewFinance ? $this->sumDeudaClienteFisico() : 0.0;
        $clientesFisicos = $canViewFinance ? $this->countClientesFisicos() : 0;
        $deudaPendientes = $canViewFinance ? $this->countDeudaPendientes() : 0;
        $deudaPendientesSaldo = $canViewFinance ? $this->sumDeudaPendientesSaldo() : 0.0;

        return [
            'canViewFinance' => $canViewFinance,
            'totalCategorias' => $totalCategorias,
            'categoriasActivas' => $categoriasActivas,
            'totalProveedores' => $totalProveedores,
            'totalClientes' => $totalClientes,
            'totalAlmacenes' => $totalAlmacenes,
            'totalProductos' => $totalProductos,
            'totalUnidades' => $totalUnidades,
            'inversionTotal' => $inversionTotal,
            'totalCuentas' => $totalCuentas,
            'saldoCuentas' => $saldoCuentas,
            'montoGeneralInvertido' => $montoGeneralInvertido,
            'deudaPendientes' => $deudaPendientes,
            'deudaPendietesSaldo' => $deudaPendientesSaldo,
            'deudaPendientesSaldo' => $deudaPendientesSaldo,
            'balances' => $balances,
            'sumaDsiponible' => $sumaDisponible,
            'sumaDisponible' => $sumaDisponible,
            'deudaClienteFisico' => $deudaClienteFisico,
            'clientesFisicos' => $clientesFisicos,
            'gastosMensuales' => $canViewFinance ? $this->getGastosMensuales() : [],
            'productosTop' => $canViewFinance ? $this->getProductosTop() : [],
            'comprasPorProveedor' => $canViewFinance ? $this->getComprasPorProveedor() : [],
            'productosPorAlmacen' => $canViewFinance ? $this->getProductosPorAlmacen() : [],
        ];
    }

    /**
     * KPIs por período usados por reportes y ventas.
     */
    public function getPeriodKpis(User $user, string $periodo): array
    {
        if (!in_array($periodo, ['diario', 'semanal', 'mensual'], true)) {
            throw new InvalidArgumentException('Período no válido.');
        }

        $ventasQuery = Venta::query()->where('estado', 'completada');

        if (!in_array($user->role, ['admin', 'moderador'], true)) {
            $ventasQuery->where('user_id', $user->id);
        }

        $this->applyPeriodFilter($ventasQuery, $periodo, 'created_at');

        $ventasReporte = $ventasQuery->selectRaw(
            'SUM(total) as total_vendido, COUNT(id) as cantidad_ventas, SUM(total_ganancia) as ganancia_producto, SUM(monto_diferencia_cambiaria) as ganancia_cambiaria'
        )->first();

        $ventas = [
            'total_vendido' => (float) ($ventasReporte->total_vendido ?? 0),
            'cantidad_ventas' => (int) ($ventasReporte->cantidad_ventas ?? 0),
            'ganancia_operativa' => (float) ($ventasReporte->ganancia_producto ?? 0),
            'ganancia_cambiaria' => (float) ($ventasReporte->ganancia_cambiaria ?? 0),
            'ganancia_total' => (float) (($ventasReporte->ganancia_producto ?? 0) + ($ventasReporte->ganancia_cambiaria ?? 0)),
        ];

        $compras = null;
        if (in_array($user->role, ['admin', 'moderador'], true)) {
            $comprasQuery = Compra::query();
            $this->applyPeriodFilter($comprasQuery, $periodo, 'fecha_compra');

            $comprasReporte = $comprasQuery->selectRaw(
                'SUM(total_compra) as total_comprado, COUNT(id) as cantidad_compras'
            )->first();

            $compras = [
                'total_comprado' => (float) ($comprasReporte->total_comprado ?? 0),
                'cantidad_compras' => (int) ($comprasReporte->cantidad_compras ?? 0),
            ];
        }

        return [
            'ventas' => $ventas,
            'compras' => $compras,
            'legacy_ventas' => [
                'total_vendido' => $ventas['total_vendido'],
                'cantidad_ventas' => $ventas['cantidad_ventas'],
                'ganancia_total' => $ventas['ganancia_total'],
            ],
        ];
    }

    private function applyPeriodFilter(Builder $query, string $periodo, string $columna): void
    {
        switch ($periodo) {
            case 'diario':
                $query->whereDate($columna, now()->toDateString());
                break;
            case 'semanal':
                $query->whereBetween($columna, [now()->startOfWeek(), now()->endOfWeek()]);
                break;
            case 'mensual':
                $query->whereMonth($columna, now()->month)->whereYear($columna, now()->year);
                break;
        }
    }

    private function countCategorias(): int
    {
        return (int) DB::table('categorias')->count();
    }

    private function countCategoriasActivas(): int
    {
        return (int) DB::table('categorias')->where('activar_categoria', true)->count();
    }

    private function countProveedores(): int
    {
        return (int) DB::table('proveedors')->count();
    }

    private function countClientes(): int
    {
        return (int) DB::table('clientes')->count();
    }

    private function countAlmacenes(): int
    {
        return (int) DB::table('almacens')->count();
    }

    private function countProductos(): int
    {
        return (int) DB::table('productos')->count();
    }

    private function sumUnidadesProductos(): float
    {
        return (float) (DB::table('productos')->sum('cantidad_producto') ?? 0);
    }

    private function calculateInversionTotal(): float
    {
        return (float) (
            DB::table('almacen_producto')
                ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
                ->selectRaw('SUM(productos.precio_compra_producto * almacen_producto.cantidad) as total_inversion')
                ->value('total_inversion') ?? 0
        );
    }

    private function getBalancesPorMoneda(): array
    {
        $monedas = DB::table('monedas')->where('estado', true)->get();
        $balances = [];

        foreach ($monedas as $moneda) {
            $saldo = DB::table('cuentas')
                ->where('moneda_id', $moneda->id)
                ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
                ->sum('saldo_cuenta');

            $balances[] = [
                'codigo' => $moneda->codigo_moneda,
                'nombre' => $moneda->nombre_moneda,
                'simbolo' => $moneda->simbolo_moneda,
                'saldo' => (float) $saldo,
                'tasa' => (float) ($moneda->tasa_cambio ?? 1),
                'principal' => (bool) $moneda->principal,
            ];
        }

        return $balances;
    }

    private function calculateTotalConvertidoBase(array $balances, float $inversionTotal): float
    {
        $totalCuentasBase = 0.0;

        foreach ($balances as $balance) {
            $tasa = isset($balance['tasa']) && $balance['tasa'] > 0 ? (float) $balance['tasa'] : 1.0;
            $totalCuentasBase += ((float) $balance['saldo']) / $tasa;
        }

        return $totalCuentasBase + $inversionTotal;
    }

    private function countCuentas(): int
    {
        return (int) DB::table('cuentas')->count();
    }

    private function sumSaldoCuentas(): float
    {
        return (float) (DB::table('cuentas')->sum('saldo_cuenta') ?? 0);
    }

    private function sumDeudaPendientesSaldo(): float
    {
        return (float) (
            DB::table('cuentas')
                ->where('tipo_moneda', 'USD')
                ->whereIn('tipo_cuenta', ['deudas'])
                ->sum('saldo_cuenta') ?? 0
        );
    }

    private function countDeudaPendientes(): int
    {
        return (int) DB::table('compras')->where('tipo_compra', 'deuda_proveedor')->count();
    }

    private function sumDeudaClienteFisico(): float
    {
        return (float) (
            DB::table('clientes')
                ->where('tipo_cliente', 'fisico')
                ->sum('deuda_pago_cliente') ?? 0
        );
    }

    private function countClientesFisicos(): int
    {
        return (int) DB::table('clientes')->where('tipo_cliente', 'fisico')->count();
    }

    private function getGastosMensuales(): array
    {
        return DB::table('compras')
            ->selectRaw("DATE_FORMAT(compras.fecha_compra, '%Y-%m') as mes_anio, SUM(compras.total_compra) as total, COUNT(compras.id) as cantidad_compras")
            ->groupBy('mes_anio')
            ->orderByDesc('mes_anio')
            ->get()
            ->toArray();
    }

    private function getProductosTop(): array
    {
        return DB::table('compra_producto')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->selectRaw('productos.nombre_producto, SUM(compra_producto.cantidad) as total_cantidad, COUNT(compra_producto.compra_id) as veces_comprado')
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderByDesc('total_cantidad')
            ->take(10)
            ->get()
            ->toArray();
    }

    private function getComprasPorProveedor(): array
    {
        return DB::table('compras')
            ->join('proveedors', 'compras.proveedor_id', '=', 'proveedors.id')
            ->selectRaw('proveedors.nombre_proveedor, COUNT(compras.id) as cantidad_compras, SUM(compras.total_compra) as total_gastado')
            ->groupBy('proveedors.id', 'proveedors.nombre_proveedor')
            ->orderByDesc('total_gastado')
            ->get()
            ->toArray();
    }

    private function getProductosPorAlmacen(): array
    {
        return DB::table('almacen_producto')
            ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
            ->selectRaw('almacens.nombre_almacen, SUM(almacen_producto.cantidad) as total_productos, COUNT(DISTINCT almacen_producto.producto_id) as productos_unicos')
            ->groupBy('almacens.id', 'almacens.nombre_almacen')
            ->orderByDesc('total_productos')
            ->get()
            ->toArray();
    }

    private function countProductosVendedor(int $userId): int
    {
        return (int) DB::table('producto_vendedors')
            ->where('user_id', $userId)
            ->distinct('producto_id')
            ->count('producto_id');
    }

    private function sumUnidadesProductosVendedor(int $userId): float
    {
        return (float) (
            DB::table('almacen_producto')
                ->join('producto_vendedors', function ($join) use ($userId) {
                    $join->on('almacen_producto.producto_id', '=', 'producto_vendedors.producto_id')
                        ->on('almacen_producto.almacen_id', '=', 'producto_vendedors.almacen_id')
                        ->where('producto_vendedors.user_id', '=', $userId);
                })
                ->sum('almacen_producto.cantidad') ?? 0
        );
    }

    private function countCategoriasVendedor(int $userId): int
    {
        return (int) DB::table('producto_vendedors')
            ->join('productos', 'producto_vendedors.producto_id', '=', 'productos.id')
            ->where('producto_vendedors.user_id', $userId)
            ->distinct('productos.categoria_id')
            ->count('productos.categoria_id');
    }
}

