<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Cuenta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AlmacenController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Almacenes
     */
    public function index()
    {
        $almacenes = in_array(Auth::user()->role, ['admin', 'moderador'])
            ? Almacen::withCount('productos')->get()
            : Auth::user()->almacenes()->withCount('productos')->get();

        return Inertia::render('Almacenes/index', [
            'almacenes' => $almacenes,
            'permisos' => [
                'crear' => in_array(Auth::user()->role, ['admin', 'moderador'])
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
            'tipo_almacen' => ['required', 'in:almacen,punto_venta,transportacion'],
            'telefono_almacen' => ['required', 'string', 'unique:almacens,telefono_almacen'],
            'correo_almacen' => ['nullable', 'email'],
            'provincia_almacen' => ['nullable', 'string'],
            'ciudad_almacen' => ['nullable', 'string'],
            'notas_almacen' => ['nullable', 'string'],
            // Nuevos campos del responsable
            'nombre_responsable' => ['nullable', 'string', 'max:255'],
            'apellido_responsable' => ['nullable', 'string', 'max:255'],
            'carnet_responsable' => ['nullable', 'string', 'max:50'],
            'telefono_responsable' => ['nullable', 'string', 'max:20'],
        ]);

        // Nuevo almacén en la base de datos
        Almacen::create([
            'nombre_almacen' => $request->nombre_almacen,
            'tipo_almacen' => $request->tipo_almacen,
            'telefono_almacen' => $request->telefono_almacen,
            'correo_almacen' => $request->correo_almacen,
            'provincia_almacen' => $request->provincia_almacen,
            'ciudad_almacen' => $request->ciudad_almacen,
            'notas_almacen' => $request->notas_almacen,
            // Nuevos campos del responsable
            'nombre_responsable' => $request->nombre_responsable,
            'apellido_responsable' => $request->apellido_responsable,
            'carnet_responsable' => $request->carnet_responsable,
            'telefono_responsable' => $request->telefono_responsable,
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
            $imagenUrl = $item->imagen_producto
                ? asset('storage/' . $item->imagen_producto)
                : asset('storage/productos/producto-default.png');

            return [
                'producto_id' => $item->id,
                'nombre_producto' => $item->nombre,
                'marca' => $item->marca_producto,
                'modelo' => $item->modelo_producto,
                'capacidad' => $item->capacidad_producto,
                'color' => $item->color_producto,
                'codigo' => $item->codigo_producto,
                'categoria' => $item->categoria,
                'imagen_url' => $imagenUrl,
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
        $cuentas = Cuenta::with('moneda')
            ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta')
            ->get()
            ->map(fn($c) => [
                'id'     => $c->id,
                'nombre' => $c->nombre_cuenta,
                'moneda' => $c->moneda?->codigo_moneda ?? $c->tipo_moneda,
            ]);

        return Inertia::render('Almacenes/Edit', [
            'almacen' => $almacen,
            'cuentas' => $cuentas,
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
            'tipo_almacen' => ['required', 'in:almacen,punto_venta,transportacion'],
            'telefono_almacen' => [
                'required',
                'string',
                'unique:almacens,telefono_almacen,' . $almacen->id
            ],
            'correo_almacen' => ['nullable', 'email'],
            'provincia_almacen' => ['nullable', 'string'],
            'ciudad_almacen' => ['nullable', 'string'],
            'notas_almacen' => ['nullable', 'string'],
            'nombre_responsable' => ['nullable', 'string', 'max:255'],
            'apellido_responsable' => ['nullable', 'string', 'max:255'],
            'carnet_responsable' => ['nullable', 'string', 'max:50'],
            'telefono_responsable' => ['nullable', 'string', 'max:20'],
            'mensajero_cuenta_id' => ['nullable', 'exists:cuentas,id'],
        ]);

        $almacen->update([
            'nombre_almacen' => $request->nombre_almacen,
            'tipo_almacen' => $request->tipo_almacen,
            'telefono_almacen' => $request->telefono_almacen,
            'correo_almacen' => $request->correo_almacen,
            'provincia_almacen' => $request->provincia_almacen,
            'ciudad_almacen' => $request->ciudad_almacen,
            'notas_almacen' => $request->notas_almacen,
            'nombre_responsable' => $request->nombre_responsable,
            'apellido_responsable' => $request->apellido_responsable,
            'carnet_responsable' => $request->carnet_responsable,
            'telefono_responsable' => $request->telefono_responsable,
            'mensajero_cuenta_id' => $request->mensajero_cuenta_id ?: null,
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
