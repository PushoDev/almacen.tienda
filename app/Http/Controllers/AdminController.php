<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
use App\Models\TasaCambioMLC;
use App\Models\HistorialTasaCambio;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Obtener datos para las tablas
        $user = auth()->user();
        $montosPorMoneda = [];
        $totalCapital = 0;
        $comparaciones = [];
        $historialCambios = [];

        // Solo calcular si el usuario tiene cuentas asignadas
        if ($user) {
            // Solo los vendedores ven sus cuentas asignadas, los admin y moderador ven todas
            if ($user->role === 'vendedor') {
                $cuentasUsuario = $user->cuentas()->with('moneda')->get();
            } else {
                // Admin y moderador pueden ver todas las cuentas
                $cuentasUsuario = \App\Models\Cuenta::with('moneda')->get();
            }

            // Agrupar montos por moneda
            foreach ($cuentasUsuario as $cuenta) {
                if (!$cuenta->moneda) continue;
                
                $monedaCodigo = $cuenta->moneda->codigo_moneda;
                $monto = $cuenta->saldo_cuenta ?? 0;
                $tasaCambio = $cuenta->moneda->tasa_cambio ?? 1;

                if (!isset($montosPorMoneda[$monedaCodigo])) {
                    $montosPorMoneda[$monedaCodigo] = [
                        'descripcion' => $cuenta->moneda->nombre_moneda,
                        'simbolo' => $cuenta->moneda->simbolo_moneda,
                        'monto' => 0,
                        'tasa_cambio' => $tasaCambio,
                    ];
                }

                $montosPorMoneda[$monedaCodigo]['monto'] += $monto;

                // Convertir a moneda base (USD) para el total de capital
                $totalCapital += $monto / $tasaCambio;
            }

            // Obtener comparaciones mensuales (solo para las cuentas del usuario si es vendedor)
            if ($user->role === 'vendedor') {
                $comparaciones = $this->getComparacionesMensuales($user->id);
            } else {
                // Para admin y moderador, mostrar comparaciones de todas las cuentas
                $comparaciones = $this->getComparacionesMensuales(null); // null significa todas las cuentas
            }

            // Obtener historial de cambios de tasa (solo para admin y moderador)
            if (in_array($user->role, ['admin', 'moderador'])) {
                $historialCambios = $this->getHistorialCambiosRecientes();
            }
        }

        return Inertia::render('dashboard', [
            'userRole' => auth()->user()->role,
            'montosPorMoneda' => array_values($montosPorMoneda),
            'totalCapital' => $totalCapital,
            'comparaciones' => $comparaciones,
            'historialCambios' => $historialCambios,
        ]);
    }

    /**
     * Obtener comparaciones mensuales (mes actual vs mes anterior)
     * Usando movimientos financieros para calcular cambios en los saldos
     */
    private function getComparacionesMensuales($userId)
    {
        // Obtener cuentas del usuario o todas las cuentas si userId es null
        if ($userId) {
            $cuentaIds = DB::table('user_cuentas')
                ->where('user_id', $userId)
                ->pluck('cuenta_id');
        } else {
            // Si userId es null, obtener todas las cuentas
            $cuentaIds = \App\Models\Cuenta::pluck('id');
        }

        if ($cuentaIds->isEmpty()) {
            return [];
        }

        // Montos actuales (mes actual)
        $montoActual = DB::table('cuentas')
            ->whereIn('cuentas.id', $cuentaIds)
            ->join('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
            ->select(
                'monedas.codigo_moneda as moneda',
                'monedas.nombre_moneda as nombre_moneda',
                'monedas.simbolo_moneda as simbolo_moneda',
                DB::raw('SUM(cuentas.saldo_cuenta) as monto_actual'),
                DB::raw('AVG(monedas.tasa_cambio) as tasa_cambio_promedio')
            )
            ->groupBy('monedas.codigo_moneda', 'monedas.nombre_moneda', 'monedas.simbolo_moneda', 'monedas.tasa_cambio')
            ->get();

        // Calcular saldos del mes anterior basados en movimientos financieros
        $inicioMesActual = now()->startOfMonth();
        $inicioMesAnterior = now()->subMonth()->startOfMonth();
        $finMesAnterior = now()->subMonth()->endOfMonth();

        $montoAnterior = [];
        foreach ($montoActual as $actual) {
            // Obtener movimientos del mes anterior para calcular el saldo
            $movimientosMesAnterior = DB::table('movimientos_financieros')
                ->whereIn('movimientos_financieros.cuenta_origen_id', $cuentaIds)
                ->orWhereIn('movimientos_financieros.cuenta_destino_id', $cuentaIds)
                ->where('movimientos_financieros.moneda', $actual->moneda)
                ->whereBetween('movimientos_financieros.fecha_operacion', [$inicioMesAnterior, $finMesAnterior])
                ->select(
                    'movimientos_financieros.cuenta_origen_id',
                    'movimientos_financieros.cuenta_destino_id',
                    'movimientos_financieros.monto',
                    'movimientos_financieros.tipo_movimiento_id'
                )
                ->get();

            // Calcular cambio neto del mes anterior
            $cambioNeto = 0;
            foreach ($movimientosMesAnterior as $movimiento) {
                // Si la cuenta es origen, es una salida (negativo)
                if (in_array($movimiento->cuenta_origen_id, $cuentaIds->toArray())) {
                    $cambioNeto -= $movimiento->monto;
                }
                // Si la cuenta es destino, es una entrada (positivo)
                if (in_array($movimiento->cuenta_destino_id, $cuentaIds->toArray())) {
                    $cambioNeto += $movimiento->monto;
                }
            }

            // El saldo anterior es el saldo actual menos el cambio del mes
            $saldoAnterior = $actual->monto_actual - $cambioNeto;

            $montoAnterior[] = [
                'moneda' => $actual->moneda,
                'nombre_moneda' => $actual->nombre_moneda,
                'simbolo_moneda' => $actual->simbolo_moneda,
                'monto_anterior' => $saldoAnterior,
                'tasa_cambio_promedio' => $actual->tasa_cambio_promedio
            ];
        }

        // Convertir a colección para facilitar el procesamiento
        $montoAnteriorCollection = collect($montoAnterior);

        $comparaciones = [];
        foreach ($montoActual as $actual) {
            $anterior = $montoAnteriorCollection->firstWhere('moneda', $actual->moneda);

            $diferencia = $actual->monto_actual - ($anterior ? $anterior['monto_anterior'] : 0);
            $porcentajeCambio = $anterior && $anterior['monto_anterior'] != 0
                ? (($actual->monto_actual - $anterior['monto_anterior']) / $anterior['monto_anterior']) * 100
                : 0;

            $comparaciones[] = [
                'moneda' => $actual->moneda,
                'nombre_moneda' => $actual->nombre_moneda,
                'simbolo_moneda' => $actual->simbolo_moneda,
                'monto_actual' => $actual->monto_actual,
                'monto_anterior' => $anterior ? $anterior['monto_anterior'] : 0,
                'diferencia' => $diferencia,
                'porcentaje_cambio' => round($porcentajeCambio, 2),
                'es_positivo' => $diferencia >= 0
            ];
        }

        return $comparaciones;
    }

    

    /**
     * Actualizar la tasa de cambio USD -> CUP
     */
    public function update(Request $request)
    {
        $request->validate([
            'tasa_cambio' => 'required|numeric|min:0',
        ]);

        // CORRECCIÓN CLAVE: setTasa() ahora requiere el par de monedas y la tasa.
        // Asumimos que este método actualiza la tasa USD a CUP.
        TasaCambio::setTasa('USD', 'CUP', $request->input('tasa_cambio'));

        return back()->with('success', 'Tasa actualizada correctamente.');
    }

    /**
     * Actualizar la tasa de cambio MLC
     * Ahora actualiza el registro existente en lugar de crear uno nuevo
     */
    public function updateMLC(Request $request)
    {
        $request->validate([
            'tasa_mlc' => 'required|numeric|min:0',
        ]);

        // Obtener el último registro de tasa MLC
        $tasaMLC = TasaCambioMLC::latest()->first();

        if ($tasaMLC) {
            // Si existe, actualizarlo
            $tasaMLC->update([
                'tasa_mlc' => $request->input('tasa_mlc')
            ]);
        } else {
            // Si no existe, crear uno nuevo
            TasaCambioMLC::create([
                'tasa_mlc' => $request->input('tasa_mlc')
            ]);
        }

        return back()->with('success', 'Tasa MLC actualizada correctamente.');
    }

    /**
     * Obtener historial de cambios de tasa recientes
     */
    private function getHistorialCambiosRecientes(): array
    {
        return HistorialTasaCambio::with(['moneda:id,nombre_moneda,codigo_moneda,simbolo_moneda', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(10) // Últimos 10 cambios
            ->get()
            ->map(function ($historial) {
                return [
                    'id' => $historial->id,
                    'moneda' => [
                        'id' => $historial->moneda->id,
                        'nombre_moneda' => $historial->moneda->nombre_moneda,
                        'codigo_moneda' => $historial->moneda->codigo_moneda,
                        'simbolo_moneda' => $historial->moneda->simbolo_moneda,
                    ],
                    'usuario' => [
                        'id' => $historial->user->id,
                        'name' => $historial->user->name,
                    ],
                    'tasa_anterior' => number_format($historial->tasa_anterior, 2),
                    'tasa_nueva' => number_format($historial->tasa_nueva, 2),
                    'diferencia_tasa' => number_format($historial->diferencia_tasa, 2),
                    'porcentaje_cambio' => number_format($historial->porcentaje_cambio, 4),
                    'total_cuentas_afectadas' => number_format($historial->total_cuentas_afectadas, 2),
                    'impacto_financiero' => number_format($historial->impacto_financiero, 2),
                    'impacto_porcentaje' => number_format($historial->impacto_porcentaje, 2),
                    'numero_cuentas_afectadas' => $historial->numero_cuentas_afectadas,
                    'es_ganancia' => $historial->esGanancia(),
                    'es_perdida' => $historial->esPerdida(),
                    'impacto_formateado' => $historial->getImpactoFormateadoAttribute(),
                    'impacto_porcentaje_formateado' => $historial->getImpactoPorcentajeFormateadoAttribute(),
                    'fecha_cambio' => $historial->created_at->format('Y-m-d H:i:s'),
                    'fecha_formateada' => $historial->created_at->format('d/m/Y H:i'),
                ];
            })
            ->toArray();
    }

    /**
     * API para obtener historial completo de cambios
     */
    public function getHistorialCompleto(Request $request)
    {
        $request->validate([
            'moneda_id' => 'nullable|exists:monedas,id',
            'dias' => 'nullable|integer|min:1|max:365',
            'tipo' => 'nullable|in:ganancias,perdidas,todos',
        ]);

        $query = HistorialTasaCambio::with(['moneda:id,nombre_moneda,codigo_moneda,simbolo_moneda', 'user:id,name']);

        // Filtros
        if ($request->moneda_id) {
            $query->porMoneda($request->moneda_id);
        }

        if ($request->dias) {
            $query->recientes($request->dias);
        }

        if ($request->tipo === 'ganancias') {
            $query->ganancias();
        } elseif ($request->tipo === 'perdidas') {
            $query->perdidas();
        }

        $historial = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(function ($item) {
                return [
                    'id' => $item->id,
                    'moneda' => $item->moneda,
                    'usuario' => $item->user,
                    'tasa_anterior' => $item->tasa_anterior,
                    'tasa_nueva' => $item->tasa_nueva,
                    'diferencia_tasa' => $item->diferencia_tasa,
                    'porcentaje_cambio' => $item->porcentaje_cambio,
                    'impacto_financiero' => $item->impacto_financiero,
                    'impacto_porcentaje' => $item->impacto_porcentaje,
                    'es_ganancia' => $item->esGanancia(),
                    'impacto_formateado' => $item->getImpactoFormateadoAttribute(),
                    'fecha_formateada' => $item->created_at->format('d/m/Y H:i'),
                ];
            });

        return response()->json($historial);
    }

    /**
     * Obtener estadísticas de impacto financiero
     */
    public function getEstadisticasImpacto()
    {
        $totalGanancias = HistorialTasaCambio::ganancias()->sum('impacto_financiero');
        $totalPerdidas = abs(HistorialTasaCambio::perdidas()->sum('impacto_financiero'));
        $netoImpacto = $totalGanancias - $totalPerdidas;
        
        $numeroCambios = HistorialTasaCambio::count();
        $cambiosConGanancia = HistorialTasaCambio::ganancias()->count();
        $cambiosConPerdida = HistorialTasaCambio::perdidas()->count();
        
        $mayorGanancia = HistorialTasaCambio::ganancias()->orderBy('impacto_financiero', 'desc')->first();
        $mayorPerdida = HistorialTasaCambio::perdidas()->orderBy('impacto_financiero', 'asc')->first();

        return response()->json([
            'total_ganancias' => number_format($totalGanancias, 2),
            'total_perdidas' => number_format($totalPerdidas, 2),
            'neto_impacto' => number_format($netoImpacto, 2),
            'numero_cambios' => $numeroCambios,
            'cambios_con_ganancia' => $cambiosConGanancia,
            'cambios_con_perdida' => $cambiosConPerdida,
            'porcentaje_ganancias' => $numeroCambios > 0 ? round(($cambiosConGanancia / $numeroCambios) * 100, 2) : 0,
            'porcentaje_perdidas' => $numeroCambios > 0 ? round(($cambiosConPerdida / $numeroCambios) * 100, 2) : 0,
            'mayor_ganancia' => $mayorGanancia ? [
                'monto' => number_format($mayorGanancia->impacto_financiero, 2),
                'moneda' => $mayorGanancia->moneda->nombre_moneda,
                'fecha' => $mayorGanancia->created_at->format('d/m/Y'),
            ] : null,
            'mayor_perdida' => $mayorPerdida ? [
                'monto' => number_format(abs($mayorPerdida->impacto_financiero), 2),
                'moneda' => $mayorPerdida->moneda->nombre_moneda,
                'fecha' => $mayorPerdida->created_at->format('d/m/Y'),
            ] : null,
        ]);
    }
}
