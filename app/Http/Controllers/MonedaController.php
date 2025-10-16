<?php

namespace App\Http\Controllers;

use App\Models\Moneda;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MonedaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $monedas = Moneda::orderBy('principal', 'desc')
            ->orderBy('codigo_moneda')
            ->get();

        return Inertia::render('Monedas/Index', [
            'monedas' => $monedas,
            'status' => session('status'),
            'success' => session('success'),
            'error' => session('error'),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Monedas/Create', [
            'moneda_principal' => Moneda::where('principal', true)->first()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo_moneda' => 'required|string|max:10',
            'nombre_moneda' => 'required|string|max:100|unique:monedas,nombre_moneda',
            'simbolo_moneda' => 'required|string|max:10',
            'tasa_cambio' => 'required|numeric|min:0.000001',
            'commission' => 'required|numeric|min:0',
            'estado' => 'boolean',
            'principal' => 'boolean',
        ], [
            'nombre_moneda.unique' => 'El nombre de moneda ya existe.',
            'tasa_cambio.min' => 'La tasa de cambio debe ser mayor a 0.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::transaction(function () use ($request) {
                // Si se marca como principal, quitar principal de otras monedas
                if ($request->principal) {
                    Moneda::where('principal', true)->update(['principal' => false]);
                }

                Moneda::create([
                    'codigo_moneda' => strtoupper($request->codigo_moneda),
                    'nombre_moneda' => $request->nombre_moneda,
                    'simbolo_moneda' => $request->simbolo_moneda,
                    'tasa_cambio' => $request->tasa_cambio,
                    'commission' => $request->commission,
                    'estado' => $request->estado ?? true,
                    'principal' => $request->principal ?? false,
                ]);
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda creada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al crear la moneda: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Moneda $moneda)
    {
        return Inertia::render('Monedas/Show', [
            'moneda' => $moneda
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Moneda $moneda)
    {
        $moneda_principal = Moneda::where('principal', true)->first();

        return Inertia::render('Monedas/Edit', [
            'moneda' => $moneda,
            'moneda_principal' => $moneda_principal,
            'es_principal_actual' => $moneda->principal
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Moneda $moneda)
    {
        $validator = Validator::make($request->all(), [
            'codigo_moneda' => 'required|string|max:10',
            'nombre_moneda' => 'required|string|max:100|unique:monedas,nombre_moneda,' . $moneda->id,
            'simbolo_moneda' => 'required|string|max:10',
            'tasa_cambio' => 'required|numeric|min:0.000001',
            'commission' => 'required|numeric|min:0',
            'estado' => 'boolean',
            'principal' => 'boolean',
        ], [
            'nombre_moneda.unique' => 'El nombre de moneda ya existe.',
            'tasa_cambio.min' => 'La tasa de cambio debe ser mayor a 0.',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput();
        }

        try {
            DB::transaction(function () use ($request, $moneda) {
                $era_principal = $moneda->principal;
                $nuevo_principal = $request->principal;

                // Si se está marcando como principal y antes no lo era
                if ($nuevo_principal && !$era_principal) {
                    Moneda::where('principal', true)->update(['principal' => false]);
                }

                // Si se está quitando el principal y era el principal
                if (!$nuevo_principal && $era_principal) {
                    // Buscar otra moneda activa para hacerla principal
                    $otra_moneda = Moneda::where('id', '!=', $moneda->id)
                        ->where('estado', true)
                        ->first();

                    if ($otra_moneda) {
                        $otra_moneda->update(['principal' => true]);
                    }
                }

                $moneda->update([
                    'codigo_moneda' => strtoupper($request->codigo_moneda),
                    'nombre_moneda' => $request->nombre_moneda,
                    'simbolo_moneda' => $request->simbolo_moneda,
                    'tasa_cambio' => $request->tasa_cambio,
                    'commission' => $request->commission,
                    'estado' => $request->estado,
                    'principal' => $request->principal,
                ]);
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda actualizada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al actualizar la moneda: ' . $e->getMessage())
                ->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Moneda $moneda)
    {
        // Validar que no sea la moneda principal
        if ($moneda->principal) {
            return redirect()->route('monedas.index')
                ->with('error', 'No se puede eliminar la moneda principal.');
        }

        try {
            $moneda->delete();

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda eliminada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->route('monedas.index')
                ->with('error', 'Error al eliminar la moneda: ' . $e->getMessage());
        }
    }

    /**
     * Cambiar estado de la moneda (activar/desactivar)
     */
    public function cambiarEstado(Moneda $moneda)
    {
        try {
            DB::transaction(function () use ($moneda) {
                $nuevo_estado = !$moneda->estado;

                // Si se está desactivando la moneda principal
                if (!$nuevo_estado && $moneda->principal) {
                    // Buscar otra moneda activa para hacerla principal
                    $otra_moneda = Moneda::where('id', '!=', $moneda->id)
                        ->where('estado', true)
                        ->first();

                    if ($otra_moneda) {
                        $otra_moneda->update(['principal' => true]);
                    } else {
                        throw new \Exception('No hay otras monedas activas para asignar como principal.');
                    }
                }

                $moneda->update(['estado' => $nuevo_estado]);
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Estado de la moneda actualizado exitosamente.');
        } catch (\Exception $e) {
            return redirect()->route('monedas.index')
                ->with('error', 'Error al cambiar estado: ' . $e->getMessage());
        }
    }

    /**
     * Establecer como moneda principal
     */
    public function establecerPrincipal(Moneda $moneda)
    {
        try {
            DB::transaction(function () use ($moneda) {
                // Validar que la moneda esté activa
                if (!$moneda->estado) {
                    throw new \Exception('No se puede establecer como principal una moneda inactiva.');
                }

                // Quitar principal de otras monedas
                Moneda::where('principal', true)->update(['principal' => false]);

                // Establecer esta moneda como principal
                $moneda->update(['principal' => true]);
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda principal establecida exitosamente.');
        } catch (\Exception $e) {
            return redirect()->route('monedas.index')
                ->with('error', 'Error al establecer moneda principal: ' . $e->getMessage());
        }
    }
}
