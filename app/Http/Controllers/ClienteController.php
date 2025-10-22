<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Compra;
use App\Models\Venta;
use App\Models\MovimientoFinanciero;
use App\Models\CompraPago;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;
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
            'tipo_cliente' => ['required', 'in:fisico,asociado'],
            'deuda_pago_cliente' => ['nullable', 'numeric', 'between:-9999999,9999999.99'], // Permitir negativos
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
     * Mostrar los detalles de un cliente específico con todas sus operaciones.
     */
    public function show(Cliente $cliente)
    {
        // Cargar todas las operaciones relacionadas con el cliente
        $operaciones = $this->obtenerOperacionesCliente($cliente->id);

        return Inertia::render('Clientes/Show', [
            'cliente' => $cliente,
            'operaciones' => $operaciones,
        ]);
    }

    /**
     * Obtener todas las operaciones del cliente (VERSIÓN SEGURA PARA PRODUCCIÓN)
     */
    private function obtenerOperacionesCliente($clienteId)
    {
        $operaciones = [];

        // 1. Obtener Pagos de Compras desde la tabla compra_pago
        try {
            if (Schema::hasTable('compra_pago')) {
                $pagosCompras = CompraPago::where('cliente_id', $clienteId)
                    ->with(['compra.proveedor', 'compra.productos', 'cuenta'])
                    ->get();

                foreach ($pagosCompras as $pago) {
                    if ($pago->compra) {
                        $operaciones[] = [
                            'tipo' => 'compra_pago',
                            'fecha' => $pago->compra->fecha_compra,
                            'descripcion' => "Pago en compra #{$pago->compra->id} - Proveedor: {$pago->compra->proveedor->nombre_proveedor}",
                            'monto' => -$pago->monto,
                            'moneda' => 'USD',
                            'referencia' => "COMPRA-{$pago->compra->id}",
                            'detalles' => [
                                'proveedor' => $pago->compra->proveedor->nombre_proveedor,
                                'total_compra' => $pago->compra->total_compra,
                                'monto_pago' => $pago->monto,
                                'productos_count' => $pago->compra->productos->count(),
                                'tipo_compra' => $pago->compra->tipo_compra,
                                'tipo_pago' => $pago->tipo_pago,
                                'cuenta' => $pago->cuenta->nombre_cuenta ?? 'N/A',
                            ]
                        ];
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("Error al cargar pagos de compras para cliente {$clienteId}: " . $e->getMessage());
        }

        // 2. Obtener Compras donde el cliente está directamente relacionado
        try {
            $comprasDirectas = Compra::where('cliente_id', $clienteId)
                ->with(['proveedor', 'productos'])
                ->get();

            foreach ($comprasDirectas as $compra) {
                $operaciones[] = [
                    'tipo' => 'compra_directa',
                    'fecha' => $compra->fecha_compra,
                    'descripcion' => "Compra directa #{$compra->id} - Proveedor: {$compra->proveedor->nombre_proveedor}",
                    'monto' => -$compra->total_compra,
                    'moneda' => 'USD',
                    'referencia' => "COMPRA-DIRECTA-{$compra->id}",
                    'detalles' => [
                        'proveedor' => $compra->proveedor->nombre_proveedor,
                        'total_compra' => $compra->total_compra,
                        'productos_count' => $compra->productos->count(),
                        'tipo_compra' => $compra->tipo_compra,
                    ]
                ];
            }
        } catch (\Exception $e) {
            Log::warning("Error al cargar compras directas para cliente {$clienteId}: " . $e->getMessage());
        }

        // 3. Obtener Ventas asociadas al cliente
        try {
            $ventas = Venta::where('cliente_id', $clienteId)
                ->with(['almacen', 'usuario', 'detalles.producto', 'moneda'])
                ->get();

            foreach ($ventas as $venta) {
                $operaciones[] = [
                    'tipo' => 'venta',
                    'fecha' => $venta->created_at,
                    'descripcion' => "Venta #{$venta->id} - Almacén: {$venta->almacen->nombre_almacen}",
                    'monto' => $venta->total,
                    'moneda' => $venta->moneda->codigo_moneda ?? 'USD',
                    'referencia' => "VENTA-{$venta->id}",
                    'detalles' => [
                        'almacen' => $venta->almacen->nombre_almacen,
                        'vendedor' => $venta->usuario->name,
                        'items_count' => $venta->detalles->count(),
                        'estado' => $venta->estado,
                        'moneda_venta' => $venta->moneda->nombre_moneda ?? 'USD',
                    ]
                ];
            }
        } catch (\Exception $e) {
            Log::warning("Error al cargar ventas para cliente {$clienteId}: " . $e->getMessage());
        }

        // 4. Obtener Transacciones financieras (MovimientosFinancieros)
        try {
            $movimientos = MovimientoFinanciero::where('cliente_origen_id', $clienteId)
                ->orWhere('cliente_destino_id', $clienteId)
                ->with(['tipoMovimiento', 'cuentaOrigen', 'cuentaDestino'])
                ->get();

            foreach ($movimientos as $movimiento) {
                $esOrigen = $movimiento->cliente_origen_id == $clienteId;
                $signoMonto = $esOrigen ? -1 : 1;

                $operaciones[] = [
                    'tipo' => $this->obtenerTipoMovimiento($movimiento),
                    'fecha' => $movimiento->fecha_operacion,
                    'descripcion' => $movimiento->descripcion,
                    'monto' => $movimiento->monto * $signoMonto,
                    'moneda' => $movimiento->moneda,
                    'referencia' => "MOV-{$movimiento->id}",
                    'es_origen' => $esOrigen,
                    'detalles' => [
                        'tipo_movimiento' => $movimiento->tipoMovimiento->nombre ?? 'N/A',
                        'tasa_cambio' => $movimiento->tasa_cambio_aplicada,
                        'cuenta_origen' => $movimiento->cuentaOrigen->nombre_cuenta ?? null,
                        'cuenta_destino' => $movimiento->cuentaDestino->nombre_cuenta ?? null,
                        'estado' => $movimiento->estado,
                        'direccion' => $esOrigen ? 'Salida' : 'Entrada',
                    ]
                ];
            }
        } catch (\Exception $e) {
            Log::warning("Error al cargar movimientos financieros para cliente {$clienteId}: " . $e->getMessage());
        }

        // 5. Ordenar todas las operaciones por fecha (más reciente primero)
        usort($operaciones, function ($a, $b) {
            return strtotime($b['fecha']) - strtotime($a['fecha']);
        });

        return $operaciones;
    }

    /**
     * Determinar el tipo de movimiento financiero
     */
    private function obtenerTipoMovimiento($movimiento)
    {
        $tipos = [
            1 => 'gasto',
            2 => 'ingreso',
            3 => 'transferencia'
        ];

        return $tipos[$movimiento->tipo_movimiento_id] ?? 'transaccion';
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
            'deuda_pago_cliente' => ['nullable', 'numeric', 'between:-9999999,9999999.99'], // Permitir negativos
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
