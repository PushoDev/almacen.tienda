<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Compra;
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
     * Venta, Gasto, Ingreso y Transferencia (todas fila colapsable) ya están.
     * Cierres y Compras se agregan en fases siguientes.
     */
    public function __invoke(Request $request)
    {
        $request->validate([
            'fecha' => 'nullable|date',
            'user_id' => 'nullable|exists:users,id',
            'tipo' => 'nullable|in:Venta,Gasto,Ingreso,Transferencia,Compra',
            'buscar' => 'nullable|string|max:255',
        ]);

        $puedeVerCosto = in_array($request->user()->role, ['admin', 'moderador']);
        $buscar = $request->input('buscar');

        // Vendedor solo ve sus propias operaciones — mismo patrón ya usado en
        // TransaccionController/ReporteController (role === 'vendedor' fuerza el scope a su
        // propio user_id, ignorando cualquier user_id que venga por query string). Admin y
        // moderador (los mismos roles que ya pueden ver costo/ganancia) siguen viendo todo,
        // con el filtro de usuario opcional de siempre.
        $userIdFiltro = $puedeVerCosto ? $request->input('user_id') : $request->user()->id;

        // Paginar Venta/Gasto/Ingreso/Transferencia ya combinados y ordenados por fecha real
        // (no "25 de cada uno" por separado). fromSub() ancla los bindings del subquery al
        // bucket 'from', que compila antes que cualquier where/orderBy de la query externa —
        // evita el bug de orden de bindings ya visto con mergeBindings()+UNION (ver bug B9 en
        // Cuentas). El ->where('tipo', ...) de más abajo se aplica sobre la query externa ya
        // resuelta por fromSub(), no reintroduce ese patrón.
        $ventasSub = DB::table('ventas')
            ->leftJoin('users', 'users.id', '=', 'ventas.user_id')
            ->leftJoin('destinatarios_venta', 'destinatarios_venta.venta_id', '=', 'ventas.id')
            ->select('ventas.id', 'ventas.created_at as fecha', DB::raw("'Venta' as tipo"))
            ->when($request->filled('fecha'), fn ($q) => $q->whereDate('ventas.created_at', $request->input('fecha')))
            ->when($userIdFiltro, fn ($q) => $q->where('ventas.user_id', $userIdFiltro))
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar) {
                $qq->where('users.name', 'like', "%{$buscar}%")
                    ->orWhere('destinatarios_venta.nombre', 'like', "%{$buscar}%")
                    ->orWhere('destinatarios_venta.apellidos', 'like', "%{$buscar}%")
                    ->orWhere('ventas.estado', 'like', "%{$buscar}%");
            }));

        // El nombre de tipos_movimiento_financiero.nombre es texto libre editable (en la
        // BD de este cliente, el id 2 está guardado como "Ingreso por Venta", aunque
        // IngresoController no tiene nada que ver con ventas) — no es confiable para
        // mostrar. Usamos la etiqueta fija por tipo_movimiento_id que ya es la convención
        // del código (1=Gasto/2=Ingreso/3=Transferencia, ver GastoController/IngresoController/
        // TransferenciaController) en vez de confiar en ese campo.
        $gastosSub = $this->construirSubqueryMovimiento($request, 1, 'Gasto', $buscar, $userIdFiltro);
        $ingresosSub = $this->construirSubqueryMovimiento($request, 2, 'Ingreso', $buscar, $userIdFiltro);
        $transferenciasSub = $this->construirSubqueryMovimiento($request, 3, 'Transferencia', $buscar, $userIdFiltro);

        // Compra es admin/moderador-only dentro de este reporte (mismo criterio que ya
        // aplica Cuentas/Show para ocultar Compras a vendedor — es dato de costo). A
        // diferencia de los otros 4 tipos, no se puede acotar "solo lo mío" para vendedor
        // sin este gate: compras.user_id recién existe desde 2026-08-06 (ver migración
        // add_user_id_to_compras_table) y, aunque existiera, vendedor no debería ver costos
        // de compra en absoluto. Por eso el subquery ni se arma cuando !$puedeVerCosto —
        // así ?tipo=Compra por URL directa devuelve vacío en vez de filtrar nada.
        $comprasSub = $puedeVerCosto ? $this->construirSubqueryCompra($request, $buscar, $userIdFiltro) : null;

        // Conteo por tipo para los widgets sobre el filtro — respeta fecha/usuario/buscar
        // pero NO el filtro de tipo (si no, al filtrar por "Venta" los otros 3 se irían a
        // cero y dejarían de servir como resumen). Clonamos cada subquery ANTES de
        // consumirla en unionAll() de más abajo. distinct() + contar el id evita inflar el
        // conteo por los leftJoin (ej. destinatarios_venta no tiene unique en venta_id).
        $conteoPorTipo = [
            'Venta' => (clone $ventasSub)->distinct()->count('ventas.id'),
            'Gasto' => (clone $gastosSub)->distinct()->count('mf.id'),
            'Ingreso' => (clone $ingresosSub)->distinct()->count('mf.id'),
            'Transferencia' => (clone $transferenciasSub)->distinct()->count('mf.id'),
        ];
        if ($comprasSub) {
            $conteoPorTipo['Compra'] = (clone $comprasSub)->distinct()->count('compras.id');
        }

        $unionQuery = $ventasSub->unionAll($gastosSub)->unionAll($ingresosSub)->unionAll($transferenciasSub);
        if ($comprasSub) {
            $unionQuery->unionAll($comprasSub);
        }

        $pagina = DB::query()
            ->fromSub($unionQuery, 'operaciones_u')
            ->when($request->filled('tipo'), fn ($q) => $q->where('tipo', $request->input('tipo')))
            ->orderByDesc('fecha')
            ->paginate(25)
            ->withQueryString();

        $filas = collect($pagina->items());
        $ventaIds = $filas->where('tipo', 'Venta')->pluck('id')->all();
        $compraIds = $filas->where('tipo', 'Compra')->pluck('id')->all();
        $movimientoIds = $filas->whereNotIn('tipo', ['Venta', 'Compra'])->pluck('id')->all();

        $ventasPorId = Venta::with([
            'usuario',
            'almacen',
            'destinatario',
            'comisionCuenta',
            'gestorCuenta.moneda',
            'mensajeroCuenta',
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

        $comprasPorId = Compra::with([
            'usuario',
            'proveedor',
            'cliente',
            'productos',
            'pagos.cuenta',
            'pagos.cliente',
        ])->whereIn('id', $compraIds)->get()->keyBy('id');

        $operaciones = $filas->map(function ($fila) use ($ventasPorId, $movimientosPorId, $comprasPorId, $puedeVerCosto) {
            if ($fila->tipo === 'Venta') {
                return $this->transformarVenta($ventasPorId[$fila->id], $puedeVerCosto);
            }

            if ($fila->tipo === 'Compra') {
                return $this->transformarCompra($comprasPorId[$fila->id]);
            }

            return $this->transformarMovimiento($movimientosPorId[$fila->id], $fila->tipo);
        })->values();

        $pagina->setCollection($operaciones);

        return Inertia::render('Reportes/Report/RastreoOperaciones', [
            'operaciones' => $pagina,
            // Vendedor no puede filtrar por usuario (siempre ve solo lo suyo), así que
            // tampoco hace falta mandarle la lista completa de nombres del sistema.
            'usuarios' => $puedeVerCosto ? DB::table('users')->select('id', 'name')->get() : [],
            'filtros' => $request->except('page'),
            'puedeVerCosto' => $puedeVerCosto,
            'conteoPorTipo' => $conteoPorTipo,
        ]);
    }

    /**
     * Subquery de movimientos_financieros para un tipo_movimiento_id dado, con los joins
     * necesarios para que 'buscar' pueda coincidir con la cuenta/cliente/proveedor origen o
     * destino, además de descripción/usuario. Gasto/Ingreso/Transferencia comparten esta
     * misma forma — solo cambia el id de tipo y la etiqueta fija.
     */
    private function construirSubqueryMovimiento(Request $request, int $tipoMovimientoId, string $etiqueta, ?string $buscar, $userIdFiltro)
    {
        return DB::table('movimientos_financieros as mf')
            ->leftJoin('users', 'users.id', '=', 'mf.user_id')
            ->leftJoin('cuentas as cuenta_origen', 'cuenta_origen.id', '=', 'mf.cuenta_origen_id')
            ->leftJoin('cuentas as cuenta_destino', 'cuenta_destino.id', '=', 'mf.cuenta_destino_id')
            ->leftJoin('clientes as cliente_origen', 'cliente_origen.id', '=', 'mf.cliente_origen_id')
            ->leftJoin('clientes as cliente_destino', 'cliente_destino.id', '=', 'mf.cliente_destino_id')
            ->leftJoin('proveedors as proveedor_destino', 'proveedor_destino.id', '=', 'mf.proveedor_destino_id')
            ->where('mf.tipo_movimiento_id', $tipoMovimientoId)
            ->select('mf.id', 'mf.fecha_operacion as fecha', DB::raw("'{$etiqueta}' as tipo"))
            ->when($request->filled('fecha'), fn ($q) => $q->whereDate('mf.fecha_operacion', $request->input('fecha')))
            ->when($userIdFiltro, fn ($q) => $q->where('mf.user_id', $userIdFiltro))
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar) {
                $qq->where('mf.descripcion', 'like', "%{$buscar}%")
                    ->orWhere('users.name', 'like', "%{$buscar}%")
                    ->orWhere('cuenta_origen.nombre_cuenta', 'like', "%{$buscar}%")
                    ->orWhere('cuenta_destino.nombre_cuenta', 'like', "%{$buscar}%")
                    ->orWhere('cliente_origen.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('cliente_destino.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('proveedor_destino.nombre_proveedor', 'like', "%{$buscar}%");
            }));
    }

    /**
     * Subquery de compras — solo se invoca cuando $puedeVerCosto (ver comentario en __invoke).
     * A diferencia de movimientos_financieros, compras.tipo_compra no distingue "Gasto vs
     * Ingreso vs Transferencia" — todas las compras son un único tipo 'Compra', así que no
     * hace falta el patrón de un tipo_movimiento_id por llamada.
     */
    private function construirSubqueryCompra(Request $request, ?string $buscar, $userIdFiltro)
    {
        return DB::table('compras')
            ->leftJoin('proveedors', 'proveedors.id', '=', 'compras.proveedor_id')
            ->leftJoin('clientes', 'clientes.id', '=', 'compras.cliente_id')
            ->select('compras.id', 'compras.fecha_compra as fecha', DB::raw("'Compra' as tipo"))
            ->when($request->filled('fecha'), fn ($q) => $q->whereDate('compras.fecha_compra', $request->input('fecha')))
            ->when($userIdFiltro, fn ($q) => $q->where('compras.user_id', $userIdFiltro))
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar) {
                $qq->where('proveedors.nombre_proveedor', 'like', "%{$buscar}%")
                    ->orWhere('clientes.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('compras.tipo_compra', 'like', "%{$buscar}%");
            }));
    }

    private function transformarMovimiento(MovimientoFinanciero $mov, string $tipo): array
    {
        // Transferencia es el único de los 3 que puede cambiar de moneda origen -> destino
        // (ej. CUP -> USD). Gasto/Ingreso son de un solo lado y una sola moneda, siempre 1.0.
        $hayConversion = $mov->moneda_origen && $mov->moneda_destino && $mov->moneda_origen !== $mov->moneda_destino;

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
            'detalle_compra' => null,
            'detalle_movimiento' => [
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
                    'producto' => $d->producto?->nombre_producto ?? 'Producto #' . $d->producto_id,
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
            ],
            'detalle_movimiento' => null,
        ];
    }

    /**
     * Compra no tiene ni el patrón "pagos con tasa/conversión" de Venta ni el patrón
     * "origen/destino único" de movimiento — es su propia forma: un proveedor/cliente que
     * recibe el pago, uno o varios métodos de pago (compra_pago) que salieron del sistema
     * (o ninguno, si es deuda_proveedor), y una lista de productos comprados. No hay
     * costo/ganancia que calcular acá — la compra ES el costo.
     */
    private function transformarCompra(Compra $compra): array
    {
        return [
            'id' => $compra->id,
            'fecha' => $compra->fecha_compra,
            'tipo' => 'Compra',
            'monto' => (float) $compra->total_compra,
            'moneda' => 'USD',
            // Nullable: compras registradas antes de 2026-08-06 no capturaron quién las hizo
            // (ver migración add_user_id_to_compras_table) — no hay forma de recuperar ese dato.
            'usuario' => $compra->usuario?->name ?? '—',
            'user_id' => $compra->user_id,
            'referencia' => "Compra #{$compra->id}",
            // compras no tiene columna de descripción/estado propia — el tipo de compra
            // (deuda_proveedor | pago_cash) es el dato más cercano a "detalle" disponible.
            'descripcion' => $compra->tipo_compra === 'deuda_proveedor' ? 'Deuda con proveedor' : 'Pago al contado',
            'detalle_venta' => null,
            'detalle_movimiento' => null,
            'detalle_compra' => [
                'info_general' => [
                    'fecha' => $compra->fecha_compra,
                    'tipo_compra' => $compra->tipo_compra,
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
            ],
        ];
    }
}
