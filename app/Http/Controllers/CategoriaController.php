<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoriaController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Categorias
     */
    public function index()
    {
        return Inertia::render('Categorias/index', [
            'categorias' => Categoria::all(),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear nueva categoria
     */
    public function create()
    {
        return Inertia::render('Categorias/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_categoria' => ['required', 'string', 'max:20', 'unique:categorias,nombre_categoria'],
            'descripcion_categoria' => ['nullable', 'string'],
            'activar_categoria' => ['required', 'boolean'],
        ]);

        // Nueva categoría en la base de datos
        Categoria::create([
            'nombre_categoria' => $request->nombre_categoria,
            'descripcion_categoria' => $request->descripcion_categoria,
            'activar_categoria' => $request->activar_categoria,
        ]);

        // Redirigimos al usuario a la lista de categorías
        return redirect()->route('categorias.index')->with('success', 'Categoría creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Categoria $categoria)
    {
        return Inertia::render('Categorias/Show', [
            'categoria' => $categoria
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Categoria $categoria)
    {
        return Inertia::render('Categorias/Edit', [
            'categoria' => $categoria
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Categoria $categoria)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_categoria' => [
                'required',
                'string',
                'max:20',
                'unique:categorias,nombre_categoria,' . $categoria->id
            ],
            'descripcion_categoria' => ['nullable', 'string'],
            'activar_categoria' => ['required', 'boolean'],
        ]);

        // Actualizar la categoría en la base de datos
        $categoria->update([
            'nombre_categoria' => $request->nombre_categoria,
            'descripcion_categoria' => $request->descripcion_categoria,
            'activar_categoria' => $request->activar_categoria,
        ]);

        // Redirigimos al usuario a la lista de categorías
        return redirect()->route('categorias.index')->with('success', 'Categoría actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Categoria $categoria)
    {
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }
        $categoria->delete();
        return redirect()->route('categorias.index')->with('success', 'Categoría eliminada exitosamente.');
    }
}
