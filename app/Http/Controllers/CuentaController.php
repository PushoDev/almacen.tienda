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
        return Inertia::render('Cuentas/Index', [
            'cuentas' => Cuenta::all(),
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
        $request->validate([
            'nombre_cuenta' => ['required', 'string', 'max:255', 'unique:cuentas,nombre_cuenta'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'deuda' => ['nullable', 'numeric'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Nueva cuenta en la base de datos
        Cuenta::create([
            'nombre_cuenta' => $request->nombre_cuenta,
            'saldo_cuenta' => $request->saldo_cuenta ?? 123.4567, // Valor por defecto si no se proporciona
            'deuda' => $request->deuda ?? 0, // Valor por defecto si no se proporciona
            'tipo_cuenta' => $request->tipo_cuenta,
            'notas_cuenta' => $request->notas_cuenta,
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
            'cuenta' => $cuenta,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Cuenta $cuenta)
    {
        return Inertia::render('Cuentas/Edit', [
            'cuenta' => $cuenta,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Cuenta $cuenta)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_cuenta' => [
                'required',
                'string',
                'max:255',
                'unique:cuentas,nombre_cuenta,' . $cuenta->id
            ],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'deuda' => ['nullable', 'numeric'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        // Actualizar la cuenta en la base de datos
        $cuenta->update([
            'nombre_cuenta' => $request->nombre_cuenta,
            'saldo_cuenta' => $request->saldo_cuenta ?? $cuenta->saldo_cuenta,
            'deuda' => $request->deuda ?? $cuenta->deuda,
            'tipo_cuenta' => $request->tipo_cuenta,
            'notas_cuenta' => $request->notas_cuenta,
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
}
