<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
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
        $cuentas = Cuenta::all(); // Obtener todas las cuentas

        return Inertia::render('Cuentas/Index', [
            'cuentas' => $cuentas->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre_cuenta' => $cuenta->nombre_cuenta,
                    'saldo_cuenta' => $cuenta->saldo_cuenta,
                    'deuda' => $cuenta->deuda,
                    'tipo_cuenta' => $cuenta->tipo_cuenta,
                    'tipo_moneda' => $cuenta->tipo_moneda,
                    'notas_cuenta' => $cuenta->notas_cuenta,
                    'created_at' => $cuenta->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $cuenta->updated_at->format('Y-m-d H:i:s'),
                ];
            }),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear una nueva cuenta
     */
    public function create()
    {
        return Inertia::render('Cuentas/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $validated = $request->validate([
            'nombre_cuenta' => ['required', 'string', 'max:255', 'unique:cuentas,nombre_cuenta'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'tipo_moneda' => ['required', 'in:USD,EUR,MLC,CUP'], // Agregamos validación para tipo_moneda
            'deuda' => ['nullable', 'numeric'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales,deudas'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Crear la cuenta en la base de datos
        Cuenta::create([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? 123.4567, // Valor por defecto si no se proporciona
            'tipo_moneda' => $validated['tipo_moneda'], // Aseguramos que se guarde el tipo de moneda
            'deuda' => $validated['deuda'] ?? 0, // Valor por defecto si no se proporciona
            'tipo_cuenta' => $validated['tipo_cuenta'],
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
        return Inertia::render('Cuentas/Show', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'tipo_moneda' => $cuenta->tipo_moneda,
                'deuda' => $cuenta->deuda,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
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
        return Inertia::render('Cuentas/Edit', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'tipo_moneda' => $cuenta->tipo_moneda,
                'deuda' => $cuenta->deuda,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
                'notas_cuenta' => $cuenta->notas_cuenta,
            ],
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
            'saldo_cuenta' => ['nullable', 'numeric'],
            'tipo_moneda' => ['required', 'in:USD,EUR,MLC,CUP'], // Validación para tipo_moneda
            'deuda' => ['nullable', 'numeric'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales,deudas'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Actualizar la cuenta en la base de datos
        $cuenta->update([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? $cuenta->saldo_cuenta,
            'tipo_moneda' => $validated['tipo_moneda'], // Aseguramos que se actualice el tipo de moneda
            'deuda' => $validated['deuda'] ?? $cuenta->deuda,
            'tipo_cuenta' => $validated['tipo_cuenta'],
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
        $cuenta->delete();
        return redirect()->route('cuentas.index')->with('success', 'Cuenta eliminada exitosamente.');
    }

    public function getDeudas()
    {
        return response()->json(Cuenta::where('tipo_cuenta', 'deudas')->get());
    }
}
