<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Reporte de Movimientos Financieros: las operaciones de caja del sistema, vengan de la tabla
 * que vengan — Gasto, Ingreso y Transferencia (`movimientos_financieros`), Envío en tránsito
 * (`transferencias_pendientes`), Operación Múltiple (`remesas`) y Ajuste de saldo
 * (`ajustes_saldo_cuenta`). Ventas y Compras no entran: ya están en Rastreo de Operaciones.
 *
 * El tipo sale de la fuente (etiqueta fija), nunca del nombre editable de
 * `tipos_movimiento_financiero`.
 */
class MovimientosFinancierosController extends Controller
{
    /**
     * Tipos en el orden de los widgets. `con_usd` indica si la fuente guarda el equivalente en USD
     * de cada operación; remesas y ajustes no lo guardan, así que no suman en USD (no se estima con
     * la tasa de hoy).
     */
    private const TIPOS = [
        'Gasto' => true,
        'Ingreso' => true,
        'Transferencia' => true,
        'Envío en tránsito' => true,
        'Operación Múltiple' => false,
        'Ajuste' => false,
    ];

    public function __invoke(Request $request)
    {
        $filtros = $request->validate([
            'buscar' => ['nullable', 'string', 'max:100'],
            'tipo' => ['nullable', Rule::in(array_keys(self::TIPOS))],
            'estado' => ['nullable', 'in:completado,en_transito,cancelado'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
        ]);

        $union = $this->subqueryMovimientos()
            ->unionAll($this->subqueryEnvios())
            ->unionAll($this->subqueryRemesas())
            ->unionAll($this->subqueryAjustes());

        $base = DB::query()
            ->fromSub($union, 'op')
            ->leftJoin('users', 'users.id', '=', 'op.user_id')
            ->when($filtros['tipo'] ?? null, fn ($q, $tipo) => $q->where('op.tipo', $tipo))
            ->when($filtros['estado'] ?? null, fn ($q, $estado) => $q->where('op.estado', $estado))
            ->when($filtros['user_id'] ?? null, fn ($q, $userId) => $q->where('op.user_id', $userId))
            ->when($filtros['desde'] ?? null, fn ($q, $desde) => $q->whereDate('op.fecha', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn ($q, $hasta) => $q->whereDate('op.fecha', '<=', $hasta))
            ->when($filtros['buscar'] ?? null, function ($q, $buscar) {
                $like = '%'.$buscar.'%';

                $q->where(function ($q) use ($buscar, $like) {
                    if (ctype_digit($buscar)) {
                        $q->orWhere('op.id', (int) $buscar);
                    }

                    $q->orWhere('op.descripcion', 'like', $like)
                        ->orWhere('op.origen', 'like', $like)
                        ->orWhere('op.destino', 'like', $like)
                        ->orWhere('users.name', 'like', $like);
                });
            });

        // Totales de TODO lo filtrado (no de la página). Un cancelado/anulado no movió dinero.
        $agregados = (clone $base)
            ->where('op.estado', '<>', 'cancelado')
            ->selectRaw('op.tipo as tipo, COUNT(*) as movimientos, COALESCE(SUM(op.monto_usd), 0) as monto_usd')
            ->groupBy('op.tipo')
            ->get()
            ->keyBy('tipo');

        $porTipo = collect(self::TIPOS)->map(fn (bool $conUsd, string $tipo) => [
            'tipo' => $tipo,
            'movimientos' => (int) ($agregados[$tipo]->movimientos ?? 0),
            'monto_usd' => $conUsd ? round((float) ($agregados[$tipo]->monto_usd ?? 0), 2) : null,
            'con_usd' => $conUsd,
        ])->values();

        $movimientos = (clone $base)
            ->select('op.*', 'users.name as usuario')
            ->orderByDesc('op.fecha')
            ->orderBy('op.tipo')
            ->orderByDesc('op.id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Reportes/Report/MovimientosFinancieros', [
            'movimientos' => $movimientos,
            'porTipo' => $porTipo,
            'totales' => [
                'movimientos' => $porTipo->sum('movimientos'),
                'cancelados' => (clone $base)->where('op.estado', 'cancelado')->count(),
            ],
            'tipos' => array_keys(self::TIPOS),
            'usuarios' => DB::table('users')->select('id', 'name')->orderBy('name')->get(),
            'filtros' => [
                'buscar' => $filtros['buscar'] ?? '',
                'tipo' => $filtros['tipo'] ?? '',
                'estado' => $filtros['estado'] ?? '',
                'user_id' => $filtros['user_id'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
            ],
        ]);
    }

    /**
     * Columnas que comparten las 4 fuentes, en el mismo orden (hace falta para el UNION). Las que una
     * fuente no tiene van en NULL con su tipo, para que MySQL no infiera uno equivocado.
     *
     * @param  array<string, string>  $columnas
     */
    private function columnas(array $columnas): string
    {
        $porDefecto = [
            'monto_destino' => 'CAST(NULL AS DECIMAL(15,2))',
            'moneda_destino' => 'CAST(NULL AS CHAR(10))',
            'salida_monto' => 'CAST(NULL AS DECIMAL(15,2))',
            'salida_moneda' => 'CAST(NULL AS CHAR(10))',
            'mensajero_monto' => 'CAST(NULL AS DECIMAL(15,2))',
            'mensajero_moneda' => 'CAST(NULL AS CHAR(10))',
            'saldo_anterior' => 'CAST(NULL AS DECIMAL(15,2))',
            'saldo_posterior' => 'CAST(NULL AS DECIMAL(15,2))',
            'monto_usd' => 'CAST(NULL AS DECIMAL(15,2))',
        ];

        $orden = [
            'tipo', 'id', 'fecha', 'user_id', 'estado', 'estado_texto', 'descripcion', 'origen', 'destino',
            'monto', 'moneda', 'monto_usd', 'monto_destino', 'moneda_destino', 'salida_monto', 'salida_moneda',
            'mensajero_monto', 'mensajero_moneda', 'saldo_anterior', 'saldo_posterior',
        ];

        $valores = array_merge($porDefecto, $columnas);

        return collect($orden)->map(fn (string $c) => "{$valores[$c]} as {$c}")->implode(', ');
    }

    /** Gasto (1), Ingreso (2) y Transferencia (3). */
    private function subqueryMovimientos()
    {
        $hayConversion = 'mf.moneda_destino IS NOT NULL AND mf.moneda_destino <> mf.moneda'
            .' AND mf.saldo_anterior_destino IS NOT NULL AND mf.saldo_posterior_destino IS NOT NULL';

        return DB::table('movimientos_financieros as mf')
            ->leftJoin('cuentas as c_origen', 'c_origen.id', '=', 'mf.cuenta_origen_id')
            ->leftJoin('cuentas as c_destino', 'c_destino.id', '=', 'mf.cuenta_destino_id')
            ->leftJoin('clientes as cl_origen', 'cl_origen.id', '=', 'mf.cliente_origen_id')
            ->leftJoin('clientes as cl_destino', 'cl_destino.id', '=', 'mf.cliente_destino_id')
            // Proveedores ya no se ofrecen en operaciones nuevas, pero el historial viejo sigue apuntando a ellos.
            ->leftJoin('proveedors as p_destino', 'p_destino.id', '=', 'mf.proveedor_destino_id')
            ->selectRaw($this->columnas([
                'tipo' => "CASE mf.tipo_movimiento_id WHEN 1 THEN 'Gasto' WHEN 2 THEN 'Ingreso' WHEN 3 THEN 'Transferencia' ELSE 'Otro movimiento' END",
                'id' => 'mf.id',
                'fecha' => 'mf.fecha_operacion',
                'user_id' => 'mf.user_id',
                'estado' => "CASE WHEN mf.estado = 'cancelado' THEN 'cancelado' ELSE 'completado' END",
                'estado_texto' => "CASE WHEN mf.estado = 'cancelado' THEN 'Cancelado' ELSE 'Completado' END",
                'descripcion' => 'mf.descripcion',
                'origen' => 'COALESCE(c_origen.nombre_cuenta, cl_origen.nombre_cliente)',
                'destino' => 'COALESCE(c_destino.nombre_cuenta, cl_destino.nombre_cliente, p_destino.nombre_proveedor)',
                'monto' => 'mf.monto',
                'moneda' => 'mf.moneda',
                'monto_usd' => 'mf.monto_usd',
                'monto_destino' => "CASE WHEN {$hayConversion} THEN ROUND(mf.saldo_posterior_destino - mf.saldo_anterior_destino, 2) ELSE NULL END",
                'moneda_destino' => "CASE WHEN {$hayConversion} THEN mf.moneda_destino ELSE NULL END",
            ]));
    }

    /**
     * Envíos de dinero en tránsito que todavía no tienen movimiento: el dinero ya salió del origen pero
     * el movimiento nace al confirmar. Los recibidos ya salen como la Transferencia que generaron.
     */
    private function subqueryEnvios()
    {
        return DB::table('transferencias_pendientes as tp')
            ->leftJoin('cuentas as c_origen', 'c_origen.id', '=', 'tp.cuenta_origen_id')
            ->leftJoin('cuentas as c_destino', 'c_destino.id', '=', 'tp.cuenta_destino_id')
            ->whereNull('tp.movimiento_financiero_id')
            ->selectRaw($this->columnas([
                'tipo' => "'Envío en tránsito'",
                'id' => 'tp.id',
                'fecha' => 'tp.created_at',
                'user_id' => 'tp.user_id',
                'estado' => "CASE WHEN tp.estado = 'en_transito' THEN 'en_transito' WHEN tp.estado IN ('anulado', 'rechazado') THEN 'cancelado' ELSE 'completado' END",
                'estado_texto' => "CASE tp.estado WHEN 'en_transito' THEN 'En tránsito' WHEN 'anulado' THEN 'Anulado' WHEN 'rechazado' THEN 'Rechazado' WHEN 'recibido_parcial' THEN 'Recibido parcial' ELSE 'Recibido' END",
                'descripcion' => 'tp.comentario',
                'origen' => 'c_origen.nombre_cuenta',
                'destino' => 'c_destino.nombre_cuenta',
                'monto' => 'tp.monto',
                'moneda' => 'tp.moneda',
                'monto_usd' => 'tp.monto_usd',
                'monto_destino' => 'CASE WHEN tp.moneda_destino <> tp.moneda THEN tp.monto_destino ELSE NULL END',
                'moneda_destino' => 'CASE WHEN tp.moneda_destino <> tp.moneda THEN tp.moneda_destino ELSE NULL END',
            ]));
    }

    /**
     * Operación Múltiple: Origen = la pata Salida (de donde sale el dinero), Destino = la pata Entrada,
     * Monto = la entrada; lo pagado y el mensajero viajan aparte. Misma convención que Rastreo.
     */
    private function subqueryRemesas()
    {
        return DB::table('remesas as r')
            ->leftJoin('cuentas as c_entrada', 'c_entrada.id', '=', 'r.entrada_cuenta_id')
            ->leftJoin('clientes as cl_entrada', 'cl_entrada.id', '=', 'r.entrada_cliente_id')
            ->leftJoin('proveedors as p_entrada', 'p_entrada.id', '=', 'r.entrada_proveedor_id')
            ->leftJoin('cuentas as c_salida', 'c_salida.id', '=', 'r.salida_cuenta_id')
            ->leftJoin('clientes as cl_salida', 'cl_salida.id', '=', 'r.salida_cliente_id')
            ->leftJoin('proveedors as p_salida', 'p_salida.id', '=', 'r.salida_proveedor_id')
            ->selectRaw($this->columnas([
                'tipo' => "'Operación Múltiple'",
                'id' => 'r.id',
                'fecha' => 'r.fecha_operacion',
                'user_id' => 'r.user_id',
                'estado' => "CASE WHEN r.estado = 'anulada' THEN 'cancelado' ELSE 'completado' END",
                'estado_texto' => "CASE WHEN r.estado = 'anulada' THEN 'Anulada' ELSE 'Completado' END",
                'descripcion' => 'r.notas',
                'origen' => 'COALESCE(c_salida.nombre_cuenta, cl_salida.nombre_cliente, p_salida.nombre_proveedor)',
                'destino' => 'COALESCE(c_entrada.nombre_cuenta, cl_entrada.nombre_cliente, p_entrada.nombre_proveedor)',
                'monto' => 'r.entrada_monto',
                'moneda' => 'r.entrada_moneda',
                'salida_monto' => 'r.salida_monto',
                'salida_moneda' => 'r.salida_moneda',
                'mensajero_monto' => 'r.mensajero_monto',
                'mensajero_moneda' => 'r.mensajero_moneda',
            ]));
    }

    /** Ajuste manual de saldo de una cuenta: el monto es la diferencia (puede ser negativa). */
    private function subqueryAjustes()
    {
        return DB::table('ajustes_saldo_cuenta as a')
            ->leftJoin('cuentas as c', 'c.id', '=', 'a.cuenta_id')
            ->leftJoin('monedas as m', 'm.id', '=', 'c.moneda_id')
            ->selectRaw($this->columnas([
                'tipo' => "'Ajuste'",
                'id' => 'a.id',
                'fecha' => 'a.created_at',
                'user_id' => 'a.user_id',
                'estado' => "'completado'",
                'estado_texto' => "'Completado'",
                'descripcion' => 'a.motivo',
                'origen' => 'CAST(NULL AS CHAR(255))',
                'destino' => 'c.nombre_cuenta',
                'monto' => 'a.saldo_nuevo - a.saldo_anterior',
                'moneda' => 'm.codigo_moneda',
                'saldo_anterior' => 'a.saldo_anterior',
                'saldo_posterior' => 'a.saldo_nuevo',
            ]));
    }
}
