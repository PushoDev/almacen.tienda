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

        $resumenCuentas = $canViewFinance ? $this->getResumenCuentas() : null;
        $resumenClientes = $canViewFinance ? $this->getResumenClientes() : null;
        $resumenProveedores = $canViewFinance ? $this->getResumenProveedores() : null;
        $resumenProductos = $canViewFinance ? $this->getResumenProductos() : null;

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
            'resumenCuentas' => $resumenCuentas,
            'resumenClientes' => $resumenClientes,
            'resumenProveedores' => $resumenProveedores,
            'resumenProductos' => $resumenProductos,
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

    private function getResumenCuentas(): array
    {
        $monedaPrincipal = DB::table('monedas')->where('principal', true)->first();

        $cuentas = DB::table('cuentas')
            ->leftJoin('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
            ->whereIn('cuentas.tipo_cuenta', ['permanentes', 'temporales'])
            ->select('cuentas.*', 'monedas.tasa_cambio', 'monedas.codigo_moneda', 'monedas.simbolo_moneda')
            ->get();

        $todas = DB::table('cuentas')
            ->leftJoin('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
            ->select('cuentas.*', 'monedas.tasa_cambio', 'monedas.codigo_moneda', 'monedas.simbolo_moneda')
            ->get();

        $totalSaldo = 0;
        $porTipo = [];
        $conteoTipo = [];
        $porEstado = [];
        $conteoEstado = [];
        $cuentasConDeuda = 0;
        $deudaSaldoEquivalente = 0;

        foreach ($cuentas as $c) {
            $tasa = $c->tasa_cambio ?? 1;
            $equiv = $tasa > 0 ? (float) ($c->saldo_cuenta ?? 0) / (float) $tasa : 0;
            $totalSaldo += $equiv;

            $porTipo[$c->tipo_cuenta] = ($porTipo[$c->tipo_cuenta] ?? 0) + $equiv;
            $conteoTipo[$c->tipo_cuenta] = ($conteoTipo[$c->tipo_cuenta] ?? 0) + 1;
        }

        foreach ($todas as $c) {
            $tasa = $c->tasa_cambio ?? 1;
            $equiv = $tasa > 0 ? (float) ($c->saldo_cuenta ?? 0) / (float) $tasa : 0;

            $porEstado[$c->estado] = ($porEstado[$c->estado] ?? 0) + $equiv;
            $conteoEstado[$c->estado] = ($conteoEstado[$c->estado] ?? 0) + 1;

            if ((float) ($c->saldo_cuenta ?? 0) < 0) {
                $cuentasConDeuda++;
                $deudaSaldoEquivalente += abs($equiv);
            }
        }

        return [
            'total_saldo' => round($totalSaldo, 2),
            'total_cuentas' => $todas->count(),
            'cuentas_activas' => $conteoEstado['activa'] ?? 0,
            'cuentas_inactivas' => $conteoEstado['inactiva'] ?? 0,
            'cuentas_con_deuda' => $cuentasConDeuda,
            'cuentas_deuda_saldo' => round($deudaSaldoEquivalente, 2),
            'moneda_principal' => $monedaPrincipal ? [
                'simbolo' => $monedaPrincipal->simbolo_moneda,
                'codigo' => $monedaPrincipal->codigo_moneda,
            ] : ['simbolo' => '$', 'codigo' => 'USD'],
            'por_tipo' => collect($porTipo)->map(fn ($v) => round($v, 2))->toArray(),
            'conteo_tipo' => $conteoTipo,
            'por_estado' => collect($porEstado)->map(fn ($v, $k) => [
                'saldo' => round($v, 2),
                'cantidad' => $conteoEstado[$k] ?? 0,
            ])->toArray(),
            'por_moneda_perm' => $this->getResumenPorMonedaPerm(),
        ];
    }

    private function getResumenPorMonedaPerm(): array
    {
        $monedas = DB::table('monedas')->where('estado', true)->get();
        $result = [];

        foreach ($monedas as $moneda) {
            $tasa = (float) ($moneda->tasa_cambio ?? 1);
            $cuentasPerm = DB::table('cuentas')
                ->where('moneda_id', $moneda->id)
                ->where('tipo_cuenta', 'permanentes')
                ->get();

            if ($cuentasPerm->isEmpty()) continue;

            $original = (float) $cuentasPerm->sum('saldo_cuenta');
            $equivalente = $tasa > 0 ? $original / $tasa : 0;

            $result[$moneda->codigo_moneda] = [
                'original' => round($original, 2),
                'equivalente' => round($equivalente, 2),
                'cantidad' => $cuentasPerm->count(),
                'simbolo' => $moneda->simbolo_moneda,
            ];
        }

        return $result;
    }

    private function getResumenClientes(): array
    {
        $clientes = DB::table('clientes')->get();

        $conFondo = $clientes->where('deuda_pago_cliente', '>', 0);
        $conDeuda = $clientes->where('deuda_pago_cliente', '<', 0);
        $neutro = $clientes->filter(fn ($c) => is_null($c->deuda_pago_cliente) || (float) $c->deuda_pago_cliente === 0.0);

        $totalFondo = (float) $conFondo->sum('deuda_pago_cliente');
        $totalDeuda = (float) $conDeuda->sum('deuda_pago_cliente');

        return [
            'total_clientes' => $clientes->count(),
            'total_fondo' => round($totalFondo, 2),
            'total_deuda' => round(abs($totalDeuda), 2),
            'balance_neto' => round($totalFondo + $totalDeuda, 2),
            'por_estado' => [
                'fondo' => ['cantidad' => $conFondo->count(), 'saldo' => round($totalFondo, 2)],
                'deuda' => ['cantidad' => $conDeuda->count(), 'saldo' => round(abs($totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro->count(), 'saldo' => 0],
            ],
        ];
    }

    private function getResumenProveedores(): array
    {
        $proveedores = DB::table('proveedors')->get();

        $conFondo = $proveedores->where('saldo_proveedor', '>', 0);
        $conDeuda = $proveedores->where('saldo_proveedor', '<', 0);
        $neutro = $proveedores->filter(fn ($p) => is_null($p->saldo_proveedor) || (float) $p->saldo_proveedor === 0.0);

        $totalFondo = (float) $conFondo->sum('saldo_proveedor');
        $totalDeuda = (float) $conDeuda->sum('saldo_proveedor');

        return [
            'total_proveedores' => $proveedores->count(),
            'total_fondo' => round($totalFondo, 2),
            'total_deuda' => round(abs($totalDeuda), 2),
            'balance_neto' => round($totalFondo + $totalDeuda, 2),
            'por_estado' => [
                'fondo' => ['cantidad' => $conFondo->count(), 'saldo' => round($totalFondo, 2)],
                'deuda' => ['cantidad' => $conDeuda->count(), 'saldo' => round(abs($totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro->count(), 'saldo' => 0],
            ],
        ];
    }

    private function getResumenProductos(): array
    {
        $totalProductos = (int) DB::table('productos')->count();

        $totalUnidades = (int) DB::table('almacen_producto')->sum('cantidad');

        $totalImporteGlobal = (float) DB::table('almacen_producto')
            ->join('productos', 'productos.id', '=', 'almacen_producto.producto_id')
            ->sum(DB::raw('productos.precio_compra_producto * almacen_producto.cantidad'));

        $productosConStock = DB::table('almacen_producto')
            ->join('productos', 'productos.id', '=', 'almacen_producto.producto_id')
            ->select('productos.id', 'productos.precio_compra_producto', DB::raw('SUM(almacen_producto.cantidad) as cantidad_total'))
            ->groupBy('productos.id', 'productos.precio_compra_producto')
            ->get();

        $sinStock = $productosConStock->filter(fn ($p) => (int) $p->cantidad_total === 0);
        $stockBajo = $productosConStock->filter(fn ($p) => (int) $p->cantidad_total > 0 && (int) $p->cantidad_total < 5);
        $conStock = $productosConStock->filter(fn ($p) => (int) $p->cantidad_total >= 5);

        // Productos sin ningun registro en almacen_producto (totalmente huerfanos)
        $idsConStock = $productosConStock->pluck('id')->toArray();
        $productosSinRegistro = (int) DB::table('productos')
            ->whereNotIn('id', $idsConStock)
            ->count();
        $sinStockCount = $sinStock->count() + $productosSinRegistro;

        $unidadesConStock = (int) $conStock->sum('cantidad_total');
        $unidadesStockBajo = (int) $stockBajo->sum('cantidad_total');

        $valorStockBajo = $stockBajo->sum(fn ($p) => (float) $p->precio_compra_producto * (int) $p->cantidad_total);

        return [
            'total_productos' => $totalProductos,
            'total_unidades' => $totalUnidades,
            'total_importe_global' => round($totalImporteGlobal, 2),
            'productos_stock_bajo' => $stockBajo->count(),
            'valor_stock_bajo' => round((float) $valorStockBajo, 2),
            'por_stock' => [
                'con_stock' => ['cantidad' => $conStock->count(), 'unidades' => $unidadesConStock],
                'stock_bajo' => ['cantidad' => $stockBajo->count(), 'unidades' => $unidadesStockBajo],
                'sin_stock' => ['cantidad' => $sinStockCount, 'unidades' => 0],
            ],
        ];
    }
}

