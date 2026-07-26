<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\MovimientoFinanciero;
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

        $totalFondo = $clientes->where('deuda_pago_cliente', '>', 0)->sum('deuda_pago_cliente');
        $totalDeuda = $clientes->where('deuda_pago_cliente', '<', 0)->sum('deuda_pago_cliente');
        $conDeuda = $clientes->where('deuda_pago_cliente', '<', 0)->count();
        $conFondo = $clientes->where('deuda_pago_cliente', '>', 0)->count();
        $neutro = $clientes->filter(fn ($c) => is_null($c->deuda_pago_cliente) || (float) $c->deuda_pago_cliente === 0.0)->count();

        $resumen = [
            'total_clientes' => $clientes->count(),
            'total_fondo' => round((float) $totalFondo, 2),
            'total_deuda' => round(abs((float) $totalDeuda), 2),
            'balance_neto' => round((float) $totalFondo + (float) $totalDeuda, 2),
            'por_estado' => [
                'fondo' => ['cantidad' => $conFondo, 'saldo' => round((float) $totalFondo, 2)],
                'deuda' => ['cantidad' => $conDeuda, 'saldo' => round(abs((float) $totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro, 'saldo' => 0],
            ],
        ];

        return Inertia::render('Clientes/Index', [
            'clientes' => $clientes,
            'resumen' => $resumen,
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
            'tipo_cliente' => ['required', 'in:fisico,asociado'],
            'deuda_pago_cliente' => ['nullable', 'numeric', 'between:-9999999,9999999.99'],
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
        // ✅ CARGAR LAS COMPRAS DONDE ESTE CLIENTE PARTICIPÓ COMO PAGADOR
        $cliente->load(['comprasComoPagador' => function ($query) {
            $query->with([
                'proveedor',
                'productos' => function ($productQuery) {
                    $productQuery->withPivot('cantidad', 'precio', 'almacen_id');
                },
                'pagos' => function ($pagoQuery) {
                    $pagoQuery->with(['cuenta', 'cliente']);
                }
            ])->orderBy('fecha_compra', 'desc');
        }]);

        // ✅ CARGAR LAS VENTAS DONDE ESTE CLIENTE ES EL COMPRADOR
        $cliente->load(['ventas' => function ($query) {
            $query->with([
                'destinatario',
                'detalles.producto.categoria',
                'pagos.cuenta.moneda',
                'pagos.moneda',
                'almacen',
                'usuario',
                'moneda',
                'gestorCuenta'
            ])->orderBy('created_at', 'desc');
        }]);

        // ✅ CARGAR LAS TRANSACCIONES FINANCIERAS DEL CLIENTE
        $cliente->load([
            'movimientosComoOrigen' => function ($query) {
                $query->with([
                    'tipoMovimiento',
                    'cuentaOrigen',
                    'cuentaDestino',
                    'clienteDestino',
                    'proveedorDestino'
                ])->orderBy('created_at', 'desc');
            },
            'movimientosComoDestino' => function ($query) {
                $query->with([
                    'tipoMovimiento',
                    'cuentaOrigen',
                    'clienteOrigen',
                    'cuentaDestino'
                ])->orderBy('created_at', 'desc');
            }
        ]);

        // ✅ CARGAR LOS PAGOS DE VENTAS RECIBIDOS POR EL CLIENTE
        $cliente->load(['pagosVenta' => function ($query) {
            $query->with([
                'venta.almacen',
                'venta.usuario',
                'venta.cliente',
                'venta.moneda',
                'moneda'
            ])->orderBy('created_at', 'desc');
        }]);

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
            'tipo_cliente' => ['required', 'in:fisico,asociado'],
            'deuda_pago_cliente' => ['nullable', 'numeric', 'between:-9999999,9999999.99'],
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
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }

        $cliente->delete();

        return redirect()->route('clientes.index')->with('success', 'Cliente eliminado exitosamente.');
    }
}
