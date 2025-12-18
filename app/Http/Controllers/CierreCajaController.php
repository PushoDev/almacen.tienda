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
    public function create()
    {
        $user = Auth::user();
        $now = Carbon::now();

        // Buscar el último cierre de este usuario para determinar el inicio del turno actual
        $ultimoCierre = CierreCaja::where('user_id', $user->id)
            ->orderBy('fecha_cierre', 'desc')
            ->first();

        $inicioTurno = $ultimoCierre ? $ultimoCierre->fecha_cierre : Carbon::today(); // O inicio del día si no hay cierres previos

        // Calcular Ventas desde el inicio del turno
        $ventas = Venta::where('user_id', $user->id)
            ->where('created_at', '>=', $inicioTurno)
            ->where('estado', 'completada') // Asumiendo 'completada' es el estado final
            ->get();

        // Calcular totales por método de pago (simplificado)
        // Asume que Venta tiene campos o relación de pagos.
        // Si no, iteramos sobre los pagos si existen, o usamos nueva lógica si se implementó.
        // Por ahora, asumiremos una lógica simple basada en la estructura actual de Venta.

        $ventasEfectivo = 0;
        $ventasOtros = 0;

        foreach ($ventas as $venta) {
            // Aquí deberíamos revisar la tabla de pagos (PagoVenta) si existe
            // para ser precisos. Si no, usamos el total de la venta.
            // Voy a usar una aproximación basada en el modelo Venta si tiene 'metodo_pago'
            // O consultando sus pagos relacionados.

            foreach ($venta->pagos as $pago) {
                // Asumimos que PagoVenta tiene 'metodo_pago_id' y 'monto'
                // Necesitamos saber qué ID es efectivo. Asumiremos por nombre o código moneda.
                // Ajustar según esquema real de PagoVenta.
                // Si es USD cash o Moneda local cash -> efectivo

                // TODO: Ajustar lógica exacta según modelos de Pago
                $ventasEfectivo += $pago->monto; // Placeholder, refinar en paso siguiente
            }

            // Si no hay pagos detallados, sumamos total a efectivo por defecto o otros
            if ($venta->pagos->isEmpty()) {
                $ventasEfectivo += $venta->total;
            }
        }

        // Totales Hardcoded temporalmente hasta refinar la lógica de pagos con el usuario
        // Ojo: Esto es un placeholder para la estructura, luego implementamos la query exacta de pagos.
        $ventasEfectivo = $ventas->sum('total');
        $ventasOtros = 0;

        $gastos = 0; // TODO: Conectar con tabla de gastos/movimientos si existe
        $devoluciones = 0; // TODO: Conectar con devoluciones

        $saldoInicial = 0; // Debería venir de la caja base o del cierre anterior

        $saldoEsperado = $saldoInicial + $ventasEfectivo - $gastos - $devoluciones;

        return Inertia::render('Cierres/Create', [
            'calculos' => [
                'inicio_turno' => $inicioTurno->toDateTimeString(),
                'saldo_inicial' => $saldoInicial,
                'ventas_efectivo' => $ventasEfectivo,
                'ventas_otros' => $ventasOtros,
                'gastos' => $gastos,
                'devoluciones' => $devoluciones,
                'saldo_esperado' => $saldoEsperado,
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

        $saldoEsperado = $validated['saldo_inicial'] + $validated['ventas_efectivo'] - $validated['total_gastos'] - $validated['total_devoluciones'];
        $diferencia = $validated['saldo_contado'] - $saldoEsperado;

        DB::beginTransaction();
        try {
            $cierre = CierreCaja::create([
                'user_id' => Auth::id(),
                'revisor_id' => Auth::id(), // Auto-aprobación inicial si el vendedor confirma
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
                'estado' => 'pendiente', // Por defecto pendiente, o 'aprobado' si se permite auto-check
            ]);

            // Si la diferencia es pequeña, aprobamos automáticamente o si el usuario "Aprueba" su propio cierre
            // Según requerimiento: "vendedores tienen derecho aprobar su respectivo cierre"
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
