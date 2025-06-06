<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class AlmacenController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Almacenes
     */
    public function index()
    {
        $almacenes = Auth::user()->role === 'admin'
            ? Almacen::withCount('productos')->get()
            : Auth::user()->almacenes()->withCount('productos')->get();

        return Inertia::render('Almacenes/Index', [
            'almacenes' => $almacenes,
            'permisos' => [
                'crear' => Auth::user()->role === 'admin'
            ]
        ]);
    }


    /**
     * Show the form for creating a new resource.
     * Ruta para crear un nuevo almacén
     */
    public function create()
    {
        return Inertia::render('Almacenes/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_almacen' => ['required', 'string', 'max:255'],
            'telefono_almacen' => ['required', 'string', 'unique:almacens,telefono_almacen'],
            'correo_almacen' => ['nullable', 'email'],
            'provincia_almacen' => ['nullable', 'string'],
            'ciudad_almacen' => ['nullable', 'string'],
            'notas_almacen' => ['nullable', 'string'],
        ]);

        // Nuevo almacén en la base de datos
        Almacen::create([
            'nombre_almacen' => $request->nombre_almacen,
            'telefono_almacen' => $request->telefono_almacen,
            'correo_almacen' => $request->correo_almacen,
            'provincia_almacen' => $request->provincia_almacen,
            'ciudad_almacen' => $request->ciudad_almacen,
            'notas_almacen' => $request->notas_almacen,
        ]);

        // Redirigimos al usuario a la lista de almacenes
        return redirect()->route('almacenes.index')->with('success', 'Almacén creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Almacen $almacen)
    {
        $productos = $almacen->getProductosConCantidad()->map(function ($item) use ($almacen) {
            return [
                'producto_id' => $item->id,
                'nombre_producto' => $item->nombre,
                'cantidad_total' => $item->cantidad_total,
                'almacen_id' => $almacen->id,
                'nombre_almacen' => $almacen->nombre_almacen,
            ];
        });

        return Inertia::render('Almacenes/Show', [
            'almacen' => $almacen,
            'productos' => $productos,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Almacen $almacen)
    {
        // dd($almacen);
        return Inertia::render('Almacenes/Edit', [
            'almacen' => $almacen,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Almacen $almacen)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_almacen' => [
                'required',
                'string',
                'max:255',
                'unique:almacens,nombre_almacen,' . $almacen->id
            ],
            'telefono_almacen' => [
                'required',
                'string',
                'unique:almacens,telefono_almacen,' . $almacen->id
            ],
            'correo_almacen' => ['nullable', 'email'],
            'provincia_almacen' => ['nullable', 'string'],
            'ciudad_almacen' => ['nullable', 'string'],
            'notas_almacen' => ['nullable', 'string'],
        ]);

        // Actualizar el almacén en la base de datos
        $almacen->update([
            'nombre_almacen' => $request->nombre_almacen,
            'telefono_almacen' => $request->telefono_almacen,
            'correo_almacen' => $request->correo_almacen,
            'provincia_almacen' => $request->provincia_almacen,
            'ciudad_almacen' => $request->ciudad_almacen,
            'notas_almacen' => $request->notas_almacen,
        ]);

        // Redirigimos al usuario a la lista de almacenes
        return redirect()->route('almacenes.index')->with('success', 'Almacén actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Almacen $almacen)
    {
        $almacen->delete();
        return redirect()->route('almacenes.index')->with('success', 'Almacén eliminado exitosamente.');
    }
}
