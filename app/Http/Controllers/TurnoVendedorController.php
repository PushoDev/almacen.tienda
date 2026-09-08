<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TurnoVendedorController extends Controller
{
    /**
     * Registra quién está atendiendo bajo la cuenta autenticada — siempre agrega una fila
     * nueva (log append-only), nunca actualiza una existente, para soportar cambio de persona
     * a mitad de turno sin perder el rastro de quién atendió antes.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'nombre_vendedor' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->turnosVendedor()->create([
            'nombre_vendedor' => $validated['nombre_vendedor'],
            'iniciado_en' => now(),
        ]);

        return back()->with('success', 'Turno registrado correctamente.');
    }
}
