<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
use App\Models\TasaCambioMLC;
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
        // CORRECCIÓN CLAVE: getTasa() ahora requiere la moneda base y la destino.
        // Asumimos que la tasa principal usada en tu cálculo de capital es USD -> CUP.
        $tasa = TasaCambio::getTasa('USD', 'CUP');

        // Asumimos que tu lógica de MLC utiliza una tabla separada o un valor fijo.
        $tasaMLC = TasaCambioMLC::latest()->first();

        // Obtener datos para las nuevas tablas
        $user = Auth::user();
        $montosPorMoneda = [];
        $totalCapital = 0;
        $comparaciones = [];

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
        }

        return Inertia::render('dashboard', [
            'userRole' => Auth::user()->role,
            'tasa' => [
                'tasa_cambio' => $tasa ?? 325.0,
            ],
            'tasamlc' => [
                'tasa_mlc' => $tasaMLC ? $tasaMLC->tasa_mlc : 1,
            ],
            'montoCUP' => $this->getMontoCUP() ?? 0,
            'montoUSD' => $this->getMontoUSD() ?? 0,
            'montoEUR' => $this->getMontoEUR() ?? 0,
            'montoMLC' => $this->getMontoMLC() ?? 0,
            'capital' => ($this->getMontoCUP() / ($tasa ?? 325.0)) + $this->getMontoUSD() + $this->getMontoEUR() + ($this->getMontoMLC() / ($tasaMLC ? $tasaMLC->tasa_mlc : 1)),
            'montosPorMoneda' => array_values($montosPorMoneda),
            'totalCapital' => $totalCapital,
            'comparaciones' => $comparaciones,
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
     * Obtener monto en CUP
     */
    private function getMontoCUP()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'CUP')
            ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    /**
     * Obtener monto en USD
     */
    private function getMontoUSD()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'USD')
            ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    /**
     * Obtener monto en EUR
     */
    private function getMontoEUR()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'EUR')
            ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    /**
     * Obtener monto en MLC
     */
    private function getMontoMLC()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'MLC')
            ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
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
}
