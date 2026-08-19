<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
use App\Models\TasaCambioMLC;
use App\Models\HistorialTasaCambio;
use App\Models\HistorialComparacionMensual;
use App\Models\HistorialPrecioCosto;
use App\Services\DashboardStatsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(DashboardStatsService $dashboardStatsService)
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

            // Obtener historial de cambios de tasa (solo para admin y moderador)
            if (in_array($user->role, ['admin', 'moderador'])) {
                $historialCambios = $this->getHistorialCambiosRecientes();
            }
        }

        $historialCostoPrecio = [];
        $statsCostoPrecio     = [];
        $resumenFinanciero    = null;
        $gananciaAgenciaMes   = null;
        if ($user && in_array($user->role, ['admin', 'moderador'])) {
            $historialCostoPrecio = $this->getHistorialCostoPrecioReciente();
            $statsCostoPrecio     = $this->getStatsCostoPrecio();
            $resumenFinanciero    = $dashboardStatsService->getResumenFinancieroCompacto();
            // Red de seguridad: si el comando programado `comparacion:cerrar-mes` no corrió
            // todavía este mes (p.ej. no hay cron configurado en el servidor), el primer
            // acceso al dashboard en el mes nuevo hace el cierre acá mismo. Llamadas
            // siguientes solo refrescan el saldo en vivo, sin tocar "Mes Anterior".
            $comparaciones      = $dashboardStatsService->actualizarComparacionMensual(null);
            $gananciaAgenciaMes = $dashboardStatsService->getGananciaAgenciaMes();
        }

        return Inertia::render('dashboard', [
            'userRole'            => auth()->user()->role,
            'montosPorMoneda'     => array_values($montosPorMoneda),
            'totalCapital'        => $totalCapital,
            'comparaciones'       => $comparaciones,
            'historialCambios'    => $historialCambios,
            'historialCostoPrecio'=> $historialCostoPrecio,
            'statsCostoPrecio'    => $statsCostoPrecio,
            'resumenFinanciero'   => $resumenFinanciero,
            'gananciaAgenciaMes'  => $gananciaAgenciaMes,
        ]);
    }

    /**
     * Obtener historial de comparaciones mensuales
     */
    public function getHistorialComparaciones(Request $request)
    {
        $request->validate([
            'meses' => 'nullable|integer|min:1|max:24',
            'moneda' => 'nullable|string|max:10',
        ]);

        $query = HistorialComparacionMensual::with('user:id,name')
            ->orderBy('mes_comparado', 'desc')
            ->orderBy('moneda_codigo');

        // Filtrar por meses
        if ($request->meses) {
            $fechaLimite = now()->subMonths($request->meses)->startOfMonth();
            $query->where('mes_comparado', '>=', $fechaLimite);
        }

        // Filtrar por moneda
        if ($request->moneda) {
            $query->where('moneda_codigo', $request->moneda);
        }

        // Si no es admin, solo mostrar sus propias comparaciones
        if (!in_array(auth()->user()->role, ['admin', 'moderador'])) {
            $query->where('user_id', auth()->id());
        }

        $historial = $query->paginate(15)->through(function ($item) {
            return [
                'id' => $item->id,
                'usuario' => $item->user->name ?? 'Sistema',
                'mes_comparado' => $item->mes_comparado->format('Y-m'),
                'mes_formateado' => $item->mes_comparado->format('F Y'),
                'moneda_codigo' => $item->moneda_codigo,
                'moneda_nombre' => $item->moneda_nombre,
                'moneda_simbolo' => $item->moneda_simbolo,
                'monto_anterior' => (float) $item->monto_anterior,
                'monto_actual' => (float) $item->monto_actual,
                'diferencia' => (float) $item->diferencia,
                'diferencia_formateada' => $item->getDiferenciaFormateadaAttribute(),
                'porcentaje_cambio' => (float) $item->porcentaje_cambio,
                'porcentaje_formateado' => $item->getPorcentajeFormateadoAttribute(),
                'es_positivo' => $item->esPositivo(),
                'tasa_cambio_usada' => (float) $item->tasa_cambio_usada,
                'created_at' => $item->created_at->format('d/m/Y H:i'),
            ];
        });

        return response()->json($historial);
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
     * Últimos cambios de precio de costo para el dashboard
     */
    private function getHistorialCostoPrecioReciente(): array
    {
        return HistorialPrecioCosto::with(['producto:id,nombre_producto', 'user:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($h) {
                return [
                    'id'                 => $h->id,
                    'producto'           => ['id' => $h->producto->id, 'nombre_producto' => $h->producto->nombre_producto],
                    'usuario'            => ['id' => $h->user->id, 'name' => $h->user->name],
                    'precio_anterior'    => (float) $h->precio_anterior,
                    'precio_nuevo'       => (float) $h->precio_nuevo,
                    'diferencia'         => (float) $h->diferencia,
                    'stock_momento'      => $h->stock_momento,
                    'impacto_financiero' => (float) $h->impacto_financiero,
                    'impacto_formateado' => $h->getImpactoFormateadoAttribute(),
                    'es_ganancia'        => $h->esGanancia(),
                    'es_perdida'         => $h->es_perdida,
                    'motivo'             => $h->motivo,
                    'fecha_formateada'   => $h->created_at->format('d/m/Y H:i'),
                ];
            })
            ->toArray();
    }

    /**
     * Totales acumulados de impacto por cambios de precio de costo
     */
    private function getStatsCostoPrecio(): array
    {
        $ganancias = (float) HistorialPrecioCosto::ganancias()->sum('impacto_financiero');
        $perdidas  = abs((float) HistorialPrecioCosto::perdidas()->sum('impacto_financiero'));

        return [
            'total_ganancias' => $ganancias,
            'total_perdidas'  => $perdidas,
            'neto_impacto'    => $ganancias - $perdidas,
            'numero_cambios'  => HistorialPrecioCosto::count(),
        ];
    }

    /**
     * Estadísticas del impacto financiero por cambios de precio de costo
     */
    public function getEstadisticasCostoPrecio()
    {
        if (!in_array(auth()->user()->role, ['admin', 'moderador'])) {
            abort(403);
        }

        $totalGanancias = HistorialPrecioCosto::ganancias()->sum('impacto_financiero');
        $totalPerdidas  = abs(HistorialPrecioCosto::perdidas()->sum('impacto_financiero'));
        $netoImpacto    = $totalGanancias - $totalPerdidas;
        $numeroCambios  = HistorialPrecioCosto::count();

        $cambiosConGanancia = HistorialPrecioCosto::ganancias()->count();
        $cambiosConPerdida  = HistorialPrecioCosto::perdidas()->count();

        $mayorGanancia = HistorialPrecioCosto::ganancias()
            ->with('producto:id,nombre_producto')
            ->orderBy('impacto_financiero', 'desc')
            ->first();

        $mayorPerdida = HistorialPrecioCosto::perdidas()
            ->with('producto:id,nombre_producto')
            ->orderBy('impacto_financiero', 'asc')
            ->first();

        return response()->json([
            'total_ganancias'       => number_format($totalGanancias, 2),
            'total_perdidas'        => number_format($totalPerdidas, 2),
            'neto_impacto'          => number_format($netoImpacto, 2),
            'es_neto_positivo'      => $netoImpacto >= 0,
            'numero_cambios'        => $numeroCambios,
            'cambios_con_ganancia'  => $cambiosConGanancia,
            'cambios_con_perdida'   => $cambiosConPerdida,
            'mayor_ganancia' => $mayorGanancia ? [
                'monto'    => number_format($mayorGanancia->impacto_financiero, 2),
                'producto' => $mayorGanancia->producto->nombre_producto ?? '-',
                'fecha'    => $mayorGanancia->created_at->format('d/m/Y'),
            ] : null,
            'mayor_perdida' => $mayorPerdida ? [
                'monto'    => number_format(abs($mayorPerdida->impacto_financiero), 2),
                'producto' => $mayorPerdida->producto->nombre_producto ?? '-',
                'fecha'    => $mayorPerdida->created_at->format('d/m/Y'),
            ] : null,
        ]);
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
