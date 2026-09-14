<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Models\HistorialTasaCambio;
use App\Models\Moneda;
use App\Services\CatalogoTarjetasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class MonedaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $monedas = Moneda::orderBy('principal', 'desc')
            ->orderBy('codigo_moneda')
            ->get()
            ->map(function (Moneda $moneda) {
                return $moneda->toArray() + [
                    'imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($moneda->imagen)['imagen_url'] ?? null,
                ];
            });

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
            'moneda_principal' => Moneda::where('principal', true)->first(),
            'catalogoImagenes' => CatalogoTarjetasService::monedaImagenes(),
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
            // Insignia visual de la moneda (catálogo en código, ver
            // CatalogoTarjetasService::monedaImagenes()) — opcional, distinta de
            // cuentas.imagen.
            'imagen' => 'nullable|string|in:'.implode(',', CatalogoTarjetasService::monedaImagenSlugsValidos()),
            'tasa_cambio' => 'required|numeric|min:0.000001',
            'commission' => 'nullable|numeric|min:0',
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
                    'imagen' => $request->imagen ?: null,
                    'tasa_cambio' => $request->tasa_cambio,
                    'commission' => $request->commission ?? 0,
                    'estado' => $request->estado ?? true,
                    'principal' => $request->principal ?? false,
                ]);
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda creada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al crear la moneda: '.$e->getMessage())
                ->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Moneda $moneda)
    {
        return Inertia::render('Monedas/Show', [
            'moneda' => $moneda->toArray() + [
                'imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($moneda->imagen)['imagen_url'] ?? null,
            ],
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
            'es_principal_actual' => $moneda->principal,
            'catalogoImagenes' => CatalogoTarjetasService::monedaImagenes(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Moneda $moneda)
    {
        $validator = Validator::make($request->all(), [
            'codigo_moneda' => 'required|string|max:10',
            'nombre_moneda' => 'required|string|max:100|unique:monedas,nombre_moneda,'.$moneda->id,
            'simbolo_moneda' => 'required|string|max:10',
            'imagen' => 'nullable|string|in:'.implode(',', CatalogoTarjetasService::monedaImagenSlugsValidos()),
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

                // Guardar tasa anterior para el historial
                $tasaAnterior = $moneda->tasa_cambio;
                $tasaNueva = (float) $request->tasa_cambio;

                // Solo registrar historial si la tasa realmente cambió
                if ($tasaAnterior != $tasaNueva) {
                    // Calcular capital total ANTES del cambio
                    $totalCapitalAntes = $this->calcularCapitalTotal();

                    // Si se está marcando como principal y antes no lo era
                    if ($nuevo_principal && ! $era_principal) {
                        Moneda::where('principal', true)->update(['principal' => false]);
                    }

                    // Si se está quitando el principal y era el principal
                    if (! $nuevo_principal && $era_principal) {
                        // Buscar otra moneda activa para hacerla principal
                        $otra_moneda = Moneda::where('id', '!=', $moneda->id)
                            ->where('estado', true)
                            ->first();

                        if ($otra_moneda) {
                            $otra_moneda->update(['principal' => true]);
                        }
                    }

                    // Actualizar la moneda
                    $moneda->update([
                        'codigo_moneda' => strtoupper($request->codigo_moneda),
                        'nombre_moneda' => $request->nombre_moneda,
                        'simbolo_moneda' => $request->simbolo_moneda,
                        'imagen' => $request->imagen ?: null,
                        'tasa_cambio' => $request->tasa_cambio,
                        'commission' => $request->commission,
                        'estado' => $request->estado,
                        'principal' => $request->principal,
                    ]);

                    // Calcular capital total DESPUÉS del cambio
                    $totalCapitalDespues = $this->calcularCapitalTotal();

                    // Crear registro en el historial
                    $this->registrarHistorialCambioTasa($moneda, $tasaAnterior, $tasaNueva, $totalCapitalAntes, $totalCapitalDespues);
                } else {
                    // Si la tasa no cambió, solo actualizar los demás campos
                    if ($nuevo_principal && ! $era_principal) {
                        Moneda::where('principal', true)->update(['principal' => false]);
                    }

                    if (! $nuevo_principal && $era_principal) {
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
                        'imagen' => $request->imagen ?: null,
                        'tasa_cambio' => $request->tasa_cambio,
                        'commission' => $request->commission,
                        'estado' => $request->estado,
                        'principal' => $request->principal,
                    ]);
                }
            });

            return redirect()->route('monedas.index')
                ->with('success', 'Moneda actualizada exitosamente.');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Error al actualizar la moneda: '.$e->getMessage())
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
                ->with('error', 'Error al eliminar la moneda: '.$e->getMessage());
        }
    }

    /**
     * Cambiar estado de la moneda (activar/desactivar)
     */
    public function cambiarEstado(Moneda $moneda)
    {
        try {
            DB::transaction(function () use ($moneda) {
                $nuevo_estado = ! $moneda->estado;

                // Si se está desactivando la moneda principal
                if (! $nuevo_estado && $moneda->principal) {
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
                ->with('error', 'Error al cambiar estado: '.$e->getMessage());
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
                if (! $moneda->estado) {
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
                ->with('error', 'Error al establecer moneda principal: '.$e->getMessage());
        }
    }

    /**
     * Calcular el capital total del sistema (convertido a USD)
     */
    private function calcularCapitalTotal(): float
    {
        $totalCapital = 0;

        // Obtener todas las cuentas con sus monedas
        $cuentas = Cuenta::with('moneda')->get();

        foreach ($cuentas as $cuenta) {
            if (! $cuenta->moneda) {
                continue;
            }

            $monto = $cuenta->saldo_cuenta ?? 0;
            $tasaCambio = $cuenta->moneda->tasa_cambio ?? 1;

            // Convertir a moneda base (USD)
            $totalCapital += $monto / $tasaCambio;
        }

        return (float) $totalCapital;
    }

    /**
     * Registrar el historial de cambio de tasa con impacto financiero
     */
    private function registrarHistorialCambioTasa(Moneda $moneda, float $tasaAnterior, float $tasaNueva, float $totalCapitalAntes, float $totalCapitalDespues): void
    {
        // Calcular impacto financiero
        $impactoFinanciero = $totalCapitalDespues - $totalCapitalAntes;
        $impactoPorcentaje = $totalCapitalAntes != 0 ? ($impactoFinanciero / $totalCapitalAntes) * 100 : 0;

        // Calcular diferencia y porcentaje de cambio en la tasa
        $diferenciaTasa = $tasaNueva - $tasaAnterior;
        $porcentajeCambioTasa = $tasaAnterior != 0 ? ($diferenciaTasa / $tasaAnterior) * 100 : 0;

        // Obtener cuentas afectadas por esta moneda
        $cuentasAfectadas = Cuenta::where('moneda_id', $moneda->id)->get();
        $numeroCuentas = $cuentasAfectadas->count();
        $totalCuentasAfectadas = $cuentasAfectadas->sum('saldo_cuenta');

        // Crear registro en el historial
        HistorialTasaCambio::create([
            'moneda_id' => $moneda->id,
            'user_id' => Auth::id(),
            'tasa_anterior' => $tasaAnterior,
            'tasa_nueva' => $tasaNueva,
            'diferencia_tasa' => $diferenciaTasa,
            'porcentaje_cambio' => $porcentajeCambioTasa,
            'total_cuentas_afectadas' => $numeroCuentas, // Corregido: ahora guarda número de cuentas
            'impacto_financiero' => $impactoFinanciero,
            'impacto_porcentaje' => $impactoPorcentaje,
            'numero_cuentas_afectadas' => $numeroCuentas,
        ]);
    }
}
