<?php

namespace App\Http\Controllers;

use App\Models\AjusteSaldoCuenta;
use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Venta;
use App\Services\DetalleOperacionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class CuentaController extends Controller
{
    public function __construct(private DetalleOperacionService $detalleOperacionService) {}

    /**
     * Display a listing of the resource.
     * Listado de Cuentas
     */
    public function index()
    {
        $user = auth()->user();
        $cuentas = in_array($user->role, ['admin', 'moderador'])
            ? Cuenta::with('moneda')->get()
            : $user->cuentas()->with('moneda')->get();

        $monedaPrincipal = Moneda::where('principal', true)
            ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda', 'tasa_cambio', 'principal')
            ->first();

        $totalSaldo = 0;
        $resumenPorTipo = [];
        $resumenPorMoneda = [];
        $resumenPorMonedaPerm = [];
        $resumenPorEstado = [];
        $conteoEstado = [];
        $conFondo = 0;
        $enDeuda = 0;
        $neutro = 0;
        $totalFondo = 0;
        $totalDeuda = 0;

        foreach ($cuentas as $cuenta) {
            $tasa = $cuenta->moneda?->tasa_cambio ?: 1;
            $equiv = $tasa > 0 ? (float) ($cuenta->saldo_cuenta ?? 0) / $tasa : 0;
            $totalSaldo += $equiv;

            $resumenPorTipo[$cuenta->tipo_cuenta] = ($resumenPorTipo[$cuenta->tipo_cuenta] ?? 0) + $equiv;

            $codigo = $cuenta->moneda?->codigo_moneda ?: 'N/A';
            if (! isset($resumenPorMoneda[$codigo])) {
                $resumenPorMoneda[$codigo] = [
                    'original' => 0,
                    'equivalente' => 0,
                    'cantidad' => 0,
                    'simbolo' => $cuenta->moneda?->simbolo_moneda ?? '$',
                ];
            }
            $resumenPorMoneda[$codigo]['original'] += (float) $cuenta->saldo_cuenta;
            $resumenPorMoneda[$codigo]['equivalente'] += $equiv;
            $resumenPorMoneda[$codigo]['cantidad']++;

            if ($cuenta->tipo_cuenta === 'permanentes') {
                if (! isset($resumenPorMonedaPerm[$codigo])) {
                    $resumenPorMonedaPerm[$codigo] = [
                        'original' => 0,
                        'equivalente' => 0,
                        'cantidad' => 0,
                        'simbolo' => $cuenta->moneda?->simbolo_moneda ?? '$',
                    ];
                }
                $resumenPorMonedaPerm[$codigo]['original'] += (float) $cuenta->saldo_cuenta;
                $resumenPorMonedaPerm[$codigo]['equivalente'] += $equiv;
                $resumenPorMonedaPerm[$codigo]['cantidad']++;
            }

            $resumenPorEstado[$cuenta->estado] = ($resumenPorEstado[$cuenta->estado] ?? 0) + $equiv;
            $conteoEstado[$cuenta->estado] = ($conteoEstado[$cuenta->estado] ?? 0) + 1;

            $saldo = (float) ($cuenta->saldo_cuenta ?? 0);
            if ($saldo > 0) {
                $conFondo++;
                $totalFondo += $saldo;
            } elseif ($saldo < 0) {
                $enDeuda++;
                $totalDeuda += $saldo;
            } else {
                $neutro++;
            }
        }

        $resumen = [
            'total_saldo' => round($totalSaldo, 2),
            'por_tipo' => collect($resumenPorTipo)->map(fn ($v) => round($v, 2))->toArray(),
            'por_moneda' => collect($resumenPorMoneda)->map(fn ($v) => [
                'original' => round($v['original'], 2),
                'equivalente' => round($v['equivalente'], 2),
                'cantidad' => $v['cantidad'],
                'simbolo' => $v['simbolo'],
            ])->toArray(),
            'por_moneda_perm' => collect($resumenPorMonedaPerm)->map(fn ($v) => [
                'original' => round($v['original'], 2),
                'equivalente' => round($v['equivalente'], 2),
                'cantidad' => $v['cantidad'],
                'simbolo' => $v['simbolo'],
            ])->toArray(),
            'por_estado' => collect($resumenPorEstado)->map(fn ($v, $k) => [
                'saldo' => round($v, 2),
                'cantidad' => $conteoEstado[$k] ?? 0,
            ])->toArray(),
            'cuentas_activas' => $conteoEstado['activa'] ?? 0,
            'cuentas_inactivas' => $conteoEstado['inactiva'] ?? 0,
            'estado_financiero' => [
                'con_fondo' => ['cantidad' => $conFondo, 'saldo' => round($totalFondo, 2)],
                'en_deuda' => ['cantidad' => $enDeuda, 'saldo' => round(abs($totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro, 'saldo' => 0],
            ],
        ];

        return Inertia::render('Cuentas/Index', [
            'cuentas' => $cuentas->map(function ($cuenta) {
                return [
                    'id' => $cuenta->id,
                    'nombre_cuenta' => $cuenta->nombre_cuenta,
                    'tipo' => $cuenta->tipo,
                    'saldo_cuenta' => $cuenta->saldo_cuenta,
                    'tipo_cuenta' => $cuenta->tipo_cuenta,
                    'tipo_titular' => $cuenta->tipo_titular,
                    'moneda_id' => $cuenta->moneda_id,
                    'moneda' => $cuenta->moneda ? [
                        'id' => $cuenta->moneda->id,
                        'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                        'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                        'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                        'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                        'principal' => $cuenta->moneda->principal,
                    ] : null,
                    'estado' => $cuenta->estado,
                    'notas_cuenta' => $cuenta->notas_cuenta,
                    'created_at' => $cuenta->created_at->format('Y-m-d H:i:s'),
                    'updated_at' => $cuenta->updated_at->format('Y-m-d H:i:s'),
                ];
            }),
            'monedaPrincipal' => $monedaPrincipal,
            'resumen' => $resumen,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear una nueva cuenta
     */
    public function create()
    {
        return Inertia::render('Cuentas/Create', [
            'monedas' => Moneda::where('estado', true)
                ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda')
                ->get()
                ->map(function ($moneda) {
                    return [
                        'id' => $moneda->id,
                        'nombre_completo' => $moneda->nombre_moneda.' ('.$moneda->codigo_moneda.')',
                        'codigo_moneda' => $moneda->codigo_moneda,
                        'simbolo_moneda' => $moneda->simbolo_moneda,
                    ];
                }),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre_cuenta' => ['required', 'string', 'max:255', 'unique:cuentas,nombre_cuenta'],
            'tipo' => ['required', 'in:tarjeta,efectivo'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'moneda_id' => ['required', 'exists:monedas,id'],
            'tipo_titular' => ['nullable', 'in:externa,personal'],
            'tipo_cuenta' => ['required', 'in:permanentes'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        Cuenta::create([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? 0.00,
            'moneda_id' => $validated['moneda_id'],
            'tipo_titular' => $validated['tipo_titular'] ?? null,
            'tipo_cuenta' => $validated['tipo_cuenta'] ?? 'permanentes',
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'] ?? null,
        ]);

        // Redirigimos al usuario a la lista de cuentas
        return redirect()->route('cuentas.index')->with('success', 'Cuenta creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Cuenta $cuenta)
    {
        $user = auth()->user();
        $esAdminOModerador = in_array($user->role, ['admin', 'moderador']);

        // Vendedor solo puede ver el detalle de sus propias cuentas asignadas
        if (! $esAdminOModerador && ! $user->cuentas()->where('cuentas.id', $cuenta->id)->exists()) {
            abort(403);
        }

        $cuenta->load('moneda'); // Cargar la relación

        return Inertia::render('Cuentas/Show', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'tipo' => $cuenta->tipo,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'moneda_id' => $cuenta->moneda_id,
                'moneda' => $cuenta->moneda ? [
                    'id' => $cuenta->moneda->id,
                    'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                    'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                    'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                    'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                    'principal' => $cuenta->moneda->principal,
                ] : null,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
                'tipo_titular' => $cuenta->tipo_titular,
                'estado' => $cuenta->estado,
                'notas_cuenta' => $cuenta->notas_cuenta,
                'created_at' => $cuenta->created_at->format('Y-m-d H:i:s'),
                'updated_at' => $cuenta->updated_at->format('Y-m-d H:i:s'),
            ],
            'puedeEditar' => $esAdminOModerador,
            'historialTransacciones' => $this->obtenerHistorialTransacciones($cuenta, $request),
            'historialVentas' => $this->obtenerHistorialVentas($cuenta, $request, $esAdminOModerador),
            'historialCompras' => $esAdminOModerador
                ? $this->obtenerHistorialCompras($cuenta, $request)
                : new LengthAwarePaginator([], 0, 15, null, ['path' => request()->url()]),
            'historialAjustes' => $esAdminOModerador
                ? $this->obtenerHistorialAjustes($cuenta, $request)
                : new LengthAwarePaginator([], 0, 15, null, ['path' => request()->url()]),
            'filtros' => [
                'transacciones' => $request->only(['q_transacciones', 'tipo_transacciones', 'desde_transacciones', 'hasta_transacciones']),
                'ventas' => $request->only(['q_ventas', 'tipo_ventas', 'desde_ventas', 'hasta_ventas']),
                'compras' => $request->only(['q_compras', 'desde_compras', 'hasta_compras']),
                'ajustes' => $request->only(['q_ajustes', 'desde_ajustes', 'hasta_ajustes']),
            ],
        ]);
    }

    /**
     * Historial de Gasto/Ingreso/Transferencia — la única fuente que sí queda
     * registrada en `movimientos_financieros`.
     */
    private function obtenerHistorialTransacciones(Cuenta $cuenta, Request $request)
    {
        $cuentaId = $cuenta->id;

        $query = DB::table('movimientos_financieros as mf')
            ->join('tipos_movimiento_financiero as tmf', 'mf.tipo_movimiento_id', '=', 'tmf.id')
            ->join('users', 'mf.user_id', '=', 'users.id')
            ->leftJoin('cuentas as c_origen', 'mf.cuenta_origen_id', '=', 'c_origen.id')
            ->leftJoin('cuentas as c_destino', 'mf.cuenta_destino_id', '=', 'c_destino.id')
            ->leftJoin('clientes as cl_origen', 'mf.cliente_origen_id', '=', 'cl_origen.id')
            ->leftJoin('clientes as cl_destino', 'mf.cliente_destino_id', '=', 'cl_destino.id')
            ->leftJoin('proveedors as p_destino', 'mf.proveedor_destino_id', '=', 'p_destino.id')
            ->where(function ($q) use ($cuentaId) {
                $q->where('mf.cuenta_origen_id', $cuentaId)->orWhere('mf.cuenta_destino_id', $cuentaId);
            });

        if ($tipo = $request->query('tipo_transacciones')) {
            $query->where('tmf.nombre', $tipo);
        }
        if ($busqueda = $request->query('q_transacciones')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('mf.descripcion', 'like', "%{$busqueda}%")
                    ->orWhere('users.name', 'like', "%{$busqueda}%");
            });
        }
        if ($desde = $request->query('desde_transacciones')) {
            $query->whereDate('mf.fecha_operacion', '>=', $desde);
        }
        if ($hasta = $request->query('hasta_transacciones')) {
            $query->whereDate('mf.fecha_operacion', '<=', $hasta);
        }

        $historial = $query->select(
            'mf.id as referencia_id',
            'mf.fecha_operacion as fecha',
            'tmf.nombre as tipo',
            DB::raw("CASE WHEN mf.cuenta_origen_id = {$cuentaId} THEN (mf.saldo_posterior_origen - mf.saldo_anterior_origen) ELSE (mf.saldo_posterior_destino - mf.saldo_anterior_destino) END as monto"),
            DB::raw("CASE WHEN mf.cuenta_origen_id = {$cuentaId} THEN mf.moneda_origen ELSE mf.moneda_destino END as moneda"),
            'mf.descripcion as descripcion',
            DB::raw("CASE WHEN mf.cuenta_origen_id = {$cuentaId} THEN COALESCE(c_destino.nombre_cuenta, cl_destino.nombre_cliente, p_destino.nombre_proveedor) ELSE COALESCE(c_origen.nombre_cuenta, cl_origen.nombre_cliente) END as contraparte"),
            'users.name as usuario',
            DB::raw("'movimiento_financiero' as fuente"),
            DB::raw("CASE WHEN mf.cuenta_origen_id = {$cuentaId} THEN mf.saldo_anterior_origen ELSE mf.saldo_anterior_destino END as saldo_anterior"),
            DB::raw("CASE WHEN mf.cuenta_origen_id = {$cuentaId} THEN mf.saldo_posterior_origen ELSE mf.saldo_posterior_destino END as saldo_posterior")
        )
            ->orderByDesc('mf.fecha_operacion')
            ->paginate(15, ['*'], 'pagina_transacciones')
            ->withQueryString();

        // Detalle rico (entidades origen/destino, tasa de cambio) para la fila colapsable —
        // solo se cargan los movimientos de la página actual (máx. 15), no toda la tabla.
        $movimientos = MovimientoFinanciero::with(['user', 'cuentaOrigen', 'cuentaDestino', 'clienteOrigen', 'clienteDestino', 'proveedorDestino'])
            ->whereIn('id', $historial->pluck('referencia_id'))
            ->get()
            ->keyBy('id');

        $historial->getCollection()->transform(function ($item) use ($movimientos) {
            $mov = $movimientos->get($item->referencia_id);
            $item->detalle = $mov ? $this->detalleOperacionService->detalleMovimiento($mov) : null;

            return $item;
        });

        return $historial;
    }

    /**
     * Historial de operaciones de venta que afectaron esta cuenta: pagos de
     * venta, comisión PV, comisión gestor y mensajería externa. Ninguna de
     * estas 4 queda registrada en `movimientos_financieros` — VentaController
     * mueve `saldo_cuenta` directo en `aprobarVenta()` sin loguearlo ahí.
     */
    private function obtenerHistorialVentas(Cuenta $cuenta, Request $request, bool $puedeVerCosto)
    {
        $cuentaId = $cuenta->id;

        $pagosVenta = DB::table('pago_ventas as pv')
            ->join('ventas as v', 'pv.venta_id', '=', 'v.id')
            ->join('users', 'v.user_id', '=', 'users.id')
            ->leftJoin('monedas as m', 'pv.moneda_id', '=', 'm.id')
            ->leftJoin('clientes as cl', 'v.cliente_id', '=', 'cl.id')
            ->where('pv.cuenta_id', $cuentaId)
            ->where('v.estado', 'completada')
            ->select(
                'v.id as referencia_id',
                'v.updated_at as fecha',
                DB::raw("'Pago de venta' as tipo"),
                'pv.monto as monto',
                DB::raw("COALESCE(m.codigo_moneda, 'USD') as moneda"),
                DB::raw('NULL as descripcion'),
                DB::raw("COALESCE(cl.nombre_cliente, 'Cliente POS') as contraparte"),
                'users.name as usuario',
                DB::raw("'venta_pago' as fuente"),
                'pv.saldo_anterior as saldo_anterior',
                'pv.saldo_posterior as saldo_posterior'
            );

        $comisionesPV = DB::table('ventas as v')
            ->join('users', 'v.user_id', '=', 'users.id')
            ->leftJoin('clientes as cl', 'v.cliente_id', '=', 'cl.id')
            ->where('v.comision_cuenta_id', $cuentaId)
            ->where('v.estado', 'completada')
            ->where('v.es_venta_gestor', false)
            ->where('v.total_comision', '>', 0)
            ->where('v.comision_tasa', '>', 0)
            ->select(
                'v.id as referencia_id',
                'v.updated_at as fecha',
                DB::raw("'Comisión vendedor' as tipo"),
                DB::raw('-(v.total_comision * v.comision_tasa) as monto'),
                DB::raw("'CUP' as moneda"),
                DB::raw('NULL as descripcion'),
                DB::raw("COALESCE(cl.nombre_cliente, 'Cliente POS') as contraparte"),
                'users.name as usuario',
                DB::raw("'venta_comision' as fuente"),
                'v.comision_saldo_anterior as saldo_anterior',
                'v.comision_saldo_posterior as saldo_posterior'
            );

        $comisionesGestor = DB::table('ventas as v')
            ->join('users', 'v.user_id', '=', 'users.id')
            ->leftJoin('clientes as cl', 'v.cliente_id', '=', 'cl.id')
            ->where('v.gestor_cuenta_id', $cuentaId)
            ->where('v.estado', 'completada')
            ->where('v.es_venta_gestor', true)
            ->where('v.gestor_monto', '>', 0)
            ->select(
                'v.id as referencia_id',
                'v.updated_at as fecha',
                DB::raw("'Comisión gestor' as tipo"),
                DB::raw('-v.gestor_monto as monto'),
                DB::raw("'CUP' as moneda"),
                DB::raw('NULL as descripcion'),
                DB::raw("COALESCE(cl.nombre_cliente, 'Cliente POS') as contraparte"),
                'users.name as usuario',
                DB::raw("'venta_gestor' as fuente"),
                'v.gestor_saldo_anterior as saldo_anterior',
                'v.gestor_saldo_posterior as saldo_posterior'
            );

        $mensajeria = DB::table('ventas as v')
            ->join('users', 'v.user_id', '=', 'users.id')
            ->leftJoin('clientes as cl', 'v.cliente_id', '=', 'cl.id')
            ->where('v.mensajero_cuenta_id', $cuentaId)
            ->where('v.estado', 'completada')
            ->where('v.mensajero_tipo', 'externo')
            ->where('v.mensajero_monto', '>', 0)
            ->select(
                'v.id as referencia_id',
                'v.updated_at as fecha',
                DB::raw("'Mensajería' as tipo"),
                DB::raw('-COALESCE(NULLIF(v.mensajero_monto_final_cup, 0), v.mensajero_monto_original) as monto'),
                DB::raw("'CUP' as moneda"),
                DB::raw('NULL as descripcion'),
                DB::raw("COALESCE(cl.nombre_cliente, 'Cliente POS') as contraparte"),
                'users.name as usuario',
                DB::raw("'venta_mensajero' as fuente"),
                'v.mensajero_saldo_anterior as saldo_anterior',
                'v.mensajero_saldo_posterior as saldo_posterior'
            );

        $query = $pagosVenta->unionAll($comisionesPV)
            ->unionAll($comisionesGestor)
            ->unionAll($mensajeria);

        // OJO: mergeBindings() reparte los bindings del $query original en sus
        // buckets originales (where/union), pero ese bucket 'where' se compila
        // ANTES que 'union' — así que cualquier ->where() agregado después de
        // mergeBindings() en $finalQuery se cuela ANTES de los bindings del
        // UNION en vez de ir al final, donde realmente está su placeholder "?"
        // en el SQL de texto. addBinding(getBindings(), 'where') aplana todo
        // en un solo bucket 'where', en el orden real del SQL embebido, para
        // que cualquier ->where()/->whereDate() posterior quede en su lugar.
        $finalQuery = DB::table(DB::raw("({$query->toSql()}) as historial_ventas"))
            ->addBinding($query->getBindings(), 'where');

        if ($tipo = $request->query('tipo_ventas')) {
            $finalQuery->where('fuente', $tipo);
        }
        if ($busqueda = $request->query('q_ventas')) {
            $finalQuery->where(function ($q) use ($busqueda) {
                $q->where('contraparte', 'like', "%{$busqueda}%")
                    ->orWhere('usuario', 'like', "%{$busqueda}%");
            });
        }
        if ($desde = $request->query('desde_ventas')) {
            $finalQuery->whereDate('fecha', '>=', $desde);
        }
        if ($hasta = $request->query('hasta_ventas')) {
            $finalQuery->whereDate('fecha', '<=', $hasta);
        }

        $historial = $finalQuery->orderByDesc('fecha')->paginate(15, ['*'], 'pagina_ventas')->withQueryString();

        // Varias filas (pago/comisión/gestor/mensajero) pueden apuntar a la misma venta —
        // se carga una sola vez por id, no una vez por fila.
        $ventas = Venta::with([
            'pagos.cuenta', 'pagos.cliente', 'pagos.moneda',
            'detalles.producto', 'destinatario', 'almacen', 'usuario',
            'comisionCuenta.moneda', 'gestorCuenta.moneda', 'mensajeroCuenta',
        ])
            ->whereIn('id', $historial->pluck('referencia_id')->unique())
            ->get()
            ->keyBy('id');

        $historial->getCollection()->transform(function ($item) use ($ventas, $puedeVerCosto) {
            $item->descripcion = match ($item->fuente) {
                'venta_pago' => "Pago de venta #{$item->referencia_id}",
                'venta_comision' => "Comisión de venta #{$item->referencia_id}",
                'venta_gestor' => "Comisión de gestor - venta #{$item->referencia_id}",
                'venta_mensajero' => "Mensajería - venta #{$item->referencia_id}",
                default => $item->descripcion,
            };

            $venta = $ventas->get($item->referencia_id);
            $item->detalle = $venta ? $this->detalleOperacionService->detalleVenta($venta, $puedeVerCosto) : null;

            return $item;
        });

        return $historial;
    }

    /**
     * Historial de pagos de compra hechos desde esta cuenta. Solo se llama
     * para admin/moderador — vendedor no ve compras (mismo criterio que
     * precio_compra/costo, ya oculto a ese rol en el resto del sistema).
     */
    private function obtenerHistorialCompras(Cuenta $cuenta, Request $request)
    {
        $cuentaId = $cuenta->id;

        $query = DB::table('compra_pago as cp')
            ->join('compras as c', 'cp.compra_id', '=', 'c.id')
            ->leftJoin('proveedors as p', 'c.proveedor_id', '=', 'p.id')
            ->leftJoin('clientes as cl', 'c.cliente_id', '=', 'cl.id')
            ->where('cp.cuenta_id', $cuentaId);

        if ($busqueda = $request->query('q_compras')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('p.nombre_proveedor', 'like', "%{$busqueda}%")
                    ->orWhere('cl.nombre_cliente', 'like', "%{$busqueda}%");
            });
        }
        if ($desde = $request->query('desde_compras')) {
            $query->whereDate('c.fecha_compra', '>=', $desde);
        }
        if ($hasta = $request->query('hasta_compras')) {
            $query->whereDate('c.fecha_compra', '<=', $hasta);
        }

        $historial = $query->select(
            'c.id as referencia_id',
            'c.fecha_compra as fecha',
            DB::raw("'Pago de compra' as tipo"),
            DB::raw('-cp.monto as monto'),
            DB::raw("'USD' as moneda"),
            DB::raw('NULL as descripcion'),
            DB::raw("COALESCE(p.nombre_proveedor, cl.nombre_cliente, 'Proveedor') as contraparte"),
            DB::raw("'Sistema' as usuario"),
            DB::raw("'compra_pago' as fuente"),
            'cp.saldo_anterior as saldo_anterior',
            'cp.saldo_posterior as saldo_posterior'
        )
            ->orderByDesc('c.fecha_compra')
            ->paginate(15, ['*'], 'pagina_compras')
            ->withQueryString();

        // Varios pagos (compra_pago) pueden apuntar a la misma compra — se carga una
        // sola vez por id, no una vez por fila.
        $compras = Compra::with(['proveedor', 'cliente', 'pagos.cuenta', 'pagos.cliente', 'productos'])
            ->whereIn('id', $historial->pluck('referencia_id')->unique())
            ->get()
            ->keyBy('id');

        $historial->getCollection()->transform(function ($item) use ($compras) {
            $item->descripcion = "Pago de compra #{$item->referencia_id}";
            $compra = $compras->get($item->referencia_id);
            $item->detalle = $compra ? $this->detalleOperacionService->detalleCompra($compra) : null;

            return $item;
        });

        return $historial;
    }

    /**
     * Historial de ajustes manuales de saldo (edición directa desde
     * Cuentas/Edit) — quedaban registrados en `ajustes_saldo_cuenta` para
     * auditoría desde el fix de seguridad de 2026-08-19, pero nunca se
     * leían de vuelta en ningún lado.
     */
    private function obtenerHistorialAjustes(Cuenta $cuenta, Request $request)
    {
        $query = DB::table('ajustes_saldo_cuenta as a')
            ->join('users', 'a.user_id', '=', 'users.id')
            ->where('a.cuenta_id', $cuenta->id);

        if ($busqueda = $request->query('q_ajustes')) {
            $query->where(function ($q) use ($busqueda) {
                $q->where('a.motivo', 'like', "%{$busqueda}%")
                    ->orWhere('users.name', 'like', "%{$busqueda}%");
            });
        }
        if ($desde = $request->query('desde_ajustes')) {
            $query->whereDate('a.created_at', '>=', $desde);
        }
        if ($hasta = $request->query('hasta_ajustes')) {
            $query->whereDate('a.created_at', '<=', $hasta);
        }

        $historial = $query->select(
            'a.id as referencia_id',
            'a.created_at as fecha',
            DB::raw("'Ajuste Manual' as tipo"),
            DB::raw('(a.saldo_nuevo - a.saldo_anterior) as monto'),
            DB::raw('NULL as moneda'),
            'a.motivo as descripcion',
            DB::raw('NULL as contraparte'),
            'users.name as usuario',
            DB::raw("'ajuste_saldo' as fuente"),
            'a.saldo_anterior as saldo_anterior',
            'a.saldo_nuevo as saldo_posterior'
        )
            ->orderByDesc('a.created_at')
            ->paginate(15, ['*'], 'pagina_ajustes')
            ->withQueryString();

        $codigoMoneda = $cuenta->moneda->codigo_moneda ?? '';
        $historial->getCollection()->transform(function ($item) use ($codigoMoneda) {
            $item->moneda = $codigoMoneda;

            return $item;
        });

        return $historial;
    }

    public function edit(Cuenta $cuenta)
    {
        $cuenta->load('moneda');

        return Inertia::render('Cuentas/Edit', [
            'cuenta' => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'tipo' => $cuenta->tipo,
                'saldo_cuenta' => $cuenta->saldo_cuenta,
                'moneda_id' => $cuenta->moneda_id,
                'moneda' => $cuenta->moneda ? [
                    'id' => $cuenta->moneda->id,
                    'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                    'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                    'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                    'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                    'principal' => $cuenta->moneda->principal,
                ] : null,
                'tipo_cuenta' => $cuenta->tipo_cuenta,
                'tipo_titular' => $cuenta->tipo_titular,
                'estado' => $cuenta->estado,
                'notas_cuenta' => $cuenta->notas_cuenta,
            ],
            'monedas' => Moneda::where('estado', true)
                ->select('id', 'nombre_moneda', 'codigo_moneda', 'simbolo_moneda')
                ->get()
                ->map(function ($moneda) {
                    return [
                        'id' => $moneda->id,
                        'nombre_completo' => $moneda->nombre_moneda.' ('.$moneda->codigo_moneda.')',
                        'codigo_moneda' => $moneda->codigo_moneda,
                        'simbolo_moneda' => $moneda->simbolo_moneda,
                    ];
                }),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Cuenta $cuenta)
    {
        $saldoActual = (float) $cuenta->saldo_cuenta;
        $saldoNuevo = $request->has('saldo_cuenta') ? (float) $request->saldo_cuenta : $saldoActual;
        $saldoCambio = $request->has('saldo_cuenta') && $saldoNuevo !== $saldoActual;

        if ($saldoCambio && auth()->user()->role !== 'admin') {
            return back()->withErrors([
                'saldo_cuenta' => 'Solo el administrador puede modificar el saldo de la cuenta.',
            ]);
        }

        if ($saldoCambio && ! Hash::check((string) $request->input('security_password'), auth()->user()->password)) {
            return back()->withErrors([
                'security_password' => 'Contraseña incorrecta.',
            ]);
        }

        $validated = $request->validate([
            'nombre_cuenta' => [
                'required',
                'string',
                'max:255',
                'unique:cuentas,nombre_cuenta,'.$cuenta->id,
            ],
            'tipo' => ['required', 'in:tarjeta,efectivo'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'moneda_id' => ['required', 'exists:monedas,id'],
            'tipo_titular' => ['nullable', 'in:externa,personal'],
            'tipo_cuenta' => ['required', 'in:permanentes'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
            'motivo_ajuste_saldo' => [$saldoCambio ? 'required' : 'nullable', 'string', 'max:500'],
        ]);

        $saldoAnterior = $cuenta->saldo_cuenta;

        $cuenta->update([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $saldoCambio ? $validated['saldo_cuenta'] : $cuenta->saldo_cuenta,
            'moneda_id' => $validated['moneda_id'],
            'tipo_titular' => $validated['tipo_titular'] ?? $cuenta->tipo_titular,
            'tipo_cuenta' => $validated['tipo_cuenta'] ?? 'permanentes',
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'] ?? $cuenta->notas_cuenta,
        ]);

        if ($saldoCambio) {
            AjusteSaldoCuenta::create([
                'cuenta_id' => $cuenta->id,
                'user_id' => auth()->id(),
                'saldo_anterior' => $saldoAnterior,
                'saldo_nuevo' => $validated['saldo_cuenta'],
                'motivo' => $validated['motivo_ajuste_saldo'],
            ]);
        }

        // Redirigimos al usuario a la lista de cuentas
        return redirect()->route('cuentas.index')->with('success', 'Cuenta actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Cuenta $cuenta)
    {
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }

        // Mismo criterio que Clientes: una cuenta con saldo distinto de cero no se
        // puede eliminar, ni siquiera por un admin — primero hay que liquidarla.
        if ((float) $cuenta->saldo_cuenta !== 0.0) {
            return back()->withErrors([
                'cuenta' => 'No se puede eliminar esta cuenta porque tiene saldo pendiente. Primero debe liquidarlo a $0.00.',
            ]);
        }

        try {
            $cuenta->delete();
        } catch (QueryException $e) {
            // Red de seguridad: una cuenta en $0.00 todavía puede tener historial de
            // movimientos financieros apuntándole (entró y salió dinero, neto cero) —
            // el chequeo de saldo de arriba no cubre ese caso, la FK sí lo bloquea.
            if ((int) $e->getCode() === 23000) {
                return back()->withErrors([
                    'cuenta' => 'No se puede eliminar esta cuenta porque tiene movimientos financieros u operaciones asociadas.',
                ]);
            }

            throw $e;
        }

        return redirect()->route('cuentas.index')->with('success', 'Cuenta eliminada exitosamente.');
    }

    public function getDeudas()
    {
        return response()->json(
            Cuenta::where('tipo_cuenta', 'deudas')
                ->with('moneda')
                ->get()
                ->map(function ($cuenta) {
                    return [
                        'id' => $cuenta->id,
                        'nombre_cuenta' => $cuenta->nombre_cuenta,
                        'saldo_cuenta' => $cuenta->saldo_cuenta,
                        'moneda' => $cuenta->moneda ? [
                            'id' => $cuenta->moneda->id,
                            'codigo_moneda' => $cuenta->moneda->codigo_moneda,
                            'simbolo_moneda' => $cuenta->moneda->simbolo_moneda,
                            'nombre_moneda' => $cuenta->moneda->nombre_moneda,
                            'tasa_cambio' => (float) $cuenta->moneda->tasa_cambio,
                            'principal' => $cuenta->moneda->principal,
                        ] : null,
                    ];
                })
        );
    }
}
