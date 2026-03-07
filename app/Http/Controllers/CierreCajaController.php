<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Venta;
use App\Notifications\CierreCajaNotification;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

class CierreCajaController extends Controller
{
    /**
     * Listado de cierres.
     * Admin/Moderador ve todos, Vendedor ve los suyos.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = CierreCaja::with(['usuario', 'revisor'])
            ->orderBy('fecha_cierre', 'desc');

        // Si no es admin/moderador, solo ve sus propios cierres
        if (! $user->isAdmin() && ! $user->isModerator()) {
            $query->where('user_id', $user->id);
        }

        // Filtros
        if ($request->has('fecha')) {
            $query->whereDate('fecha_cierre', $request->fecha);
        }

        if ($request->has('estado') && $request->estado !== 'todos') {
            $query->where('estado', $request->estado);
        }

        $cierres = $query->paginate(20);

        return Inertia::render('Cierres/Index', [
            'cierres' => $cierres,
            'filters' => $request->all(['fecha', 'estado']),
        ]);
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

        // ============================================
        // NUEVO: COMPARATIVA CON CIERRE ANTERIOR
        // ============================================
        $comparativaCuentas = [];
        $comparativaClientes = [];

        if ($ultimoCierre) {
            // Obtener saldos actuales de TODAS las cuentas accesibles por el usuario
            $cuentasQuery = \App\Models\Cuenta::with('moneda');
            if (! in_array($user->role, ['admin', 'moderador'])) {
                $cuentasQuery->whereHas('users', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
            }
            $cuentasActuales = $cuentasQuery->get();

            // Obtener saldos del cierre anterior (de los detalles)
            $cuentasCierreAnterior = [];
            if ($ultimoCierre->detalles && is_array($ultimoCierre->detalles)) {
                foreach ($ultimoCierre->detalles as $detalle) {
                    if (isset($detalle['items_ventas_cuentas'])) {
                        foreach ($detalle['items_ventas_cuentas'] as $item) {
                            if (isset($item['cuenta_nombre'])) {
                                $cuentaNombre = $item['cuenta_nombre'];
                                if (! isset($cuentasCierreAnterior[$cuentaNombre])) {
                                    $cuentasCierreAnterior[$cuentaNombre] = 0;
                                }
                                // Sumar montos de ventas a cuentas
                                $cuentasCierreAnterior[$cuentaNombre] += $item['monto_equivalente'] ?? $item['monto'] ?? 0;
                            }
                        }
                    }
                }
            }

            // Comparar cuentas
            foreach ($cuentasActuales as $cuenta) {
                $nombreCuenta = $cuenta->nombre_cuenta;
                $saldoActual = $cuenta->saldo_cuenta;
                $saldoAnterior = $cuentasCierreAnterior[$nombreCuenta] ?? 0;
                $diferencia = $saldoActual - $saldoAnterior;

                $comparativaCuentas[] = [
                    'id' => $cuenta->id,
                    'nombre' => $nombreCuenta,
                    'tipo' => $cuenta->tipo,
                    'moneda' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                    'saldo_anterior' => round($saldoAnterior, 2),
                    'saldo_actual' => round($saldoActual, 2),
                    'diferencia' => round($diferencia, 2),
                    'estado' => $diferencia > 0 ? 'subio' : ($diferencia < 0 ? 'bajo' : 'igual'),
                ];
            }

            // Obtener deudas actuales de TODOS los clientes
            $clientesActuales = \App\Models\Cliente::all();

            // Obtener deudas del cierre anterior
            $clientesCierreAnterior = [];
            if ($ultimoCierre->detalles && is_array($ultimoCierre->detalles)) {
                foreach ($ultimoCierre->detalles as $detalle) {
                    if (isset($detalle['items_ventas_clientes'])) {
                        foreach ($detalle['items_ventas_clientes'] as $item) {
                            if (isset($item['cliente_nombre'])) {
                                $clienteNombre = $item['cliente_nombre'];
                                if (! isset($clientesCierreAnterior[$clienteNombre])) {
                                    $clientesCierreAnterior[$clienteNombre] = 0;
                                }
                                $clientesCierreAnterior[$clienteNombre] += $item['monto_equivalente'] ?? $item['monto'] ?? 0;
                            }
                        }
                    }
                }
            }

            // Comparar clientes (deuda)
            foreach ($clientesActuales as $cliente) {
                $nombreCliente = $cliente->nombre_cliente;
                $deudaActual = $cliente->deuda_pago_cliente;
                $deudaAnterior = $clientesCierreAnterior[$nombreCliente] ?? 0;
                $diferencia = $deudaActual - $deudaAnterior;

                $comparativaClientes[] = [
                    'id' => $cliente->id,
                    'nombre' => $nombreCliente,
                    'deuda_anterior' => round($deudaAnterior, 2),
                    'deuda_actual' => round($deudaActual, 2),
                    'diferencia' => round($diferencia, 2),
                    'estado' => $diferencia < 0 ? 'mejoro' : ($diferencia > 0 ? 'empeoro' : 'igual'),
                ];
            }
        }

        // Preparar respuesta para Inertia con detalles mejorados de transferencias y claridad en pagos
        return Inertia::render('Cierres/Create', [
            'fecha_apertura' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
            'moneda_referencia' => $monedaRef ? $monedaRef->codigo_moneda : 'USD',
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
                'transferencias_resumen' => $this->obtenerResumenTransferencias($calculos['detalles']),
                // NUEVO: Totales separados por destino (cuentas vs clientes)
                'ventas_a_cuentas_total_usd' => $calculos['ventas_a_cuentas_total_usd'],
                'ventas_a_clientes_total_usd' => $calculos['ventas_a_clientes_total_usd'],
                'ventas_a_cuentas_efectivo_usd' => $calculos['ventas_a_cuentas_efectivo_usd'],
                'ventas_a_cuentas_transferencia_usd' => $calculos['ventas_a_cuentas_transferencia_usd'],
                'ventas_a_clientes_efectivo_usd' => $calculos['ventas_a_clientes_efectivo_usd'],
                'ventas_a_clientes_transferencia_usd' => $calculos['ventas_a_clientes_transferencia_usd'],
                // NUEVO: Comisiones a gestores
                'comisiones_gestor_total' => $calculos['comisiones_gestor_total'] ?? 0,
                'comisiones_gestor_detalles' => $calculos['comisiones_gestor_detalles'] ?? [],
            ],
            // NUEVO: Comparativa con cierre anterior
            'comparativa_cuentas' => $comparativaCuentas,
            'comparativa_clientes' => $comparativaClientes,
            'tiene_cierre_anterior' => $ultimoCierre !== null,
        ]);
    }

    /**
     * Guardar el cierre.
     */
    public function store(Request $request)
    {
        // Registro de emergencia para confirmar que la petición llega al controlador
        \Illuminate\Support\Facades\Log::emergency('!!! CIERRE CAJA - EJECUTANDO STORE !!!', [
            'user_id' => Auth::id(),
            'role' => Auth::user() ? Auth::user()->role : 'N/A',
            'data_keys' => array_keys($request->all()),
        ]);

        $data = $request->all();
        $user = Auth::user();

        // Determinar inicio del turno (misma lógica que create)
        $ultimoCierre = CierreCaja::where('user_id', $user->id)
            ->orderBy('fecha_cierre', 'desc')
            ->first();

        $inicioTurno = $this->calcularInicioTurno($user, $ultimoCierre);

        // Obtener cálculos del backend como FUENTE DE VERDAD
        try {
            $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);
            $detallesJson = $calculos['detalles'];
            $comisionesGestorDetalles = $calculos['comisiones_gestor_detalles'] ?? [];
            $comisionesGestorTotal = $calculos['comisiones_gestor_total'] ?? 0;

            // Usar cálculos del backend como fuente de verdad
            $ventasEfectivo = $calculos['ventas_efectivo'];
            $ventasOtros = $calculos['ventas_otros'];
            $saldoEsperado = $calculos['saldo_esperado_global'];
        } catch (\Exception $e) {
            // Fallback defensivo solo si falla el cálculo backend
            \Illuminate\Support\Facades\Log::error('Fallo obtenerDetallesCierre: '.$e->getMessage());
            $ventasEfectivo = $data['ventas_efectivo'] ?? 0;
            $ventasOtros = $data['ventas_otros'] ?? 0;
            $comisionesGestorTotal = 0;
            $comisionesGestorDetalles = [];
            $detallesJson = [];
            $saldoEsperado = 0;
        }

        $saldoInicial = $data['saldo_inicial'] ?? 0;
        $totalGastos = $data['total_gastos'] ?? 0;
        $totalDevoluciones = $data['total_devoluciones'] ?? 0;
        $saldoContado = $data['saldo_contado'] ?? 0;

        // Calcular diferencia usando el saldo esperado del backend
        $diferencia = round($saldoContado - $saldoEsperado, 2);

        DB::beginTransaction();
        try {
            $cierre = CierreCaja::create([
                'user_id' => Auth::id(),
                'revisor_id' => Auth::id(),
                'fecha_apertura' => $data['fecha_apertura'] ?? now(),
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
            ]);

            DB::commit();
            \Illuminate\Support\Facades\Log::emergency('!!! CIERRE GUARDADO EXITOSAMENTE ID: '.$cierre->id.' !!!');

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
            \Illuminate\Support\Facades\Log::emergency('!!! ERROR CRÍTICO AL GUARDAR CIERRE !!!: '.$e->getMessage());

            return back()->with('error', 'Error crítico: '.$e->getMessage());
        }
    }

    public function show($id)
    {
        $cierre = CierreCaja::with(['usuario', 'revisor'])->findOrFail($id);

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

        return Inertia::render('Cierres/Show', [
            'cierre' => $cierre,
        ]);
    }

    public function aprobar(Request $request, $id)
    {
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
        // 1. Obtener Pagos de Ventas (Ingresos por Venta)
        $pagos = \App\Models\PagoVenta::whereHas('venta', function ($q) use ($user, $inicioTurno) {
            $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno);
        })->with(['moneda', 'cuenta', 'cliente', 'venta.detalles.producto.categoria'])->get();

        // 2. Obtener IDs de cuentas del usuario para buscar transferencias entrantes
        $cuentaIds = $user->cuentas()->pluck('id')->toArray();

        // 2. Obtener Movimientos Financieros (Gastos, Ingresos, Transferencias) del usuario
        // Incluye transferencias entrantes hacia cuentas del usuario
        $movimientos = MovimientoFinanciero::where(function ($query) use ($user, $cuentaIds) {
            // Movimientos que el usuario hace (gastos, ingresos, transferencias que envía)
            $query->where('user_id', $user->id);

            // Transferencias entrantes hacia cuentas del usuario (hechas por otros usuarios)
            if (! empty($cuentaIds)) {
                $query->orWhere(function ($q) use ($cuentaIds) {
                    $q->where('tipo_movimiento_id', 3) // Solo transferencias
                        ->whereIn('cuenta_destino_id', $cuentaIds);
                });
            }
        })
            ->where('fecha_operacion', '>=', $inicioTurno)
            ->with(['tipoMovimiento', 'cuentaOrigen', 'cuentaDestino', 'clienteOrigen', 'clienteDestino', 'proveedorDestino'])
            ->get();

        // Estructura para agrupar por Moneda
        $resumenPorMoneda = [];

        // Inicializar monedas activas (Principal primero)
        $monedas = Moneda::where('estado', true)->orderBy('principal', 'desc')->orderBy('codigo_moneda')->get();
        foreach ($monedas as $moneda) {
            $resumenPorMoneda[$moneda->codigo_moneda] = [
                'moneda' => $moneda->codigo_moneda,
                'tasa_cambio' => $moneda->tasa_cambio > 0 ? $moneda->tasa_cambio : 1,
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
                'cuenta_nombre' => $pago->cuenta ? $pago->cuenta->nombre_cuenta : null,
                'cliente_nombre' => $pago->cliente ? $pago->cliente->nombre_cliente : null,
                'destino_nombre' => $destinoNombre,
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
                'cuenta_nombre' => $pago->cuenta ? $pago->cuenta->nombre_cuenta : null,
                'destino_nombre' => $destinoNombre,
                'productos' => $detallesProductos,
            ];

            // --- AGREGAR A RESUMEN DE PRODUCTOS (AGRUPADO POR PRODUCTO + PRECIO) ---
            // Esto permite mostrar precios variables: 5 x $35 + 3 x $40 = filas separadas
            if ($pago->venta && $pago->venta->detalles && ! in_array($pago->venta_id, $ventasProcesadas)) {
                $ventasProcesadas[] = $pago->venta_id;
                foreach ($pago->venta->detalles as $det) {
                    $prodId = $det->producto_id;
                    $precioVenta = (float) $det->precio_venta;

                    $producto = $det->producto;
                    $nombreProd = $producto ? $producto->nombre_producto : 'Producto Desconocido';
                    $marca = $producto ? $producto->marca_producto : '';
                    $modelo = $producto ? $producto->modelo_producto : '';
                    $capacidad = $producto ? $producto->capacidad_producto : '';
                    $codigo = $producto ? $producto->codigo_producto : '';
                    $imagen = $producto ? $producto->imagen_url : '';
                    $categoria = $producto && $producto->categoria ? $producto->categoria->nombre_categoria : '';

                    if (! isset($resumenPorMoneda[$codigo]['productos_resumen'][$prodId])) {
                        $precioBase = isset($det->precio_base) ? (float) $det->precio_base : $precioVenta;
                        $resumenPorMoneda[$codigo]['productos_resumen'][$prodId] = [
                            'id' => $prodId,
                            'nombre' => $nombreProd,
                            'marca' => $marca,
                            'modelo' => $modelo,
                            'capacidad' => $capacidad,
                            'codigo' => $codigo,
                            'imagen_url' => $imagen,
                            'categoria' => $categoria,
                            'cantidad' => 0,
                            'precio_base' => $precioBase,
                            'precio_venta' => $precioVenta,
                            'total' => 0,
                        ];
                    }

                    $resumenPorMoneda[$codigo]['productos_resumen'][$prodId]['cantidad'] += $det->cantidad;
                    $resumenPorMoneda[$codigo]['productos_resumen'][$prodId]['total'] += (float) $det->subtotal;
                }
            }
        }

        // --- PROCESAR MOVIMIENTOS FINANCIEROS ---
        foreach ($movimientos as $mov) {
            $codigo = $mov->moneda ?? 'USD';
            if (! isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }

            // TIPO 1: GASTO
            if ($mov->tipo_movimiento_id == 1) {
                $item = [
                    'id' => 'm_'.$mov->id,
                    'desc' => $mov->descripcion,
                    'monto' => $mov->monto,
                    'hora' => $mov->created_at->format('H:i'),
                    'origen' => $this->obtenerNombreOrigen($mov),
                    'destino' => $this->obtenerNombreDestino($mov),
                ];

                // Resta a la caja
                $resumenPorMoneda[$codigo]['gastos'] += $mov->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto; // Gasto sale de caja
                $resumenPorMoneda[$codigo]['items_gastos'][] = $item;
            }
            // TIPO 2: INGRESO
            elseif ($mov->tipo_movimiento_id == 2) {
                $item = [
                    'id' => 'm_'.$mov->id,
                    'desc' => $mov->descripcion,
                    'monto' => $mov->monto,
                    'hora' => $mov->created_at->format('H:i'),
                    'origen' => $this->obtenerNombreOrigen($mov),
                    'destino' => $this->obtenerNombreDestino($mov),
                ];

                // Suma a la caja
                $resumenPorMoneda[$codigo]['ingresos_extra'] += $mov->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] += $mov->monto;
                $resumenPorMoneda[$codigo]['items_ingresos'][] = $item;
            }
            // TIPO 3: TRANSFERENCIA
            elseif ($mov->tipo_movimiento_id == 3) {
                // Determinar si el usuario es el emisor o el receptor de la transferencia
                $esReceptor = ! empty($mov->cuenta_destino_id) &&
                              in_array($mov->cuenta_destino_id, $cuentaIds);

                // Procesar transferencia con detalles bidireccionales
                $detallesTransferencia = $this->procesarTransferenciaBidireccional($mov, $resumenPorMoneda, $user, $cuentaIds, $esReceptor);

                // Actualizar saldos según corresponda
                if ($detallesTransferencia['afecta_saldo_origen']) {
                    $resumenPorMoneda[$codigo]['transferencias_salientes'] += $mov->monto;
                    $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto;
                }

                // Solo agregar a salientes si el usuario es el EMISOR (no receptor)
                if (! $esReceptor) {
                    $resumenPorMoneda[$codigo]['items_transferencias_salientes'][] = $detallesTransferencia['item_salida'];
                }
            }
        }

        // --- PROCESAR COMISIONES A GESTORES (Ventas con es_venta_gestor = true) ---
        $comisionesGestorTotalUSD = 0;
        $comisionesGestorDetalles = [];

        // Buscar ventas con gestor en el turno actual
        $ventasConGestor = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('es_venta_gestor', true)
            ->whereNotNull('gestor_cuenta_id')
            ->where('gestor_monto', '>', 0)
            ->with(['gestorCuenta.moneda', 'monedaCobro'])
            ->get();

        foreach ($ventasConGestor as $venta) {
            $montoComision = (float) $venta->gestor_monto;

            // Obtener la moneda de la cuenta del gestor - primero por relación, luego por campo directo
            $gestorCuenta = $venta->gestorCuenta;
            $monedaCodigo =
                ($gestorCuenta?->moneda?->codigo_moneda) ??
                ($gestorCuenta?->tipo_moneda) ??
                'USD';

            $tasaCambio = $gestorCuenta?->moneda?->tasa_cambio ?? 1;
            $montoEnUSD = $tasaCambio > 0 ? $montoComision / $tasaCambio : $montoComision;

            // Agregar al total
            $comisionesGestorTotalUSD += $montoEnUSD;

            // Crear detalle para la UI
            $comisionesGestorDetalles[] = [
                'venta_id' => $venta->id,
                'monto' => $montoComision,
                'moneda_codigo' => $monedaCodigo,
                'monto_usd' => round($montoEnUSD, 2),
                'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta ?? 'N/A',
                'cuenta_tipo' => $venta->gestorCuenta?->tipo ?? 'N/A',
                'comentario' => $venta->gestor_comentario ?? '',
                'fecha' => $venta->created_at->format('Y-m-d H:i'),
            ];

            // Restar del saldo calculado de la moneda correspondiente
            if (isset($resumenPorMoneda[$monedaCodigo])) {
                $resumenPorMoneda[$monedaCodigo]['comisiones_gestor'] = ($resumenPorMoneda[$monedaCodigo]['comisiones_gestor'] ?? 0) + $montoComision;
                $resumenPorMoneda[$monedaCodigo]['saldo_calculado'] -= $montoComision; // Comisión sale de caja
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
            $saldoCalculado = $monedaData['saldo_calculado'] ?? 0;

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

            // Saldo esperado incluye INGRESOS EXTRA y resta GASTOS y TRANSFERENCIAS
            $saldoEsperadoTotalUSD += ($saldoCalculado / $tasa);
        }

        $result = [
            'detalles' => array_values($resumenPorMoneda),
            'ventas_efectivo' => round($ventasEfectivoTotalUSD, 2),
            'ventas_otros' => round($ventasOtrosTotalUSD, 2),
            'saldo_esperado_global' => round($saldoEsperadoTotalUSD, 2),
            // NUEVO: Totales separados por destino
            'ventas_a_cuentas_total_usd' => round($ventasACuentasTotalUSD, 2),
            'ventas_a_clientes_total_usd' => round($ventasAClientesTotalUSD, 2),
            'ventas_a_cuentas_efectivo_usd' => round($ventasACuentasEfectivoUSD, 2),
            'ventas_a_cuentas_transferencia_usd' => round($ventasACuentasTransferenciaUSD, 2),
            'ventas_a_clientes_efectivo_usd' => round($ventasAClientesEfectivoUSD, 2),
            'ventas_a_clientes_transferencia_usd' => round($ventasAClientesTransferenciaUSD, 2),
            // NUEVO: Comisiones a gestores
            'comisiones_gestor_total' => round($comisionesGestorTotalUSD, 2),
            'comisiones_gestor_detalles' => $comisionesGestorDetalles,
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
    private function procesarTransferenciaBidireccional($movimiento, &$resumenPorMoneda, $user, array $cuentaIds = [], bool $esReceptor = false): array
    {
        $codigoOrigen = $movimiento->moneda ?? 'USD';
        $tasaCambio = $movimiento->tasa_cambio_aplicada ?? 1;

        // Obtener información del origen
        $origenInfo = $this->obtenerInfoEntidad($movimiento, 'origen');
        $destinoInfo = $this->obtenerInfoEntidad($movimiento, 'destino');

        // Determinar si afecta el saldo del usuario (solo si el origen es una cuenta suya)
        $afectaSaldoOrigen = false;

        if ($movimiento->cuentaOrigen && $user !== null) {
            $afectaSaldoOrigen = in_array($user->role, ['admin', 'moderador']) ||
                $user->cuentas()->where('id', $movimiento->cuentaOrigen->id)->exists();
        }

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
            'es_receptor' => $esReceptor, // Indica si el usuario actual es el receptor
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
            ];
            $montoEntrada = $movimiento->monto;
        }

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

            // Agregar detalles completos para vista
            if (! empty($monedaData['items_transferencias_salientes'])) {
                foreach ($monedaData['items_transferencias_salientes'] as $transferencia) {
                    $resumenTransferencias['detalles_completos'][] = [
                        'id' => $transferencia['id'] ?? '',
                        'descripcion' => $transferencia['desc'] ?? '',
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
                        'tipo' => 'saliente',
                    ];
                }
            }

            // Agregar transferencias entrantes si existen
            if (! empty($monedaData['items_transferencias_entrantes'])) {
                foreach ($monedaData['items_transferencias_entrantes'] as $transferencia) {
                    $resumenTransferencias['detalles_completos'][] = [
                        'id' => $transferencia['id'] ?? '',
                        'descripcion' => $transferencia['desc'] ?? '',
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
                        'tipo' => 'entrante',
                    ];
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
        $primerPago = \App\Models\PagoVenta::whereHas('venta', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        })->orderBy('created_at', 'asc')->first();

        if ($primerPago) {
            return $primerPago->created_at;
        }

        // 4. Último recurso: usar hoy
        return Carbon::today();
    }
}
