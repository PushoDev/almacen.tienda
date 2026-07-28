<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Models\Moneda;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CuentaController extends Controller
{
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
            if (!isset($resumenPorMoneda[$codigo])) {
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
                if (!isset($resumenPorMonedaPerm[$codigo])) {
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
                        'nombre_completo' => $moneda->nombre_moneda . ' (' . $moneda->codigo_moneda . ')',
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
            'tipo' => ['required', 'in:tarjeta,efectivo,otro'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'moneda_id' => ['required', 'exists:monedas,id'],
            'tipo_titular' => ['nullable', 'in:externa,personal'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        Cuenta::create([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $validated['saldo_cuenta'] ?? 0.00,
            'moneda_id' => $validated['moneda_id'],
            'tipo_titular' => $validated['tipo_titular'],
            'tipo_cuenta' => $validated['tipo_cuenta'],
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'],
        ]);

        // Redirigimos al usuario a la lista de cuentas
        return redirect()->route('cuentas.index')->with('success', 'Cuenta creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Cuenta $cuenta)
    {
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
        ]);
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
                        'nombre_completo' => $moneda->nombre_moneda . ' (' . $moneda->codigo_moneda . ')',
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

        if ($saldoCambio && $request->input('security_password') !== 'glorietashop') {
            return back()->withErrors([
                'security_password' => 'Contraseña de seguridad incorrecta.',
            ]);
        }

        $validated = $request->validate([
            'nombre_cuenta' => [
                'required',
                'string',
                'max:255',
                'unique:cuentas,nombre_cuenta,' . $cuenta->id,
            ],
            'tipo' => ['required', 'in:tarjeta,efectivo,otro'],
            'saldo_cuenta' => ['nullable', 'numeric'],
            'moneda_id' => ['required', 'exists:monedas,id'],
            'tipo_titular' => ['nullable', 'in:externa,personal'],
            'tipo_cuenta' => ['required', 'in:permanentes,temporales'],
            'estado' => ['required', 'in:activa,inactiva'],
            'notas_cuenta' => ['nullable', 'string'],
        ]);

        $cuenta->update([
            'nombre_cuenta' => $validated['nombre_cuenta'],
            'tipo' => $validated['tipo'],
            'saldo_cuenta' => $saldoCambio ? $validated['saldo_cuenta'] : $cuenta->saldo_cuenta,
            'moneda_id' => $validated['moneda_id'],
            'tipo_titular' => $validated['tipo_titular'] ?? $cuenta->tipo_titular,
            'tipo_cuenta' => $validated['tipo_cuenta'],
            'estado' => $validated['estado'],
            'notas_cuenta' => $validated['notas_cuenta'],
        ]);

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
        $cuenta->delete();
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
