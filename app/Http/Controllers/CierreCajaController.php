<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\CierreCaja;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\PagoVenta;
use App\Models\Remesa;
use App\Models\TransferenciaPendiente;
use App\Models\TurnoVendedor;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\CierreCajaNotification;
use App\Services\CatalogoTarjetasService;
use App\Services\MetodosPagoService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class CierreCajaController extends Controller
{
    /** Días en tránsito a partir de los cuales un envío de dinero se marca como atrasado. */
    private const DIAS_PARA_ATRASADO = 2;

    public function __construct(private MetodosPagoService $metodosPago) {}

    /**
     * Listado de cierres.
     * Admin/Moderador ve todos, Vendedor ve los suyos.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $esAdminOModerador = $user->isAdmin() || $user->isModerator();

        $query = CierreCaja::with(['usuario', 'turnoVendedor'])
            ->orderBy('fecha_cierre', 'desc');

        // Si no es admin/moderador, solo ve sus propios cierres
        if (! $esAdminOModerador) {
            $query->where('user_id', $user->id);
        }

        // Filtros
        if ($request->has('fecha_desde') && $request->fecha_desde) {
            $query->whereDate('fecha_cierre', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta') && $request->fecha_hasta) {
            $query->whereDate('fecha_cierre', '<=', $request->fecha_hasta);
        }

        // Filtro por vendedor — relevante para admin/moderador (un vendedor ya está
        // restringido a los suyos arriba, pero no molesta aplicarlo igual si llega).
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // "Cuadre": si el cierre coincidió (saldo_contado vs saldo_esperado) o no.
        // Mismo umbral que CierreCaja::tieneDiferencia() (0.01) — no filtrar por `estado`,
        // ya que store() lo crea siempre como 'aprobado' y ese filtro nunca distingue nada real.
        if ($request->has('cuadre') && $request->cuadre !== 'todos') {
            if ($request->cuadre === 'cuadrado') {
                $query->whereRaw('ABS(diferencia) <= 0.01');
            } elseif ($request->cuadre === 'descuadrado') {
                $query->whereRaw('ABS(diferencia) > 0.01');
            }
        }

        // Resumen de TODO lo que cumple el filtro (no solo de la página): se calcula antes de paginar.
        $resumen = $this->resumenDelListado(clone $query);

        $cierres = $query->paginate(20);

        // Un cierre cubre un rango de tiempo (fecha_apertura → fecha_cierre) en una cuenta
        // compartida por punto de venta: puede incluir varias personas relevándose antes de que
        // alguien cierre la caja. Se listan todas, no solo quien cerró. Los cierres nuevos traen
        // los turnos y los envíos en tránsito guardados; los anteriores se recalculan o quedan
        // sin ese dato (null), nunca inventado.
        $cierres->getCollection()->transform(function (CierreCaja $cierre) {
            $turnos = is_array($cierre->resumen_turnos) ? $cierre->resumen_turnos : null;
            $envios = is_array($cierre->envios_en_transito) ? $cierre->envios_en_transito : null;
            $enviosLista = $envios ? array_merge($envios['enviados'] ?? [], $envios['por_recibir'] ?? []) : [];

            $cierre->setAttribute('responsables_turno', $turnos !== null
                ? collect($turnos)->pluck('nombre')->filter()->unique()->values()
                : $this->responsablesDeTurnoDeUnCierreAnterior($cierre));
            $cierre->setAttribute('turno_cierre', $cierre->turnoVendedor?->nombre_vendedor);
            $cierre->setAttribute('ventas_total_usd', round((float) $cierre->ventas_efectivo + (float) $cierre->ventas_otros, 2));
            $cierre->setAttribute('ventas_count', $turnos !== null ? (int) array_sum(array_column($turnos, 'ventas_count')) : null);
            $cierre->setAttribute('envios_guardados', $envios !== null);
            $cierre->setAttribute('envios_en_transito_total', (int) ($envios['resumen']['total'] ?? 0));
            $cierre->setAttribute('envios_atrasados', count(array_filter($enviosLista, fn ($envio) => ! empty($envio['atrasado']))));

            // El listado no necesita los JSON pesados del cierre: viajaban enteros por cada fila.
            return $cierre->makeHidden([
                'detalles', 'arqueo_detalles', 'confirmacion_transferencias', 'snapshot_cuentas', 'snapshot_clientes',
                'mensajero_detalles', 'comisiones_gestor_detalles', 'resumen_turnos', 'envios_en_transito',
            ]);
        });

        return Inertia::render('Cierres/Index', [
            'cierres' => $cierres,
            'resumen' => $resumen,
            'filters' => $request->all(['fecha_desde', 'fecha_hasta', 'user_id', 'cuadre']),
            'vendedores' => $esAdminOModerador
                ? User::whereIn('id', CierreCaja::select('user_id')->distinct())->orderBy('name')->get(['id', 'name'])
                : [],
            'es_admin_o_moderador' => $esAdminOModerador,
        ]);
    }

    /**
     * Quiénes atendieron en un cierre guardado antes de registrar los turnos: se recalcula con las ventas y los
     * movimientos de su periodo (lo único que existe para esos cierres).
     *
     * @return Collection<int, string>
     */
    private function responsablesDeTurnoDeUnCierreAnterior(CierreCaja $cierre): Collection
    {
        $nombresVenta = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->with('turnoVendedor:id,nombre_vendedor')
            ->get()
            ->pluck('turnoVendedor.nombre_vendedor');

        $nombresMovimiento = MovimientoFinanciero::where('user_id', $cierre->user_id)
            ->whereBetween('fecha_operacion', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->with('turnoVendedor:id,nombre_vendedor')
            ->get()
            ->pluck('turnoVendedor.nombre_vendedor');

        return $nombresVenta->merge($nombresMovimiento)->filter()->unique()->values();
    }

    /**
     * Números de arriba del listado, sobre todos los cierres que cumplen el filtro: cuántos son, cuánto se vendió,
     * cuántos cerraron con saldo esperado negativo y cuántos dejaron dinero en tránsito (y cuántos envíos iban
     * atrasados). Los cierres anteriores a guardar el tránsito no cuentan en esos dos últimos.
     *
     * @param  Builder<CierreCaja>  $consulta
     * @return array{total: int, ventas_total_usd: float, saldo_negativo: int, con_transito: int, envios_atrasados: int}
     */
    private function resumenDelListado($consulta): array
    {
        $cierres = $consulta->reorder()->without(['usuario', 'turnoVendedor'])
            ->get(['id', 'saldo_esperado', 'ventas_efectivo', 'ventas_otros', 'envios_en_transito']);

        $conTransito = 0;
        $atrasados = 0;
        foreach ($cierres as $cierre) {
            $envios = is_array($cierre->envios_en_transito) ? $cierre->envios_en_transito : null;
            if ($envios === null) {
                continue;
            }
            if ((int) ($envios['resumen']['total'] ?? 0) > 0) {
                $conTransito++;
            }
            foreach (array_merge($envios['enviados'] ?? [], $envios['por_recibir'] ?? []) as $envio) {
                $atrasados += empty($envio['atrasado']) ? 0 : 1;
            }
        }

        return [
            'total' => $cierres->count(),
            'ventas_total_usd' => round((float) $cierres->sum(fn ($cierre) => (float) $cierre->ventas_efectivo + (float) $cierre->ventas_otros), 2),
            'saldo_negativo' => $cierres->filter(fn ($cierre) => (float) $cierre->saldo_esperado < 0)->count(),
            'con_transito' => $conTransito,
            'envios_atrasados' => $atrasados,
        ];
    }

    /**
     * Muestra la vista de pre-cierre con los cálculos del turno actual.
     */
    public function create()
    {
        $user = Auth::user();

        // Buscar el último cierre de este usuario para determinar el inicio del turno actual
        $ultimoCierre = CierreCaja::where('user_id', $user->id)
            ->orderBy('fecha_cierre', 'desc')
            ->first();

        // Calcular inicio de turno de forma robusta
        $inicioTurno = $this->calcularInicioTurno($user, $ultimoCierre);

        // Calcular detalles usando método compartido
        $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);

        // Moneda de referencia (principal) para que total productos = total cobrado
        $monedaRef = Moneda::where('principal', true)->first();

        // Obtener warehouses para tooltip en tabla de productos
        $almacenes = Almacen::select('id', 'nombre_almacen')->get()->map(function ($a) {
            return ['id' => $a->id, 'nombre' => $a->nombre_almacen];
        });

        // ============================================
        // NUEVO: COMPARATIVA CON CIERRE ANTERIOR
        // ============================================
        $comparativaCuentas = [];
        $comparativaClientes = [];

        // Saldos actuales de las cuentas cuyo saldo puede ver el usuario: todas para admin/moderador y, para un
        // vendedor, solo las de acceso `completo`. Las de `cobro` no se comparan: de ellas solo ve lo que cobró.
        $cuentasActuales = $user->cuentasUsables()->with('moneda')->get();
        $comparativaCuentasCobro = $this->cuentasDeCobroDelTurno($user, $inicioTurno);

        // Obtener deudas actuales de TODOS los clientes
        $clientesActuales = Cliente::all();

        // Obtener saldos/deudas del cierre anterior (snapshot o fallback a detalles)
        $cuentasCierreAnteriorPorId = [];
        $cuentasCierreAnteriorPorNombre = [];
        $clientesCierreAnteriorPorId = [];
        $clientesCierreAnteriorPorNombre = [];

        if ($ultimoCierre && is_array($ultimoCierre->snapshot_cuentas)) {
            foreach ($ultimoCierre->snapshot_cuentas as $item) {
                if (isset($item['id'])) {
                    $cuentasCierreAnteriorPorId[(int) $item['id']] = $item['saldo'] ?? 0;
                }
            }
        }

        if ($ultimoCierre && is_array($ultimoCierre->snapshot_clientes)) {
            foreach ($ultimoCierre->snapshot_clientes as $item) {
                if (isset($item['id'])) {
                    $clientesCierreAnteriorPorId[(int) $item['id']] = $item['deuda'] ?? 0;
                }
            }
        }

        // Fallback: si no hay snapshot, usar detalles antiguos (por nombre)
        if ($ultimoCierre && empty($cuentasCierreAnteriorPorId) && $ultimoCierre->detalles && is_array($ultimoCierre->detalles)) {
            foreach ($ultimoCierre->detalles as $detalle) {
                if (isset($detalle['items_ventas_cuentas'])) {
                    foreach ($detalle['items_ventas_cuentas'] as $item) {
                        if (isset($item['cuenta_nombre'])) {
                            $cuentaNombre = $item['cuenta_nombre'];
                            if (! isset($cuentasCierreAnteriorPorNombre[$cuentaNombre])) {
                                $cuentasCierreAnteriorPorNombre[$cuentaNombre] = 0;
                            }
                            $cuentasCierreAnteriorPorNombre[$cuentaNombre] += $item['monto_equivalente'] ?? $item['monto'] ?? 0;
                        }
                    }
                }
            }
        }

        if ($ultimoCierre && empty($clientesCierreAnteriorPorId) && $ultimoCierre->detalles && is_array($ultimoCierre->detalles)) {
            foreach ($ultimoCierre->detalles as $detalle) {
                if (isset($detalle['items_ventas_clientes'])) {
                    foreach ($detalle['items_ventas_clientes'] as $item) {
                        if (isset($item['cliente_nombre'])) {
                            $clienteNombre = $item['cliente_nombre'];
                            if (! isset($clientesCierreAnteriorPorNombre[$clienteNombre])) {
                                $clientesCierreAnteriorPorNombre[$clienteNombre] = 0;
                            }
                            $clientesCierreAnteriorPorNombre[$clienteNombre] += $item['monto_equivalente'] ?? $item['monto'] ?? 0;
                        }
                    }
                }
            }
        }

        // Dinero en tránsito por cuenta, para explicar saldos que no cuadran con el cierre anterior: lo que salió de
        // la cuenta origen al enviar (ya descontado de su saldo) y lo que aún no llegó a la cuenta destino.
        $enviosAbiertos = TransferenciaPendiente::visiblesPara($user)
            ->where('estado', TransferenciaPendiente::ESTADO_EN_TRANSITO)
            ->get(['cuenta_origen_id', 'cuenta_destino_id', 'monto', 'monto_destino']);
        $enTransitoSalida = $enviosAbiertos->groupBy('cuenta_origen_id')->map(fn ($grupo) => round((float) $grupo->sum('monto'), 2));
        $enTransitoEntrada = $enviosAbiertos->groupBy('cuenta_destino_id')->map(fn ($grupo) => round((float) $grupo->sum('monto_destino'), 2));

        // Comparar cuentas (si no hay cierre anterior, mostrar saldo actual como anterior)
        foreach ($cuentasActuales as $cuenta) {
            $saldoActual = (float) $cuenta->saldo_cuenta;
            // Cuenta que no estaba en el cierre anterior: no tiene saldo anterior real con qué comparar.
            $esNueva = $ultimoCierre
                && ! isset($cuentasCierreAnteriorPorId[$cuenta->id])
                && ! isset($cuentasCierreAnteriorPorNombre[$cuenta->nombre_cuenta]);
            if ($ultimoCierre) {
                $saldoAnterior = $cuentasCierreAnteriorPorId[$cuenta->id]
                    ?? $cuentasCierreAnteriorPorNombre[$cuenta->nombre_cuenta]
                    ?? 0;
            } else {
                $saldoAnterior = $saldoActual;
            }
            // Redondeada ANTES de decidir el estado: la resta de dos decimales en coma flotante deja residuos
            // (ej. 3e-11) que pasaban por "subió/bajó" pero se mostraban como -$0.00.
            $diferencia = round($saldoActual - $saldoAnterior, 2);

            $comparativaCuentas[] = [
                'es_nueva' => (bool) $esNueva,
                'en_transito_salida' => $enTransitoSalida[$cuenta->id] ?? 0,
                'en_transito_entrada' => $enTransitoEntrada[$cuenta->id] ?? 0,
                'id' => $cuenta->id,
                'nombre' => $cuenta->nombre_cuenta,
                'tipo' => $cuenta->tipo,
                'banco' => $this->logoDeCuenta($cuenta),
                'moneda' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                'saldo_anterior' => round($saldoAnterior, 2),
                'saldo_actual' => round($saldoActual, 2),
                'diferencia' => round($diferencia, 2),
                'estado' => $diferencia > 0 ? 'subio' : ($diferencia < 0 ? 'bajo' : 'igual'),
            ];
        }

        // Comparar clientes (deuda)
        foreach ($clientesActuales as $cliente) {
            $deudaActual = (float) $cliente->deuda_pago_cliente;
            if ($ultimoCierre) {
                $deudaAnterior = $clientesCierreAnteriorPorId[$cliente->id]
                    ?? $clientesCierreAnteriorPorNombre[$cliente->nombre_cliente]
                    ?? 0;
            } else {
                $deudaAnterior = $deudaActual;
            }
            // Redondeada antes de decidir el estado (ver la comparativa de cuentas).
            $diferencia = round($deudaActual - $deudaAnterior, 2);

            $comparativaClientes[] = [
                'id' => $cliente->id,
                'nombre' => $cliente->nombre_cliente,
                'deuda_anterior' => round($deudaAnterior, 2),
                'deuda_actual' => round($deudaActual, 2),
                'diferencia' => round($diferencia, 2),
                'estado' => $diferencia < 0 ? 'mejoro' : ($diferencia > 0 ? 'empeoro' : 'igual'),
            ];
        }

        $puedeVerCostoImpactoEspeciales = in_array($user->role, ['admin', 'moderador'], true);

        $calculosPayload = [
            'fecha_apertura' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
            'moneda_referencia' => $monedaRef ? $monedaRef->codigo_moneda : 'USD',
            'almacenes' => $almacenes,
            'calculos' => [
                'inicio_turno' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
                'saldo_inicial' => 0,
                // Campos legacy para compatibilidad
                'ventas_efectivo' => $calculos['ventas_efectivo'],
                'ventas_otros' => $calculos['ventas_otros'],
                'gastos' => 0,
                'devoluciones' => 0,
                'saldo_esperado_global' => $calculos['saldo_esperado_global'],
                'detalles' => $calculos['detalles'],
                // Widgets: Totales por moneda (sin conversión global)
                'usd_efectivo' => $calculos['usd_efectivo'] ?? 0,
                'cup_efectivo' => $calculos['cup_efectivo'] ?? 0,
                'usd_transferencia' => $calculos['usd_transferencia'] ?? 0,
                'cup_transferencias' => $calculos['cup_transferencias'] ?? 0,
                'usd_internacional' => $calculos['usd_internacional'] ?? 0,
                'transferencias_resumen' => $this->obtenerResumenTransferencias($calculos['detalles']),
                // NUEVO: Totales separados por destino (cuentas vs clientes)
                'ventas_a_cuentas_total_usd' => $calculos['ventas_a_cuentas_total_usd'],
                'ventas_a_clientes_total_usd' => $calculos['ventas_a_clientes_total_usd'],
                'ventas_a_cuentas_efectivo_usd' => $calculos['ventas_a_cuentas_efectivo_usd'],
                'ventas_a_cuentas_transferencia_usd' => $calculos['ventas_a_cuentas_transferencia_usd'],
                'ventas_a_clientes_efectivo_usd' => $calculos['ventas_a_clientes_efectivo_usd'],
                'ventas_a_clientes_transferencia_usd' => $calculos['ventas_a_clientes_transferencia_usd'],
                // Comisiones a gestores
                'comisiones_gestor_total' => $calculos['comisiones_gestor_total'] ?? 0,
                'comisiones_gestor_detalles' => $calculos['comisiones_gestor_detalles'] ?? [],
                // Nuevos: comisiones y ganancia agencia
                'comision_pv_total' => $calculos['comision_pv_total'] ?? 0,
                'comision_gestor_total' => $calculos['comision_gestor_total'] ?? 0,
                'comisiones_pv_detalles' => $calculos['comisiones_pv_detalles'] ?? [],
                'ganancia_agencia_total' => $calculos['ganancia_agencia_total'] ?? 0,
                // Envíos de dinero abiertos que el usuario puede ver (informativo: no entra en ningún saldo)
                'envios_en_transito' => TransferenciaPendiente::resumenAbiertosPara($user),
                'envios_en_transito_detalle' => $this->detalleEnviosAbiertos($user),
                'turnos' => $this->resumenTurnos($user, $inicioTurno),
                'turno_actual' => $user->turnoActivo()?->nombre_vendedor,
                'total_gastos' => $calculos['total_gastos_usd'] ?? 0,
                'total_devoluciones' => $calculos['ventas_devueltas_total_usd'] ?? 0,
                'operaciones_multiples' => $this->detalleOperacionesMultiples($user, $inicioTurno),
                // Resumen financiero
                'ventas_brutas_usd' => $calculos['ventas_brutas_usd'] ?? 0,
                'comisiones_pv_cup' => $calculos['comisiones_pv_cup'] ?? 0,
                'comisiones_gestor_cup' => $calculos['comisiones_gestor_cup'] ?? 0,
                'comisiones_total_cup' => $calculos['comisiones_total_cup'] ?? 0,
                // Ventas especiales
                'ventas_especiales_count' => $calculos['ventas_especiales_count'] ?? 0,
                'ventas_especiales_total_usd' => $calculos['ventas_especiales_total_usd'] ?? 0,
                'ventas_especiales_costo_usd' => $calculos['ventas_especiales_costo_usd'] ?? 0,
                'ventas_especiales_impacto_usd' => $calculos['ventas_especiales_impacto_usd'] ?? 0,
                'ventas_especiales_detalles' => $calculos['ventas_especiales_detalles'] ?? [],
                // Ventas sin comisión (de la agencia)
                'ventas_sin_comision_count' => $calculos['ventas_sin_comision_count'] ?? 0,
                'ventas_sin_comision_total_usd' => $calculos['ventas_sin_comision_total_usd'] ?? 0,
                'ventas_sin_comision_costo_usd' => $calculos['ventas_sin_comision_costo_usd'] ?? 0,
                'ventas_sin_comision_impacto_usd' => $calculos['ventas_sin_comision_impacto_usd'] ?? 0,
                'ventas_sin_comision_detalles' => $calculos['ventas_sin_comision_detalles'] ?? [],
                // Ventas anuladas
                'ventas_anuladas_count' => $calculos['ventas_anuladas_count'] ?? 0,
                'ventas_anuladas_total_usd' => $calculos['ventas_anuladas_total_usd'] ?? 0,
                'ventas_anuladas_detalles' => $calculos['ventas_anuladas_detalles'] ?? [],
                // Ventas devueltas (ya movieron dinero y se revirtieron)
                'ventas_devueltas_count' => $calculos['ventas_devueltas_count'] ?? 0,
                'ventas_devueltas_total_usd' => $calculos['ventas_devueltas_total_usd'] ?? 0,
                'ventas_devueltas_detalles' => $calculos['ventas_devueltas_detalles'] ?? [],
                // Mensajería del turno
                'mensajero_total_usd' => $calculos['mensajero_total_usd'] ?? 0,
                'mensajero_total_cup' => $calculos['mensajero_total_cup'] ?? 0,
                'mensajero_count' => $calculos['mensajero_count'] ?? 0,
                'mensajero_detalles' => $calculos['mensajero_detalles'] ?? [],
            ],
            // NUEVO: Comparativa con cierre anterior
            'comparativa_cuentas' => $comparativaCuentas,
            'comparativa_cuentas_cobro' => $comparativaCuentasCobro,
            'comparativa_clientes' => $comparativaClientes,
            'tiene_cierre_anterior' => $ultimoCierre !== null,
        ];

        if (! $puedeVerCostoImpactoEspeciales) {
            unset(
                $calculosPayload['calculos']['ventas_especiales_costo_usd'],
                $calculosPayload['calculos']['ventas_especiales_impacto_usd'],
                $calculosPayload['calculos']['ventas_sin_comision_costo_usd'],
                $calculosPayload['calculos']['ventas_sin_comision_impacto_usd']
            );

            $calculosPayload['calculos']['ventas_especiales_detalles'] = array_map(function ($detalle) {
                unset($detalle['costo'], $detalle['impacto']);

                return $detalle;
            }, $calculosPayload['calculos']['ventas_especiales_detalles']);

            $calculosPayload['calculos']['ventas_sin_comision_detalles'] = array_map(function ($detalle) {
                unset($detalle['costo'], $detalle['impacto']);

                return $detalle;
            }, $calculosPayload['calculos']['ventas_sin_comision_detalles']);
        }

        // Preparar respuesta para Inertia con detalles mejorados de transferencias y claridad en pagos
        return Inertia::render('Cierres/Create', $calculosPayload);
    }

    /**
     * Guardar el cierre.
     */
    public function store(Request $request)
    {
        Log::info('CierreCaja store iniciado', ['user_id' => Auth::id()]);

        // Solo se aceptan del navegador el inicio del periodo que está cerrando (para detectar un cierre repetido), lo
        // contado, las observaciones y el arqueo: el resto (ventas, gastos, devoluciones, saldo esperado) lo calcula el
        // servidor.
        $data = $request->validate([
            'fecha_apertura' => ['nullable', 'date'],
            'saldo_contado' => ['nullable', 'numeric'],
            'observaciones' => ['nullable', 'string', 'max:2000'],
            'arqueo_detalles' => ['nullable', 'array'],
            'confirmacion_transferencias' => ['nullable', 'array'],
        ]);
        $user = Auth::user();

        DB::beginTransaction();
        try {
            // Un solo cierre a la vez por usuario: un segundo envío (doble clic, dos pestañas) espera aquí y ya
            // encuentra el cierre nuevo.
            User::whereKey($user->id)->lockForUpdate()->first();

            // Determinar inicio del turno (misma lógica que create)
            $ultimoCierre = CierreCaja::where('user_id', $user->id)
                ->orderBy('fecha_cierre', 'desc')
                ->first();

            $inicioTurno = $this->calcularInicioTurno($user, $ultimoCierre);

            // La pantalla lleva el inicio del periodo que se está cerrando: si ya cambió, ese cierre ya se hizo
            if (! empty($data['fecha_apertura']) && Carbon::parse($data['fecha_apertura'])->toDateTimeString() !== Carbon::parse($inicioTurno)->toDateTimeString()) {
                DB::rollBack();
                Log::warning('CierreCaja repetido o periodo cambiado', ['user_id' => $user->id]);

                return back()->withErrors(['cierre' => 'Este cierre ya se realizó o el periodo cambió. Recarga la página para ver el estado actual.']);
            }

            // Cálculos del servidor como FUENTE DE VERDAD; si fallan no se guarda un cierre en ceros
            $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);
            $detallesJson = $calculos['detalles'];
            $comisionesGestorDetalles = $calculos['comisiones_gestor_detalles'] ?? [];
            $comisionesGestorTotal = $calculos['comisiones_gestor_total'] ?? 0;
            $ventasEfectivo = $calculos['ventas_efectivo'];
            $ventasOtros = $calculos['ventas_otros'];
            $saldoEsperado = $calculos['saldo_esperado_global'];
            $mensajeroSnapshotTotUSD = $calculos['mensajero_total_usd'] ?? 0;
            $mensajeroSnapshotTotCUP = $calculos['mensajero_total_cup'] ?? 0;
            $mensajeroSnapshotCount = $calculos['mensajero_count'] ?? 0;
            $mensajeroSnapshotDetalles = $calculos['mensajero_detalles'] ?? [];

            $saldoInicial = 0;
            $totalGastos = $calculos['total_gastos_usd'] ?? 0;
            $totalDevoluciones = $calculos['ventas_devueltas_total_usd'] ?? 0;
            // Sin conteo físico (decisión del cliente), lo contado es lo esperado
            $saldoContado = (float) ($data['saldo_contado'] ?? $saldoEsperado);

            // Calcular diferencia usando el saldo esperado del backend
            $diferencia = round($saldoContado - $saldoEsperado, 2);

            // Snapshot de las cuentas cuyo saldo puede ver el usuario (a un vendedor, solo las de acceso `completo`:
            // el saldo de una cuenta de cobro no debe quedar guardado en el cierre).
            $cuentasSnapshot = $user->cuentasUsables()->with('moneda')->get()->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre' => $cuenta->nombre_cuenta,
                    'tipo' => $cuenta->tipo,
                    'moneda' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                    'saldo' => round((float) $cuenta->saldo_cuenta, 2),
                ];
            })->values()->all();

            // Snapshot real de clientes
            $clientesSnapshot = Cliente::all()->map(function ($cliente) {
                return [
                    'id' => $cliente->id,
                    'nombre' => $cliente->nombre_cliente,
                    'deuda' => round((float) $cliente->deuda_pago_cliente, 2),
                ];
            })->values()->all();

            // Lo que el cierre dejaba sin guardar: quién cerró, qué turnos hubo y qué viajaba al cerrar
            $enviosAbiertos = $this->detalleEnviosAbiertos($user);
            $enviosAlCerrar = [
                'resumen' => TransferenciaPendiente::resumenAbiertosPara($user),
                'enviados' => $enviosAbiertos['enviados'],
                'por_recibir' => $enviosAbiertos['por_recibir'],
            ];

            $cierre = CierreCaja::create([
                'user_id' => Auth::id(),
                'revisor_id' => Auth::id(),
                'turno_vendedor_id' => $user->turnoActivo()?->id,
                'resumen_turnos' => $this->resumenTurnos($user, $inicioTurno),
                'envios_en_transito' => $enviosAlCerrar,
                'fecha_apertura' => $inicioTurno,
                'fecha_cierre' => now(),
                'saldo_inicial' => $saldoInicial,
                'ventas_efectivo' => $ventasEfectivo,
                'ventas_otros' => $ventasOtros,
                'total_gastos' => $totalGastos,
                'total_devoluciones' => $totalDevoluciones,
                'comisiones_gestor' => $comisionesGestorTotal,
                'comisiones_gestor_detalles' => $comisionesGestorDetalles,
                'saldo_esperado' => $saldoEsperado,
                'saldo_contado' => $saldoContado,
                'diferencia' => $diferencia,
                'observaciones' => $data['observaciones'] ?? '',
                'estado' => 'aprobado',
                'detalles' => $detallesJson,
                'arqueo_detalles' => $data['arqueo_detalles'] ?? [],
                'confirmacion_transferencias' => $data['confirmacion_transferencias'] ?? [],
                'snapshot_cuentas' => $cuentasSnapshot,
                'snapshot_clientes' => $clientesSnapshot,
                'mensajero_total_usd' => $mensajeroSnapshotTotUSD,
                'mensajero_total_cup' => $mensajeroSnapshotTotCUP,
                'mensajero_count' => $mensajeroSnapshotCount,
                'mensajero_detalles' => $mensajeroSnapshotDetalles,
            ]);

            DB::commit();
            Log::info('CierreCaja guardado', ['cierre_id' => $cierre->id]);

            // Notificar a usuarios relevantes
            try {
                $notificationService = new NotificationService;
                $datosNotificacion = $notificationService->prepararDatosCierreCaja($cierre);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                Notification::send($usuariosParaNotificar, new CierreCajaNotification($cierre));
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de cierre de caja: '.$e->getMessage());
            }

            return redirect()->route('ventas.cierres')->with('success', 'Cierre realizado con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('CierreCaja error al guardar: '.$e->getMessage());

            return back()->withErrors(['cierre' => 'No se pudo guardar el cierre. Inténtalo de nuevo; si sigue fallando avisa al administrador.']);
        }
    }

    /**
     * Quién atendió en el periodo (turnos "Atendido por") y qué movió cada uno: ventas completadas y movimientos
     * financieros propios, agrupados por `turno_vendedor_id`. Un punto de venta (un usuario) puede tener varias
     * personas en el mismo periodo; las operaciones sin turno (admin, o anteriores a la función) van juntas.
     *
     * @return array<int, array{turno_id: int|null, nombre: string|null, desde: string|null, ventas_count: int, ventas_total_usd: float, gastos_count: int, ingresos_count: int, transferencias_count: int}>
     */
    private function resumenTurnos(User $user, mixed $inicioTurno): array
    {
        $ventas = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->get(['id', 'turno_vendedor_id', 'total']);

        $movimientos = MovimientoFinanciero::where('user_id', $user->id)
            ->where('fecha_operacion', '>=', $inicioTurno)
            ->get(['id', 'turno_vendedor_id', 'tipo_movimiento_id']);

        $turnos = TurnoVendedor::whereIn('id', $ventas->pluck('turno_vendedor_id')->merge($movimientos->pluck('turno_vendedor_id'))->filter()->unique())
            ->get()
            ->keyBy('id');

        $claves = $ventas->pluck('turno_vendedor_id')->merge($movimientos->pluck('turno_vendedor_id'))->unique()->values();

        return $claves->map(function ($turnoId) use ($ventas, $movimientos, $turnos) {
            $ventasDelTurno = $ventas->where('turno_vendedor_id', $turnoId);
            $movimientosDelTurno = $movimientos->where('turno_vendedor_id', $turnoId);
            $turno = $turnos->get($turnoId);

            return [
                'turno_id' => $turnoId,
                'nombre' => $turno?->nombre_vendedor,
                'desde' => $turno?->iniciado_en?->format('Y-m-d H:i'),
                'ventas_count' => $ventasDelTurno->count(),
                'ventas_total_usd' => round((float) $ventasDelTurno->sum('total'), 2),
                'gastos_count' => $movimientosDelTurno->where('tipo_movimiento_id', 1)->count(),
                'ingresos_count' => $movimientosDelTurno->where('tipo_movimiento_id', 2)->count(),
                'transferencias_count' => $movimientosDelTurno->where('tipo_movimiento_id', 3)->count(),
            ];
        })->sortBy(fn (array $fila) => $fila['desde'] ?? '')->values()->all();
    }

    public function show($id)
    {
        $cierre = CierreCaja::with(['usuario', 'revisor', 'turnoVendedor'])->findOrFail($id);

        // Seguridad: solo dueño o admin
        $currentUser = Auth::user();
        if ($currentUser->role !== 'admin' && $currentUser->role !== 'moderador' && $currentUser->id !== $cierre->user_id) {
            Log::warning('Acceso denegado a cierre', [
                'attempt_user_id' => $currentUser->id ?? null,
                'attempt_user_role' => $currentUser->role ?? null,
                'cierre_id' => $cierre->id,
                'cierre_user_id' => $cierre->user_id,
            ]);
            abort(403);
        }

        Log::info('Mostrar cierre accedido', [
            'user_id' => $currentUser->id ?? null,
            'role' => $currentUser->role ?? null,
            'cierre_id' => $cierre->id,
        ]);

        // Calcular comisiones y ganancia desde las ventas del turno del cierre
        $comisionesPVVentasCierre = Venta::with(['detalles.producto:id,nombre_producto,marca_producto,modelo_producto', 'comisionCuenta.moneda'])
            ->where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_gestor', false)
            ->where('total_comision', '>', 0)
            ->get(['id', 'total', 'cliente_id', 'total_comision', 'comision_tasa', 'comision_cuenta_id', 'created_at']);

        $comisionPVTotal = $comisionesPVVentasCierre->sum(fn ($v) => (float) $v->total_comision);

        $comisionesPVDetallesCierre = $comisionesPVVentasCierre->map(fn ($v) => [
            'venta_id' => $v->id,
            'comision_usd' => round((float) $v->total_comision, 2),
            // Una comisión pagada desde una cuenta USD no tiene monto en CUP.
            'comision_cup' => $v->comisionCuenta?->moneda?->codigo_moneda === 'USD' ? 0.0 : round((float) $v->total_comision * (float) $v->comision_tasa, 2),
            'fecha' => $v->created_at->format('Y-m-d H:i'),
            'total_venta' => round((float) $v->total, 2),
            'productos' => $v->detalles->map(fn ($d) => [
                'nombre' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                'marca' => $d->producto?->marca_producto,
                'modelo' => $d->producto?->modelo_producto,
                'cantidad' => (int) $d->cantidad,
            ])->values()->all(),
        ])->values()->all();

        $comisionGestorTotal = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_gestor', true)
            ->sum('total_comision');

        $ventasDelCierre = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->get(['total_ganancia', 'total_comision']);

        $gananciaAgenciaTotal = $ventasDelCierre->sum(fn ($v) => (float) $v->total_ganancia - (float) $v->total_comision
        );

        // --- RESUMEN FINANCIERO DEL CIERRE ---
        $ventasBrutasUSD = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->sum('total_esperado_usd');

        // Solo comisiones pagadas desde cuentas CUP: las de una cuenta USD (tasa 1) no son CUP.
        $comisionesPVCUP = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_gestor', false)
            ->whereDoesntHave('comisionCuenta.moneda', fn ($q) => $q->where('codigo_moneda', 'USD'))
            ->whereNotNull('comision_tasa')
            ->where('comision_tasa', '>', 0)
            ->selectRaw('COALESCE(SUM(total_comision * comision_tasa), 0) as total_cup')
            ->value('total_cup') ?? 0;

        // Comisiones gestor CUP: calculadas sobre ventas con gestor (gestor_monto * tasa de la cuenta)
        $comisionesGestorCUPTotal = (float) (Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_gestor', true)
            ->whereHas('gestorCuenta', fn ($q) => $q->whereHas('moneda', fn ($q2) => $q2->where('codigo_moneda', 'CUP')))
            ->sum('gestor_monto'));

        $comisionesTotalCUP = round((float) $comisionesPVCUP + $comisionesGestorCUPTotal, 2);

        $almacenes = Almacen::select('id', 'nombre_almacen')->get()->map(function ($a) {
            return ['id' => $a->id, 'nombre' => $a->nombre_almacen];
        })->toArray();

        // Ventas especiales del turno del cierre
        $ventasEspecialesCierre = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_especial', true)
            ->with(['detalles'])
            ->get();

        $veCount = $ventasEspecialesCierre->count();
        $veTotal = 0;
        $veCosto = 0;
        $veDetalles = [];

        foreach ($ventasEspecialesCierre as $ve) {
            $t = (float) $ve->total;
            $c = $ve->detalles->sum(fn ($d) => (float) $d->costo_unitario * (int) $d->cantidad);
            $veTotal += $t;
            $veCosto += $c;
            $veDetalles[] = [
                'venta_id' => $ve->id,
                'motivo' => $ve->nota_venta_especial ?? 'Sin motivo registrado',
                'total' => round($t, 2),
                'costo' => round($c, 2),
                'impacto' => round($t - $c, 2),
                'es_regalo' => $t == 0,
                'fecha' => $ve->created_at->format('Y-m-d H:i'),
            ];
        }

        $puedeVerCostoImpactoEspeciales = in_array($currentUser->role, ['admin', 'moderador'], true);

        // Ventas sin comisión (de la agencia) del turno del cierre
        $ventasSinComisionCierre = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'completada')
            ->where('es_venta_sin_comision', true)
            ->with(['detalles'])
            ->get();

        $vscCount = $ventasSinComisionCierre->count();
        $vscTotal = 0;
        $vscCosto = 0;
        $vscDetalles = [];

        foreach ($ventasSinComisionCierre as $vsc) {
            $t = (float) $vsc->total;
            $c = $vsc->detalles->sum(fn ($d) => (float) $d->costo_unitario * (int) $d->cantidad);
            $vscTotal += $t;
            $vscCosto += $c;
            $vscDetalles[] = [
                'venta_id' => $vsc->id,
                'total' => round($t, 2),
                'costo' => round($c, 2),
                'impacto' => round($t - $c, 2),
                'fecha' => $vsc->created_at->format('Y-m-d H:i'),
            ];
        }

        // Ventas anuladas durante el período del cierre
        $ventasAnuladasCierre = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'cancelada')
            ->with('detalles')
            ->get();

        $vaCount = $ventasAnuladasCierre->count();
        $vaTotalUSD = round($ventasAnuladasCierre->sum(fn ($v) => (float) $v->detalles->sum('subtotal')), 2);
        $vaDetalles = $ventasAnuladasCierre->map(fn ($v) => [
            'venta_id' => $v->id,
            'total' => round((float) $v->detalles->sum('subtotal'), 2),
            'motivo' => $v->motivo_anulacion ?? 'sin_motivo',
            'detalle' => $v->detalle_anulacion,
            'fecha' => $v->created_at->format('Y-m-d H:i'),
        ])->values()->all();

        // Ventas devueltas: completadas que después se revirtieron (dinero y stock). A diferencia de
        // una anulada, esta sí movió dinero — por eso va en su propia sección.
        $ventasDevueltasCierre = Venta::where('user_id', $cierre->user_id)
            ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
            ->where('estado', 'devuelta')
            ->with('detalles')
            ->get();

        $vdCount = $ventasDevueltasCierre->count();
        $vdTotalUSD = round($ventasDevueltasCierre->sum(fn ($v) => (float) $v->detalles->sum('subtotal')), 2);
        $vdDetalles = $ventasDevueltasCierre->map(fn ($v) => [
            'venta_id' => $v->id,
            'total' => round((float) $v->detalles->sum('subtotal'), 2),
            'motivo' => $v->motivo_anulacion ?? 'sin_motivo',
            'detalle' => $v->detalle_anulacion,
            'fecha' => $v->created_at->format('Y-m-d H:i'),
        ])->values()->all();

        // Mensajería del período del cierre — usar snapshot si existe, recalcular si es un cierre antiguo
        if ($cierre->mensajero_detalles !== null) {
            $mensajeroCount = $cierre->mensajero_count ?? 0;
            $mensajeroTotUSD = $cierre->mensajero_total_usd ?? 0;
            $mensajeroTotCUP = $cierre->mensajero_total_cup ?? 0;
            $mensajeroDetallesList = $cierre->mensajero_detalles ?? [];
            $mensajeroPropioTotCUP = round(array_sum(array_map(fn ($d) => ($d['tipo'] ?? '') === 'propio' ? ($d['monto_cup'] ?? 0) : 0, $mensajeroDetallesList)), 2);
            $mensajeroExternoTotCUP = round(array_sum(array_map(fn ($d) => ($d['tipo'] ?? '') !== 'propio' ? ($d['monto_cup'] ?? 0) : 0, $mensajeroDetallesList)), 2);
        } else {
            // Fallback: recalcular desde la BD para cierres anteriores sin snapshot
            $mensajeroCierre = Venta::where('user_id', $cierre->user_id)
                ->whereBetween('created_at', [$cierre->fecha_apertura, $cierre->fecha_cierre])
                ->where('estado', 'completada')
                ->whereNotNull('mensajero_monto')
                ->where('mensajero_monto', '>', 0)
                ->with('detalles.producto:id,nombre_producto,marca_producto,modelo_producto')
                ->get(['id', 'total', 'mensajero_monto', 'mensajero_monto_original', 'mensajero_monto_final_cup', 'mensajero_tipo', 'mensajero_tasa', 'mensajero_tasa_entrada']);

            $mensajeroCount = $mensajeroCierre->count();
            $mensajeroTotUSD = round($mensajeroCierre->sum(fn ($v) => (float) $v->mensajero_monto), 2);
            $mensajeroPropioTotCUP = 0;
            $mensajeroExternoTotCUP = 0;
            $mensajeroDetallesList = [];

            $mensajeroTotCUP = round($mensajeroCierre->sum(function ($v) use (&$mensajeroPropioTotCUP, &$mensajeroExternoTotCUP, &$mensajeroDetallesList) {
                $montoUSD = (float) $v->mensajero_monto;
                if ($v->mensajero_monto_final_cup) {
                    $cup = (float) $v->mensajero_monto_final_cup;
                } elseif ($v->mensajero_tasa_entrada > 0 || $v->mensajero_tasa > 0) {
                    $tasa = (float) ($v->mensajero_tasa_entrada ?? $v->mensajero_tasa);
                    $cup = $montoUSD * $tasa;
                } else {
                    $cup = (float) ($v->mensajero_monto_original ?? $montoUSD);
                }
                if ($v->mensajero_tipo === 'propio') {
                    $mensajeroPropioTotCUP += $cup;
                } else {
                    $mensajeroExternoTotCUP += $cup;
                }
                $mensajeroDetallesList[] = [
                    'venta_id' => $v->id,
                    'monto_usd' => round($montoUSD, 2),
                    'monto_cup' => round($cup, 2),
                    'tasa' => $montoUSD > 0 ? round($cup / $montoUSD, 2) : null,
                    'tipo' => $v->mensajero_tipo,
                    'total_venta' => round((float) $v->total, 2),
                    'productos' => $v->detalles->map(fn ($d) => [
                        'nombre' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                        'marca' => $d->producto?->marca_producto,
                        'modelo' => $d->producto?->modelo_producto,
                        'cantidad' => (int) $d->cantidad,
                    ])->values()->all(),
                ];

                return $cup;
            }), 2);
            $mensajeroPropioTotCUP = round($mensajeroPropioTotCUP, 2);
            $mensajeroExternoTotCUP = round($mensajeroExternoTotCUP, 2);
        }

        // --- COMPARATIVA CON CIERRE ANTERIOR ---
        $comparativaCuentas = [];
        $comparativaClientes = [];

        $cierreAnterior = CierreCaja::where('user_id', $cierre->user_id)
            ->where('id', '<', $cierre->id)
            ->orderBy('fecha_cierre', 'desc')
            ->first();

        $tieneCierreAnterior = $cierreAnterior !== null;

        if ($tieneCierreAnterior) {
            $snapAnteriorCuentas = is_array($cierreAnterior->snapshot_cuentas)
                ? $cierreAnterior->snapshot_cuentas
                : [];
            $snapAnteriorClientes = is_array($cierreAnterior->snapshot_clientes)
                ? $cierreAnterior->snapshot_clientes
                : [];
        } else {
            $snapAnteriorCuentas = [];
            $snapAnteriorClientes = [];
        }

        $snapActualCuentas = is_array($cierre->snapshot_cuentas) ? $cierre->snapshot_cuentas : [];
        $snapActualClientes = is_array($cierre->snapshot_clientes) ? $cierre->snapshot_clientes : [];

        // Indexar snapshots por id
        $anteriorCuentasPorId = [];
        foreach ($snapAnteriorCuentas as $item) {
            if (isset($item['id'])) {
                $anteriorCuentasPorId[(int) $item['id']] = $item['saldo'] ?? 0;
            }
        }
        $anteriorClientesPorId = [];
        foreach ($snapAnteriorClientes as $item) {
            if (isset($item['id'])) {
                $anteriorClientesPorId[(int) $item['id']] = $item['deuda'] ?? 0;
            }
        }

        $actualCuentasPorId = [];
        foreach ($snapActualCuentas as $item) {
            if (isset($item['id'])) {
                $actualCuentasPorId[(int) $item['id']] = [
                    'nombre' => $item['nombre'] ?? '',
                    'tipo' => $item['tipo'] ?? '',
                    'moneda' => $item['moneda'] ?? 'USD',
                    'saldo' => $item['saldo'] ?? 0,
                ];
            }
        }
        $actualClientesPorId = [];
        foreach ($snapActualClientes as $item) {
            if (isset($item['id'])) {
                $actualClientesPorId[(int) $item['id']] = [
                    'nombre' => $item['nombre'] ?? '',
                    'deuda' => $item['deuda'] ?? 0,
                ];
            }
        }

        // El saldo de una cuenta de cobro no lo ve quien solo cobra en ella. Los cierres guardados antes de ese permiso
        // pueden traerlo en el snapshot (y viaja también dentro de `cierre`), así que se filtra aquí al mostrarlo.
        if ($currentUser->role === 'vendedor') {
            $cuentasVisibles = $currentUser->cuentasCompletas()->pluck('cuentas.id')->map(fn ($valor) => (int) $valor)->all();
            $actualCuentasPorId = array_intersect_key($actualCuentasPorId, array_flip($cuentasVisibles));
            $cierre->snapshot_cuentas = array_values(array_filter(
                $snapActualCuentas,
                fn ($item) => in_array((int) ($item['id'] ?? 0), $cuentasVisibles, true)
            ));
        }

        // Dinero que seguía en tránsito al cerrar (guardado en el cierre; los cierres anteriores no lo tienen)
        $enviosGuardados = is_array($cierre->envios_en_transito)
            ? collect(array_merge($cierre->envios_en_transito['enviados'] ?? [], $cierre->envios_en_transito['por_recibir'] ?? []))
            : collect();
        $enTransitoSalida = $enviosGuardados->groupBy('cuenta_origen_id')->map(fn ($grupo) => round((float) $grupo->sum('monto'), 2));
        $enTransitoEntrada = $enviosGuardados->groupBy('cuenta_destino_id')->map(fn ($grupo) => round((float) $grupo->sum('monto_destino'), 2));

        $cuentasDelSnapshot = Cuenta::with('moneda')->whereIn('id', array_keys($actualCuentasPorId))->get()->keyBy('id');

        // Construir comparativa de cuentas
        foreach ($actualCuentasPorId as $id => $data) {
            $saldoActual = (float) $data['saldo'];
            $saldoAnterior = (float) ($anteriorCuentasPorId[$id] ?? 0);
            // Redondeada ANTES de decidir el estado: la resta de dos decimales deja residuos que se mostraban como -$0.00
            $diferencia = round($saldoActual - $saldoAnterior, 2);

            $comparativaCuentas[] = [
                'es_nueva' => $tieneCierreAnterior && ! array_key_exists($id, $anteriorCuentasPorId),
                'en_transito_salida' => $enTransitoSalida[$id] ?? 0,
                'en_transito_entrada' => $enTransitoEntrada[$id] ?? 0,
                'id' => $id,
                'nombre' => $data['nombre'],
                'tipo' => $data['tipo'],
                'banco' => $this->logoDeCuenta($cuentasDelSnapshot->get($id)),
                'moneda' => $data['moneda'],
                'saldo_anterior' => round($saldoAnterior, 2),
                'saldo_actual' => round($saldoActual, 2),
                'diferencia' => $diferencia,
                'estado' => $diferencia > 0 ? 'subio' : ($diferencia < 0 ? 'bajo' : 'igual'),
            ];
        }

        // Construir comparativa de clientes
        foreach ($actualClientesPorId as $id => $data) {
            $deudaActual = (float) $data['deuda'];
            $deudaAnterior = (float) ($anteriorClientesPorId[$id] ?? 0);
            $diferencia = round($deudaActual - $deudaAnterior, 2);

            $comparativaClientes[] = [
                'id' => $id,
                'nombre' => $data['nombre'],
                'deuda_anterior' => round($deudaAnterior, 2),
                'deuda_actual' => round($deudaActual, 2),
                'diferencia' => round($diferencia, 2),
                'estado' => $diferencia < 0 ? 'mejoro' : ($diferencia > 0 ? 'empeoro' : 'igual'),
            ];
        }

        // --- TRANSACCIONES EXTERNAS (operaciones de otros usuarios en cuentas del vendedor) ---
        $transaccionesExternas = [];
        $cierreUser = User::find($cierre->user_id);
        $cuentaIdsExternas = $cierreUser ? $cierreUser->cuentas()->pluck('id')->toArray() : [];

        if ($cierreUser && ! empty($cuentaIdsExternas)) {
            $movimientosExternos = MovimientoFinanciero::where(function ($q) use ($cierreUser, $cuentaIdsExternas) {
                $q->where('user_id', '!=', $cierreUser->id);
                $q->where(function ($qq) use ($cuentaIdsExternas) {
                    $qq->where(function ($qqq) use ($cuentaIdsExternas) {
                        $qqq->where('tipo_movimiento_id', 1)->whereIn('cuenta_origen_id', $cuentaIdsExternas);
                    })->orWhere(function ($qqq) use ($cuentaIdsExternas) {
                        $qqq->where('tipo_movimiento_id', 2)->whereIn('cuenta_destino_id', $cuentaIdsExternas);
                    })->orWhere(function ($qqq) use ($cuentaIdsExternas) {
                        $qqq->where('tipo_movimiento_id', 3)
                            ->where(function ($qqqq) use ($cuentaIdsExternas) {
                                $qqqq->whereIn('cuenta_origen_id', $cuentaIdsExternas)
                                    ->orWhereIn('cuenta_destino_id', $cuentaIdsExternas);
                            });
                    });
                });
            })
                ->whereBetween('fecha_operacion', [$cierre->fecha_apertura, $cierre->fecha_cierre])
                ->with(['user', 'cuentaOrigen', 'cuentaDestino'])
                ->get();

            foreach ($movimientosExternos as $mov) {
                $item = [
                    'hora' => $mov->created_at->format('H:i'),
                    'desc' => $mov->descripcion,
                    'monto' => $mov->monto,
                    'moneda' => $mov->moneda ?? 'USD',
                    'usuario_nombre' => $mov->user?->name ?? 'Sistema',
                ];

                if ($mov->tipo_movimiento_id == 1) {
                    $item['tipo'] = 'Gasto';
                    $item['cuenta'] = $mov->cuentaOrigen?->nombre_cuenta ?? '-';
                    $item['es_entrante'] = false;
                } elseif ($mov->tipo_movimiento_id == 2) {
                    $item['tipo'] = 'Ingreso';
                    $item['cuenta'] = $mov->cuentaDestino?->nombre_cuenta ?? '-';
                    $item['es_entrante'] = true;
                } elseif ($mov->tipo_movimiento_id == 3) {
                    $esEntrante = in_array($mov->cuenta_destino_id, $cuentaIdsExternas);
                    $item['tipo'] = $esEntrante ? 'Transferencia Entrante' : 'Transferencia Saliente';
                    $item['cuenta'] = $esEntrante
                        ? ($mov->cuentaDestino?->nombre_cuenta ?? '-')
                        : ($mov->cuentaOrigen?->nombre_cuenta ?? '-');
                    $item['es_entrante'] = $esEntrante;
                }

                $transaccionesExternas[] = $item;
            }

            usort($transaccionesExternas, fn ($a, $b) => $a['hora'] <=> $b['hora']);
        }

        $showPayload = [
            'cierre' => $cierre,
            'transacciones_externas' => $transaccionesExternas,
            'userRole' => $currentUser->role ?? 'vendedor',
            'comision_pv_total' => round((float) $comisionPVTotal, 2),
            'comision_gestor_total' => round((float) $comisionGestorTotal, 2),
            'comisiones_pv_detalles' => $comisionesPVDetallesCierre,
            'ganancia_agencia_total' => round($gananciaAgenciaTotal, 2),
            // Resumen financiero
            'ventas_brutas_usd' => round((float) $ventasBrutasUSD, 2),
            'comisiones_pv_cup' => round((float) $comisionesPVCUP, 2),
            'comisiones_gestor_cup' => round($comisionesGestorCUPTotal, 2),
            'comisiones_total_cup' => $comisionesTotalCUP,
            'almacenes' => $almacenes,
            // Ventas especiales
            'ventas_especiales_count' => $veCount,
            'ventas_especiales_total_usd' => round($veTotal, 2),
            'ventas_especiales_costo_usd' => round($veCosto, 2),
            'ventas_especiales_impacto_usd' => round($veTotal - $veCosto, 2),
            'ventas_especiales_detalles' => $veDetalles,
            // Ventas sin comisión (de la agencia)
            'ventas_sin_comision_count' => $vscCount,
            'ventas_sin_comision_total_usd' => round($vscTotal, 2),
            'ventas_sin_comision_costo_usd' => round($vscCosto, 2),
            'ventas_sin_comision_impacto_usd' => round($vscTotal - $vscCosto, 2),
            'ventas_sin_comision_detalles' => $vscDetalles,
            // Ventas anuladas
            'ventas_anuladas_count' => $vaCount,
            'ventas_anuladas_total_usd' => $vaTotalUSD,
            'ventas_anuladas_detalles' => $vaDetalles,
            // Ventas devueltas
            'ventas_devueltas_count' => $vdCount,
            'ventas_devueltas_total_usd' => $vdTotalUSD,
            'ventas_devueltas_detalles' => $vdDetalles,
            // Mensajería del turno
            'mensajero_total_usd' => $mensajeroTotUSD,
            'mensajero_total_cup' => $mensajeroTotCUP,
            'mensajero_count' => $mensajeroCount,
            'mensajero_propio_total_cup' => $mensajeroPropioTotCUP,
            'mensajero_externo_total_cup' => $mensajeroExternoTotCUP,
            'mensajero_detalles' => $mensajeroDetallesList,
            // Comparativa con cierre anterior
            'comparativa_cuentas' => $comparativaCuentas,
            'comparativa_cuentas_cobro' => $cierreUser ? $this->cuentasDeCobroDelTurno($cierreUser, $cierre->fecha_apertura, $cierre->fecha_cierre) : [],
            'comparativa_clientes' => $comparativaClientes,
            'tiene_cierre_anterior' => $tieneCierreAnterior,
            // Lo que el cierre guarda desde el 10-09; los cierres anteriores no lo tienen (null / false)
            'turno_cierre' => $cierre->turnoVendedor?->nombre_vendedor,
            'turnos' => $cierre->resumen_turnos,
            'envios_guardados' => is_array($cierre->envios_en_transito),
            'envios_en_transito' => $cierre->envios_en_transito,
            // Se recalculan por las fechas del cierre, como las ventas especiales
            'operaciones_multiples' => $this->detalleOperacionesMultiples($currentUser, $cierre->fecha_apertura, $cierre->fecha_cierre),
        ];

        if (! $puedeVerCostoImpactoEspeciales) {
            unset(
                $showPayload['ventas_especiales_costo_usd'],
                $showPayload['ventas_especiales_impacto_usd'],
                $showPayload['ventas_sin_comision_costo_usd'],
                $showPayload['ventas_sin_comision_impacto_usd']
            );

            $showPayload['ventas_especiales_detalles'] = array_map(function ($detalle) {
                unset($detalle['costo'], $detalle['impacto']);

                return $detalle;
            }, $showPayload['ventas_especiales_detalles']);

            $showPayload['ventas_sin_comision_detalles'] = array_map(function ($detalle) {
                unset($detalle['costo'], $detalle['impacto']);

                return $detalle;
            }, $showPayload['ventas_sin_comision_detalles']);
        }

        return Inertia::render('Cierres/Show', $showPayload);
    }

    public function aprobar(Request $request, $id)
    {
        // Solo quien revisa los cierres (admin o moderador); antes cualquier usuario autenticado podía aprobar cualquiera
        abort_unless(in_array(Auth::user()->role, ['admin', 'moderador'], true), 403);

        $cierre = CierreCaja::findOrFail($id);
        $cierre->update([
            'estado' => 'aprobado',
            'revisor_id' => Auth::id(),
        ]);

        return back()->with('success', 'Cierre aprobado.');
    }

    /**
     * Método helper privado para calcular detalles de cierre.
     * Centraliza la lógica para create y store.
     */
    private function obtenerDetallesCierre($user, $inicioTurno)
    {
        // 1. Obtener Pagos de Ventas (Ingresos por Venta) - solo ventas completadas
        $pagos = PagoVenta::whereHas('venta', function ($q) use ($user, $inicioTurno) {
            $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno)
                ->where('estado', 'completada');
        })->with(['moneda', 'cuenta', 'cliente', 'venta.detalles.producto.categoria', 'venta.turnoVendedor'])->get();

        // Acumular mensajero del turno (solo ventas completadas con mensajero)
        $ventasConMensajero = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->whereNotNull('mensajero_monto')
            ->where('mensajero_monto', '>', 0)
            ->with(['mensajeroMoneda', 'detalles.producto:id,nombre_producto,marca_producto,modelo_producto'])
            ->get(['id', 'total', 'mensajero_monto', 'mensajero_monto_original', 'mensajero_monto_final_cup', 'mensajero_moneda_id', 'mensajero_tipo', 'mensajero_cuenta_id', 'mensajero_tasa', 'mensajero_tasa_entrada', 'mensajero_cuenta_origen_id']);

        // 2. Obtener IDs de cuentas del usuario para buscar transferencias entrantes
        $cuentaIds = $user->cuentas()->pluck('id')->toArray();

        // Cuentas que maneja este usuario (admin y moderador, todas): un movimiento entre dos cuentas suyas no cambia lo
        // que maneja, así que no entra en el saldo esperado; solo cuenta lo que sale hacia fuera o entra desde fuera.
        $propiasIds = $user->cuentasPropias()->pluck('cuentas.id')->map(fn ($id) => (int) $id)->all();

        // Saldo esperado global en USD: se suma cada operación con lo que valía el día que se hizo (`monto_usd`,
        // `monto_equivalente`), nunca con la tasa de hoy, para que un cambio de tasa no altere el cierre.
        $saldoEsperadoUsd = 0.0;
        $gastosUsd = 0.0; // gastos que salieron de una cuenta, con la tasa de cada uno

        // 2. Obtener Movimientos Financieros (Gastos, Ingresos, Transferencias) del usuario
        // Incluye cualquier movimiento que afecte las cuentas del usuario, sin importar quién lo creó
        $movimientos = MovimientoFinanciero::where(function ($query) use ($user, $cuentaIds) {
            // Movimientos creados por el usuario (gastos, ingresos, transferencias)
            $query->where('user_id', $user->id);

            // Movimientos de otros usuarios que afectan las cuentas del vendedor
            if (! empty($cuentaIds)) {
                // Gastos desde cuentas del usuario (hechos por admin/otros vendedores)
                $query->orWhere(function ($q) use ($cuentaIds) {
                    $q->where('tipo_movimiento_id', 1)
                        ->whereIn('cuenta_origen_id', $cuentaIds);
                });
                // Ingresos a cuentas del usuario (hechos por admin/otros vendedores)
                $query->orWhere(function ($q) use ($cuentaIds) {
                    $q->where('tipo_movimiento_id', 2)
                        ->whereIn('cuenta_destino_id', $cuentaIds);
                });
                // Transferencias desde/hacia cuentas del usuario (hechas por admin/otros vendedores)
                $query->orWhere(function ($q) use ($cuentaIds) {
                    $q->where('tipo_movimiento_id', 3)
                        ->where(function ($qq) use ($cuentaIds) {
                            $qq->whereIn('cuenta_origen_id', $cuentaIds)
                                ->orWhereIn('cuenta_destino_id', $cuentaIds);
                        });
                });
            }
        })
            ->where('fecha_operacion', '>=', $inicioTurno)
            ->with(['tipoMovimiento', 'cuentaOrigen', 'cuentaDestino', 'clienteOrigen', 'clienteDestino', 'proveedorDestino', 'user', 'turnoVendedor'])
            ->get();

        // Transferencias que nacieron de un envío en tránsito: su salida ya se contó el día del envío, así que al
        // confirmarse solo cuenta la entrada (con lo que de verdad se acreditó).
        $enviosPorMovimiento = TransferenciaPendiente::whereIn('movimiento_financiero_id', $movimientos->where('tipo_movimiento_id', 3)->pluck('id'))
            ->get()
            ->keyBy('movimiento_financiero_id');

        // Estructura para agrupar por Moneda
        $resumenPorMoneda = [];

        // Inicializar monedas activas (Principal primero)
        $monedas = Moneda::where('estado', true)->orderBy('principal', 'desc')->orderBy('codigo_moneda')->get();
        foreach ($monedas as $moneda) {
            $resumenPorMoneda[$moneda->codigo_moneda] = [
                'moneda' => $moneda->codigo_moneda,
                'tasa_cambio' => $moneda->tasa_cambio > 0 ? $moneda->tasa_cambio : 1,
                'moneda_imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($moneda->imagen)['imagen_url'] ?? null,
                // Pagos que entraron a CUENTAS del vendedor (afectan saldo)
                'ventas_efectivo_cuentas' => 0,
                'ventas_transferencia_cuentas' => 0,
                'ventas_a_cuentas_total' => 0,
                // Pagos que fueron a DEUDA de CLIENTES (no afectan saldo)
                'ventas_efectivo_clientes' => 0,
                'ventas_transferencia_clientes' => 0,
                'ventas_a_clientes_total' => 0,
                // Campos legacy para compatibilidad
                'ventas_efectivo' => 0,
                'ventas_transferencia' => 0,
                'ingresos_extra' => 0,
                'gastos' => 0,
                'transferencias_salientes' => 0,
                'transferencias_entrantes' => 0,
                'saldo_calculado' => 0,
                // Detalles específicos para la UI
                'items_ventas' => [], // Compatibilidad legacy
                'items_ventas_cuentas' => [],
                'items_ventas_clientes' => [],
                'items_gastos' => [],
                'items_ingresos' => [],
                'items_transferencias_salientes' => [],
                'items_transferencias_entrantes' => [],
                'productos_resumen' => [],
                'pagos_resumen' => [
                    'efectivo' => 0,
                    'transferencia' => 0,
                ],
                'operaciones_detalle' => [],
            ];
        }
        // Asegurar que si hay monedas en pagos que no esten activas, se creen
        // (Aunque el sistema no debería permitirlo, es defensivo)

        // --- PROCESAR PAGOS DE VENTAS ---
        $ventasProcesadas = []; // Trackear ventas ya procesadas para evitar duplicados de productos
        $ventasConDetalles = []; // Cachear detalles de productos por venta_id

        Log::info('CIERRE: Procesando pagos', ['count' => $pagos->count(), 'user_id' => $user->id, 'inicio_turno' => $inicioTurno]);

        // Primero, construir cache de detalles de productos por venta
        foreach ($pagos as $pago) {
            if ($pago->venta && $pago->venta->detalles && ! isset($ventasConDetalles[$pago->venta_id])) {
                $tasaVenta = (float) ($pago->venta->tasa_cambio_principal ?: 1);
                $detallesProductos = [];
                foreach ($pago->venta->detalles as $det) {
                    $nombre = $det->producto ? $det->producto->nombre_producto : 'Producto Desconocido';
                    $marca = $det->producto && $det->producto->marca_producto
                        ? trim($det->producto->marca_producto)
                        : '';
                    $modelo = $det->producto && $det->producto->modelo_producto
                        ? trim($det->producto->modelo_producto)
                        : '';
                    $capacidad = $det->producto && $det->producto->capacidad_producto
                        ? trim($det->producto->capacidad_producto)
                        : '';
                    $color = $det->producto && $det->producto->color_producto
                        ? trim($det->producto->color_producto)
                        : '';
                    $categoria = $det->producto && $det->producto->categoria
                        ? trim($det->producto->categoria->nombre_categoria)
                        : '';
                    $partes = array_filter([$nombre, $marca, $modelo, $capacidad]);
                    $descripcionCompleta = implode(' ', $partes);
                    $precioVenta = (float) $det->precio_venta;
                    $subtotal = (float) $det->subtotal;
                    $precioEquiv = $tasaVenta > 0 ? $precioVenta / $tasaVenta : $precioVenta;
                    $subtotalEquiv = $tasaVenta > 0 ? $subtotal / $tasaVenta : $subtotal;
                    $detallesProductos[] = [
                        'cantidad' => (int) $det->cantidad,
                        'descripcion' => $nombre,
                        'marca' => $marca,
                        'modelo' => $modelo,
                        'capacidad' => $capacidad,
                        'color' => $color,
                        'categoria' => $categoria,
                        'precio_unitario' => $precioVenta,
                        'total' => $subtotal,
                        'precio_equivalente' => round($precioEquiv, 2),
                        'total_equivalente' => round($subtotalEquiv, 2),
                    ];
                }
                $ventasConDetalles[$pago->venta_id] = $detallesProductos;
            }
        }

        foreach ($pagos as $pago) {
            $codigo = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD';
            if (! isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }
            if (! isset($resumenPorMoneda[$codigo]['pagos_resumen'])) {
                $resumenPorMoneda[$codigo]['pagos_resumen'] = ['efectivo' => 0, 'transferencia' => 0];
            }
            if (! isset($resumenPorMoneda[$codigo]['productos_resumen'])) {
                $resumenPorMoneda[$codigo]['productos_resumen'] = [];
            }

            $detallesProductos = $ventasConDetalles[$pago->venta_id] ?? [];

            // Destino del pago: cuenta (ej. ZELLE EDDY ALONSO) o cliente o efectivo
            $destinoNombre = $pago->cuenta
                ? $pago->cuenta->nombre_cuenta
                : ($pago->cliente ? $pago->cliente->nombre_cliente : null);
            $bancoCuenta = CatalogoTarjetasService::porSlug($pago->cuenta?->imagen);
            $monedaImagenUrl = CatalogoTarjetasService::monedaImagenPorSlug($pago->moneda?->imagen)['imagen_url'] ?? null;
            $itemVenta = [
                'id' => 'p_'.$pago->id,
                'venta_id' => $pago->venta_id,
                'monto' => (float) $pago->monto,
                'monto_equivalente' => (float) ($pago->monto_equivalente ?? $pago->monto),
                'tasa_cambio_aplicada' => (float) ($pago->tasa_cambio_aplicada ?? 1),
                'tipo_pago' => $pago->tipo_pago,
                'confirmada' => ! empty($pago->referencia),
                'referencia' => $pago->referencia,
                'cliente' => $pago->cliente ? $pago->cliente->nombre_cliente : 'Mostrador',
                'hora' => $pago->created_at->format('H:i'),
                'detalles' => $detallesProductos,
                'moneda_codigo' => $pago->moneda ? $pago->moneda->codigo_moneda : 'USD',
                'via_pago' => $pago->via_pago ?? null,
                'via_info' => $this->metodosPago->viaPorSlug($pago->via_pago),
                'cuenta_nombre' => $pago->cuenta ? $pago->cuenta->nombre_cuenta : null,
                'cliente_nombre' => $pago->cliente ? $pago->cliente->nombre_cliente : null,
                'destino_nombre' => $destinoNombre,
                'banco' => $bancoCuenta,
                'moneda_imagen_url' => $monedaImagenUrl,
                'turno_nombre' => $pago->venta?->turnoVendedor?->nombre_vendedor,
            ];

            // ===== CLASIFICAR PAGO POR DESTINO Y MÉTODO =====
            // Determinar si el pago fue a CUENTA (afecta saldo) o a CLIENTE (deuda, no afecta saldo)
            $esPagoACuenta = ! empty($pago->cuenta_id);
            $esPagoACliente = ! empty($pago->cliente_id);
            $esEfectivo = $pago->tipo_pago === 'efectivo';
            $monto = (float) $pago->monto;

            // Campos legacy - mantener para compatibilidad
            if ($esEfectivo) {
                $resumenPorMoneda[$codigo]['ventas_efectivo'] += $monto;
                $resumenPorMoneda[$codigo]['pagos_resumen']['efectivo'] += $monto;
            } else {
                $resumenPorMoneda[$codigo]['ventas_transferencia'] += $monto;
                $resumenPorMoneda[$codigo]['pagos_resumen']['transferencia'] += $monto;
            }

            // NUEVO: Clasificación detallada por destino
            if ($esPagoACuenta) {
                // Pago a CUENTA - sí afecta el saldo del vendedor
                if ($esEfectivo) {
                    $resumenPorMoneda[$codigo]['ventas_efectivo_cuentas'] += $monto;
                } else {
                    $resumenPorMoneda[$codigo]['ventas_transferencia_cuentas'] += $monto;
                }
                $resumenPorMoneda[$codigo]['ventas_a_cuentas_total'] += $monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] += $monto; // Sí suma al saldo
                $saldoEsperadoUsd += $pago->monto_equivalente !== null
                    ? (float) $pago->monto_equivalente
                    : $monto / max((float) ($resumenPorMoneda[$codigo]['tasa_cambio'] ?? 1), 0.0001);
                $resumenPorMoneda[$codigo]['items_ventas_cuentas'][] = $itemVenta;
            } elseif ($esPagoACliente) {
                // Pago a CLIENTE - NO afecta el saldo (es deuda del cliente)
                if ($esEfectivo) {
                    $resumenPorMoneda[$codigo]['ventas_efectivo_clientes'] += $monto;
                } else {
                    $resumenPorMoneda[$codigo]['ventas_transferencia_clientes'] += $monto;
                }
                $resumenPorMoneda[$codigo]['ventas_a_clientes_total'] += $monto;
                // NO suma a saldo_calculado - este dinero no entró a las cuentas del vendedor
                $resumenPorMoneda[$codigo]['items_ventas_clientes'][] = $itemVenta;
            }

            // MANTENER COMPATIBILIDAD: también agregar al array items_ventas original
            $resumenPorMoneda[$codigo]['items_ventas'][] = $itemVenta;

            // --- AGREGAR A OPERACIONES DETALLE (DESGLOSE POR MÉTODO DE PAGO) ---
            $resumenPorMoneda[$codigo]['operaciones_detalle'][] = [
                'venta_id' => $pago->venta_id,
                'pago_id' => $pago->id,
                'cliente' => $pago->cliente ? $pago->cliente->nombre_cliente : 'Mostrador',
                'monto' => (float) $pago->monto,
                'tasa_cambio_aplicada' => (float) ($pago->tasa_cambio_aplicada ?? 1),
                'hora' => $pago->created_at->format('H:i'),
                'tipo_pago' => $pago->tipo_pago,
                'via_pago' => $pago->via_pago ?? null,
                'via_info' => $this->metodosPago->viaPorSlug($pago->via_pago),
                'cuenta_nombre' => $pago->cuenta ? $pago->cuenta->nombre_cuenta : null,
                'destino_nombre' => $destinoNombre,
                'banco' => $bancoCuenta,
                'moneda_imagen_url' => $monedaImagenUrl,
                'productos' => $detallesProductos,
            ];

            // --- AGREGAR A RESUMEN DE PRODUCTOS (AGRUPADO POR PRODUCTO + PRECIO) ---
            // Esto permite mostrar precios variables: 5 x $35 + 3 x $40 = filas separadas
            if ($pago->venta && $pago->venta->detalles && ! in_array($pago->venta_id, $ventasProcesadas)) {
                $ventasProcesadas[] = $pago->venta_id;
                foreach ($pago->venta->detalles as $det) {
                    $prodId = $det->producto_id;
                    $precioVenta = (float) $det->precio_venta;

                    // Obtener precio base desde la fila única del almacén
                    $precioBase = DB::table('producto_vendedors')
                        ->where('producto_id', $prodId)
                        ->where('almacen_id', $pago->venta->almacen_id)
                        ->value('precio_venta');

                    $precioBase = $precioBase ? (float) $precioBase : $precioVenta;

                    $producto = $det->producto;
                    $nombreProd = $producto ? $producto->nombre_producto : 'Producto Desconocido';
                    $marca = $producto ? $producto->marca_producto : '';
                    $modelo = $producto ? $producto->modelo_producto : '';
                    $capacidad = $producto ? $producto->capacidad_producto : '';
                    $color = $producto ? $producto->color_producto : '';
                    $codigoProducto = $producto ? $producto->codigo_producto : '';
                    $imagen = $producto ? $producto->imagen_url : '';
                    $categoria = $producto && $producto->categoria ? $producto->categoria->nombre_categoria : '';
                    $almacenId = $pago->venta->almacen_id;

                    // Agrupar por producto + almacen para manejar precios base diferentes por almacen
                    $key = $prodId.'_'.$almacenId;

                    if (! isset($resumenPorMoneda[$codigo]['productos_resumen'][$key])) {
                        $resumenPorMoneda[$codigo]['productos_resumen'][$key] = [
                            'id' => $prodId,
                            'almacen_id' => $almacenId,
                            'nombre' => $nombreProd,
                            'marca' => $marca,
                            'modelo' => $modelo,
                            'capacidad' => $capacidad,
                            'color' => $color,
                            'codigo' => $codigoProducto,
                            'imagen_url' => $imagen,
                            'categoria' => $categoria,
                            'cantidad' => 0,
                            'precio_base' => $precioBase,
                            'precio_venta' => $precioVenta,
                            'total' => 0,
                            'comision' => 0,
                        ];
                    }

                    $resumenPorMoneda[$codigo]['productos_resumen'][$key]['cantidad'] += $det->cantidad;
                    $resumenPorMoneda[$codigo]['productos_resumen'][$key]['total'] += (float) $det->subtotal;

                    // Calcular comisión prorrateada (PV o Gestor)
                    $detSubtotal = (float) $det->subtotal;
                    $totalProductos = (float) $pago->venta->detalles->sum('subtotal');
                    $ratio = $totalProductos > 0 ? $detSubtotal / $totalProductos : 0;

                    $hasGestor = ($pago->venta->es_venta_gestor ?? false) && (float) ($pago->venta->gestor_monto ?? 0) > 0;

                    if ($hasGestor) {
                        $gestorMonto = (float) ($pago->venta->gestor_monto ?? 0);
                        $gestorTasa = (float) ($pago->venta->tasa_aplicada_gestor ?? 0);
                        $gestorUSD = $gestorTasa > 0 ? $gestorMonto / $gestorTasa : $gestorMonto;
                        $comisionTotal = $ratio * $gestorUSD;
                    } else {
                        $comisionTotal = (float) $det->comision_unitaria * $det->cantidad;
                    }

                    $resumenPorMoneda[$codigo]['productos_resumen'][$key]['comision'] += round($comisionTotal, 2);
                }
            }
        }

        // --- PROCESAR MOVIMIENTOS FINANCIEROS ---
        foreach ($movimientos as $mov) {
            $codigo = $mov->moneda ?? 'USD';
            if (! isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }

            // Lo que valía la operación en USD el día que se hizo (los movimientos viejos se congelaron en la migración)
            $montoUsdOperacion = $mov->monto_usd !== null
                ? (float) $mov->monto_usd
                : Moneda::equivalenteUsd((float) $mov->monto, $mov->cuenta_origen_id ?? $mov->cuenta_destino_id, $mov->moneda);

            // TIPO 1: GASTO
            if ($mov->tipo_movimiento_id == 1) {
                // Solo cambia la caja si sale de una cuenta; el gasto de un cliente es informativo (su deuda, no una cuenta).
                $afectaCaja = $mov->cuenta_origen_id !== null;
                $item = [
                    'id' => 'm_'.$mov->id,
                    'desc' => $mov->descripcion,
                    'monto' => $mov->monto,
                    'moneda' => $mov->moneda ?? 'USD',
                    'moneda_imagen_url' => $resumenPorMoneda[$codigo]['moneda_imagen_url'] ?? null,
                    'hora' => $mov->created_at->format('H:i'),
                    'origen' => $this->obtenerNombreOrigen($mov),
                    'destino' => $this->obtenerNombreDestino($mov),
                    'banco' => $this->logoDeCuenta($mov->cuentaOrigen),
                    'usuario_nombre' => $mov->user?->name ?? 'Sistema',
                    'es_propio' => $mov->user_id == $user->id,
                    'afecta_caja' => $afectaCaja,
                    'turno_nombre' => $mov->turnoVendedor?->nombre_vendedor,
                ];

                if ($afectaCaja) {
                    // Resta a la caja
                    $resumenPorMoneda[$codigo]['gastos'] += $mov->monto;
                    $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto; // Gasto sale de caja
                    $saldoEsperadoUsd -= $montoUsdOperacion;
                    $gastosUsd += $montoUsdOperacion;
                } else {
                    $resumenPorMoneda[$codigo]['gastos_clientes'] = ($resumenPorMoneda[$codigo]['gastos_clientes'] ?? 0) + $mov->monto;
                }
                $resumenPorMoneda[$codigo]['items_gastos'][] = $item;
            }
            // TIPO 2: INGRESO
            elseif ($mov->tipo_movimiento_id == 2) {
                // Solo cambia la caja si entra a una cuenta; el ingreso a un cliente es informativo.
                $afectaCaja = $mov->cuenta_destino_id !== null;
                $item = [
                    'id' => 'm_'.$mov->id,
                    'desc' => $mov->descripcion,
                    'monto' => $mov->monto,
                    'moneda' => $mov->moneda ?? 'USD',
                    'moneda_imagen_url' => $resumenPorMoneda[$codigo]['moneda_imagen_url'] ?? null,
                    'hora' => $mov->created_at->format('H:i'),
                    'origen' => $this->obtenerNombreOrigen($mov),
                    'destino' => $this->obtenerNombreDestino($mov),
                    'banco' => $this->logoDeCuenta($mov->cuentaDestino),
                    'usuario_nombre' => $mov->user?->name ?? 'Sistema',
                    'es_propio' => $mov->user_id == $user->id,
                    'afecta_caja' => $afectaCaja,
                    'turno_nombre' => $mov->turnoVendedor?->nombre_vendedor,
                ];

                if ($afectaCaja) {
                    // Suma a la caja
                    $resumenPorMoneda[$codigo]['ingresos_extra'] += $mov->monto;
                    $resumenPorMoneda[$codigo]['saldo_calculado'] += $mov->monto;
                    $saldoEsperadoUsd += $montoUsdOperacion;
                } else {
                    $resumenPorMoneda[$codigo]['ingresos_clientes'] = ($resumenPorMoneda[$codigo]['ingresos_clientes'] ?? 0) + $mov->monto;
                }
                $resumenPorMoneda[$codigo]['items_ingresos'][] = $item;
            }
            // TIPO 3: TRANSFERENCIA
            elseif ($mov->tipo_movimiento_id == 3) {
                // Solo cuenta lo que cambia lo que maneja el usuario: sale cuando va a algo que no es suyo (otra persona,
                // un cliente, un proveedor) y entra cuando viene de algo que no es suyo; entre cuentas suyas es neutral.
                $origenEsPropio = $mov->cuenta_origen_id !== null && in_array((int) $mov->cuenta_origen_id, $propiasIds, true);
                $destinoEsPropio = $mov->cuenta_destino_id !== null && in_array((int) $mov->cuenta_destino_id, $propiasIds, true);
                $envioDeOrigen = $enviosPorMovimiento->get($mov->id);

                $salidaCuenta = $origenEsPropio && ! $destinoEsPropio && $envioDeOrigen === null;
                $entradaCuenta = $destinoEsPropio && ! $origenEsPropio;

                // Entrada de un envío que llegó incompleto: vale lo acreditado, no lo enviado
                $montoAcreditado = $envioDeOrigen?->monto_acreditado;
                $usdEntrada = $montoUsdOperacion;
                if ($envioDeOrigen && $envioDeOrigen->monto_destino > 0 && $montoAcreditado !== null) {
                    $usdEntrada = round($montoUsdOperacion * ($montoAcreditado / $envioDeOrigen->monto_destino), 2);
                }

                // Procesar transferencia con detalles bidireccionales
                $detallesTransferencia = $this->procesarTransferenciaBidireccional($mov, $resumenPorMoneda, $user, $salidaCuenta, $entradaCuenta, $montoAcreditado);

                // Actualizar saldos según corresponda
                if ($salidaCuenta) {
                    $resumenPorMoneda[$codigo]['transferencias_salientes'] += $mov->monto;
                    $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto;
                    $saldoEsperadoUsd -= $montoUsdOperacion;
                }
                if ($entradaCuenta) {
                    $saldoEsperadoUsd += $usdEntrada;
                }

                $esReceptor = $entradaCuenta;

                // Solo agregar a salientes si el usuario es el EMISOR (no receptor)
                if (! $esReceptor) {
                    $resumenPorMoneda[$codigo]['items_transferencias_salientes'][] = $detallesTransferencia['item_salida'];
                }
            }
        }

        // --- ENVÍOS DE DINERO EN TRÁNSITO ---
        // El efectivo puede tardar días en llegar. La salida cuenta el día del ENVÍO (el dinero ya salió de la cuenta de
        // origen), con lo que valía ese día; la entrada cuenta al confirmarse, como transferencia (arriba), con lo
        // acreditado. Un envío entre cuentas del propio usuario no cambia lo que maneja y no cuenta.
        $enviosHaciaFuera = fn () => TransferenciaPendiente::query()
            ->whereIn('cuenta_origen_id', $propiasIds)
            ->whereNotIn('cuenta_destino_id', $propiasIds);
        $estadosSinDinero = [TransferenciaPendiente::ESTADO_RECHAZADO, TransferenciaPendiente::ESTADO_ANULADO];

        // Salidas del turno: enviadas en el periodo y no rechazadas ni anuladas (si se devolvió dentro del mismo
        // periodo, la salida y el retorno se compensan y no hay nada que contar).
        foreach ($enviosHaciaFuera()->where('created_at', '>=', $inicioTurno)->whereNotIn('estado', $estadosSinDinero)->get() as $envio) {
            $codigoEnvio = $envio->moneda ?? 'USD';
            if (! isset($resumenPorMoneda[$codigoEnvio])) {
                $resumenPorMoneda[$codigoEnvio] = $this->initMonedaStruct($codigoEnvio);
            }
            $resumenPorMoneda[$codigoEnvio]['saldo_calculado'] -= $envio->monto;
            $resumenPorMoneda[$codigoEnvio]['envios_salida'] = ($resumenPorMoneda[$codigoEnvio]['envios_salida'] ?? 0) + $envio->monto;
            $saldoEsperadoUsd -= $envio->monto_usd ?? Moneda::equivalenteUsd((float) $envio->monto, $envio->cuenta_origen_id, $envio->moneda);
        }

        // Retornos: envíos de un cierre anterior que se rechazaron o anularon en este periodo; el dinero volvió al origen
        // y esa salida ya se había contado antes.
        $enviosDevueltos = $enviosHaciaFuera()
            ->where('created_at', '<', $inicioTurno)
            ->whereIn('estado', $estadosSinDinero)
            ->whereHas('seguimientos', fn ($q) => $q->whereIn('estado', $estadosSinDinero)->where('created_at', '>=', $inicioTurno))
            ->get();
        foreach ($enviosDevueltos as $envio) {
            $codigoEnvio = $envio->moneda ?? 'USD';
            if (! isset($resumenPorMoneda[$codigoEnvio])) {
                $resumenPorMoneda[$codigoEnvio] = $this->initMonedaStruct($codigoEnvio);
            }
            $resumenPorMoneda[$codigoEnvio]['saldo_calculado'] += $envio->monto;
            $resumenPorMoneda[$codigoEnvio]['envios_retorno'] = ($resumenPorMoneda[$codigoEnvio]['envios_retorno'] ?? 0) + $envio->monto;
            $saldoEsperadoUsd += $envio->monto_usd ?? Moneda::equivalenteUsd((float) $envio->monto, $envio->cuenta_origen_id, $envio->moneda);
        }

        // --- PROCESAR COMISIONES A GESTORES (Ventas con es_venta_gestor = true) ---
        $comisionesGestorTotalUSD = 0;
        $comisionesGestorDetalles = [];

        // Buscar ventas con gestor en el turno actual - solo ventas completadas
        $ventasConGestor = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->where('es_venta_gestor', true)
            ->whereNotNull('gestor_cuenta_id')
            ->where('gestor_monto', '>', 0)
            ->with(['gestorCuenta.moneda', 'monedaCobro', 'detalles.producto:id,nombre_producto,marca_producto,modelo_producto'])
            ->get(['id', 'total', 'cliente_id', 'gestor_monto', 'gestor_cuenta_id', 'gestor_comentario', 'moneda_cobro_id', 'created_at', 'es_venta_gestor', 'tasa_aplicada_gestor']);

        foreach ($ventasConGestor as $venta) {
            $montoComision = (float) $venta->gestor_monto;

            // Obtener la moneda de la cuenta del gestor - primero por relación, luego por campo directo
            $gestorCuenta = $venta->gestorCuenta;
            $monedaCodigo =
                ($gestorCuenta?->moneda?->codigo_moneda) ??
                ($gestorCuenta?->tipo_moneda) ??
                'USD';

            // Tasa realmente negociada en la venta (tasa_aplicada_gestor, editable desde
            // guardarDestinatario()) tiene prioridad sobre la tasa global actual del sistema —
            // esta última puede haber cambiado desde que se hizo la venta.
            $tasaVenta = (float) ($venta->tasa_aplicada_gestor ?? 0);
            $tasaCambio = $tasaVenta > 0 ? $tasaVenta : ($gestorCuenta?->moneda?->tasa_cambio ?? 1);
            $montoEnUSD = $tasaCambio > 0 ? $montoComision / $tasaCambio : $montoComision;

            // Agregar al total
            $comisionesGestorTotalUSD += $montoEnUSD;

            // Crear detalle para la UI
            $comisionesGestorDetalles[] = [
                'venta_id' => $venta->id,
                'monto' => $montoComision,
                'moneda_codigo' => $monedaCodigo,
                'monto_usd' => round($montoEnUSD, 2),
                // Tasa efectiva (monto / monto_usd) — siempre coincide con los montos mostrados.
                'tasa' => $montoEnUSD > 0 ? round($montoComision / $montoEnUSD, 2) : null,
                'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta ?? 'N/A',
                'cuenta_tipo' => $venta->gestorCuenta?->tipo ?? 'N/A',
                'comentario' => $venta->gestor_comentario ?? '',
                'fecha' => $venta->created_at->format('Y-m-d H:i'),
                'total_venta' => round((float) $venta->total, 2),
                'productos' => $venta->detalles->map(fn ($d) => [
                    'nombre' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                    'marca' => $d->producto?->marca_producto,
                    'modelo' => $d->producto?->modelo_producto,
                    'cantidad' => (int) $d->cantidad,
                ])->values()->all(),
            ];

            // Restar del saldo calculado de la moneda correspondiente
            if (isset($resumenPorMoneda[$monedaCodigo])) {
                $resumenPorMoneda[$monedaCodigo]['comisiones_gestor'] = ($resumenPorMoneda[$monedaCodigo]['comisiones_gestor'] ?? 0) + $montoComision;
                $resumenPorMoneda[$monedaCodigo]['saldo_calculado'] -= $montoComision; // Comisión sale de caja
                $saldoEsperadoUsd -= $montoEnUSD; // ya con la tasa negociada en la venta
            }
        }

        // Agregar comisiones_gestor al resumen por moneda
        foreach ($resumenPorMoneda as $monedaCodigo => &$monedaData) {
            $monedaData['comisiones_gestor'] = $monedaData['comisiones_gestor'] ?? 0;
            $monedaData['comisiones_gestor_detalles'] = array_filter(
                $comisionesGestorDetalles,
                fn ($d) => $d['moneda_codigo'] === $monedaCodigo
            );
        }
        unset($monedaData); // Romper referencia

        // --- CALCULAR TOTALES GLOBALES (EQUIVALENTE USD) ---
        $ventasEfectivoTotalUSD = 0;
        $ventasOtrosTotalUSD = 0;
        $saldoEsperadoTotalUSD = 0;

        // NUEVO: Totales separados por destino
        $ventasACuentasTotalUSD = 0;
        $ventasAClientesTotalUSD = 0;
        $ventasACuentasEfectivoUSD = 0;
        $ventasACuentasTransferenciaUSD = 0;
        $ventasAClientesEfectivoUSD = 0;
        $ventasAClientesTransferenciaUSD = 0;

        foreach ($resumenPorMoneda as $monedaData) {
            $tasa = ! empty($monedaData['tasa_cambio']) && $monedaData['tasa_cambio'] > 0 ? $monedaData['tasa_cambio'] : 1;

            // Asegurar que todas las claves existan con valor por defecto
            $ventasEfectivo = $monedaData['ventas_efectivo'] ?? 0;
            $ventasTransferencia = $monedaData['ventas_transferencia'] ?? 0;
            $ventasACuentasTotal = $monedaData['ventas_a_cuentas_total'] ?? 0;
            $ventasAClientesTotal = $monedaData['ventas_a_clientes_total'] ?? 0;
            $ventasEfectivoCuentas = $monedaData['ventas_efectivo_cuentas'] ?? 0;
            $ventasTransferenciaCuentas = $monedaData['ventas_transferencia_cuentas'] ?? 0;
            $ventasEfectivoClientes = $monedaData['ventas_efectivo_clientes'] ?? 0;
            $ventasTransferenciaClientes = $monedaData['ventas_transferencia_clientes'] ?? 0;

            // Convertir a USD (Moneda Base)
            $ventasEfectivoTotalUSD += ($ventasEfectivo / $tasa);
            $ventasOtrosTotalUSD += ($ventasTransferencia / $tasa);

            // NUEVO: Calcular totales por destino
            $ventasACuentasTotalUSD += ($ventasACuentasTotal / $tasa);
            $ventasAClientesTotalUSD += ($ventasAClientesTotal / $tasa);
            $ventasACuentasEfectivoUSD += ($ventasEfectivoCuentas / $tasa);
            $ventasACuentasTransferenciaUSD += ($ventasTransferenciaCuentas / $tasa);
            $ventasAClientesEfectivoUSD += ($ventasEfectivoClientes / $tasa);
            $ventasAClientesTransferenciaUSD += ($ventasTransferenciaClientes / $tasa);

        }

        // El saldo esperado global ya viene acumulado con la tasa de cada operación (ver `$saldoEsperadoUsd`); por
        // moneda sigue siendo `saldo_calculado`, en unidades de esa moneda.
        $saldoEsperadoTotalUSD = $saldoEsperadoUsd;

        // --- WIDGETS: Totales por moneda para cuentas ---
        $usdEfectivoRaw = $resumenPorMoneda['USD']['ventas_efectivo_cuentas'] ?? 0;
        $eurEfectivoRaw = $resumenPorMoneda['EUR']['ventas_efectivo_cuentas'] ?? 0;
        $eurTasa = ! empty($resumenPorMoneda['EUR']['tasa_cambio']) && $resumenPorMoneda['EUR']['tasa_cambio'] > 0
            ? $resumenPorMoneda['EUR']['tasa_cambio']
            : 1;
        $cupEfectivoRaw = $resumenPorMoneda['CUP']['ventas_efectivo_cuentas'] ?? 0;
        $usdTransfRaw = $resumenPorMoneda['USD']['ventas_transferencia_cuentas'] ?? 0;
        $cupTransfRaw = $resumenPorMoneda['CUP']['ventas_transferencia_cuentas'] ?? 0;

        $widgetUsdEfectivo = $usdEfectivoRaw + round($eurEfectivoRaw / $eurTasa, 2);
        $widgetCupEfectivo = $cupEfectivoRaw;
        $widgetUsdTransferencia = $usdTransfRaw;
        $widgetCupTransferencias = $cupTransfRaw;

        // --- VENTAS ESPECIALES COMPLETADAS EN EL TURNO ---
        $ventasEspeciales = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->where('es_venta_especial', true)
            ->with(['detalles'])
            ->get();

        $ventasEspecialesCount = $ventasEspeciales->count();
        $ventasEspecialesTotalUSD = 0;
        $ventasEspecialesCostoUSD = 0;
        $ventasEspecialesDetalles = [];

        foreach ($ventasEspeciales as $ventaE) {
            $totalVenta = (float) $ventaE->total;
            $costoVenta = $ventaE->detalles->sum(fn ($d) => (float) $d->costo_unitario * (int) $d->cantidad);

            $ventasEspecialesTotalUSD += $totalVenta;
            $ventasEspecialesCostoUSD += $costoVenta;

            $ventasEspecialesDetalles[] = [
                'venta_id' => $ventaE->id,
                'motivo' => $ventaE->nota_venta_especial ?? 'Sin motivo registrado',
                'total' => round($totalVenta, 2),
                'costo' => round($costoVenta, 2),
                'impacto' => round($totalVenta - $costoVenta, 2),
                'es_regalo' => $totalVenta == 0,
                'fecha' => $ventaE->created_at->format('Y-m-d H:i'),
            ];
        }

        $ventasEspecialesImpactoUSD = round($ventasEspecialesTotalUSD - $ventasEspecialesCostoUSD, 2);

        // --- VENTAS SIN COMISIÓN (de la agencia) COMPLETADAS EN EL TURNO ---
        $ventasSinComision = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->where('es_venta_sin_comision', true)
            ->with(['detalles'])
            ->get();

        $ventasSinComisionCount = $ventasSinComision->count();
        $ventasSinComisionTotalUSD = 0;
        $ventasSinComisionCostoUSD = 0;
        $ventasSinComisionDetalles = [];

        foreach ($ventasSinComision as $ventaSC) {
            $totalVenta = (float) $ventaSC->total;
            $costoVenta = $ventaSC->detalles->sum(fn ($d) => (float) $d->costo_unitario * (int) $d->cantidad);

            $ventasSinComisionTotalUSD += $totalVenta;
            $ventasSinComisionCostoUSD += $costoVenta;

            $ventasSinComisionDetalles[] = [
                'venta_id' => $ventaSC->id,
                'total' => round($totalVenta, 2),
                'costo' => round($costoVenta, 2),
                'impacto' => round($totalVenta - $costoVenta, 2),
                'fecha' => $ventaSC->created_at->format('Y-m-d H:i'),
            ];
        }

        $ventasSinComisionImpactoUSD = round($ventasSinComisionTotalUSD - $ventasSinComisionCostoUSD, 2);

        // --- COMISIÓN PUNTO DE VENTA (ventas sin gestor) ---
        $comisionesPVVentas = Venta::with(['detalles.producto:id,nombre_producto,marca_producto,modelo_producto', 'comisionCuenta.moneda'])
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->where('es_venta_gestor', false)
            ->where('total_comision', '>', 0)
            ->get(['id', 'total', 'cliente_id', 'total_comision', 'comision_tasa', 'comision_cuenta_id', 'created_at']);

        $comisionPVTotal = $comisionesPVVentas->sum(fn ($v) => (float) $v->total_comision
        );

        $comisionesPVDetalles = $comisionesPVVentas->map(fn ($v) => [
            'venta_id' => $v->id,
            'comision_usd' => round((float) $v->total_comision, 2),
            'comision_cup' => $v->comisionCuenta?->moneda?->codigo_moneda === 'USD' ? 0.0 : round((float) $v->total_comision * (float) ($v->comision_tasa ?: 1), 2),
            'fecha' => $v->created_at->format('Y-m-d H:i'),
            'total_venta' => round((float) $v->total, 2),
            'productos' => $v->detalles->map(fn ($d) => [
                'nombre' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                'marca' => $d->producto?->marca_producto,
                'modelo' => $d->producto?->modelo_producto,
                'cantidad' => (int) $d->cantidad,
            ])->values()->all(),
        ])->values()->all();

        // --- COMISIÓN GESTOR (ventas con gestor, en USD) ---
        $comisionGestorTotal = $comisionesGestorTotalUSD;

        // --- GANANCIA AGENCIA (total_ganancia - total_comision de todas las ventas) ---
        $ventasDelTurno = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->get(['total_ganancia', 'total_comision']);

        $gananciaAgenciaTotal = $ventasDelTurno->sum(fn ($v) => (float) $v->total_ganancia - (float) $v->total_comision
        );

        // --- RESUMEN FINANCIERO DEL TURNO ---
        $ventasBrutasUSD = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->sum('total_esperado_usd');

        // Comisiones PV en CUP: total_comision (USD) × comision_tasa
        $comisionesPVCUP = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada')
            ->where('es_venta_gestor', false)
            ->whereDoesntHave('comisionCuenta.moneda', fn ($q) => $q->where('codigo_moneda', 'USD'))
            ->whereNotNull('comision_tasa')
            ->where('comision_tasa', '>', 0)
            ->selectRaw('COALESCE(SUM(total_comision * comision_tasa), 0) as total_cup')
            ->value('total_cup') ?? 0;

        // Comisiones Gestor en CUP: suma de gestor_monto en cuentas CUP
        $comisionesGestorCUP = array_sum(array_map(
            fn ($d) => ($d['moneda_codigo'] ?? '') === 'CUP' ? (float) ($d['monto'] ?? 0) : 0,
            $comisionesGestorDetalles
        ));

        $comisionesTotalCUP = round((float) $comisionesPVCUP + $comisionesGestorCUP, 2);

        // --- MENSAJERO DEL TURNO ---
        $mensajeroTotalUSD = 0;
        $mensajeroTotalCUP = 0;
        $mensajeroDetalles = [];

        $mensajeroPropioTotalCUP = 0;
        $mensajeroPropioCount = 0;
        $mensajeroExternoTotalCUP = 0;
        $mensajeroExternoCount = 0;

        foreach ($ventasConMensajero as $v) {
            $montoUSD = (float) $v->mensajero_monto;

            // CUP real: usa monto_final_cup si fue configurado en distribución
            // Si no, convierte con tasa si había conversión USD→CUP, o usa monto_original directo si era CUP
            if ($v->mensajero_monto_final_cup) {
                $montoCUP = (float) $v->mensajero_monto_final_cup;
            } elseif ($v->mensajero_tasa_entrada > 0 || $v->mensajero_tasa > 0) {
                $tasa = (float) ($v->mensajero_tasa_entrada ?? $v->mensajero_tasa);
                $montoCUP = $montoUSD * $tasa;
            } else {
                $montoCUP = (float) ($v->mensajero_monto_original ?? $montoUSD);
            }

            $mensajeroTotalUSD += $montoUSD;
            $mensajeroTotalCUP += $montoCUP;

            if ($v->mensajero_tipo === 'propio') {
                $mensajeroPropioTotalCUP += $montoCUP;
                $mensajeroPropioCount++;
            } else {
                $mensajeroExternoTotalCUP += $montoCUP;
                $mensajeroExternoCount++;
            }

            $mensajeroDetalles[] = [
                'venta_id' => $v->id,
                'monto_usd' => round($montoUSD, 2),
                'monto_cup' => round($montoCUP, 2),
                // Tasa efectiva (monto_cup / monto_usd), no simplemente mensajero_tasa —
                // así siempre coincide con el monto mostrado aunque se haya ajustado
                // manualmente el monto final (premio/sanción) por encima del cálculo por tasa.
                'tasa' => $montoUSD > 0 ? round($montoCUP / $montoUSD, 2) : null,
                'tipo' => $v->mensajero_tipo,
                'total_venta' => round((float) $v->total, 2),
                'productos' => $v->detalles->map(fn ($d) => [
                    'nombre' => $d->producto?->nombre_producto ?? 'Producto #'.$d->producto_id,
                    'marca' => $d->producto?->marca_producto,
                    'modelo' => $d->producto?->modelo_producto,
                    'cantidad' => (int) $d->cantidad,
                ])->values()->all(),
            ];
        }
        $mensajeroTotalUSD = round($mensajeroTotalUSD, 2);
        $mensajeroTotalCUP = round($mensajeroTotalCUP, 2);
        $mensajeroPropioTotalCUP = round($mensajeroPropioTotalCUP, 2);
        $mensajeroExternoTotalCUP = round($mensajeroExternoTotalCUP, 2);

        // --- VENTAS ANULADAS EN EL TURNO ---
        $ventasAnuladas = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'cancelada')
            ->with('detalles')
            ->get();

        $ventasAnuladasCount = $ventasAnuladas->count();
        // Usar suma de subtotales de productos (excluye mensajero del total)
        $ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn ($v) => (float) $v->detalles->sum('subtotal')), 2);
        $ventasAnuladasDetalles = $ventasAnuladas->map(fn ($v) => [
            'venta_id' => $v->id,
            'total' => round((float) $v->detalles->sum('subtotal'), 2),
            'motivo' => $v->motivo_anulacion ?? 'sin_motivo',
            'detalle' => $v->detalle_anulacion,
            'fecha' => $v->created_at->format('Y-m-d H:i'),
        ])->values()->all();

        // --- VENTAS DEVUELTAS EN EL TURNO (completadas que después se revirtieron) ---
        $ventasDevueltas = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'devuelta')
            ->with('detalles')
            ->get();

        $ventasDevueltasCount = $ventasDevueltas->count();
        $ventasDevueltasTotalUSD = round($ventasDevueltas->sum(fn ($v) => (float) $v->detalles->sum('subtotal')), 2);
        $ventasDevueltasDetalles = $ventasDevueltas->map(fn ($v) => [
            'venta_id' => $v->id,
            'total' => round((float) $v->detalles->sum('subtotal'), 2),
            'motivo' => $v->motivo_anulacion ?? 'sin_motivo',
            'detalle' => $v->detalle_anulacion,
            'fecha' => $v->created_at->format('Y-m-d H:i'),
        ])->values()->all();

        // El mensajero cobrado al cliente entra al saldo pero es pass-through —
        // se resta del saldo esperado porque al aprobar ya salió a la cuenta del mensajero.
        $saldoEsperadoSinMensajero = round($saldoEsperadoTotalUSD - $mensajeroTotalUSD, 2);

        $result = [
            'detalles' => array_values($resumenPorMoneda),
            'ventas_efectivo' => round($ventasEfectivoTotalUSD, 2),
            'ventas_otros' => round($ventasOtrosTotalUSD, 2),
            'saldo_esperado_global' => $saldoEsperadoSinMensajero,
            'total_gastos_usd' => round($gastosUsd, 2),
            // Mensajero del turno — informativo y ya descontado del saldo esperado
            'mensajero_total_usd' => $mensajeroTotalUSD,
            'mensajero_total_cup' => $mensajeroTotalCUP,
            'mensajero_count' => count($mensajeroDetalles),
            'mensajero_propio_total_cup' => $mensajeroPropioTotalCUP,
            'mensajero_propio_count' => $mensajeroPropioCount,
            'mensajero_externo_total_cup' => $mensajeroExternoTotalCUP,
            'mensajero_externo_count' => $mensajeroExternoCount,
            'mensajero_detalles' => $mensajeroDetalles,
            // Totales separados por destino
            'ventas_a_cuentas_total_usd' => round($ventasACuentasTotalUSD, 2),
            'ventas_a_clientes_total_usd' => round($ventasAClientesTotalUSD, 2),
            'ventas_a_cuentas_efectivo_usd' => round($ventasACuentasEfectivoUSD, 2),
            'ventas_a_cuentas_transferencia_usd' => round($ventasACuentasTransferenciaUSD, 2),
            'ventas_a_clientes_efectivo_usd' => round($ventasAClientesEfectivoUSD, 2),
            'ventas_a_clientes_transferencia_usd' => round($ventasAClientesTransferenciaUSD, 2),
            // Widgets: Totales por moneda (sin conversión global)
            'usd_efectivo' => round($widgetUsdEfectivo, 2),
            'cup_efectivo' => round($widgetCupEfectivo, 2),
            'usd_transferencia' => round($widgetUsdTransferencia, 2),
            'cup_transferencias' => round($widgetCupTransferencias, 2),
            // USD Internacional = total de ventas que fueron a CLIENTES (deuda)
            'usd_internacional' => round($ventasAClientesTotalUSD, 2),
            // Comisiones a gestores (legacy)
            'comisiones_gestor_total' => round($comisionesGestorTotalUSD, 2),
            'comisiones_gestor_detalles' => $comisionesGestorDetalles,
            // Nuevos: comisiones y ganancia agencia
            'comision_pv_total' => round((float) $comisionPVTotal, 2),
            'comision_gestor_total' => round((float) $comisionGestorTotal, 2),
            'comisiones_pv_detalles' => $comisionesPVDetalles,
            'ganancia_agencia_total' => round($gananciaAgenciaTotal, 2),
            // Resumen financiero del turno
            'ventas_brutas_usd' => round((float) $ventasBrutasUSD, 2),
            'comisiones_pv_cup' => round((float) $comisionesPVCUP, 2),
            'comisiones_gestor_cup' => round($comisionesGestorCUP, 2),
            'comisiones_total_cup' => $comisionesTotalCUP,
            // Ventas especiales
            'ventas_especiales_count' => $ventasEspecialesCount,
            'ventas_especiales_total_usd' => round($ventasEspecialesTotalUSD, 2),
            'ventas_especiales_costo_usd' => round($ventasEspecialesCostoUSD, 2),
            'ventas_especiales_impacto_usd' => $ventasEspecialesImpactoUSD,
            'ventas_especiales_detalles' => $ventasEspecialesDetalles,
            // Ventas sin comisión (de la agencia)
            'ventas_sin_comision_count' => $ventasSinComisionCount,
            'ventas_sin_comision_total_usd' => round($ventasSinComisionTotalUSD, 2),
            'ventas_sin_comision_costo_usd' => round($ventasSinComisionCostoUSD, 2),
            'ventas_sin_comision_impacto_usd' => $ventasSinComisionImpactoUSD,
            'ventas_sin_comision_detalles' => $ventasSinComisionDetalles,
            // Ventas anuladas
            'ventas_anuladas_count' => $ventasAnuladasCount,
            'ventas_anuladas_total_usd' => $ventasAnuladasTotalUSD,
            'ventas_anuladas_detalles' => $ventasAnuladasDetalles,
            // Ventas devueltas
            'ventas_devueltas_count' => $ventasDevueltasCount,
            'ventas_devueltas_total_usd' => $ventasDevueltasTotalUSD,
            'ventas_devueltas_detalles' => $ventasDevueltasDetalles,
        ];

        Log::info('CIERRE: Resultado', [
            'detalles_count' => count($result['detalles']),
            'items_ventas_total' => array_sum(array_map(fn ($d) => count($d['items_ventas'] ?? []), $result['detalles'])),
            'ventas_efectivo' => $result['ventas_efectivo'],
            'ventas_otros' => $result['ventas_otros'],
        ]);

        return $result;
    }

    /**
     * Inicializa la estructura de moneda (helper interno)
     */

    /**
     * Inicializa la estructura de moneda (helper interno)
     */
    private function initMonedaStruct($codigo)
    {
        return [
            'moneda' => $codigo,
            'tasa_cambio' => 1,
            // Pagos que entraron a CUENTAS del vendedor (afectan saldo)
            'ventas_efectivo_cuentas' => 0,
            'ventas_transferencia_cuentas' => 0,
            'ventas_a_cuentas_total' => 0,
            // Pagos que fueron a DEUDA de CLIENTES (no afectan saldo)
            'ventas_efectivo_clientes' => 0,
            'ventas_transferencia_clientes' => 0,
            'ventas_a_clientes_total' => 0,
            // Campos legacy para compatibilidad
            'ventas_efectivo' => 0,
            'ventas_transferencia' => 0,
            'ingresos_extra' => 0,
            'gastos' => 0,
            'transferencias_salientes' => 0,
            'transferencias_entrantes' => 0,
            'saldo_calculado' => 0,
            // NUEVO: Comisiones a gestores
            'comisiones_gestor' => 0,
            'comisiones_gestor_detalles' => [],
            // Resumen directo solicitado
            'productos_resumen' => [],
            'pagos_resumen' => [
                'efectivo' => 0,
                'transferencia' => 0,
            ],
            // Items separados por destino
            'items_ventas' => [], // Compatibilidad legacy
            'items_ventas_cuentas' => [],
            'items_ventas_clientes' => [],
            'items_gastos' => [],
            'items_ingresos' => [],
            'items_transferencias_salientes' => [],
            'items_transferencias_entrantes' => [],
            'operaciones_detalle' => [],
        ];
    }

    /**
     * Cuentas que el vendedor tiene solo para cobrar (acceso `cobro`): no se le muestra su saldo ni se comparan
     * con el cierre anterior, únicamente lo que cobró en ellas durante el turno. Admin y moderador no tienen
     * cuentas de cobro (ven todas con saldo), así que para ellos es una lista vacía.
     *
     * @return array<int, array{id: int, nombre: string, tipo: string|null, banco: array{slug: string, nombre: string, imagen_url: string}|null, moneda: string|null, operado_turno: float}>
     */
    private function cuentasDeCobroDelTurno(User $user, mixed $inicioTurno, mixed $finTurno = null): array
    {
        if (in_array($user->role, ['admin', 'moderador'], true)) {
            return [];
        }

        $cuentasCobro = $user->cuentas()->wherePivot('acceso', Cuenta::ACCESO_COBRO)->with('moneda')->get();

        if ($cuentasCobro->isEmpty()) {
            return [];
        }

        $cobradoPorCuenta = PagoVenta::whereIn('cuenta_id', $cuentasCobro->pluck('id'))
            ->whereHas('venta', fn ($q) => $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno)
                ->when($finTurno, fn ($consulta) => $consulta->where('created_at', '<=', $finTurno))
                ->where('estado', 'completada'))
            ->selectRaw('cuenta_id, SUM(monto) as total')
            ->groupBy('cuenta_id')
            ->pluck('total', 'cuenta_id');

        return $cuentasCobro->map(fn (Cuenta $cuenta) => [
            'id' => $cuenta->id,
            'nombre' => $cuenta->nombre_cuenta,
            'tipo' => $cuenta->tipo,
            'banco' => $this->logoDeCuenta($cuenta),
            'moneda' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
            'operado_turno' => round((float) ($cobradoPorCuenta[$cuenta->id] ?? 0), 2),
        ])->values()->all();
    }

    /**
     * Operaciones Múltiples (remesas) del turno. Solo las ven admin y moderador, como en todo el módulo: para un
     * vendedor `visible` es false y no viaja nada. Mueven saldos de cuentas directamente (no crean un movimiento
     * financiero), así que el Cierre no las contaba en ningún lado; esto es informativo y NO entra en el saldo
     * esperado. Las anuladas se listan con su estado pero no suman al resumen.
     *
     * @return array{visible: bool, items: array<int, array<string, mixed>>, resumen: array{total: int, entradas: array<int, array{moneda: string, monto: float}>, salidas: array<int, array{moneda: string, monto: float}>}}
     */
    private function detalleOperacionesMultiples(User $user, mixed $inicioTurno, mixed $finTurno = null): array
    {
        $vacio = ['visible' => false, 'items' => [], 'resumen' => ['total' => 0, 'entradas' => [], 'salidas' => []]];

        if (! in_array($user->role, ['admin', 'moderador'], true)) {
            return $vacio;
        }

        $remesas = Remesa::with(['user:id,name', 'entradaCuenta', 'entradaCliente', 'entradaProveedor', 'salidaCuenta', 'salidaCliente', 'salidaProveedor', 'mensajeroCuenta'])
            ->when($inicioTurno, fn ($consulta) => $consulta->where('fecha_operacion', '>=', $inicioTurno))
            ->when($finTurno, fn ($consulta) => $consulta->where('fecha_operacion', '<=', $finTurno))
            ->orderByDesc('id')
            ->get();

        $items = $remesas->map(fn (Remesa $remesa) => [
            'id' => $remesa->id,
            'hora' => $remesa->fecha_operacion->format('H:i'),
            'usuario_nombre' => $remesa->user?->name ?? 'Sistema',
            'es_propio' => $remesa->user_id === $user->id,
            'estado' => $remesa->estado,
            'anulada' => $remesa->estado === 'anulada',
            'notas' => $remesa->notas,
            'entrada' => [
                'tipo' => $remesa->entrada_tipo,
                'nombre' => $remesa->nombre_entrada ?? 'No especificado',
                'monto' => (float) $remesa->entrada_monto,
                'moneda' => $remesa->entrada_moneda,
                'banco' => $this->logoDeCuenta($remesa->entradaCuenta),
            ],
            'salida' => [
                'tipo' => $remesa->salida_tipo,
                'nombre' => $remesa->nombre_salida ?? 'No especificado',
                'monto' => (float) $remesa->salida_monto,
                'moneda' => $remesa->salida_moneda,
                'banco' => $this->logoDeCuenta($remesa->salidaCuenta),
            ],
            'mensajero' => $remesa->mensajero_cuenta_id ? [
                'tipo' => 'cuenta',
                'nombre' => $remesa->mensajeroCuenta?->nombre_cuenta ?? 'No especificado',
                'monto' => (float) $remesa->mensajero_monto,
                'moneda' => $remesa->mensajero_moneda,
                'banco' => $this->logoDeCuenta($remesa->mensajeroCuenta),
            ] : null,
        ]);

        $vigentes = $remesas->where('estado', '!=', 'anulada');
        $sumarPorMoneda = fn ($pares) => collect($pares)
            ->groupBy('moneda')
            ->map(fn ($grupo, $moneda) => ['moneda' => (string) $moneda, 'monto' => round((float) $grupo->sum('monto'), 2)])
            ->values()
            ->all();

        return [
            'visible' => true,
            'items' => $items->values()->all(),
            'resumen' => [
                'total' => $vigentes->count(),
                'entradas' => $sumarPorMoneda($vigentes->map(fn (Remesa $r) => ['moneda' => $r->entrada_moneda, 'monto' => $r->entrada_monto])),
                // El mensajero también es dinero que sale de una cuenta.
                'salidas' => $sumarPorMoneda($vigentes->flatMap(fn (Remesa $r) => array_filter([
                    ['moneda' => $r->salida_moneda, 'monto' => $r->salida_monto],
                    $r->mensajero_cuenta_id ? ['moneda' => $r->mensajero_moneda, 'monto' => $r->mensajero_monto] : null,
                ]))),
            ],
        ];
    }

    /**
     * Envíos de dinero que siguen en tránsito y el usuario puede ver, repartidos en dos listas que suman lo
     * mismo que `TransferenciaPendiente::resumenAbiertosPara()`: "por_recibir" son los que otro envió y le toca
     * confirmar a este usuario (o a un admin/moderador, que confirma cualquiera); "enviados" son el resto, sobre
     * todo los que salieron de él y esperan que el destino los confirme. Informativo: no entra en ningún saldo.
     *
     * @return array{enviados: array<int, array<string, mixed>>, por_recibir: array<int, array<string, mixed>>}
     */
    private function detalleEnviosAbiertos(User $user): array
    {
        $envios = TransferenciaPendiente::visiblesPara($user)
            ->with(['cuentaOrigen.moneda', 'cuentaDestino.moneda', 'usuario:id,name'])
            ->where('estado', TransferenciaPendiente::ESTADO_EN_TRANSITO)
            ->orderByDesc('id')
            ->get();

        $items = $envios->map(function (TransferenciaPendiente $envio) use ($user) {
            $esPropio = $envio->user_id === $user->id;

            // Un envío de efectivo puede tardar días; pasados DIAS_PARA_ATRASADO se marca para que no se olvide
            $diasEnTransito = (int) $envio->created_at->diffInDays(now());

            return [
                'id' => $envio->id,
                'cuenta_origen_id' => $envio->cuenta_origen_id,
                'cuenta_destino_id' => $envio->cuenta_destino_id,
                'dias_en_transito' => $diasEnTransito,
                'atrasado' => $diasEnTransito >= self::DIAS_PARA_ATRASADO,
                'fecha' => $envio->created_at->format('d/m H:i'),
                'origen_nombre' => $envio->cuentaOrigen?->nombre_cuenta ?? 'No especificado',
                'banco_origen' => $this->logoDeCuenta($envio->cuentaOrigen),
                'destino_nombre' => $envio->cuentaDestino?->nombre_cuenta ?? 'No especificado',
                'banco_destino' => $this->logoDeCuenta($envio->cuentaDestino),
                'monto' => (float) $envio->monto,
                'moneda' => $envio->moneda,
                'moneda_imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($envio->cuentaOrigen?->moneda?->imagen)['imagen_url'] ?? null,
                'monto_destino' => (float) $envio->monto_destino,
                'moneda_destino' => $envio->moneda_destino,
                'tasa_cambio' => $envio->tasa_cambio_aplicada,
                'usuario_nombre' => $envio->usuario?->name ?? 'Sistema',
                'es_propio' => $esPropio,
                'comentario' => $envio->comentario,
                'por_recibir' => ! $esPropio && $envio->puedeRecibir($user),
            ];
        });

        return [
            'atrasados' => $items->where('atrasado', true)->count(),
            'enviados' => $items->where('por_recibir', false)->values()->all(),
            'por_recibir' => $items->where('por_recibir', true)->values()->all(),
        ];
    }

    /**
     * Logo de la cuenta (banco/tarjeta o insignia de efectivo) o null si no tiene uno asignado.
     *
     * @return array{slug: string, nombre: string, imagen_url: string}|null
     */
    private function logoDeCuenta(?Cuenta $cuenta): ?array
    {
        return CatalogoTarjetasService::porSlug($cuenta?->imagen);
    }

    /**
     * Obtiene el nombre descriptivo del origen de un movimiento
     */
    private function obtenerNombreOrigen($movimiento): string
    {
        if ($movimiento->cuentaOrigen) {
            return "Cuenta: {$movimiento->cuentaOrigen->nombre_cuenta}";
        } elseif ($movimiento->clienteOrigen) {
            return "Cliente: {$movimiento->clienteOrigen->nombre_cliente}";
        } else {
            return 'Caja/Origen no especificado';
        }
    }

    /**
     * Obtiene el nombre descriptivo del destino de un movimiento
     */
    private function obtenerNombreDestino($movimiento): string
    {
        if ($movimiento->cuentaDestino) {
            return "Cuenta: {$movimiento->cuentaDestino->nombre_cuenta}";
        } elseif ($movimiento->clienteDestino) {
            return "Cliente: {$movimiento->clienteDestino->nombre_cliente}";
        } elseif ($movimiento->proveedorDestino) {
            return "Proveedor: {$movimiento->proveedorDestino->nombre_proveedor}";
        } else {
            return 'Destino no especificado';
        }
    }

    /**
     * Procesa una transferencia para mostrar detalles bidireccionales completos
     */
    private function procesarTransferenciaBidireccional($movimiento, &$resumenPorMoneda, $user, bool $salidaCuenta = false, bool $esReceptor = false, ?float $montoAcreditado = null): array
    {
        $codigoOrigen = $movimiento->moneda ?? 'USD';
        $tasaCambio = $movimiento->tasa_cambio_aplicada ?? 1;

        // Obtener información del origen
        $origenInfo = $this->obtenerInfoEntidad($movimiento, 'origen');
        $destinoInfo = $this->obtenerInfoEntidad($movimiento, 'destino');

        // Afecta el saldo del usuario solo si el dinero sale hacia algo que no es suyo (lo decide quien llama)
        $afectaSaldoOrigen = $salidaCuenta;

        // Crear item de salida con detalles completos
        $itemSalida = [
            'id' => 't_'.$movimiento->id,
            'desc' => $movimiento->descripcion,
            'monto_origen' => $movimiento->monto,
            'moneda_origen' => $codigoOrigen,
            'origen_tipo' => $origenInfo['tipo'],
            'origen_nombre' => $origenInfo['nombre'],
            'destino_tipo' => $destinoInfo['tipo'],
            'destino_nombre' => $destinoInfo['nombre'],
            'monto_destino' => $this->calcularMontoDestino($movimiento),
            'moneda_destino' => $destinoInfo['moneda'],
            'tasa_cambio' => $tasaCambio,
            'hora' => $movimiento->created_at->format('H:i'),
            'afecta_saldo_usuario' => $afectaSaldoOrigen,
            'es_receptor' => $esReceptor,
            'banco_origen' => $this->logoDeCuenta($movimiento->cuentaOrigen),
            'banco_destino' => $this->logoDeCuenta($movimiento->cuentaDestino),
            'usuario_nombre' => $movimiento->user?->name ?? 'Sistema',
            'es_propio' => $movimiento->user_id == $user->id,
            'turno_nombre' => $movimiento->turnoVendedor?->nombre_vendedor,
        ];

        // Si el destino está en una moneda diferente, agregar también a la lista de esa moneda
        $montoEntrada = $this->calcularMontoDestino($movimiento);
        $itemEntrada = null;

        if ($destinoInfo['moneda'] !== $codigoOrigen && isset($resumenPorMoneda[$destinoInfo['moneda']])) {
            $itemEntrada = [
                'id' => 't_entrada_'.$movimiento->id,
                'desc' => $movimiento->descripcion,
                'monto_origen' => $movimiento->monto,
                'moneda_origen' => $codigoOrigen,
                'origen_tipo' => $origenInfo['tipo'],
                'origen_nombre' => $origenInfo['nombre'],
                'destino_tipo' => $destinoInfo['tipo'],
                'destino_nombre' => $destinoInfo['nombre'],
                'monto_destino' => $montoEntrada,
                'moneda_destino' => $destinoInfo['moneda'],
                'tasa_cambio' => $tasaCambio,
                'hora' => $movimiento->created_at->format('H:i'),
                'es_entrada' => true,
                'usuario_nombre' => $movimiento->user?->name ?? 'Sistema',
                'es_propio' => $movimiento->user_id == $user->id,
            ];
        } else {
            // Mismo código de moneda, crear item de entrada con el mismo monto
            $itemEntrada = [
                'id' => 't_entrada_'.$movimiento->id,
                'desc' => $movimiento->descripcion,
                'monto_origen' => $movimiento->monto,
                'moneda_origen' => $codigoOrigen,
                'origen_tipo' => $origenInfo['tipo'],
                'origen_nombre' => $origenInfo['nombre'],
                'destino_tipo' => $destinoInfo['tipo'],
                'destino_nombre' => $destinoInfo['nombre'],
                'monto_destino' => $movimiento->monto,
                'moneda_destino' => $codigoOrigen,
                'tasa_cambio' => $tasaCambio,
                'hora' => $movimiento->created_at->format('H:i'),
                'es_entrada' => true,
                'usuario_nombre' => $movimiento->user?->name ?? 'Sistema',
                'es_propio' => $movimiento->user_id == $user->id,
            ];
            $montoEntrada = $movimiento->monto;
        }

        // Un envío que llegó incompleto acredita menos de lo enviado: la entrada vale lo acreditado
        if ($montoAcreditado !== null) {
            $montoEntrada = $montoAcreditado;
            $itemEntrada['monto_destino'] = $montoAcreditado;
        }

        $itemEntrada['banco_origen'] = $itemSalida['banco_origen'];
        $itemEntrada['banco_destino'] = $itemSalida['banco_destino'];

        // Si el usuario es el receptor, agregar a transferencias entrantes y al saldo
        if ($esReceptor && $itemEntrada) {
            $codigoEntrada = $itemEntrada['moneda_destino'];
            if (! isset($resumenPorMoneda[$codigoEntrada])) {
                $resumenPorMoneda[$codigoEntrada] = $this->initMonedaStruct($codigoEntrada);
            }
            $resumenPorMoneda[$codigoEntrada]['items_transferencias_entrantes'][] = $itemEntrada;
            $resumenPorMoneda[$codigoEntrada]['transferencias_entrantes'] += $montoEntrada;
            // Las transferencias entrantes incrementan el saldo calculado
            $resumenPorMoneda[$codigoEntrada]['saldo_calculado'] += $montoEntrada;
        }

        // También agregar a la lista de transferencias salientes original (para mantener compatibilidad)
        if (! $esReceptor && $destinoInfo['moneda'] !== $codigoOrigen && isset($resumenPorMoneda[$destinoInfo['moneda']])) {
            $resumenPorMoneda[$destinoInfo['moneda']]['items_transferencias_entrantes'][] = $itemEntrada;
            $resumenPorMoneda[$destinoInfo['moneda']]['transferencias_entrantes'] += $itemEntrada['monto_destino'];
        }

        return [
            'item_salida' => $itemSalida,
            'item_entrada' => $itemEntrada,
            'monto_entrada' => $montoEntrada,
            'afecta_saldo_origen' => $afectaSaldoOrigen,
        ];
    }

    /**
     * Obtiene información detallada de una entidad (origen o destino)
     */
    private function obtenerInfoEntidad($movimiento, string $lado): array
    {
        $info = [
            'tipo' => 'desconocido',
            'nombre' => 'No especificado',
            'moneda' => $movimiento->moneda ?? 'USD',
        ];

        if ($lado === 'origen') {
            if ($movimiento->cuentaOrigen) {
                $info['tipo'] = 'cuenta';
                $info['nombre'] = $movimiento->cuentaOrigen->nombre_cuenta;
                $info['moneda'] = $movimiento->cuentaOrigen->moneda->codigo_moneda ?? 'USD';
            } elseif ($movimiento->clienteOrigen) {
                $info['tipo'] = 'cliente';
                $info['nombre'] = $movimiento->clienteOrigen->nombre_cliente;
                $info['moneda'] = 'USD'; // Clientes siempre operan en USD
            }
        } else { // destino
            if ($movimiento->cuentaDestino) {
                $info['tipo'] = 'cuenta';
                $info['nombre'] = $movimiento->cuentaDestino->nombre_cuenta;
                $info['moneda'] = $movimiento->cuentaDestino->moneda->codigo_moneda ?? 'USD';
            } elseif ($movimiento->clienteDestino) {
                $info['tipo'] = 'cliente';
                $info['nombre'] = $movimiento->clienteDestino->nombre_cliente;
                $info['moneda'] = 'USD'; // Clientes siempre operan en USD
            } elseif ($movimiento->proveedorDestino) {
                $info['tipo'] = 'proveedor';
                $info['nombre'] = $movimiento->proveedorDestino->nombre_proveedor;
                $info['moneda'] = 'USD'; // Proveedores siempre operan en USD
            }
        }

        return $info;
    }

    /**
     * Calcula el monto en la moneda de destino aplicando la tasa de cambio
     */
    private function calcularMontoDestino($movimiento): float
    {
        $origenInfo = $this->obtenerInfoEntidad($movimiento, 'origen');
        $destinoInfo = $this->obtenerInfoEntidad($movimiento, 'destino');

        // Si ambas monedas son iguales, no hay conversión
        if ($origenInfo['moneda'] === $destinoInfo['moneda']) {
            return (float) $movimiento->monto;
        }

        $tasaCambio = $movimiento->tasa_cambio_aplicada ?? 1;

        // Lógica de conversión según el tipo de entidades
        if ($origenInfo['tipo'] === 'cuenta' && $destinoInfo['tipo'] === 'cuenta') {
            // Cuenta → Cuenta: Dividir por tasa de la moneda destino
            return round($movimiento->monto / $tasaCambio, 2);
        } elseif ($origenInfo['tipo'] === 'cuenta' && in_array($destinoInfo['tipo'], ['cliente', 'proveedor'])) {
            // Cuenta → Cliente/Proveedor: Convertir a USD
            return round($movimiento->monto / $tasaCambio, 2);
        } elseif (in_array($origenInfo['tipo'], ['cliente', 'proveedor']) && $destinoInfo['tipo'] === 'cuenta') {
            // Cliente/Proveedor → Cuenta: Convertir de USD a moneda cuenta
            return round($movimiento->monto * $tasaCambio, 2);
        } else {
            // Cliente/Proveedor → Cliente/Proveedor: Ambos USD, sin conversión
            return (float) $movimiento->monto;
        }
    }

    /**
     * Genera un resumen de transferencias para mostrar en la vista
     */
    private function obtenerResumenTransferencias(array $detalles): array
    {
        $resumenTransferencias = [
            'total_salientes' => 0,
            'total_entrantes' => 0,
            'por_moneda' => [],
            'detalles_completos' => [],
        ];

        // Deduplicado global por movimiento_id: una transferencia entre monedas distintas
        // genera un item "saliente" en el bucket de la moneda origen y un item "entrante" en
        // el bucket de la moneda destino (ver procesarTransferenciaBidireccional). Si el mapa
        // de vistos se reiniciara en cada vuelta del foreach de abajo, ambos items sobrevivirían
        // como 2 filas separadas en detalles_completos para la misma operación.
        $seenMovimientos = [];

        $agregarDetalle = function (array $transferencia, string $tipo) use (&$resumenTransferencias, &$seenMovimientos) {
            $id = $transferencia['id'] ?? '';
            $baseId = str_replace(['t_entrada_', 't_'], '', $id);

            if (isset($seenMovimientos[$baseId])) {
                return;
            }

            $seenMovimientos[$baseId] = true;

            $resumenTransferencias['detalles_completos'][] = [
                'id' => $id,
                'desc' => $transferencia['desc'] ?? '',
                'monto_origen' => $transferencia['monto_origen'] ?? 0,
                'moneda_origen' => $transferencia['moneda_origen'] ?? 'USD',
                'origen_tipo' => $transferencia['origen_tipo'] ?? '',
                'origen_nombre' => $transferencia['origen_nombre'] ?? '',
                'monto_destino' => $transferencia['monto_destino'] ?? 0,
                'moneda_destino' => $transferencia['moneda_destino'] ?? 'USD',
                'destino_tipo' => $transferencia['destino_tipo'] ?? '',
                'destino_nombre' => $transferencia['destino_nombre'] ?? '',
                'tasa_cambio' => $transferencia['tasa_cambio'] ?? 1,
                'hora' => $transferencia['hora'] ?? '',
                'afecta_saldo_usuario' => $transferencia['afecta_saldo_usuario'] ?? false,
                'es_propio' => $transferencia['es_propio'] ?? true,
                'usuario_nombre' => $transferencia['usuario_nombre'] ?? 'Sistema',
                'tipo' => $tipo,
            ];
        };

        foreach ($detalles as $monedaData) {
            $codigo = $monedaData['moneda'] ?? 'USD';

            // Acumular totales
            $resumenTransferencias['total_salientes'] += $monedaData['transferencias_salientes'] ?? 0;
            $resumenTransferencias['total_entrantes'] += $monedaData['transferencias_entrantes'] ?? 0;

            // Resumen por moneda
            $salientes = $monedaData['transferencias_salientes'] ?? 0;
            $entrantes = $monedaData['transferencias_entrantes'] ?? 0;
            if ($salientes > 0 || $entrantes > 0) {
                $resumenTransferencias['por_moneda'][$codigo] = [
                    'moneda' => $codigo,
                    'tasa_cambio' => $monedaData['tasa_cambio'] ?? 1,
                    'salientes' => $salientes,
                    'entrantes' => $entrantes,
                    'neto' => $entrantes - $salientes,
                    'items_salientes' => $monedaData['items_transferencias_salientes'] ?? [],
                    'items_entrantes' => $monedaData['items_transferencias_entrantes'] ?? [],
                ];
            }

            if (! empty($monedaData['items_transferencias_salientes'])) {
                foreach ($monedaData['items_transferencias_salientes'] as $transferencia) {
                    $agregarDetalle($transferencia, 'saliente');
                }
            }

            if (! empty($monedaData['items_transferencias_entrantes'])) {
                foreach ($monedaData['items_transferencias_entrantes'] as $transferencia) {
                    $agregarDetalle($transferencia, 'entrante');
                }
            }
        }

        // Ordenar detalles completos por hora
        usort($resumenTransferencias['detalles_completos'], function ($a, $b) {
            return strcmp($a['hora'], $b['hora']);
        });

        return $resumenTransferencias;
    }

    /**
     * Calcula el inicio del turno de forma robusta.
     * Si existe último cierre, usa su fecha_cierre.
     * Si no existe, busca la operación más antigua sin cerrar del usuario.
     * Solo usa today() como último recurso.
     */
    private function calcularInicioTurno($user, ?CierreCaja $ultimoCierre): Carbon
    {
        // 1. Si existe cierre previo, usar su fecha_cierre
        if ($ultimoCierre && $ultimoCierre->fecha_cierre) {
            return $ultimoCierre->fecha_cierre;
        }

        // 2. Si no existe cierre previo, buscar la operación más antigua sin cerrar
        // Buscar la venta completada más antigua del usuario
        $primeraVenta = Venta::where('user_id', $user->id)
            ->where('estado', 'completada')
            ->orderBy('created_at', 'asc')
            ->first();

        if ($primeraVenta) {
            return $primeraVenta->created_at;
        }

        // 3. Buscar el pago más antiguo
        $primerPago = PagoVenta::whereHas('venta', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->orderBy('created_at', 'asc')->first();

        if ($primerPago) {
            return $primerPago->created_at;
        }

        // 4. Último recurso: usar hoy
        return Carbon::today();
    }
}
