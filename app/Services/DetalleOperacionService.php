<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\MovimientoFinanciero;
use App\Models\Venta;

/**
 * Arma el detalle rico y colapsable de una operación (Venta, Compra, Movimiento
 * Financiero) — extraído de RastreoOperacionesController para poder reusarlo en
 * cualquier página que muestre historial de operaciones (Cuentas/Clientes/Proveedores
 * Show) sin duplicar esta lógica en cada controller. El shape que devuelve cada método
 * coincide exactamente con las interfaces TS en resources/js/components/detalle-operacion.tsx.
 */
class DetalleOperacionService
{
    /**
     * @return array{tipo: string, nombre: string, saldo_anterior: float|null, saldo_posterior: float|null, moneda: string|null}|null
     */
    public function entidadMovimiento($cuenta, $cliente, $proveedor, $saldoAnterior, $saldoPosterior, ?string $moneda): ?array
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

    /**
     * Shape de `detalle_movimiento` (Gasto/Ingreso/Transferencia).
     */
    public function detalleMovimiento(MovimientoFinanciero $mov): array
    {
        // Transferencia es el único de los 3 que puede cambiar de moneda origen -> destino
        // (ej. CUP -> USD). Gasto/Ingreso son de un solo lado y una sola moneda, siempre 1.0.
        $hayConversion = $mov->moneda_origen && $mov->moneda_destino && $mov->moneda_origen !== $mov->moneda_destino;

        return [
            'info_general' => [
                'fecha' => $mov->fecha_operacion,
                'estado' => $mov->estado,
                'tasa_cambio_aplicada' => $hayConversion ? (float) $mov->tasa_cambio_aplicada : null,
                // Cuánto llegó realmente al destino en su propia moneda (ej. 78000 CUP
                // salen del origen, pero al destino en USD llegan 111.43) — se deriva del
                // delta de saldo del destino, no hace falta recalcular la conversión.
                // Null salvo que haya conversión real: en Gasto/Ingreso equivaldría siempre
                // a 'monto' (misma moneda), así que no aporta mostrarlo de nuevo.
                'monto_destino' => ($hayConversion && $mov->saldo_anterior_destino !== null && $mov->saldo_posterior_destino !== null)
                    ? round((float) $mov->saldo_posterior_destino - (float) $mov->saldo_anterior_destino, 2)
                    : null,
            ],
            // Gasto solo llena origen, Ingreso solo destino, Transferencia llena ambos.
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
        ];
    }

    /**
     * Shape de `detalle_venta`. Requiere `$venta` con `pagos`, `detalles.producto`,
     * `destinatario`, `almacen`, `comisionCuenta.moneda`, `gestorCuenta.moneda`,
     * `mensajeroCuenta` cargados — no hace eager loading acá, cada caller decide qué
     * cargar según lo que ya tenga a mano.
     */
    public function detalleVenta(Venta $venta, bool $puedeVerCosto): array
    {
        $totalPagado = $venta->pagos->sum('monto_equivalente');
        $comisionCupCalculada = $venta->comision_tasa > 0
            ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
            : null;
        $gananciaAgencia = round($venta->detalles->sum(
            fn ($d) => (float) $d->ganancia - ((float) $d->comision_unitaria * $d->cantidad)
        ), 2);

        // Saldo antes/después de cada "pata" de la venta que aprobarVenta() tocó — mismo
        // shape que ya usa entidadMovimiento() para Gasto/Ingreso/Transferencia, con una
        // etiqueta extra porque acá pueden ser hasta 5 entidades en vez de solo origen/destino.
        // Ventas viejas (antes de esta función) tienen saldo_anterior null — se omiten en vez
        // de mostrar una tarjeta vacía.
        $movimientosSaldo = [];
        foreach ($venta->pagos as $i => $pago) {
            if ($pago->saldo_anterior === null) {
                continue;
            }
            $movimientosSaldo[] = [
                'etiqueta' => 'Pago '.($i + 1),
                'tipo' => $pago->cuenta_id ? 'cuenta' : 'cliente',
                'nombre' => $pago->cuenta?->nombre_cuenta ?? $pago->cliente?->nombre_cliente ?? '—',
                'saldo_anterior' => (float) $pago->saldo_anterior,
                'saldo_posterior' => (float) $pago->saldo_posterior,
                'moneda' => $pago->cuenta_id ? ($pago->moneda?->codigo_moneda ?? null) : 'USD',
            ];
        }
        if ($venta->comision_saldo_anterior !== null) {
            $movimientosSaldo[] = [
                'etiqueta' => 'Comisión PV',
                'tipo' => 'cuenta',
                'nombre' => $venta->comisionCuenta?->nombre_cuenta ?? '—',
                'saldo_anterior' => (float) $venta->comision_saldo_anterior,
                'saldo_posterior' => (float) $venta->comision_saldo_posterior,
                'moneda' => $venta->comisionCuenta?->moneda?->codigo_moneda ?? 'CUP',
            ];
        }
        if ($venta->gestor_saldo_anterior !== null) {
            $movimientosSaldo[] = [
                'etiqueta' => 'Gestor',
                'tipo' => 'cuenta',
                'nombre' => $venta->gestorCuenta?->nombre_cuenta ?? '—',
                'saldo_anterior' => (float) $venta->gestor_saldo_anterior,
                'saldo_posterior' => (float) $venta->gestor_saldo_posterior,
                'moneda' => $venta->gestorCuenta?->moneda?->codigo_moneda ?? 'CUP',
            ];
        }
        if ($venta->mensajero_saldo_anterior !== null) {
            $movimientosSaldo[] = [
                'etiqueta' => 'Mensajero',
                'tipo' => 'cuenta',
                'nombre' => $venta->mensajeroCuenta?->nombre_cuenta ?? '—',
                'saldo_anterior' => (float) $venta->mensajero_saldo_anterior,
                'saldo_posterior' => (float) $venta->mensajero_saldo_posterior,
                'moneda' => $venta->mensajeroCuenta?->moneda?->codigo_moneda ?? 'CUP',
            ];
        }

        return [
            'info_general' => [
                'fecha' => $venta->created_at,
                'almacen' => $venta->almacen?->nombre_almacen,
            ],
            // Solo presente cuando la venta terminó anulada — motivo es obligatorio en
            // anularVenta(), detalle es opcional (ver VentaController::anularVenta()).
            'anulacion' => $venta->estado === 'cancelada' ? [
                'motivo' => $venta->motivo_anulacion,
                'detalle' => $venta->detalle_anulacion,
            ] : null,
            'receptor' => $venta->destinatario ? [
                'nombre_completo' => trim($venta->destinatario->nombre.' '.$venta->destinatario->apellidos),
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
                // Mismo gate que ya aplica productos_footer a estos mismos valores —
                // antes se filtraban por producto pero se mandaban sin filtrar acá,
                // dejando ver el margen agregado a roles sin puedeVerCosto.
                'ganancia_operacional' => $puedeVerCosto ? (float) $venta->total_ganancia : null,
                'comision_pv_usd' => (float) $venta->total_comision,
                'comision_pv_cup' => $comisionCupCalculada,
                'ganancia_agencia' => $puedeVerCosto ? $gananciaAgencia : null,
                'ganancia_perdida_cambiaria' => $puedeVerCosto ? (float) $venta->ganancia_perdida_cambiaria : null,
                'ganancia_real_total' => $puedeVerCosto ? (float) $venta->ganancia_real_total : null,
                'tasa_cambio_principal' => (float) $venta->tasa_cambio_principal,
            ],
            'productos' => $venta->detalles->map(fn ($d) => [
                'producto' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                'imagen_url' => $d->producto?->imagen_url,
                'marca' => $d->producto?->marca_producto,
                'modelo' => $d->producto?->modelo_producto,
                'capacidad' => $d->producto?->capacidad_producto,
                'color' => $d->producto?->color_producto,
                'codigo' => $d->producto?->codigo_producto,
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
            'movimientos_saldo' => $movimientosSaldo,
        ];
    }

    /**
     * Shape de `detalle_compra`. Requiere `$compra` con `proveedor`, `cliente`,
     * `pagos.cuenta`, `pagos.cliente`, `productos` cargados.
     *
     * Compra no tiene ni el patrón "pagos con tasa/conversión" de Venta ni el patrón
     * "origen/destino único" de movimiento — es su propia forma: un proveedor/cliente que
     * recibe el pago, uno o varios métodos de pago (compra_pago) que salieron del sistema
     * (o ninguno, si es deuda_proveedor), y una lista de productos comprados. No hay
     * costo/ganancia que calcular acá — la compra ES el costo.
     */
    public function detalleCompra(Compra $compra): array
    {
        // Mismo criterio que en detalleVenta(): receptor (proveedor o cliente que recibió
        // el pago) + cada fila de compra_pago con cuenta/cliente real (se omite la fila
        // 'deuda_proveedor', esa no mueve el saldo de ninguna cuenta/cliente que pagó — el
        // saldo del receptor ya se cubre aparte arriba). Compras viejas tienen saldo_anterior
        // null — se omiten en vez de mostrar una tarjeta vacía.
        $movimientosSaldo = [];
        if ($compra->receptor_saldo_anterior !== null) {
            $movimientosSaldo[] = [
                'etiqueta' => 'Receptor',
                'tipo' => $compra->proveedor_id ? 'proveedor' : 'cliente',
                'nombre' => $compra->proveedor?->nombre_proveedor ?? $compra->cliente?->nombre_cliente ?? '—',
                'saldo_anterior' => (float) $compra->receptor_saldo_anterior,
                'saldo_posterior' => (float) $compra->receptor_saldo_posterior,
                'moneda' => 'USD',
            ];
        }
        foreach ($compra->pagos as $i => $pago) {
            if ($pago->saldo_anterior === null) {
                continue;
            }
            $movimientosSaldo[] = [
                'etiqueta' => 'Pago '.($i + 1),
                'tipo' => $pago->cuenta_id ? 'cuenta' : 'cliente',
                'nombre' => $pago->cuenta?->nombre_cuenta ?? $pago->cliente?->nombre_cliente ?? '—',
                'saldo_anterior' => (float) $pago->saldo_anterior,
                'saldo_posterior' => (float) $pago->saldo_posterior,
                'moneda' => 'USD',
            ];
        }

        return [
            'info_general' => [
                'fecha' => $compra->fecha_compra,
                'tipo_compra' => $compra->tipo_compra,
                'es_parcial' => $compra->es_parcial,
            ],
            // Quién recibió el pago — siempre uno solo (proveedor O cliente-proveedor),
            // a diferencia de "pagos" abajo que sí puede ser múltiple (varias cuentas).
            'proveedor' => $compra->proveedor?->nombre_proveedor,
            'cliente' => $compra->cliente?->nombre_cliente,
            // Vacío en deuda_proveedor (no sale dinero de ninguna cuenta); una o varias
            // cuentas/clientes en pago_cash — mismo caso de "varios orígenes en una sola
            // operación" que ya resolvimos para venta.pagos, aplicado acá al lado que sale.
            'pagos' => $compra->pagos->map(fn ($pago) => [
                'tipo_pago' => $pago->tipo_pago,
                'monto' => (float) $pago->monto,
                'origen' => $pago->cuenta?->nombre_cuenta ?? $pago->cliente?->nombre_cliente ?? '—',
            ])->values(),
            'productos' => $compra->productos->map(fn ($p) => [
                'producto' => $p->nombre_producto,
                'imagen_url' => $p->imagen_url,
                'marca' => $p->marca_producto,
                'modelo' => $p->modelo_producto,
                'capacidad' => $p->capacidad_producto,
                'color' => $p->color_producto,
                'codigo' => $p->codigo_producto,
                'cantidad' => (int) $p->pivot->cantidad,
                'precio' => (float) $p->pivot->precio,
                'subtotal' => round((float) $p->pivot->cantidad * (float) $p->pivot->precio, 2),
            ])->values(),
            'movimientos_saldo' => $movimientosSaldo,
        ];
    }
}
