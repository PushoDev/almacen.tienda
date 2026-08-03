<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\MovimientoFinanciero;
use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RastreoOperacionesController extends Controller
{
    /**
     * Reporte de Rastreo de Operaciones (Auditoría General).
     *
     * En construcción por fases (ver docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md):
     * Venta (fila colapsable, mismo nivel de detalle que VentaController::show()) y
     * Gasto/Ingreso (fila simple, sin expandir) ya están. Transferencia, Cierres y
     * Compras se agregan en fases siguientes.
     */
    public function __invoke(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $puedeVerCosto = in_array($request->user()->role, ['admin', 'moderador']);

        // Paginar Venta/Gasto/Ingreso ya combinados y ordenados por fecha real (no "25 de
        // cada uno" por separado). fromSub() ancla los bindings del subquery al bucket 'from',
        // que compila antes que cualquier where/orderBy de la query externa — evita el bug
        // de orden de bindings ya visto con mergeBindings()+UNION (ver bug B9 en Cuentas).
        $ventasSub = DB::table('ventas')
            ->select('id', 'created_at as fecha', DB::raw("'Venta' as tipo"))
            ->when($request->filled('start_date'), fn ($q) => $q->whereDate('created_at', '>=', $request->input('start_date')))
            ->when($request->filled('end_date'), fn ($q) => $q->whereDate('created_at', '<=', $request->input('end_date')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->input('user_id')));

        // El nombre de tipos_movimiento_financiero.nombre es texto libre editable (en la
        // BD de este cliente, el id 2 está guardado como "Ingreso por Venta", aunque
        // IngresoController no tiene nada que ver con ventas) — no es confiable para
        // mostrar. Usamos la etiqueta fija por tipo_movimiento_id que ya es la convención
        // del código (1=Gasto/2=Ingreso/3=Transferencia, ver GastoController/IngresoController/
        // TransferenciaController) en vez de confiar en ese campo.
        $gastosSub = DB::table('movimientos_financieros as mf')
            ->where('mf.tipo_movimiento_id', 1)
            ->select('mf.id', 'mf.fecha_operacion as fecha', DB::raw("'Gasto' as tipo"))
            ->when($request->filled('start_date'), fn ($q) => $q->whereDate('mf.fecha_operacion', '>=', $request->input('start_date')))
            ->when($request->filled('end_date'), fn ($q) => $q->whereDate('mf.fecha_operacion', '<=', $request->input('end_date')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('mf.user_id', $request->input('user_id')));

        $ingresosSub = DB::table('movimientos_financieros as mf')
            ->where('mf.tipo_movimiento_id', 2)
            ->select('mf.id', 'mf.fecha_operacion as fecha', DB::raw("'Ingreso' as tipo"))
            ->when($request->filled('start_date'), fn ($q) => $q->whereDate('mf.fecha_operacion', '>=', $request->input('start_date')))
            ->when($request->filled('end_date'), fn ($q) => $q->whereDate('mf.fecha_operacion', '<=', $request->input('end_date')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('mf.user_id', $request->input('user_id')));

        $pagina = DB::query()
            ->fromSub($ventasSub->unionAll($gastosSub)->unionAll($ingresosSub), 'operaciones_u')
            ->orderByDesc('fecha')
            ->paginate(25)
            ->withQueryString();

        $filas = collect($pagina->items());
        $ventaIds = $filas->where('tipo', 'Venta')->pluck('id')->all();
        $movimientoIds = $filas->where('tipo', '!=', 'Venta')->pluck('id')->all();

        $ventasPorId = Venta::with([
            'usuario',
            'almacen',
            'destinatario',
            'comisionCuenta',
            'gestorCuenta.moneda',
            'mensajeroCuenta.moneda',
            'mensajeroMoneda',
            'pagos.cuenta',
            'pagos.cliente',
            'pagos.moneda',
            'detalles.producto',
        ])->whereIn('id', $ventaIds)->get()->keyBy('id');

        $movimientosPorId = MovimientoFinanciero::with([
            'user',
            'cuentaOrigen',
            'cuentaDestino',
            'clienteOrigen',
            'clienteDestino',
            'proveedorDestino',
        ])->whereIn('id', $movimientoIds)->get()->keyBy('id');

        $operaciones = $filas->map(function ($fila) use ($ventasPorId, $movimientosPorId, $puedeVerCosto) {
            if ($fila->tipo === 'Venta') {
                return $this->transformarVenta($ventasPorId[$fila->id], $puedeVerCosto);
            }

            return $this->transformarMovimiento($movimientosPorId[$fila->id], $fila->tipo);
        })->values();

        $pagina->setCollection($operaciones);

        return Inertia::render('Reportes/Report/RastreoOperaciones', [
            'operaciones' => $pagina,
            'usuarios' => DB::table('users')->select('id', 'name')->get(),
            'filtros' => $request->except('page'),
            'puedeVerCosto' => $puedeVerCosto,
        ]);
    }

    private function transformarMovimiento(MovimientoFinanciero $mov, string $tipo): array
    {
        return [
            'id' => $mov->id,
            'fecha' => $mov->fecha_operacion,
            'tipo' => $tipo,
            'monto' => (float) $mov->monto,
            'moneda' => $mov->moneda,
            'usuario' => $mov->user?->name ?? '—',
            'user_id' => $mov->user_id,
            'referencia' => "{$tipo} #{$mov->id}",
            'descripcion' => $mov->descripcion,
            'detalle_venta' => null,
            'detalle_movimiento' => [
                'info_general' => [
                    'fecha' => $mov->fecha_operacion,
                    'estado' => $mov->estado,
                ],
                // Gasto solo llena origen, Ingreso solo destino — null si no aplica.
                // Diseñado para servir tal cual a Transferencia (llena ambos) más adelante.
                'origen' => $this->entidadMovimiento(
                    $mov->cuentaOrigen,
                    $mov->clienteOrigen,
                    null,
                    $mov->saldo_anterior_origen,
                    $mov->saldo_posterior_origen,
                    $mov->moneda_origen,
                ),
                'destino' => $this->entidadMovimiento(
                    $mov->cuentaDestino,
                    $mov->clienteDestino,
                    $mov->proveedorDestino,
                    $mov->saldo_anterior_destino,
                    $mov->saldo_posterior_destino,
                    $mov->moneda_destino,
                ),
            ],
        ];
    }

    private function entidadMovimiento($cuenta, $cliente, $proveedor, $saldoAnterior, $saldoPosterior, ?string $moneda): ?array
    {
        $nombre = $cuenta?->nombre_cuenta ?? $cliente?->nombre_cliente ?? $proveedor?->nombre_proveedor;
        if ($nombre === null) {
            return null;
        }

        return [
            'tipo' => $cuenta ? 'cuenta' : ($cliente ? 'cliente' : 'proveedor'),
            'nombre' => $nombre,
            'saldo_anterior' => $saldoAnterior !== null ? (float) $saldoAnterior : null,
            'saldo_posterior' => $saldoPosterior !== null ? (float) $saldoPosterior : null,
            'moneda' => $moneda,
        ];
    }

    private function transformarVenta(Venta $venta, bool $puedeVerCosto): array
    {
        $totalPagado = $venta->pagos->sum('monto_equivalente');
        $comisionCupCalculada = $venta->comision_tasa > 0
            ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
            : null;
        $gananciaAgencia = round($venta->detalles->sum(
            fn ($d) => (float) $d->ganancia - ((float) $d->comision_unitaria * $d->cantidad)
        ), 2);

        return [
            'id' => $venta->id,
            'fecha' => $venta->created_at,
            'tipo' => 'Venta',
            'monto' => (float) $venta->total,
            'moneda' => 'USD',
            'usuario' => $venta->usuario?->name ?? '—',
            'user_id' => $venta->user_id,
            'referencia' => "Venta #{$venta->id}",
            'descripcion' => $venta->estado,
            'detalle_venta' => [
                'info_general' => [
                    'fecha' => $venta->created_at,
                    'almacen' => $venta->almacen?->nombre_almacen,
                ],
                'receptor' => $venta->destinatario ? [
                    'nombre_completo' => trim($venta->destinatario->nombre . ' ' . $venta->destinatario->apellidos),
                    'carnet_identidad' => $venta->destinatario->carnet_identidad,
                    'telefono' => $venta->destinatario->telefono_contacto,
                    'direccion' => $venta->destinatario->direccion_residencia,
                ] : null,
                'comision_pv' => $venta->comision_cuenta_id ? [
                    'monto_usd' => (float) $venta->total_comision,
                    'tasa' => $venta->comision_tasa ? (float) $venta->comision_tasa : null,
                    'monto_cup' => $comisionCupCalculada,
                    'cuenta' => $venta->comisionCuenta?->nombre_cuenta,
                ] : null,
                // Independiente del XOR comisión PV/Gestor — una venta puede tener
                // mensajero + PV, mensajero + gestor, o mensajero solo.
                'mensajero' => $venta->mensajero_monto > 0 ? [
                    'tipo' => $venta->mensajero_tipo,
                    'monto_usd' => (float) $venta->mensajero_monto,
                    'tasa' => $venta->mensajero_tasa ? (float) $venta->mensajero_tasa : null,
                    'monto_cup' => $venta->mensajero_tasa > 0
                        ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
                        : null,
                    'monto_final_cup' => $venta->mensajero_monto_final_cup ? (float) $venta->mensajero_monto_final_cup : null,
                    'cuenta' => $venta->mensajeroCuenta?->nombre_cuenta,
                ] : null,
                // XOR con comisión PV — solo una de las dos se llena por venta (es_venta_gestor).
                'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
                    'monto' => (float) $venta->gestor_monto,
                    'monto_usd' => $venta->tasa_aplicada_gestor > 0
                        ? round((float) $venta->gestor_monto / (float) $venta->tasa_aplicada_gestor, 2)
                        : (float) $venta->gestor_monto,
                    'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
                    'moneda' => $venta->gestorCuenta?->moneda?->codigo_moneda,
                    'cuenta' => $venta->gestorCuenta?->nombre_cuenta,
                    'comentario' => $venta->gestor_comentario,
                ] : null,
                'pagos' => $venta->pagos->map(fn ($pago) => [
                    'metodo' => $pago->tipo_pago,
                    'moneda' => $pago->moneda?->codigo_moneda,
                    'monto_original' => (float) $pago->monto,
                    'equivalente_usd' => (float) $pago->monto_equivalente,
                    'tasa_cambio' => (float) $pago->tasa_cambio_aplicada,
                    'destino' => $pago->cuenta?->nombre_cuenta ?? $pago->cliente?->nombre_cliente ?? '—',
                    'via' => $pago->via_pago,
                ])->values(),
                'resumen_financiero' => [
                    'total_venta' => (float) $venta->total,
                    'total_pagado' => (float) $totalPagado,
                    'restante' => (float) $venta->total - (float) $totalPagado,
                    'ganancia_operacional' => (float) $venta->total_ganancia,
                    'comision_pv_usd' => (float) $venta->total_comision,
                    'comision_pv_cup' => $comisionCupCalculada,
                    'ganancia_agencia' => $gananciaAgencia,
                    'ganancia_perdida_cambiaria' => (float) $venta->ganancia_perdida_cambiaria,
                    'ganancia_real_total' => (float) $venta->ganancia_real_total,
                    'tasa_cambio_principal' => (float) $venta->tasa_cambio_principal,
                ],
                'productos' => $venta->detalles->map(fn ($d) => [
                    'producto' => $d->producto?->nombre_producto ?? 'Producto #' . $d->producto_id,
                    'imagen_url' => $d->producto?->imagen_url,
                    'cantidad' => (int) $d->cantidad,
                    'precio' => (float) $d->precio_venta,
                    'costo_unitario' => $puedeVerCosto ? (float) $d->costo_unitario : null,
                    'ganancia_unitaria' => $puedeVerCosto ? (float) $d->ganancia : null,
                    'comision_unitaria' => (float) $d->comision_unitaria,
                    'subtotal' => (float) $d->subtotal,
                ])->values(),
                'productos_footer' => [
                    'total_venta' => (float) $venta->total,
                    'ganancia_total' => $puedeVerCosto ? (float) $venta->total_ganancia : null,
                    'comision_vendedor' => (float) $venta->total_comision,
                    'ganancia_agencia' => $puedeVerCosto ? $gananciaAgencia : null,
                ],
            ],
            'detalle_movimiento' => null,
        ];
    }
}
