<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use App\Models\Compra;
use App\Models\MovimientoFinanciero;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProveedorController extends Controller
{
    /**
     * Display a listing of the resource.
     * Listado de Proveedores
     */
    public function index()
    {
        $proveedores = Proveedor::all();

        $totalFondo = $proveedores->where('saldo_proveedor', '>', 0)->sum('saldo_proveedor');
        $totalDeuda = $proveedores->where('saldo_proveedor', '<', 0)->sum('saldo_proveedor');
        $conDeuda = $proveedores->where('saldo_proveedor', '<', 0)->count();
        $conFondo = $proveedores->where('saldo_proveedor', '>', 0)->count();
        $neutro = $proveedores->filter(fn ($p) => is_null($p->saldo_proveedor) || (float) $p->saldo_proveedor === 0.0)->count();

        $resumen = [
            'total_proveedores' => $proveedores->count(),
            'total_fondo' => round((float) $totalFondo, 2),
            'total_deuda' => round(abs((float) $totalDeuda), 2),
            'balance_neto' => round((float) $totalFondo + (float) $totalDeuda, 2),
            'por_estado' => [
                'fondo' => ['cantidad' => $conFondo, 'saldo' => round((float) $totalFondo, 2)],
                'deuda' => ['cantidad' => $conDeuda, 'saldo' => round(abs((float) $totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro, 'saldo' => 0],
            ],
        ];

        return Inertia::render('Proveedores/index', [
            'proveedores' => $proveedores,
            'resumen' => $resumen,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear un nuevo proveedor
     */
    public function create()
    {
        return Inertia::render('Proveedores/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_proveedor' => ['required', 'string', 'max:255'],
            'telefono_proveedor' => ['required', 'string', 'unique:proveedors,telefono_proveedor'],
            'correo_proveedor' => ['nullable', 'email', 'unique:proveedors,correo_proveedor'],
            'localidad_proveedor' => ['required', 'string'],
            'notas_proveedor' => ['nullable', 'string'],
            'saldo_proveedor' => ['nullable', 'numeric', 'min:-9999999', 'max:9999999'],
        ]);

        // Nuevo proveedor en la base de datos
        Proveedor::create([
            'nombre_proveedor' => $request->nombre_proveedor,
            'telefono_proveedor' => $request->telefono_proveedor,
            'correo_proveedor' => $request->correo_proveedor,
            'localidad_proveedor' => $request->localidad_proveedor,
            'notas_proveedor' => $request->notas_proveedor,
            'saldo_proveedor' => $request->saldo_proveedor ?? 0,
        ]);

        // Redirigimos al usuario a la lista de proveedores
        return redirect()->route('proveedores.index')->with('success', 'Proveedor creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Proveedor $proveedor)
    {
        // Cargar compras del proveedor con relaciones
        $compras = Compra::with([
            'productos' => function ($query) {
                $query->withPivot('cantidad', 'precio', 'almacen_id');
            },
            'productos.categoria'
        ])
            ->where('proveedor_id', $proveedor->id)
            ->orderBy('fecha_compra', 'desc')
            ->get();

        // Cargar transacciones financieras relacionadas con el proveedor (SOLO como destino)
        $transacciones = MovimientoFinanciero::with([
            'cuentaOrigen',
            'cuentaDestino',
            'clienteOrigen',
            'clienteDestino',
            'tipoMovimiento'
        ])
            ->where('proveedor_destino_id', $proveedor->id)
            ->orderBy('fecha_operacion', 'desc')
            ->get();

        // Calcular estadísticas
        $estadisticas = [
            'total_compras' => $compras->count(),
            'monto_total_compras' => $compras->sum('total_compra'),
            'total_transacciones' => $transacciones->count(),
            'monto_total_ingresos' => $transacciones->sum('monto'), // Solo ingresos (proveedor como destino)
            'saldo_actual' => $proveedor->saldo_proveedor,
        ];

        return Inertia::render('Proveedores/Show', [
            'proveedor' => $proveedor,
            'compras' => $compras,
            'transacciones' => $transacciones,
            'estadisticas' => $estadisticas,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Proveedor $proveedor)
    {
        return Inertia::render('Proveedores/Edit', [
            'proveedor' => $proveedor,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Proveedor $proveedor)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_proveedor' => [
                'required',
                'string',
                'max:255',
                'unique:proveedors,nombre_proveedor,' . $proveedor->id
            ],
            'telefono_proveedor' => [
                'required',
                'string',
                'unique:proveedors,telefono_proveedor,' . $proveedor->id
            ],
            'correo_proveedor' => [
                'nullable',
                'email',
                'unique:proveedors,correo_proveedor,' . $proveedor->id
            ],
            'localidad_proveedor' => ['required', 'string'],
            'notas_proveedor' => ['nullable', 'string'],
            'saldo_proveedor' => ['nullable', 'numeric', 'min:-9999999', 'max:9999999'],
        ]);

        // Actualizar el proveedor en la base de datos
        $proveedor->update([
            'nombre_proveedor' => $request->nombre_proveedor,
            'telefono_proveedor' => $request->telefono_proveedor,
            'correo_proveedor' => $request->correo_proveedor,
            'localidad_proveedor' => $request->localidad_proveedor,
            'notas_proveedor' => $request->notas_proveedor,
            'saldo_proveedor' => $request->saldo_proveedor,
        ]);

        // Redirigimos al usuario a la lista de proveedores
        return redirect()->route('proveedores.index')->with('success', 'Proveedor actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Proveedor $proveedor)
    {
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }
        $proveedor->delete();
        return redirect()->route('proveedores.index')->with('success', 'Proveedor eliminado exitosamente.');
    }

    /**
     * Actualizar el saldo del proveedor
     */
    public function actualizarSaldo(Request $request, Proveedor $proveedor)
    {
        $request->validate([
            'monto' => ['required', 'numeric', 'min:-9999999', 'max:9999999'],
            'concepto' => ['nullable', 'string', 'max:255'],
        ]);

        $montoAnterior = $proveedor->saldo_proveedor;
        $proveedor->actualizarSaldo($request->monto);

        return redirect()->back()->with('success', [
            'message' => 'Saldo actualizado exitosamente.',
            'monto_anterior' => $montoAnterior,
            'monto_nuevo' => $proveedor->saldo_proveedor,
            'diferencia' => $request->monto
        ]);
    }

    /**
     * Mostrar proveedores con deuda (saldo negativo) - dinero perdido
     */
    public function conDeuda()
    {
        return Inertia::render('Proveedores/ConDeuda', [
            'proveedores' => Proveedor::conSaldoNegativo()->get(),
        ]);
    }

    /**
     * Mostrar proveedores con fondo (saldo positivo)
     */
    public function conFondo()
    {
        return Inertia::render('Proveedores/ConFondo', [
            'proveedores' => Proveedor::conSaldoPositivo()->get(),
        ]);
    }

    /**
     * Resetear saldo a cero
     */
    public function resetearSaldo(Proveedor $proveedor)
    {
        $saldoAnterior = $proveedor->saldo_proveedor;
        $proveedor->update(['saldo_proveedor' => 0]);

        return redirect()->back()->with('success', [
            'message' => 'Saldo reseteado a cero exitosamente.',
            'saldo_anterior' => $saldoAnterior
        ]);
    }
}
