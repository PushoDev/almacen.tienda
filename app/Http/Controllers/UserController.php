<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $empleados = User::with('almacenes')->get();
        $almacenes = Almacen::all();

        return Inertia::render('Empleados/Index', [
            'empleados' => $empleados,
            'almacenes' => $almacenes,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $almacenes = Almacen::all();
        return Inertia::render('Empleados/Create', [
            'almacenes' => $almacenes,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validación
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'role' => 'required|in:admin,vendedor',
            'almacenes' => 'array|exists:almacens,id',
        ]);

        // Creación del usuario
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        // Asignar almacenes
        if (!empty($validated['almacenes'])) {
            $user->almacenes()->sync($validated['almacenes']);
        }

        return redirect()->route('empleados.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        // Si necesitas mostrar detalles individuales
        $empleado = User::with('almacenes')->findOrFail($id);
        return Inertia::render('Empleados/Show', [
            'empleado' => $empleado,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $empleado = User::with('almacenes')->findOrFail($id);
        $almacenes = Almacen::all();

        return Inertia::render('Empleados/Edit', [
            'empleado' => $empleado,
            'almacenes' => $almacenes,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        // Validación
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8',
            'role' => 'required|in:admin,vendedor',
            'almacenes' => 'array|exists:almacens,id',
        ]);

        // Actualización del usuario
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => $validated['password'] ? Hash::make($validated['password']) : $user->password,
        ]);

        // Actualizar almacenes
        $user->almacenes()->sync($validated['almacenes'] ?? []);

        return redirect()->route('empleados.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->route('empleados.index');
    }
}
