<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
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
     * por ahora solo muestra Ventas (fila colapsable con el mismo nivel de detalle que
     * VentaController::show() — receptor, comisión PV, pagos, resumen financiero y productos).
     * Gasto/Ingreso/Transferencia, Cierres y Compras se agregan en fases siguientes.
     */
    public function __invoke(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $puedeVerCosto = in_array($request->user()->role, ['admin', 'moderador']);

        $query = Venta::with([
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
        ]);

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->input('start_date'));
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->input('end_date'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        $ventas = $query->orderByDesc('created_at')->paginate(25)->withQueryString();

        $ventas->getCollection()->transform(function (Venta $venta) use ($puedeVerCosto) {
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
            ];
        });

        return Inertia::render('Reportes/Report/RastreoOperaciones', [
            'operaciones' => $ventas,
            'usuarios' => DB::table('users')->select('id', 'name')->get(),
            'filtros' => $request->except('page'),
            'puedeVerCosto' => $puedeVerCosto,
        ]);
    }
}
