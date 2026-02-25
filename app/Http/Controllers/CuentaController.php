<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Models\Moneda;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CuentaController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Cuentas
     */
    public function index()
    {
        $cuentas = in_array(auth()->user()->role, ['admin', 'moderador'])
            ? Cuenta::with('moneda')->get()
            : auth()->user()->cuentas()->with('moneda')->get(); // Cargar la relación con moneda y filtrar por usuario si es vendedor

        return Inertia::render('Cuentas/Index', [
            'cuentas' => $cuentas->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre_cuenta' => $cuenta->nombre_cuenta,
                    'tipo' => $cuenta->tipo,
                    'saldo_cuenta' => $cuenta->saldo_cuenta,
                    'deuda' => $cuenta->deuda,
                    'tipo_cuenta' => $cuenta->tipo_cuenta,
                    'moneda_id' => $cuenta->moneda_id,
                    'moneda' => $cuenta->moneda ? [
                        'id' => $cuenta->moneda->id,
                        'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                        'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                        'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                        'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                        'principal' => $cuenta->moneda->principal,
                    ] : null,
                    'estado' => $cuenta->estado,
                    'notas_cuenta' => $cuenta->notas_cuenta,
                    'created_at' => $cuenta->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $cuenta->updated_at->format('Y-m-d H:i:s'),
                ];
            }),
            'monedaPrincipal' => Moneda::where('principal', true)
                ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda', 'tasa_cambio', 'principal')
                ->first(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear una nueva cuenta
     */
    public function create()
    {
        return Inertia::render('Cuentas/Create', [
            'monedas' => Moneda::where('estado', true)
                ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda')
                ->get()
                ->map(function ($moneda) {
                    return [
                        'id' => $moneda->id,
                        'nombre_completo' => $moneda->nombre_moneda . ' (' . $moneda->codigo_moneda . ')',
                        'codigo_moneda' => $moneda->codigo_moneda,
                        'simbolo_moneda' => $moneda->simbolo_moneda,
                    ];
                }),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $validated = $request->validate([
            'nombre_cuenta' => ['required', 'string', 'max:255', 'unique:cuentas,nombre_cuenta'],
            'tipo' => ['required', 'in:tarjeta,efectivo,otro'],
            'saldo_cuenta' => ['nullable', 'numeric', 'min:0'],
            'moneda_id' => ['required', 'exists:monedas,id'], // Cambiamos tipo_moneda por moneda_id
            'deuda' => ['nullable', 'numeric', 'min:0'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales,deudas'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Crear la cuenta en la base de datos
        Cuenta::create([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? 0.00,
            'moneda_id' => $validated['moneda_id'], // Usamos moneda_id en lugar de tipo_moneda
            'deuda' => $validated['deuda'] ?? 0,
            'tipo_cuenta' => $validated['tipo_cuenta'],
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'],
        ]);

        // Redirigimos al usuario a la lista de cuentas
        return redirect()->route('cuentas.index')->with('success', 'Cuenta creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Cuenta $cuenta)
    {
        $cuenta->load('moneda'); // Cargar la relación

        return Inertia::render('Cuentas/Show', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'tipo' => $cuenta->tipo,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'moneda_id' => $cuenta->moneda_id,
                'moneda' => $cuenta->moneda ? [
                    'id' => $cuenta->moneda->id,
                    'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                    'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                    'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                    'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                    'principal' => $cuenta->moneda->principal,
                ] : null,
                'deuda' => $cuenta->deuda,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
                'estado' => $cuenta->estado,
                'notas_cuenta' => $cuenta->notas_cuenta,
                'created_at' => $cuenta->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $cuenta->updated_at->format('Y-m-d H:i:s'),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Cuenta $cuenta)
    {
        $cuenta->load('moneda'); // Cargar la relación

        return Inertia::render('Cuentas/Edit', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'tipo' => $cuenta->tipo,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'moneda_id' => $cuenta->moneda_id,
                'moneda' => $cuenta->moneda ? [
                    'id' => $cuenta->moneda->id,
                    'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                    'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                    'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                    'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                    'principal' => $cuenta->moneda->principal,
                ] : null,
                'deuda' => $cuenta->deuda,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
                'estado' => $cuenta->estado,
                'notas_cuenta' => $cuenta->notas_cuenta,
            ],
            'monedas' => Moneda::where('estado', true)
                ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda')
                ->get()
                ->map(function ($moneda) {
                    return [
                        'id' => $moneda->id,
                        'nombre_completo' => $moneda->nombre_moneda . ' (' . $moneda->codigo_moneda . ')',
                        'codigo_moneda' => $moneda->codigo_moneda,
                        'simbolo_moneda' => $moneda->simbolo_moneda,
                    ];
                }),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Cuenta $cuenta)
    {
        // Validamos los datos del formulario
        $validated = $request->validate([
            'nombre_cuenta' => [
                'required',
                'string',
                'max:255',
                'unique:cuentas,nombre_cuenta,' . $cuenta->id,
            ],
            'tipo' => ['required', 'in:tarjeta,efectivo,otro'],
            'saldo_cuenta' => ['nullable', 'numeric', 'min:0'],
            'moneda_id' => ['required', 'exists:monedas,id'], // Cambiamos tipo_moneda por moneda_id
            'deuda' => ['nullable', 'numeric', 'min:0'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales,deudas'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Actualizar la cuenta en la base de datos
        $cuenta->update([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? $cuenta->saldo_cuenta,
            'moneda_id' => $validated['moneda_id'], // Usamos moneda_id en lugar de tipo_moneda
            'deuda' => $validated['deuda'] ?? $cuenta->deuda,
            'tipo_cuenta' => $validated['tipo_cuenta'],
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'],
        ]);

        // Redirigimos al usuario a la lista de cuentas
        return redirect()->route('cuentas.index')->with('success', 'Cuenta actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Cuenta $cuenta)
    {
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }
        $cuenta->delete();
        return redirect()->route('cuentas.index')->with('success', 'Cuenta eliminada exitosamente.');
    }

    public function getDeudas()
    {
        return response()->json(
            Cuenta::where('tipo_cuenta', 'deudas')
                ->with('moneda')
                ->get()
                ->map(function ($cuenta) {
                    return [
                        'id' => $cuenta->id,
                        'nombre_cuenta' => $cuenta->nombre_cuenta,
                        'saldo_cuenta' => $cuenta->saldo_cuenta,
                        'deuda' => $cuenta->deuda,
                        'moneda' => $cuenta->moneda ? [
                            'id' => $cuenta->moneda->id,
                            'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                            'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                            'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                            'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                            'principal' => $cuenta->moneda->principal,
                        ] : null,
                    ];
                })
        );
    }
}
