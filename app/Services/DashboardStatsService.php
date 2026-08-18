<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\HistorialComparacionMensual;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DashboardStatsService
{
    private const STOCK_BAJO_THRESHOLD = 5;
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
     * Resumen financiero compacto para el dashboard principal: Capital Financiero
     * total + una tarjeta por cada moneda que realmente tenga cuentas permanentes
     * (dinámico, no una lista fija de códigos — si se activa una moneda nueva
     * aparece sola, sin tocar este método).
     */
    public function getResumenFinancieroCompacto(): array
    {
        $resumenCuentas = $this->getResumenCuentas();
        $resumenClientes = $this->getResumenClientes();
        $resumenProveedores = $this->getResumenProveedores();
        $resumenProductos = $this->getResumenProductos();

        // Clientes/proveedores/inventario no tienen desglose por moneda en el sistema
        // (son montos únicos, sin columna moneda) — se asumen en la moneda principal,
        // así que solo se suman a esa tarjeta, no a las demás.
        $extrasMonedaPrincipal = $resumenClientes['balance_neto']
            + $resumenProveedores['balance_neto']
            + $resumenProductos['total_importe_global'];

        $codigoPrincipal = $resumenCuentas['moneda_principal']['codigo'] ?? null;

        $capitalPorMoneda = collect($resumenCuentas['por_moneda_perm'])
            ->map(function ($info, $codigo) use ($extrasMonedaPrincipal, $codigoPrincipal) {
                $esPrincipal = $codigo === $codigoPrincipal;

                return [
                    'codigo' => $codigo,
                    'simbolo' => $info['simbolo'],
                    'monto' => round(($esPrincipal ? $extrasMonedaPrincipal : 0) + $info['original'], 2),
                    'incluye_clientes_proveedores_inventario' => $esPrincipal,
                ];
            })
            ->values()
            ->toArray();

        return [
            'capital_financiero' => round($resumenCuentas['total_saldo'] + $extrasMonedaPrincipal, 2),
            'capital_por_moneda' => $capitalPorMoneda,
            'moneda_principal' => $resumenCuentas['moneda_principal'],
        ];
    }

    /**
     * Actualiza (o crea, en el primer acceso al mes) el snapshot de comparación
     * mensual por moneda + una fila sintética "INVENTARIO" (valor de costo del
     * stock, mismo cálculo que ya usa Logistica). "Mes Anterior" es el "Saldo
     * Acumulado" (movimiento neto) con el que cerró el mes pasado — congelado,
     * se lee tal cual. "Saldo Acumulado" es cuánto se ha movido (entradas −
     * salidas) desde que empezó este mes: arranca en 0 el día 1, calculado como
     * `valor en vivo ahora − saldo_inicio_mes` (el ancla, capturada una sola vez
     * en el primer acceso del mes y nunca vuelta a tocar) — así se evita volver
     * a sumar `movimientos_financieros`, que es donde vivía el bug de agrupación
     * de WHERE (whereIn()->orWhereIn()->where()->where() sin agrupar, dejaba el
     * lado "origen" sin filtro de moneda/fecha). "Diferencia" compara el
     * movimiento de este mes contra el del mes pasado.
     *
     * Se llama tanto desde el comando programado (00:00 del día 1) como, de red
     * de seguridad, desde AdminController::index() en cada carga del dashboard —
     * si el comando no corrió todavía, el primer acceso del mes nuevo hace el
     * "cierre" (captura del ancla) ahí mismo.
     */
    public function actualizarComparacionMensual(?int $userId = null): array
    {
        $mesActual = now()->startOfMonth()->toDateString();
        $porMoneda = $this->getResumenCuentas()['por_moneda_perm'];
        $porMoneda['INVENTARIO'] = [
            'original' => $this->getResumenProductos()['total_importe_global'],
            'simbolo' => '$',
        ];
        $monedasInfo = DB::table('monedas')->get()->groupBy('codigo_moneda');

        $resultado = [];

        foreach ($porMoneda as $codigo => $info) {
            $monedaInfo = $monedasInfo->get($codigo)?->first();
            $valorEnVivo = (float) $info['original'];

            $filaExistente = HistorialComparacionMensual::where('user_id', $userId)
                ->where('mes_comparado', $mesActual)
                ->where('moneda_codigo', $codigo)
                ->first();

            if ($filaExistente) {
                $saldoInicioMes = (float) $filaExistente->saldo_inicio_mes;
                $montoAnterior = (float) $filaExistente->monto_anterior;
            } else {
                // Primer acceso del mes: el ancla se captura ahora mismo y ya no se toca.
                $saldoInicioMes = $valorEnVivo;

                $ultimaFila = HistorialComparacionMensual::where('user_id', $userId)
                    ->where('moneda_codigo', $codigo)
                    ->where('mes_comparado', '<', $mesActual)
                    ->orderByDesc('mes_comparado')
                    ->first();

                $montoAnterior = $ultimaFila ? (float) $ultimaFila->monto_actual : 0.0;
            }

            $montoActual = $valorEnVivo - $saldoInicioMes;
            $diferencia = $montoActual - $montoAnterior;
            $porcentajeCambio = $montoAnterior != 0.0 ? round(($diferencia / $montoAnterior) * 100, 2) : 0.0;
            $nombreMoneda = $monedaInfo->nombre_moneda ?? ($codigo === 'INVENTARIO' ? 'Inventario' : $codigo);

            HistorialComparacionMensual::updateOrCreate(
                ['user_id' => $userId, 'mes_comparado' => $mesActual, 'moneda_codigo' => $codigo],
                [
                    'moneda_nombre' => $nombreMoneda,
                    'moneda_simbolo' => $info['simbolo'],
                    'saldo_inicio_mes' => $saldoInicioMes,
                    'monto_anterior' => $montoAnterior,
                    'monto_actual' => $montoActual,
                    'diferencia' => $diferencia,
                    'porcentaje_cambio' => $porcentajeCambio,
                    'tasa_cambio_usada' => $monedaInfo->tasa_cambio ?? 1,
                ]
            );

            $resultado[] = [
                'moneda' => $codigo,
                'nombre_moneda' => $nombreMoneda,
                'simbolo_moneda' => $info['simbolo'],
                'monto_actual' => round($montoActual, 2),
                'monto_anterior' => round($montoAnterior, 2),
                'diferencia' => round($diferencia, 2),
                'porcentaje_cambio' => $porcentajeCambio,
                'es_positivo' => $diferencia >= 0,
                'tasa_cambio' => (float) ($monedaInfo->tasa_cambio ?? 1),
            ];
        }

        return $resultado;
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
            // DISTINCT: un producto puede tener varias líneas en la misma compra (distintos
            // almacenes/colores) — "veces comprado" cuenta compras, no líneas.
            ->selectRaw('productos.nombre_producto, SUM(compra_producto.cantidad) as total_cantidad, COUNT(DISTINCT compra_producto.compra_id) as veces_comprado')
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

    private function getMonedaPrincipal(): array
    {
        $moneda = DB::table('monedas')->where('principal', true)->first();

        if (!$moneda) {
            $moneda = DB::table('monedas')->where('estado', true)->first();
        }

        return $moneda
            ? ['simbolo' => $moneda->simbolo_moneda, 'codigo' => $moneda->codigo_moneda]
            : ['simbolo' => '$', 'codigo' => 'USD'];
    }

    private function getResumenCuentas(): array
    {
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
        $porTipoMoneda = [];

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

            $tipoCuenta = $c->tipo ?? 'otro';
            $codigoMoneda = $c->codigo_moneda ?? 'N/A';
            $simboloMoneda = $c->simbolo_moneda ?? '$';
            if (!isset($porTipoMoneda[$tipoCuenta])) {
                $porTipoMoneda[$tipoCuenta] = [];
            }
            if (!isset($porTipoMoneda[$tipoCuenta][$codigoMoneda])) {
                $porTipoMoneda[$tipoCuenta][$codigoMoneda] = [
                    'original' => 0,
                    'equivalente' => 0,
                    'cantidad' => 0,
                    'simbolo' => $simboloMoneda,
                ];
            }
            $porTipoMoneda[$tipoCuenta][$codigoMoneda]['original'] += (float) ($c->saldo_cuenta ?? 0);
            $porTipoMoneda[$tipoCuenta][$codigoMoneda]['equivalente'] += $equiv;
            $porTipoMoneda[$tipoCuenta][$codigoMoneda]['cantidad']++;
        }

        return [
            'total_saldo' => round($totalSaldo, 2),
            'total_cuentas' => $todas->count(),
            'cuentas_activas' => $conteoEstado['activa'] ?? 0,
            'cuentas_inactivas' => $conteoEstado['inactiva'] ?? 0,
            'cuentas_con_deuda' => $cuentasConDeuda,
            'cuentas_deuda_saldo' => round($deudaSaldoEquivalente, 2),
            'moneda_principal' => $this->getMonedaPrincipal(),
            'por_tipo' => collect($porTipo)->map(fn ($v) => round($v, 2))->toArray(),
            'conteo_tipo' => $conteoTipo,
            'por_estado' => collect($porEstado)->map(fn ($v, $k) => [
                'saldo' => round($v, 2),
                'cantidad' => $conteoEstado[$k] ?? 0,
            ])->toArray(),
            'por_moneda_perm' => $this->getResumenPorMonedaPerm(),
            'por_tipo_moneda' => collect($porTipoMoneda)->map(fn ($monedas) => 
                collect($monedas)->map(fn ($v) => [
                    'original' => round($v['original'], 2),
                    'equivalente' => round($v['equivalente'], 2),
                    'cantidad' => $v['cantidad'],
                    'simbolo' => $v['simbolo'],
                ])->toArray()
            )->toArray(),
        ];
    }

    private function getResumenPorMonedaPerm(): array
    {
        $cuentas = DB::table('cuentas')
            ->leftJoin('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
            ->where('cuentas.tipo_cuenta', 'permanentes')
            ->select('cuentas.*', 'monedas.tasa_cambio', 'monedas.codigo_moneda', 'monedas.simbolo_moneda')
            ->get();

        $result = [];
        foreach ($cuentas as $c) {
            $codigo = $c->codigo_moneda ?? 'N/A';
            $simbolo = $c->simbolo_moneda ?? '$';
            $tasa = (float) ($c->tasa_cambio ?? 1);
            $original = (float) ($c->saldo_cuenta ?? 0);
            $equivalente = $tasa > 0 ? $original / $tasa : 0;

            if (!isset($result[$codigo])) {
                $result[$codigo] = [
                    'original' => 0,
                    'equivalente' => 0,
                    'cantidad' => 0,
                    'simbolo' => $simbolo,
                ];
            }
            $result[$codigo]['original'] += $original;
            $result[$codigo]['equivalente'] += $equivalente;
            $result[$codigo]['cantidad']++;
        }

        return collect($result)->map(fn ($v) => [
            'original' => round($v['original'], 2),
            'equivalente' => round($v['equivalente'], 2),
            'cantidad' => $v['cantidad'],
            'simbolo' => $v['simbolo'],
        ])->toArray();
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
        $stockBajo = $productosConStock->filter(fn ($p) => (int) $p->cantidad_total > 0 && (int) $p->cantidad_total < self::STOCK_BAJO_THRESHOLD);
        $conStock = $productosConStock->filter(fn ($p) => (int) $p->cantidad_total >= self::STOCK_BAJO_THRESHOLD);

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

