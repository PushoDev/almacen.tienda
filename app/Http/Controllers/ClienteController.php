<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class ClienteController extends Controller
{
    /**
     * Mostrar una lista de todos los clientes.
     */
    public function index()
    {
        $clientes = Cliente::all();

        return Inertia::render('Clientes/Index', [
            'clientes' => $clientes,
        ]);
    }

    /**
     * Mostrar el formulario para crear un nuevo cliente.
     */
    public function create()
    {
        return Inertia::render('Clientes/Create');
    }

    /**
     * Almacenar un nuevo cliente en la base de datos.
     */
    public function store(Request $request)
    {
        // Validación de datos
        $validator = Validator::make($request->all(), [
            'nombre_cliente' => ['required', 'string', 'unique:clientes,nombre_cliente'],
            'telefono_cliente' => ['required', 'string', 'unique:clientes,telefono_cliente'],
            'direccion_cliente' => ['nullable', 'string'],
            'ciudad_cliente' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Crear el cliente
        Cliente::create($request->all());

        return redirect()->route('clientes.index')->with('success', 'Cliente creado exitosamente.');
    }

    /**
     * Mostrar los detalles de un cliente específico.
     */
    public function show(Cliente $cliente)
    {
        return Inertia::render('Clientes/Show', [
            'cliente' => $cliente,
        ]);
    }

    /**
     * Mostrar el formulario para editar un cliente existente.
     */
    public function edit(Cliente $cliente)
    {
        return Inertia::render('Clientes/Edit', [
            'cliente' => $cliente,
        ]);
    }

    /**
     * Actualizar un cliente existente en la base de datos.
     */
    public function update(Request $request, Cliente $cliente)
    {
        // Validación de datos
        $validator = Validator::make($request->all(), [
            'nombre_cliente' => ['required', 'string', 'unique:clientes,nombre_cliente,' . $cliente->id],
            'telefono_cliente' => ['required', 'string', 'unique:clientes,telefono_cliente,' . $cliente->id],
            'direccion_cliente' => ['nullable', 'string'],
            'ciudad_cliente' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        // Actualizar el cliente
        $cliente->update($request->all());

        return redirect()->route('clientes.index')->with('success', 'Cliente actualizado exitosamente.');
    }

    /**
     * Eliminar un cliente de la base de datos.
     */
    public function destroy(Cliente $cliente)
    {
        $cliente->delete();

        return redirect()->route('clientes.index')->with('success', 'Cliente eliminado exitosamente.');
    }
}
