<?php

namespace App\Http\Controllers;

use App\Models\CierreCaja;
use App\Models\Venta;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CierreCajaController extends Controller
{
    /**
     * Listado de cierres.
     * Admin/Moderador ve todos, Vendedor ve los suyos.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        $query = CierreCaja::with(['usuario', 'revisor'])
            ->orderBy('fecha_cierre', 'desc');

        // Si no es admin/moderador, solo ve sus propios cierres
        if (!$user->isAdmin() && !$user->isModerator()) {
            $query->where('user_id', $user->id);
        }

        // Filtros
        if ($request->has('fecha')) {
            $query->whereDate('fecha_cierre', $request->fecha);
        }

        if ($request->has('estado') && $request->estado !== 'todos') {
            $query->where('estado', $request->estado);
        }

        $cierres = $query->paginate(20);

        return Inertia::render('Cierres/Index', [
            'cierres' => $cierres,
            'filters' => $request->all(['fecha', 'estado']),
        ]);
    }

    /**
     * Muestra la vista de pre-cierre con los cálculos del turno actual.
     */
    /**
     * Muestra la vista de pre-cierre con los cálculos del turno actual.
     */
    public function create()
    {
        $user = Auth::user();

        // Buscar el último cierre de este usuario para determinar el inicio del turno actual
        $ultimoCierre = CierreCaja::where('user_id', $user->id)
            ->orderBy('fecha_cierre', 'desc')
            ->first();

        $inicioTurno = $ultimoCierre ? $ultimoCierre->fecha_cierre : Carbon::today();

        // Obtener todos los pagos asociados a las ventas del usuario en el turno actual
        $pagos = \App\Models\PagoVenta::whereHas('venta', function ($q) use ($user, $inicioTurno) {
            $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno);
        })->with('moneda')->get();

        // Agrupar y Calcular Totales por Moneda y Método
        $detalles = [];
        $ventasEfectivo = 0;
        $ventasOtros = 0;

        foreach ($pagos as $pago) {
            $moneda = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD';
            $metodo = ucfirst($pago->tipo_pago);
            $monto = $pago->monto;

            // Key única para agrupación
            $key = $moneda . '_' . $metodo;

            if (!isset($detalles[$key])) {
                $detalles[$key] = [
                    'moneda' => $moneda,
                    'metodo' => $metodo,
                    'monto' => 0,
                    'cantidad_pagos' => 0
                ];
            }

            $detalles[$key]['monto'] += $monto;
            $detalles[$key]['cantidad_pagos']++;

            // Clasificación General (Efectivo vs Otros) para el resumen simple
            // Asumiendo que 'efectivo' es el keyword en tipo_pago
            if (stripos($pago->tipo_pago, 'efectivo') !== false) {
                // TODO: Si hay manejo de múltiples monedas, aquí deberíamos convertir a moneda base
                // Si 'monto' ya está normalizado o es mixto, esto es una aproximación.
                // Asumiremos que el valor contable principal usa el monto nominal si es la moneda base,
                // o convertido si existiera. Por ahora sumamos directo (riesgo si hay mezclas).
                $ventasEfectivo += $monto;
            } else {
                $ventasOtros += $monto;
            }
        }

        // Re-indexar array para enviar al frontend
        $detalles = array_values($detalles);

        $gastos = 0; // Conectar con módulo de Gastos si existe
        $devoluciones = 0; // Conectar con módulo de Devoluciones si existe

        $saldoInicial = 0; // Implementar lógica de fondo de caja si aplica

        $saldoEsperado = $saldoInicial + $ventasEfectivo - $gastos - $devoluciones;

        return Inertia::render('Cierres/Create', [
            'calculos' => [
                'inicio_turno' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
                'saldo_inicial' => $saldoInicial,
                'ventas_efectivo' => $ventasEfectivo,
                'ventas_otros' => $ventasOtros,
                'gastos' => $gastos,
                'devoluciones' => $devoluciones,
                'saldo_esperado' => $saldoEsperado,
                'detalles' => $detalles // Nuevo campo con el desglose
            ]
        ]);
    }

    /**
     * Guardar el cierre.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'saldo_inicial' => 'required|numeric',
            'ventas_efectivo' => 'required|numeric',
            'ventas_otros' => 'required|numeric',
            'total_gastos' => 'required|numeric',
            'total_devoluciones' => 'required|numeric',
            'saldo_contado' => 'required|numeric',
            'observaciones' => 'nullable|string',
            'fecha_apertura' => 'required|date',
            // 'detalles' no es obligatorio validarlo estrictamente si confiamos, pero idealmente sí
        ]);

        // Recalcular detalles para persistencia segura (mismo lógica que create)
        $inicioTurno = Carbon::parse($validated['fecha_apertura']);
        $user = Auth::user();

        $pagos = \App\Models\PagoVenta::whereHas('venta', function ($q) use ($user, $inicioTurno) {
            $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno);
        })->with('moneda')->get();

        $detalles = [];
        foreach ($pagos as $pago) {
            $moneda = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD';
            $metodo = ucfirst($pago->tipo_pago);
            $monto = $pago->monto;
            $key = $moneda . '_' . $metodo;

            if (!isset($detalles[$key])) {
                $detalles[$key] = ['moneda' => $moneda, 'metodo' => $metodo, 'monto' => 0, 'cantidad_pagos' => 0];
            }
            $detalles[$key]['monto'] += $monto;
            $detalles[$key]['cantidad_pagos']++;
        }
        $detalles = array_values($detalles);


        $saldoEsperado = $validated['saldo_inicial'] + $validated['ventas_efectivo'] - $validated['total_gastos'] - $validated['total_devoluciones'];
        $diferencia = $validated['saldo_contado'] - $saldoEsperado;

        DB::beginTransaction();
        try {
            $cierre = CierreCaja::create([
                'user_id' => Auth::id(),
                'revisor_id' => Auth::id(),
                'fecha_apertura' => $validated['fecha_apertura'],
                'fecha_cierre' => now(),
                'saldo_inicial' => $validated['saldo_inicial'],
                'ventas_efectivo' => $validated['ventas_efectivo'],
                'ventas_otros' => $validated['ventas_otros'],
                'total_gastos' => $validated['total_gastos'],
                'total_devoluciones' => $validated['total_devoluciones'],
                'saldo_esperado' => $saldoEsperado,
                'saldo_contado' => $validated['saldo_contado'],
                'diferencia' => $diferencia,
                'observaciones' => $validated['observaciones'],
                'estado' => 'pendiente',
                'detalles' => $detalles, // Guardamos el JSON
            ]);

            $cierre->update(['estado' => 'aprobado']);

            DB::commit();
            return redirect()->route('ventas.cierres')->with('success', 'Cierre realizado con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Error al guardar el cierre: ' . $e->getMessage());
        }
    }

    public function show($id)
    {
        $cierre = CierreCaja::with(['usuario', 'revisor'])->findOrFail($id);

        // Seguridad: solo dueño o admin
        if (Auth::user()->role !== 'admin' && Auth::user()->role !== 'moderador' && Auth::user()->id !== $cierre->user_id) {
            abort(403);
        }

        return Inertia::render('Cierres/Show', [
            'cierre' => $cierre
        ]);
    }

    public function aprobar(Request $request, $id)
    {
        // Solo admin/moderador o el propio usuario (si la regla de negocio lo permite post-creacion,
        // aunque normalmente se aprueba al cerrar. Dejamos esto para admins por ahora para flujo de revisión).
        $cierre = CierreCaja::findOrFail($id);
        $cierre->update([
            'estado' => 'aprobado',
            'revisor_id' => Auth::id()
        ]);

        return back()->with('success', 'Cierre aprobado.');
    }
}
