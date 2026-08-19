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
     * stock, mismo cálculo que ya usa Logistica).
     *
     * "Saldo Acumulado" = saldo TOTAL en vivo de las cuentas ahora mismo (mismo
     * número que Tabla 1 / Logística) — nunca negativo mientras exista dinero
     * real, sin importar cuánto se haya movido. "Mes Anterior" es ese mismo
     * total, congelado tal como cerró el mes pasado. "Diferencia" = Saldo
     * Acumulado − Mes Anterior, el único lugar donde puede aparecer un número
     * negativo, y ahí sí tiene sentido porque está etiquetado como cambio, no
     * como saldo.
     *
     * (Redefinido 2026-08-19: la versión anterior mostraba en "Saldo Acumulado"
     * el movimiento neto del mes en vez del total, restando un ancla
     * `saldo_inicio_mes` — generaba confusión real, un saldo de cuenta con
     * dinero real se veía negativo. `saldo_inicio_mes` se sigue capturando por
     * si sirve como referencia histórica, pero ya no se usa para calcular
     * `monto_actual`.)
     *
     * Se llama tanto desde el comando programado (00:00 del día 1) como, de red
     * de seguridad, desde AdminController::index() en cada carga del dashboard.
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
                // Primer acceso del mes: se guarda como referencia histórica (ya no se usa en el cálculo de abajo).
                $saldoInicioMes = $valorEnVivo;

                $ultimaFila = HistorialComparacionMensual::where('user_id', $userId)
                    ->where('moneda_codigo', $codigo)
                    ->where('mes_comparado', '<', $mesActual)
                    ->orderByDesc('mes_comparado')
                    ->first();

                $montoAnterior = $ultimaFila ? (float) $ultimaFila->monto_actual : 0.0;
            }

            $montoActual = $valorEnVivo;
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
     * Ganancia real de la agencia en lo que va del mes en curso, desglosada por
     * fuente. Compras/Gasto/Ingreso no tienen margen posible (ver análisis en
     * docs/arreglos-pendientes/dashboard-resumen-financiero-2026-08-12.md, Fase
     * 4b) — solo Ventas y Transferencias pueden generar ganancia real, cada una
     * ya calculada y guardada por su propio controller al momento de la
     * operación (`ventas.ganancia_neta` en `VentaController::aprobarVenta()`,
     * `movimientos_financieros.ganancia_perdida_cambiaria` en
     * `TransferenciaController::store()`) — acá solo se suman.
     */
    public function getGananciaAgenciaMes(): array
    {
        $inicioMes = now()->startOfMonth();

        $gananciaVentas = (float) DB::table('ventas')
            ->where('estado', 'completada')
            ->where('updated_at', '>=', $inicioMes)
            ->sum('ganancia_neta');

        $gananciaTransferencias = (float) DB::table('movimientos_financieros')
            ->where('tipo_movimiento_id', 3) // Transferencia Interna
            ->where('fecha_operacion', '>=', $inicioMes)
            ->sum('ganancia_perdida_cambiaria');

        return [
            'ganancia_ventas' => round($gananciaVentas, 2),
            'ganancia_transferencias' => round($gananciaTransferencias, 2),
            'ganancia_neta_total' => round($gananciaVentas + $gananciaTransferencias, 2),
        ];
    }

    /**
     * Tasa de cambio oficial de una moneda (por `moneda_id`, no por código — este
     * sistema tiene 2 monedas distintas codificadas "CUP" con historiales de tasa
     * independientes, hay que resolver por id o se mezclan) vigente en un instante
     * pasado. Reconstruida desde `historial_tasa_cambios` (cada cambio de tasa
     * queda ahí con su fecha), no desde el valor actual de `monedas.tasa_cambio`
     * (que ya cambió desde entonces). Usado por el backfill de ganancia de
     * Transferencias — no se llama desde ningún flujo normal del dashboard.
     */
    public function tasaOficialHistorica(int $monedaId, \Carbon\Carbon $momento): float
    {
        $cambio = DB::table('historial_tasa_cambios')
            ->where('moneda_id', $monedaId)
            ->where('created_at', '<=', $momento)
            ->orderByDesc('created_at')
            ->first();

        if ($cambio) {
            return (float) $cambio->tasa_nueva;
        }

        // No hay ningún cambio registrado antes de ese momento: o la tasa nunca
        // cambió, o cambió por primera vez después — el mejor dato disponible es
        // el "tasa_anterior" del cambio más antiguo (si existe) o la tasa actual.
        $primerCambio = DB::table('historial_tasa_cambios')
            ->where('moneda_id', $monedaId)
            ->orderBy('created_at')
            ->first();

        if ($primerCambio) {
            return (float) $primerCambio->tasa_anterior;
        }

        return (float) (DB::table('monedas')->where('id', $monedaId)->value('tasa_cambio') ?? 1.0);
    }

    /**
     * Reconstruye el movimiento neto real de las cuentas (entradas − salidas)
     * en un rango de fechas, por moneda. `movimientos_financieros` solo es
     * confiable para Gasto/Ingreso/Transferencia — Venta y Compra mueven
     * `saldo_cuenta` directo sin loguearse ahí (ver CuentaController.php,
     * métodos `obtenerHistorialVentas`/`obtenerHistorialCompras`, de donde
     * salen estas mismas 6 fuentes, aquí sumadas por moneda en vez de
     * paginadas por cuenta). También incluye `ajustes_saldo_cuenta` (ediciones
     * manuales auditadas) para que el neto cuadre siempre con el saldo real.
     *
     * Usado por el comando de backfill de agosto 2026 — no se llama desde
     * ningún flujo normal del dashboard.
     */
    public function reconstruirMovimientoCuentas(\Carbon\Carbon $desde, \Carbon\Carbon $hasta): array
    {
        $neto = [];

        $sumar = function (string $moneda, float $monto) use (&$neto) {
            $neto[$moneda] = ($neto[$moneda] ?? 0.0) + $monto;
        };

        DB::table('movimientos_financieros')
            ->whereBetween('fecha_operacion', [$desde, $hasta])
            ->whereNotNull('cuenta_origen_id')
            ->selectRaw('moneda_origen as moneda, SUM(saldo_posterior_origen - saldo_anterior_origen) as delta')
            ->groupBy('moneda_origen')
            ->get()
            ->each(fn ($r) => $sumar($r->moneda, (float) $r->delta));

        DB::table('movimientos_financieros')
            ->whereBetween('fecha_operacion', [$desde, $hasta])
            ->whereNotNull('cuenta_destino_id')
            ->selectRaw('moneda_destino as moneda, SUM(saldo_posterior_destino - saldo_anterior_destino) as delta')
            ->groupBy('moneda_destino')
            ->get()
            ->each(fn ($r) => $sumar($r->moneda, (float) $r->delta));

        DB::table('pago_ventas as pv')
            ->join('ventas as v', 'pv.venta_id', '=', 'v.id')
            ->leftJoin('monedas as m', 'pv.moneda_id', '=', 'm.id')
            ->where('v.estado', 'completada')
            ->whereBetween('v.updated_at', [$desde, $hasta])
            ->selectRaw("COALESCE(m.codigo_moneda, 'USD') as moneda, SUM(pv.monto) as total")
            ->groupBy('moneda')
            ->get()
            ->each(fn ($r) => $sumar($r->moneda, (float) $r->total));

        $comisionPv = (float) DB::table('ventas')
            ->whereNotNull('comision_cuenta_id')
            ->where('estado', 'completada')
            ->where('es_venta_gestor', false)
            ->where('total_comision', '>', 0)
            ->where('comision_tasa', '>', 0)
            ->whereBetween('updated_at', [$desde, $hasta])
            ->sum(DB::raw('total_comision * comision_tasa'));
        $sumar('CUP', -$comisionPv);

        $comisionGestor = (float) DB::table('ventas')
            ->whereNotNull('gestor_cuenta_id')
            ->where('estado', 'completada')
            ->where('es_venta_gestor', true)
            ->where('gestor_monto', '>', 0)
            ->whereBetween('updated_at', [$desde, $hasta])
            ->sum('gestor_monto');
        $sumar('CUP', -$comisionGestor);

        $mensajeria = (float) DB::table('ventas')
            ->whereNotNull('mensajero_cuenta_id')
            ->where('estado', 'completada')
            ->where('mensajero_tipo', 'externo')
            ->where('mensajero_monto', '>', 0)
            ->whereBetween('updated_at', [$desde, $hasta])
            ->sum(DB::raw('COALESCE(NULLIF(mensajero_monto_final_cup, 0), mensajero_monto_original)'));
        $sumar('CUP', -$mensajeria);

        $comprasPago = (float) DB::table('compra_pago as cp')
            ->join('compras as c', 'cp.compra_id', '=', 'c.id')
            ->whereBetween('c.fecha_compra', [$desde, $hasta])
            ->sum('cp.monto');
        $sumar('USD', -$comprasPago);

        DB::table('ajustes_saldo_cuenta as a')
            ->join('cuentas as c', 'a.cuenta_id', '=', 'c.id')
            ->join('monedas as m', 'c.moneda_id', '=', 'm.id')
            ->whereBetween('a.created_at', [$desde, $hasta])
            ->selectRaw('m.codigo_moneda as moneda, SUM(a.saldo_nuevo - a.saldo_anterior) as delta')
            ->groupBy('moneda')
            ->get()
            ->each(fn ($r) => $sumar($r->moneda, (float) $r->delta));

        return $neto;
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

