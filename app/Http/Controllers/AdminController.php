<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
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
        $tasa = TasaCambio::getTasa(); // Obtenemos la tasa actual

        return Inertia::render('dashboard', [
            'tasa' => [
                'tasa_cambio' => $tasa ?? 0,
            ],
                'montoCUP' => $this->getMontoCUP() ?? 0, // Monto en CUP
            'montoUSD'=> $this->getMontoUSD() ?? 0,
            'montoEUR'=> $this->getMontoEUR() ?? 0,
            'capital'=> ($this->getMontoCUP() / $tasa ) + ($this->getMontoUSD() ?? 0) + ($this->getMontoEUR() ?? 0),
        ]);
    }

    /**
     * Summary of getMontoCUP
     */
    private function getMontoCUP()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'CUP')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }
    /**
     * Summary of getMontoUSD
     */
    private function getMontoUSD()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'USD')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }
    /**
     * Summary of getMontoEUR
     */
    private function getMontoEUR()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'EUR')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }



    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request)
    {
        $request->validate([
            'tasa_cambio' => 'required|numeric|min:0',
        ]);

        TasaCambio::setTasa($request->input('tasa_cambio'));

        return back()->with('success', 'Tasa actualizada correctamente.');
    }
}
