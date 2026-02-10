<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\Venta;
use App\Models\User;
use App\Models\MovimientoFinanciero;
use App\Models\Moneda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Notifications\CierreCajaNotification;
use App\Services\NotificationService;

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
        if (!$user->isAdmin() && !$user->isModerator()) {
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

        $inicioTurno = $ultimoCierre ? $ultimoCierre->fecha_cierre : Carbon::today();

        // Calcular detalles usando método compartido
        $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);

        // Moneda de referencia (principal) para que total productos = total cobrado
        $monedaRef = Moneda::where('principal', true)->first();

        // Preparar respuesta para Inertia con detalles mejorados de transferencias
        return Inertia::render('Cierres/Create', [
            'fecha_apertura' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
            'moneda_referencia' => $monedaRef ? $monedaRef->codigo_moneda : 'USD',
            'calculos' => [
                'inicio_turno' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
                'saldo_inicial' => 0, // Implementar saldo inicial real si existe lógica
                'ventas_efectivo' => $calculos['ventas_efectivo'],
                'ventas_otros' => $calculos['ventas_otros'],
                'gastos' => 0, // Ya incluido en saldo_esperado_global
                'devoluciones' => 0,
                'saldo_esperado_global' => $calculos['saldo_esperado_global'], // Saldo calculado con ingresos extras, gastos, etc.
                'detalles' => $calculos['detalles'],
                // Nuevos campos para transferencias bidireccionales
                'transferencias_resumen' => $this->obtenerResumenTransferencias($calculos['detalles'])
            ]
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
            'data_keys' => array_keys($request->all())
        ]);

        // Validación flexible: si fallan los secundarios, permitimos 0
        $data = $request->all();

        $saldoInicial = $data['saldo_inicial'] ?? 0;
        $ventasEfectivo = $data['ventas_efectivo'] ?? 0;
        $ventasOtros = $data['ventas_otros'] ?? 0;
        $totalGastos = $data['total_gastos'] ?? 0;
        $totalDevoluciones = $data['total_devoluciones'] ?? 0;
        $saldoContado = $data['saldo_contado'] ?? 0;

        $inicioTurno = isset($data['fecha_apertura']) ? Carbon::parse($data['fecha_apertura']) : now()->subDay();
        $user = Auth::user();

        // Intentar obtener detalles, si falla no bloqueamos el cierre
        try {
            $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);
            $detallesJson = $calculos['detalles'];
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Fallo obtenerDetallesCierre: ' . $e->getMessage());
            $detallesJson = [];
        }

        $saldoEsperado = round($saldoInicial + $ventasEfectivo - $totalGastos - $totalDevoluciones, 2);
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
            \Illuminate\Support\Facades\Log::emergency('!!! CIERRE GUARDADO EXITOSAMENTE ID: ' . $cierre->id . ' !!!');

            // Notificar a usuarios relevantes
            try {
                $notificationService = new NotificationService();
                $datosNotificacion = $notificationService->prepararDatosCierreCaja($cierre);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                Notification::send($usuariosParaNotificar, new CierreCajaNotification($cierre));
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de cierre de caja: ' . $e->getMessage());
            }

            return redirect()->route('ventas.cierres')->with('success', 'Cierre realizado con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::emergency('!!! ERROR CRÍTICO AL GUARDAR CIERRE !!!: ' . $e->getMessage());
            return back()->with('error', 'Error crítico: ' . $e->getMessage());
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
            'cierre' => $cierre
        ]);
    }

    public function aprobar(Request $request, $id)
    {
        $cierre = CierreCaja::findOrFail($id);
        $cierre->update([
            'estado' => 'aprobado',
            'revisor_id' => Auth::id()
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
        })->with(['moneda', 'cuenta', 'cliente', 'venta.detalles.producto'])->get();

        // 2. Obtener Movimientos Financieros (Gastos, Ingresos, Transferencias) del usuario
        $movimientos = MovimientoFinanciero::where('user_id', $user->id)
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
                'tasa_cambio' => $moneda->tasa_cambio,
                'ventas_efectivo' => 0,
                'ventas_transferencia' => 0,
                'ingresos_extra' => 0,
                'gastos' => 0,
                'transferencias_salientes' => 0,
                'transferencias_entrantes' => 0,
                            'saldo_calculado' => 0,
                            // Nuevos agregados para ventas
                            'total_cantidad_productos_vendidos_en_moneda' => 0,
                            'total_precios_unitarios_vendidos_en_moneda' => 0,
                            'total_subtotales_vendidos_en_moneda' => 0,
                            // Detalles específicos para la UI solicitada
                            'items_ventas' => [],
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

        // Primero, construir cache de detalles de productos por venta
        foreach ($pagos as $pago) {
            if ($pago->venta && $pago->venta->detalles && !isset($ventasConDetalles[$pago->venta_id])) {
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
                    $partes = array_filter([$nombre, $marca, $modelo, $capacidad]);
                    $descripcionCompleta = implode(' ', $partes);
                    $precioVenta = (float) $det->precio_venta;
                    $subtotal = (float) $det->subtotal;
                    $precioEquiv = $tasaVenta > 0 ? $precioVenta / $tasaVenta : $precioVenta;
                    $subtotalEquiv = $tasaVenta > 0 ? $subtotal / $tasaVenta : $subtotal;
                    $detallesProductos[] = [
                        'cantidad' => (int) $det->cantidad,
                        'descripcion' => $descripcionCompleta,
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
            if (!isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }
            if (!isset($resumenPorMoneda[$codigo]['pagos_resumen'])) {
                $resumenPorMoneda[$codigo]['pagos_resumen'] = ['efectivo' => 0, 'transferencia' => 0];
            }
            if (!isset($resumenPorMoneda[$codigo]['productos_resumen'])) {
                $resumenPorMoneda[$codigo]['productos_resumen'] = [];
            }

            $detallesProductos = $ventasConDetalles[$pago->venta_id] ?? [];

            // Destino del pago: cuenta (ej. ZELLE EDDY ALONSO) o cliente o efectivo
            $destinoNombre = $pago->cuenta
                ? $pago->cuenta->nombre_cuenta
                : ($pago->cliente ? $pago->cliente->nombre_cliente : null);
            $itemVenta = [
                'id' => 'p_' . $pago->id,
                'venta_id' => $pago->venta_id,
                'monto' => (float) $pago->monto,
                'monto_equivalente' => (float) ($pago->monto_equivalente ?? $pago->monto),
                'tipo_pago' => $pago->tipo_pago,
                'confirmada' => !empty($pago->referencia),
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

            // Clasificar Efectivo vs Transferencia
            if ($pago->tipo_pago === 'efectivo') {
                $resumenPorMoneda[$codigo]['ventas_efectivo'] += $pago->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] += $pago->monto;
                $resumenPorMoneda[$codigo]['pagos_resumen']['efectivo'] += $pago->monto;
            } else {
                $resumenPorMoneda[$codigo]['ventas_transferencia'] += $pago->monto;
                $resumenPorMoneda[$codigo]['pagos_resumen']['transferencia'] += $pago->monto;
                $itemVenta['confirmada'] = !empty($pago->referencia);
            }

            // --- AGREGAR A OPERACIONES DETALLE (DESGLOSE POR MÉTODO DE PAGO) ---
            $resumenPorMoneda[$codigo]['operaciones_detalle'][] = [
                'venta_id' => $pago->venta_id,
                'pago_id' => $pago->id,
                'cliente' => $pago->cliente ? $pago->cliente->nombre_cliente : 'Mostrador',
                'monto' => (float) $pago->monto,
                'hora' => $pago->created_at->format('H:i'),
                'tipo_pago' => $pago->tipo_pago,
                'via_pago' => $pago->via_pago ?? null,
                'cuenta_nombre' => $pago->cuenta ? $pago->cuenta->nombre_cuenta : null,
                'destino_nombre' => $destinoNombre,
                'productos' => $detallesProductos,
            ];

            // --- AGREGAR A RESUMEN DE PRODUCTOS (UNA SOLA VEZ POR VENTA) ---
            if ($pago->venta && $pago->venta->detalles && !in_array($pago->venta_id, $ventasProcesadas)) {
                $ventasProcesadas[] = $pago->venta_id;
                foreach ($pago->venta->detalles as $det) {
                    $prodId = $det->producto_id;
                    $nombreProd = $det->producto ? $det->producto->nombre_producto : 'Producto Desconocido';
                    $marca = $det->producto ? $det->producto->marca_producto : '';

                    if (!isset($resumenPorMoneda[$codigo]['productos_resumen'][$prodId])) {
                        $resumenPorMoneda[$codigo]['productos_resumen'][$prodId] = [
                            'id' => $prodId,
                            'nombre' => $nombreProd,
                            'detalles' => $marca,
                            'cantidad' => 0,
                            'precio' => (float) $det->precio_venta,
                            'total' => 0,
                        ];
                    }

                    $resumenPorMoneda[$codigo]['productos_resumen'][$prodId]['cantidad'] += $det->cantidad;
                    $resumenPorMoneda[$codigo]['productos_resumen'][$prodId]['total'] += (float) $det->subtotal;
                }
            }

            $resumenPorMoneda[$codigo]['items_ventas'][] = $itemVenta;
        }

        // --- PROCESAR MOVIMIENTOS FINANCIEROS ---
        foreach ($movimientos as $mov) {
            $codigo = $mov->moneda ?? 'USD';
            if (!isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }

            // TIPO 1: GASTO
            if ($mov->tipo_movimiento_id == 1) {
                $item = [
                    'id' => 'm_' . $mov->id,
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
                    'id' => 'm_' . $mov->id,
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
                // Procesar transferencia con detalles bidireccionales
                $detallesTransferencia = $this->procesarTransferenciaBidireccional($mov, $resumenPorMoneda, $user);

                // Actualizar saldos según corresponda
                if ($detallesTransferencia['afecta_saldo_origen']) {
                    $resumenPorMoneda[$codigo]['transferencias_salientes'] += $mov->monto;
                    $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto;
                }

                // Agregar a la lista de transferencias salientes (el usuario siempre ve sus salidas)
                $resumenPorMoneda[$codigo]['items_transferencias_salientes'][] = $detallesTransferencia['item_salida'];
            }
        }

        // --- CALCULAR TOTALES GLOBALES (EQUIVALENTE USD) ---
        $ventasEfectivoTotalUSD = 0;
        $ventasOtrosTotalUSD = 0;
        $saldoEsperadoTotalUSD = 0;

        foreach ($resumenPorMoneda as $monedaData) {
            $tasa = $monedaData['tasa_cambio'] > 0 ? $monedaData['tasa_cambio'] : 1;

            // Convertir a USD (Moneda Base) - Asumiendo Tasa es X Moneda / 1 USD?
            // O 1 Moneda = X USD?
            // Revisando MonedaController: $totalCupDistribuir / $tasa_cambio = USD.
            // Entonces Tasa es CUP por USD. (ej. 320).
            // MontoBase = MontoMoneda / Tasa.

            $ventasEfectivoTotalUSD += ($monedaData['ventas_efectivo'] / $tasa);
            $ventasOtrosTotalUSD += ($monedaData['ventas_transferencia'] / $tasa);

            // Saldo esperado incluye INGRESOS EXTRA y resta GASTOS y TRANSFERENCIAS
            // Saldo Calculado en Moneda / Tasa
            $saldoEsperadoTotalUSD += ($monedaData['saldo_calculado'] / $tasa);
        }

        return [
            'detalles' => array_values($resumenPorMoneda), // Array para frontend
            'ventas_efectivo' => round($ventasEfectivoTotalUSD, 2),
            'ventas_otros' => round($ventasOtrosTotalUSD, 2),
            // Pasamos el saldo calculado total para pre-llenar los campos
            'saldo_esperado_global' => round($saldoEsperadoTotalUSD, 2)
        ];
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
            'ventas_efectivo' => 0,
            'ventas_transferencia' => 0,
            'ingresos_extra' => 0,
            'gastos' => 0,
            'transferencias_salientes' => 0,
            'transferencias_entrantes' => 0,
            'saldo_calculado' => 0,
            // Resumen directo solicitado
            'productos_resumen' => [],
            'pagos_resumen' => [
                'efectivo' => 0,
                'transferencia' => 0,
            ],
            'items_ventas' => [],
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
            return "Caja/Origen no especificado";
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
            return "Destino no especificado";
        }
    }

    /**
     * Procesa una transferencia para mostrar detalles bidireccionales completos
     */
    private function procesarTransferenciaBidireccional($movimiento, &$resumenPorMoneda, $user): array
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
            'id' => 't_' . $movimiento->id,
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
        ];

        // Si el destino está en una moneda diferente, agregar también a la lista de esa moneda
        if ($destinoInfo['moneda'] !== $codigoOrigen && isset($resumenPorMoneda[$destinoInfo['moneda']])) {
            $itemEntrada = [
                'id' => 't_entrada_' . $movimiento->id,
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
                'es_entrada' => true,
            ];

            $resumenPorMoneda[$destinoInfo['moneda']]['items_transferencias_entrantes'][] = $itemEntrada;
            $resumenPorMoneda[$destinoInfo['moneda']]['transferencias_entrantes'] += $itemEntrada['monto_destino'];
        }

        return [
            'item_salida' => $itemSalida,
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
            return (float)$movimiento->monto;
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
            return (float)$movimiento->monto;
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
            'detalles_completos' => []
        ];

        foreach ($detalles as $monedaData) {
            $codigo = $monedaData['moneda'];

            // Acumular totales
            $resumenTransferencias['total_salientes'] += $monedaData['transferencias_salientes'];
            $resumenTransferencias['total_entrantes'] += $monedaData['transferencias_entrantes'];

            // Resumen por moneda
            if ($monedaData['transferencias_salientes'] > 0 || $monedaData['transferencias_entrantes'] > 0) {
                $resumenTransferencias['por_moneda'][$codigo] = [
                    'moneda' => $codigo,
                    'tasa_cambio' => $monedaData['tasa_cambio'],
                    'salientes' => $monedaData['transferencias_salientes'],
                    'entrantes' => $monedaData['transferencias_entrantes'],
                    'neto' => $monedaData['transferencias_entrantes'] - $monedaData['transferencias_salientes'],
                    'items_salientes' => $monedaData['items_transferencias_salientes'],
                    'items_entrantes' => $monedaData['items_transferencias_entrantes'] ?? []
                ];
            }

            // Agregar detalles completos para vista
            if (!empty($monedaData['items_transferencias_salientes'])) {
                foreach ($monedaData['items_transferencias_salientes'] as $transferencia) {
                    $resumenTransferencias['detalles_completos'][] = [
                        'id' => $transferencia['id'],
                        'descripcion' => $transferencia['desc'],
                        'monto_origen' => $transferencia['monto_origen'],
                        'moneda_origen' => $transferencia['moneda_origen'],
                        'origen_tipo' => $transferencia['origen_tipo'],
                        'origen_nombre' => $transferencia['origen_nombre'],
                        'monto_destino' => $transferencia['monto_destino'],
                        'moneda_destino' => $transferencia['moneda_destino'],
                        'destino_tipo' => $transferencia['destino_tipo'],
                        'destino_nombre' => $transferencia['destino_nombre'],
                        'tasa_cambio' => $transferencia['tasa_cambio'],
                        'hora' => $transferencia['hora'],
                        'afecta_saldo_usuario' => $transferencia['afecta_saldo_usuario'] ?? false,
                        'tipo' => 'saliente'
                    ];
                }
            }

            // Agregar transferencias entrantes si existen
            if (!empty($monedaData['items_transferencias_entrantes'])) {
                foreach ($monedaData['items_transferencias_entrantes'] as $transferencia) {
                    $resumenTransferencias['detalles_completos'][] = [
                        'id' => $transferencia['id'],
                        'descripcion' => $transferencia['desc'],
                        'monto_origen' => $transferencia['monto_origen'],
                        'moneda_origen' => $transferencia['moneda_origen'],
                        'origen_tipo' => $transferencia['origen_tipo'],
                        'origen_nombre' => $transferencia['origen_nombre'],
                        'monto_destino' => $transferencia['monto_destino'],
                        'moneda_destino' => $transferencia['moneda_destino'],
                        'destino_tipo' => $transferencia['destino_tipo'],
                        'destino_nombre' => $transferencia['destino_nombre'],
                        'tasa_cambio' => $transferencia['tasa_cambio'],
                        'hora' => $transferencia['hora'],
                        'tipo' => 'entrante'
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
}
