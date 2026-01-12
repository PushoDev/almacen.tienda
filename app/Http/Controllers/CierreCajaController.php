<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\Venta;
use App\Models\User;
use App\Models\MovimientoFinanciero;
use App\Models\Moneda;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use App\Notifications\CierreCajaNotification;

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

        // Preparar respuesta para Inertia
        return Inertia::render('Cierres/Create', [
            'fecha_apertura' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
            'calculos' => [
                'inicio_turno' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
                'saldo_inicial' => 0, // Implementar saldo inicial real si existe lógica
                'ventas_efectivo' => $calculos['ventas_efectivo'],
                'ventas_otros' => $calculos['ventas_otros'],
                'gastos' => 0, // Ya incluido en saldo_esperado_global
                'devoluciones' => 0,
                'saldo_esperado_global' => $calculos['saldo_esperado_global'], // Saldo calculado con ingresos extras, gastos, etc.
                'detalles' => $calculos['detalles']
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
        if (Auth::user()->role !== 'admin' && Auth::user()->role !== 'moderador' && Auth::user()->id !== $cierre->user_id) {
            abort(403);
        }

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
            ->with(['tipoMovimiento', 'cuentaOrigen', 'cuentaDestino'])
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
                'saldo_calculado' => 0,
                // Detalles específicos para la UI solicitada
                'items_ventas' => [],
                'items_gastos' => [],
                'items_ingresos' => [],
                'items_transferencias' => [],
            ];
        }
        // Asegurar que si hay monedas en pagos que no esten activas, se creen
        // (Aunque el sistema no debería permitirlo, es defensivo)

        // --- PROCESAR PAGOS DE VENTAS ---
        foreach ($pagos as $pago) {
            $codigo = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD';
            if (!isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }

            // Construir detalle de productos para el tooltip
            $detallesStr = "";
            if ($pago->venta && $pago->venta->detalles) {
                foreach ($pago->venta->detalles as $det) {
                    $nombreProd = $det->producto ? $det->producto->nombre_producto : 'Producto';
                    $detallesStr .= "{$det->cantidad}x {$nombreProd}, ";
                }
                $detallesStr = rtrim($detallesStr, ", ");
            }

            $itemVenta = [
                'id' => 'p_' . $pago->id,
                'monto' => $pago->monto,
                'tipo_pago' => $pago->tipo_pago,
                'confirmada' => !empty($pago->referencia),
                'referencia' => $pago->referencia,
                'cliente' => $pago->cliente ? $pago->cliente->nombre_cliente : 'Mostrador',
                'hora' => $pago->created_at->format('H:i'),
                'detalles' => $detallesStr // <--- Nuevo campo para el tooltip
            ];

            // Clasificar Efectivo vs Transferencia
            // Si el pago va a una Cuenta, revisar si la cuenta es 'Caja Física' (tipo efectivo) o Banco.
            // Simplificación actual: Basado en 'tipo_pago' del registro.
            if ($pago->tipo_pago === 'efectivo') {
                $resumenPorMoneda[$codigo]['ventas_efectivo'] += $pago->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] += $pago->monto;
            } else {
                $resumenPorMoneda[$codigo]['ventas_transferencia'] += $pago->monto;
                // Las transferencias NO suman al saldo físico de caja usualmente,
                // pero SÍ suman al saldo contable del turno si el usuario es responsable de esa cuenta bancaria.
                // IMPORTANTE: En tiendas, el cajero suele rendir solo el EFECTIVO.
                // Las transferencias se confirman pero no se "entregan" físicamente.
                // NO sumaremos transferencia al 'saldo_calculado' de la CAJA FÍSICA.
                // Pero se mostrarán en el reporte.
                $itemVenta['confirmada'] = !empty($pago->referencia);
            }
            $resumenPorMoneda[$codigo]['items_ventas'][] = $itemVenta;
        }

        // --- PROCESAR MOVIMIENTOS FINANCIEROS ---
        foreach ($movimientos as $mov) {
            $codigo = $mov->moneda ?? 'USD';
            if (!isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = $this->initMonedaStruct($codigo);
            }

            $item = [
                'id' => 'm_' . $mov->id,
                'desc' => $mov->descripcion,
                'monto' => $mov->monto,
                'hora' => $mov->created_at->format('H:i'),
                'origen' => $mov->cuentaOrigen ? $mov->cuentaOrigen->nombre_cuenta : 'Caja',
                'destino' => $mov->cuentaDestino ? $mov->cuentaDestino->nombre_cuenta : 'Externo'
            ];

            // TIPO 1: GASTO
            if ($mov->tipo_movimiento_id == 1) {
                // Resta a la caja
                $resumenPorMoneda[$codigo]['gastos'] += $mov->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto; // Gasto sale de caja
                $resumenPorMoneda[$codigo]['items_gastos'][] = $item;
            }
            // TIPO 2: INGRESO
            elseif ($mov->tipo_movimiento_id == 2) {
                // Suma a la caja
                $resumenPorMoneda[$codigo]['ingresos_extra'] += $mov->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] += $mov->monto;
                $resumenPorMoneda[$codigo]['items_ingresos'][] = $item;
            }
            // TIPO 3: TRANSFERENCIA
            elseif ($mov->tipo_movimiento_id == 3) {
                // Si Origen es NULL (o cuenta de caja), es salida.
                // Si Destino es NULL (o cuenta de caja), es entrada.
                // Como filtramos por 'user_id' creador, asumimos que EL USUARIO inició la transferencia.
                // Si es salida:
                $resumenPorMoneda[$codigo]['transferencias_salientes'] += $mov->monto;
                $resumenPorMoneda[$codigo]['saldo_calculado'] -= $mov->monto;
                $resumenPorMoneda[$codigo]['items_transferencias'][] = $item;

                // NOTA: Si hubiera transferencias ENTRANTES hechas por OTRO usuario hacia este usuario,
                // no saldrían en esta query (user_id = auth).
                // Eso requeriría una lógica más compleja de "Buzón de transferencias".
                // Por ahora asumimos flujo simple.
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
            // Pasamos el saldo calculo total para pre-llenar los campos
            'saldo_esperado_global' => round($saldoEsperadoTotalUSD, 2)
        ];
    }

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
            'saldo_calculado' => 0,
            'items_ventas' => [],
            'items_gastos' => [],
            'items_ingresos' => [],
            'items_transferencias' => [],
        ];
    }
}
