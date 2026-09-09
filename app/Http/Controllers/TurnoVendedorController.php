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

        // Limpia la bandera de "login nuevo pendiente de confirmar" (ver User::requiereCapturaTurno)
        // — ya se confirmó para esta sesión, no debe volver a bloquear hasta el próximo login.
        $request->session()->forget('turno_pendiente_confirmacion');

        return back()->with('success', 'Turno registrado correctamente.');
    }
}
