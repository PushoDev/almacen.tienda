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
use Illuminate\Support\Facades\Notification;
use App\Notifications\CierreCajaNotification;

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

        // Calcular detalles usando método compartido
        $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);

        // Preparar respuesta para Inertia
        return Inertia::render('Cierres/Create', [
            'calculos' => [
                'inicio_turno' => $inicioTurno instanceof Carbon ? $inicioTurno->toDateTimeString() : $inicioTurno,
                'saldo_inicial' => 0, // Implementar saldo inicial real si existe lógica
                'ventas_efectivo' => $calculos['ventas_efectivo'],
                'ventas_otros' => $calculos['ventas_otros'],
                'gastos' => 0,
                'devoluciones' => 0,
                'saldo_esperado' => 0 + $calculos['ventas_efectivo'], // saldo_inicial + ventas_efectivo - gastos
                'detalles' => $calculos['detalles']
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
        ]);

        $inicioTurno = Carbon::parse($validated['fecha_apertura']);
        $user = Auth::user();

        // Recalcular detalles para asegurar consistencia
        $calculos = $this->obtenerDetallesCierre($user, $inicioTurno);

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
                'detalles' => $calculos['detalles'], // Guardamos el desglose detallado
            ]);

            $cierre->update(['estado' => 'aprobado']);

            DB::commit();

            // Notificar Admins y Moderadores
            try {
                $admins = User::whereIn('role', ['admin', 'moderador'])->get();
                Notification::send($admins, new CierreCajaNotification($cierre));
            } catch (\Exception $e) {
                \Log::error('Error enviando notificación de cierre: ' . $e->getMessage());
            }

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
        $cierre = CierreCaja::findOrFail($id);
        $cierre->update([
            'estado' => 'aprobado',
            'revisor_id' => Auth::id()
        ]);

        return back()->with('success', 'Cierre aprobado.');
    }

    /**
     * Método helper privado para calcular detalles de cierre.
     * Centraliza la lógica para create y store.
     */
    private function obtenerDetallesCierre($user, $inicioTurno)
    {
        // Obtener pagos de ventas del usuario en el periodo
        $pagos = \App\Models\PagoVenta::whereHas('venta', function ($q) use ($user, $inicioTurno) {
            $q->where('user_id', $user->id)
                ->where('created_at', '>=', $inicioTurno);
        })->with(['moneda', 'cuenta', 'cliente'])->get();

        $agrupado = [];
        $ventasEfectivo = 0; // Solo lo que sume a "Caja Física" o que no tenga cuenta y sea efectivo
        $ventasOtros = 0;

        foreach ($pagos as $pago) {
            // Datos básicos
            $monedaCodigo = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD';
            $metodo = ucfirst($pago->tipo_pago); // Efectivo, Transferencia
            $monto = $pago->monto;

            // Determinar nombre de cuenta o destino
            if ($pago->cuenta) {
                $nombreCuenta = $pago->cuenta->nombre_cuenta;
                $cuentaId = $pago->cuenta->id;
                $tipoDestino = 'cuenta';
            } elseif ($pago->cliente) {
                // Pagos con saldo a favor de cliente (créditos, etc. si aplicara lógica inversa)
                // O simplemente pagos asignados a un cliente específico pero sin cuenta destino real (ej. deuda)
                $nombreCuenta = 'Cliente: ' . $pago->cliente->nombre_cliente;
                $cuentaId = 'cliente_' . $pago->cliente->id;
                $tipoDestino = 'cliente';
            } else {
                // Si no tiene cuenta ni cliente, asumimos Caja General o similar
                $nombreCuenta = 'Caja General / Sin Cuenta';
                $cuentaId = 'null';
                $tipoDestino = 'general';
            }

            // Clave única para agrupación: CuentaID + Moneda + Metodo
            $key = $cuentaId . '_' . $monedaCodigo . '_' . $metodo;

            if (!isset($agrupado[$key])) {
                $agrupado[$key] = [
                    'cuenta' => $nombreCuenta,
                    'tipo_destino' => $tipoDestino,
                    'moneda' => $monedaCodigo,
                    'metodo' => $metodo,
                    'monto' => 0,
                    'cantidad_pagos' => 0,
                    'tasa_acumulada' => 0, // Para promedio
                    'referencias' => [],
                ];
            }

            $agrupado[$key]['monto'] += $monto;
            $agrupado[$key]['cantidad_pagos']++;
            $agrupado[$key]['tasa_acumulada'] += ($pago->tasa_cambio_aplicada ?? 1);
            if ($pago->referencia) {
                $agrupado[$key]['referencias'][] = $pago->referencia;
            }

            // Clasificación para resumen simple superior (Efectivo vs Bancos/Otros)
            // Se considera "Efectivo" si el método dice efectivo Y no va a una cuenta bancaria externa
            // Ojo: Si va a una "Caja Física" (cuenta) también es efectivo disponible.
            // Simplificación actual: Si método contiene 'Efectivo', suma a efectivo.
            if (stripos($pago->tipo_pago, 'efectivo') !== false) {
                // FIXED: Usar monto_equivalente para sumar en la moneda base (USD)
                // Esto evita sumar 100 USD + 1000 CUP como 1100.
                $ventasEfectivo += $pago->monto_equivalente;
            } else {
                $ventasOtros += $pago->monto_equivalente;
            }
        }

        // Post-procesamiento para promedios
        foreach ($agrupado as &$grupo) {
            if ($grupo['cantidad_pagos'] > 0) {
                $grupo['tasa_promedio'] = $grupo['tasa_acumulada'] / $grupo['cantidad_pagos'];
            } else {
                $grupo['tasa_promedio'] = 1;
            }
            unset($grupo['tasa_acumulada']); // Limpiar auxiliar
        }

        return [
            'detalles' => array_values($agrupado),
            'ventas_efectivo' => $ventasEfectivo,
            'ventas_otros' => $ventasOtros
        ];
    }
}
