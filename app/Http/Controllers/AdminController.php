<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
use App\Models\TasaCambioMLC; // Asumimos que tienes este modelo
use Illuminate\Http\Request;
use Inertia\Inertia;
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

        return Inertia::render('dashboard', [
            'tasa' => [
                // Usamos el valor por defecto 325.0 si la base de datos devuelve null.
                // Esto simula tu lógica antigua que devolvía 325.0 si no había registro.
                'tasa_cambio' => $tasa ?? 325.0,
            ],
            'tasamlc' => [
                'tasa_mlc' => $tasaMLC ? $tasaMLC->tasa_mlc : 1,
            ],
            'montoCUP' => $this->getMontoCUP() ?? 0,
            'montoUSD' => $this->getMontoUSD() ?? 0,
            'montoEUR' => $this->getMontoEUR() ?? 0,
            'montoMLC' => $this->getMontoMLC() ?? 0,

            // Cálculo de capital: Se utiliza el valor de $tasa obtenido (USD a CUP)
            'capital' => ($this->getMontoCUP() / ($tasa ?? 325.0)) + $this->getMontoUSD() + $this->getMontoEUR() + ($this->getMontoMLC() / ($tasaMLC ? $tasaMLC->tasa_mlc : 1)),
        ]);
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
