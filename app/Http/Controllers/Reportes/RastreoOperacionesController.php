<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\AjusteSaldoCuenta;
use App\Models\Compra;
use App\Models\MovimientoFinanciero;
use App\Models\Venta;
use App\Services\DetalleOperacionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RastreoOperacionesController extends Controller
{
    public function __construct(private DetalleOperacionService $detalleOperacionService) {}

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
            'tipo' => 'nullable|in:Venta,Gasto,Ingreso,Transferencia,Compra,Ajuste',
            'buscar' => 'nullable|string|max:255',
            'cliente_ids' => 'nullable|array',
            'cliente_ids.*' => 'integer|exists:clientes,id',
            'proveedor_ids' => 'nullable|array',
            'proveedor_ids.*' => 'integer|exists:proveedors,id',
            'cuenta_ids' => 'nullable|array',
            'cuenta_ids.*' => 'integer|exists:cuentas,id',
            'cliente_direccion' => 'nullable|in:envia,recibe,cualquiera',
            'proveedor_direccion' => 'nullable|in:envia,recibe,cualquiera',
            'cuenta_direccion' => 'nullable|in:envia,recibe,cualquiera',
        ]);

        $puedeVerCosto = in_array($request->user()->role, ['admin', 'moderador']);
        $buscar = $request->input('buscar');
        // "34" debe encontrar "Venta #34" sin que el usuario tenga que saber de antemano
        // qué tipo es — match exacto por id, además del texto libre de siempre. ctype_digit
        // en vez de is_numeric: un id nunca tiene signo/decimales, y "34" no debería
        // interpretarse como floats/notación científica.
        $buscarId = ($buscar !== null && ctype_digit($buscar)) ? (int) $buscar : null;
        $clienteIds = $request->input('cliente_ids', []);
        $proveedorIds = $request->input('proveedor_ids', []);
        $cuentaIds = $request->input('cuenta_ids', []);
        // Dirección de cada filtro — "cualquiera" (default) es el comportamiento de antes
        // (coincide en cualquier lado). "envia"/"recibe" acotan a un solo lado de la
        // operación: quién mandó el dinero vs. quién lo recibió, mismo concepto que ya
        // distinguen las columnas "Cuenta Envía" / "Cuenta que Recibe" de la tabla.
        $clienteDireccion = $request->input('cliente_direccion', 'cualquiera');
        $proveedorDireccion = $request->input('proveedor_direccion', 'cualquiera');
        $cuentaDireccion = $request->input('cuenta_direccion', 'cualquiera');

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
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar, $buscarId) {
                $qq->where('users.name', 'like', "%{$buscar}%")
                    ->orWhere('destinatarios_venta.nombre', 'like', "%{$buscar}%")
                    ->orWhere('destinatarios_venta.apellidos', 'like', "%{$buscar}%")
                    ->orWhere('ventas.estado', 'like', "%{$buscar}%")
                    ->when($buscarId, fn ($q2) => $q2->orWhere('ventas.id', $buscarId));
            }))
            // Cliente: la venta puede tener su propio cliente_id (ventas.cliente_id) y/o
            // clientes distintos por cada pago (pago_ventas.cliente_id, cuando un pago se
            // cobra contra la deuda de un cliente en vez de una cuenta) — cualquiera de los
            // dos cuenta como "esta venta involucra a este cliente". whereExists en vez de
            // join para no duplicar filas cuando una venta tiene varios pagos. En Venta el
            // cliente SIEMPRE está del lado "recibe" (recibe el pago/cobro de la venta) — no
            // existe un cliente "envía" acá, así que direccion=envia da cero resultados.
            ->when($clienteIds, function ($q) use ($clienteIds, $clienteDireccion) {
                if ($clienteDireccion === 'envia') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->where(function ($qq) use ($clienteIds) {
                    $qq->whereIn('ventas.cliente_id', $clienteIds)
                        ->orWhereExists(function ($sub) use ($clienteIds) {
                            $sub->select(DB::raw(1))
                                ->from('pago_ventas')
                                ->whereColumn('pago_ventas.venta_id', 'ventas.id')
                                ->whereIn('pago_ventas.cliente_id', $clienteIds);
                        });
                });
            })
            // Cuenta: solo vive en pago_ventas (una venta no tiene cuenta propia, solo la de
            // cada pago) — puede haber varias cuentas en una sola venta, igual que clientes.
            // Mismo caso que Cliente: la cuenta de una venta siempre "recibe" el cobro, nunca
            // "envía" (Venta no tiene lado que sale, ver columna Cuenta Envía siempre en '—').
            ->when($cuentaIds, function ($q) use ($cuentaIds, $cuentaDireccion) {
                if ($cuentaDireccion === 'envia') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->whereExists(function ($sub) use ($cuentaIds) {
                    $sub->select(DB::raw(1))
                        ->from('pago_ventas')
                        ->whereColumn('pago_ventas.venta_id', 'ventas.id')
                        ->whereIn('pago_ventas.cuenta_id', $cuentaIds);
                });
            })
            // Venta nunca involucra un proveedor — si el filtro está activo, ninguna venta
            // puede calificar (no "no aplicar el filtro", sino "cero resultados de este tipo"),
            // sin importar la dirección elegida.
            ->when($proveedorIds, fn ($q) => $q->whereRaw('1 = 0'));

        // El nombre de tipos_movimiento_financiero.nombre es texto libre editable (en la
        // BD de este cliente, el id 2 está guardado como "Ingreso por Venta", aunque
        // IngresoController no tiene nada que ver con ventas) — no es confiable para
        // mostrar. Usamos la etiqueta fija por tipo_movimiento_id que ya es la convención
        // del código (1=Gasto/2=Ingreso/3=Transferencia, ver GastoController/IngresoController/
        // TransferenciaController) en vez de confiar en ese campo.
        $gastosSub = $this->construirSubqueryMovimiento($request, 1, 'Gasto', $buscar, $buscarId, $userIdFiltro, $clienteIds, $proveedorIds, $cuentaIds, $clienteDireccion, $proveedorDireccion, $cuentaDireccion);
        $ingresosSub = $this->construirSubqueryMovimiento($request, 2, 'Ingreso', $buscar, $buscarId, $userIdFiltro, $clienteIds, $proveedorIds, $cuentaIds, $clienteDireccion, $proveedorDireccion, $cuentaDireccion);
        $transferenciasSub = $this->construirSubqueryMovimiento($request, 3, 'Transferencia', $buscar, $buscarId, $userIdFiltro, $clienteIds, $proveedorIds, $cuentaIds, $clienteDireccion, $proveedorDireccion, $cuentaDireccion);

        // Compra es admin/moderador-only dentro de este reporte (mismo criterio que ya
        // aplica Cuentas/Show para ocultar Compras a vendedor — es dato de costo). A
        // diferencia de los otros 4 tipos, no se puede acotar "solo lo mío" para vendedor
        // sin este gate: compras.user_id recién existe desde 2026-08-06 (ver migración
        // add_user_id_to_compras_table) y, aunque existiera, vendedor no debería ver costos
        // de compra en absoluto. Por eso el subquery ni se arma cuando !$puedeVerCosto —
        // así ?tipo=Compra por URL directa devuelve vacío en vez de filtrar nada.
        $comprasSub = $puedeVerCosto ? $this->construirSubqueryCompra($request, $buscar, $buscarId, $userIdFiltro, $clienteIds, $proveedorIds, $cuentaIds, $clienteDireccion, $proveedorDireccion, $cuentaDireccion) : null;

        // Ajuste manual de saldo — solo toca Cuentas, nunca Cliente/Proveedor (ver
        // construirSubqueryAjuste). Disponible para todos los roles, igual que Gasto/
        // Ingreso/Transferencia: no es dato de costo como Compra, y el userIdFiltro de
        // vendedor ya lo deja vacío en la práctica (los ajustes los hace admin/moderador).
        $ajustesSub = $this->construirSubqueryAjuste($request, $buscar, $buscarId, $userIdFiltro, $clienteIds, $proveedorIds, $cuentaIds, $cuentaDireccion);

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
            'Ajuste' => (clone $ajustesSub)->distinct()->count('a.id'),
        ];
        if ($comprasSub) {
            $conteoPorTipo['Compra'] = (clone $comprasSub)->distinct()->count('compras.id');
        }

        $unionQuery = $ventasSub->unionAll($gastosSub)->unionAll($ingresosSub)->unionAll($transferenciasSub)->unionAll($ajustesSub);
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
        $ajusteIds = $filas->where('tipo', 'Ajuste')->pluck('id')->all();
        $movimientoIds = $filas->whereNotIn('tipo', ['Venta', 'Compra', 'Ajuste'])->pluck('id')->all();

        $ventasPorId = Venta::with([
            'usuario',
            'turnoVendedor',
            'almacen',
            'destinatario',
            'comisionCuenta.moneda',
            'gestorCuenta.moneda',
            'mensajeroCuenta.moneda',
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

        $ajustesPorId = AjusteSaldoCuenta::with(['user', 'cuenta.moneda'])->whereIn('id', $ajusteIds)->get()->keyBy('id');

        $operaciones = $filas->map(function ($fila) use ($ventasPorId, $movimientosPorId, $comprasPorId, $ajustesPorId, $puedeVerCosto) {
            if ($fila->tipo === 'Venta') {
                return $this->transformarVenta($ventasPorId[$fila->id], $puedeVerCosto);
            }

            if ($fila->tipo === 'Compra') {
                return $this->transformarCompra($comprasPorId[$fila->id]);
            }

            if ($fila->tipo === 'Ajuste') {
                return $this->transformarAjuste($ajustesPorId[$fila->id]);
            }

            return $this->transformarMovimiento($movimientosPorId[$fila->id], $fila->tipo);
        })->values();

        $pagina->setCollection($operaciones);

        return Inertia::render('Reportes/Report/RastreoOperaciones', [
            'operaciones' => $pagina,
            // Vendedor no puede filtrar por usuario (siempre ve solo lo suyo), así que
            // tampoco hace falta mandarle la lista completa de nombres del sistema.
            'usuarios' => $puedeVerCosto ? DB::table('users')->select('id', 'name')->get() : [],
            // Cliente/Proveedor/Cuenta para los combobox multiselect de filtro — a diferencia
            // de 'usuarios', son solo nombres (no dato de costo), así que se mandan a todos
            // los roles por igual; los volúmenes son chicos (decenas, no miles), no hace
            // falta un endpoint de búsqueda aparte, se filtran en el cliente.
            'clientes' => DB::table('clientes')->select('id', 'nombre_cliente as nombre')->orderBy('nombre_cliente')->get(),
            'proveedores' => DB::table('proveedors')->select('id', 'nombre_proveedor as nombre')->orderBy('nombre_proveedor')->get(),
            'cuentas' => DB::table('cuentas')->select('id', 'nombre_cuenta as nombre')->orderBy('nombre_cuenta')->get(),
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
    private function construirSubqueryMovimiento(
        Request $request,
        int $tipoMovimientoId,
        string $etiqueta,
        ?string $buscar,
        ?int $buscarId,
        $userIdFiltro,
        array $clienteIds,
        array $proveedorIds,
        array $cuentaIds,
        string $clienteDireccion,
        string $proveedorDireccion,
        string $cuentaDireccion,
    ) {
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
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar, $buscarId) {
                $qq->where('mf.descripcion', 'like', "%{$buscar}%")
                    ->orWhere('users.name', 'like', "%{$buscar}%")
                    ->orWhere('cuenta_origen.nombre_cuenta', 'like', "%{$buscar}%")
                    ->orWhere('cuenta_destino.nombre_cuenta', 'like', "%{$buscar}%")
                    ->orWhere('cliente_origen.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('cliente_destino.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('proveedor_destino.nombre_proveedor', 'like', "%{$buscar}%")
                    ->when($buscarId, fn ($q2) => $q2->orWhere('mf.id', $buscarId));
            }))
            // Cliente/Cuenta pueden estar del lado origen (envía) O destino (recibe) — Gasto
            // solo llena origen, Ingreso solo destino, Transferencia ambos. direccion=envia
            // acota a origen, recibe a destino, cualquiera (default) a los dos.
            ->when($clienteIds, fn ($q) => $q->where(function ($qq) use ($clienteIds, $clienteDireccion) {
                if ($clienteDireccion !== 'recibe') {
                    $qq->orWhereIn('cliente_origen.id', $clienteIds);
                }
                if ($clienteDireccion !== 'envia') {
                    $qq->orWhereIn('cliente_destino.id', $clienteIds);
                }
            }))
            ->when($cuentaIds, fn ($q) => $q->where(function ($qq) use ($cuentaIds, $cuentaDireccion) {
                if ($cuentaDireccion !== 'recibe') {
                    $qq->orWhereIn('cuenta_origen.id', $cuentaIds);
                }
                if ($cuentaDireccion !== 'envia') {
                    $qq->orWhereIn('cuenta_destino.id', $cuentaIds);
                }
            }))
            // Proveedor solo puede ser destino (proveedor_origen_id no existe en el esquema)
            // — direccion=envia no tiene nada que calzar, cero resultados.
            ->when($proveedorIds, function ($q) use ($proveedorIds, $proveedorDireccion) {
                if ($proveedorDireccion === 'envia') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->whereIn('proveedor_destino.id', $proveedorIds);
            });
    }

    /**
     * Subquery de compras — solo se invoca cuando $puedeVerCosto (ver comentario en __invoke).
     * A diferencia de movimientos_financieros, compras.tipo_compra no distingue "Gasto vs
     * Ingreso vs Transferencia" — todas las compras son un único tipo 'Compra', así que no
     * hace falta el patrón de un tipo_movimiento_id por llamada.
     */
    private function construirSubqueryCompra(
        Request $request,
        ?string $buscar,
        ?int $buscarId,
        $userIdFiltro,
        array $clienteIds,
        array $proveedorIds,
        array $cuentaIds,
        string $clienteDireccion,
        string $proveedorDireccion,
        string $cuentaDireccion,
    ) {
        return DB::table('compras')
            ->leftJoin('proveedors', 'proveedors.id', '=', 'compras.proveedor_id')
            ->leftJoin('clientes', 'clientes.id', '=', 'compras.cliente_id')
            ->select('compras.id', 'compras.fecha_compra as fecha', DB::raw("'Compra' as tipo"))
            ->when($request->filled('fecha'), fn ($q) => $q->whereDate('compras.fecha_compra', $request->input('fecha')))
            ->when($userIdFiltro, fn ($q) => $q->where('compras.user_id', $userIdFiltro))
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar, $buscarId) {
                $qq->where('proveedors.nombre_proveedor', 'like', "%{$buscar}%")
                    ->orWhere('clientes.nombre_cliente', 'like', "%{$buscar}%")
                    ->orWhere('compras.tipo_compra', 'like', "%{$buscar}%")
                    ->when($buscarId, fn ($q2) => $q2->orWhere('compras.id', $buscarId));
            }))
            // Cliente tiene dos roles distintos en Compra, opuestos entre sí:
            // - compras.cliente_id ("recibe"): el cliente físico actúa como proveedor, es
            //   quien recibió el pago de la compra.
            // - compra_pago.cliente_id ("envía"): el cliente financió/pagó la compra con su
            //   deuda — mismo rol que un vendedor "envía" dinero desde una cuenta.
            // direccion=cualquiera junta los dos, igual que antes de este cambio.
            ->when($clienteIds, fn ($q) => $q->where(function ($qq) use ($clienteIds, $clienteDireccion) {
                if ($clienteDireccion !== 'envia') {
                    $qq->orWhereIn('compras.cliente_id', $clienteIds);
                }
                if ($clienteDireccion !== 'recibe') {
                    $qq->orWhereExists(function ($sub) use ($clienteIds) {
                        $sub->select(DB::raw(1))
                            ->from('compra_pago')
                            ->whereColumn('compra_pago.compra_id', 'compras.id')
                            ->whereIn('compra_pago.cliente_id', $clienteIds);
                    });
                }
            }))
            // Proveedor siempre "recibe" en Compra — no existe un proveedor que "envíe".
            ->when($proveedorIds, function ($q) use ($proveedorIds, $proveedorDireccion) {
                if ($proveedorDireccion === 'envia') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->whereIn('compras.proveedor_id', $proveedorIds);
            })
            // Cuenta solo vive en compra_pago (siempre "envía" — paga la compra, no hay
            // concepto de "cuenta que recibe" en Compra, eso lo cubre Proveedor/Cliente).
            // compras.cuenta_id es un campo legacy (el primer pago nada más) que
            // compra_pago ya cubre por completo, no hace falta consultarlo aparte.
            ->when($cuentaIds, function ($q) use ($cuentaIds, $cuentaDireccion) {
                if ($cuentaDireccion === 'recibe') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->whereExists(function ($sub) use ($cuentaIds) {
                    $sub->select(DB::raw(1))
                        ->from('compra_pago')
                        ->whereColumn('compra_pago.compra_id', 'compras.id')
                        ->whereIn('compra_pago.cuenta_id', $cuentaIds);
                });
            });
    }

    /**
     * Subquery de ajustes manuales de saldo (ajustes_saldo_cuenta) — solo toca una cuenta,
     * nunca cliente/proveedor, así que esos dos filtros simplemente no aplican (cero
     * resultados si están activos, mismo criterio que Venta con proveedor_ids).
     */
    private function construirSubqueryAjuste(
        Request $request,
        ?string $buscar,
        ?int $buscarId,
        $userIdFiltro,
        array $clienteIds,
        array $proveedorIds,
        array $cuentaIds,
        string $cuentaDireccion,
    ) {
        return DB::table('ajustes_saldo_cuenta as a')
            ->leftJoin('users', 'users.id', '=', 'a.user_id')
            ->leftJoin('cuentas', 'cuentas.id', '=', 'a.cuenta_id')
            ->select('a.id', 'a.created_at as fecha', DB::raw("'Ajuste' as tipo"))
            ->when($request->filled('fecha'), fn ($q) => $q->whereDate('a.created_at', $request->input('fecha')))
            ->when($userIdFiltro, fn ($q) => $q->where('a.user_id', $userIdFiltro))
            ->when($buscar, fn ($q) => $q->where(function ($qq) use ($buscar, $buscarId) {
                $qq->where('a.motivo', 'like', "%{$buscar}%")
                    ->orWhere('users.name', 'like', "%{$buscar}%")
                    ->orWhere('cuentas.nombre_cuenta', 'like', "%{$buscar}%")
                    ->when($buscarId, fn ($q2) => $q2->orWhere('a.id', $buscarId));
            }))
            ->when($clienteIds, fn ($q) => $q->whereRaw('1 = 0'))
            ->when($proveedorIds, fn ($q) => $q->whereRaw('1 = 0'))
            // La cuenta ajustada siempre "recibe" el ajuste (mismo criterio que Venta con
            // su cuenta de cobro) — direccion=envia no tiene nada que calzar.
            ->when($cuentaIds, function ($q) use ($cuentaIds, $cuentaDireccion) {
                if ($cuentaDireccion === 'envia') {
                    $q->whereRaw('1 = 0');

                    return;
                }
                $q->whereIn('a.cuenta_id', $cuentaIds);
            });
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
            'detalle_compra' => null,
            'detalle_movimiento' => $this->detalleOperacionService->detalleMovimiento($mov),
        ];
    }

    private function transformarVenta(Venta $venta, bool $puedeVerCosto): array
    {
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
            'detalle_venta' => $this->detalleOperacionService->detalleVenta($venta, $puedeVerCosto),
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
            // (deuda_proveedor | pago_cash) más es_parcial (ver Compra::getEsParcialAttribute,
            // mismo criterio que Comprar/Index.tsx y Comprar/Show.tsx) son el dato más cercano
            // a "detalle"/estado disponible.
            'descripcion' => $compra->tipo_compra === 'deuda_proveedor'
                ? 'Deuda con proveedor'
                : ($compra->es_parcial ? 'Pago parcial (con deuda restante)' : 'Pago al contado'),
            'detalle_venta' => null,
            'detalle_movimiento' => null,
            'detalle_compra' => $this->detalleOperacionService->detalleCompra($compra),
        ];
    }

    private function transformarAjuste(AjusteSaldoCuenta $ajuste): array
    {
        return [
            'id' => $ajuste->id,
            'fecha' => $ajuste->created_at,
            'tipo' => 'Ajuste',
            'monto' => (float) $ajuste->saldo_nuevo - (float) $ajuste->saldo_anterior,
            'moneda' => $ajuste->cuenta?->moneda?->codigo_moneda ?? '',
            'usuario' => $ajuste->user?->name ?? '—',
            'user_id' => $ajuste->user_id,
            'referencia' => "Ajuste #{$ajuste->id}",
            'descripcion' => $ajuste->motivo,
            'detalle_venta' => null,
            'detalle_compra' => null,
            'detalle_movimiento' => $this->detalleOperacionService->detalleAjuste($ajuste),
        ];
    }
}
