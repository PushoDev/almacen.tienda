<?php

namespace App\Http\Controllers;

use App\Models\TasaCambio;
use Illuminate\Http\Request;
use Inertia\Inertia;

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
            ]
        ]);
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
