<?php

namespace App\Http\Controllers;

use App\Models\CasilleroCargo;
use App\Models\Compra;
use App\Models\CompraProducto;
use App\Models\Contenedor;
use App\Models\ContenedorLinea;
use App\Models\Cuenta;
use App\Services\CasilleroService;
use App\Services\ContenedorService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Contenedores del Casillero de Compras (solo administrador): se arman con parte de lo que espera
 * en Panamá y llevan sus propios cargos. Ver docs/plan-casillero-de-compras.md (Fase 2).
 */
class ContenedorController extends Controller
{
    public function __construct(
        private ContenedorService $contenedores,
        private CasilleroService $casillero,
    ) {}

    public function index(): Response
    {
        $abiertos = Contenedor::where('estado', Contenedor::ESTADO_ABIERTO)
            ->with([
                'lineas.compraProducto.producto',
                'lineas.compraProducto.compra.cliente',
                'cargos' => fn ($q) => $q->where('estado', CasilleroCargo::ESTADO_ACTIVO),
            ])
            ->latest('id')
            ->get()
            ->map(fn (Contenedor $contenedor) => $this->shapeContenedor($contenedor));

        $cuentasUsd = Cuenta::query()
            ->whereHas('moneda', fn ($q) => $q->where('codigo_moneda', CasilleroService::MONEDA_CARGOS_PANAMA)->where('estado', true))
            ->where('estado', 'activa')
            ->orderBy('nombre_cuenta')
            ->get(['id', 'nombre_cuenta', 'saldo_cuenta']);

        return Inertia::render('Casillero/Contenedores', [
            'contenedores' => $abiertos,
            'disponibles' => $this->lineasDisponibles(),
            'cuentas' => $cuentasUsd,
            'resumen' => [
                'contenedores' => $abiertos->count(),
                'unidades' => $abiertos->sum('unidades'),
                'valor_mercancia_usd' => round($abiertos->sum('valor_mercancia_usd'), 2),
                'cargos_usd' => round($abiertos->sum('cargos_usd'), 2),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'nombre' => 'required|string|max:120',
            'notas' => 'nullable|string|max:255',
            'fecha_salida' => 'nullable|date',
        ]);

        $contenedor = $this->contenedores->crear($request->user(), $datos);

        return back()->with('success', "Contenedor «{$contenedor->nombre}» creado.");
    }

    public function update(Request $request, Contenedor $contenedor): RedirectResponse
    {
        $datos = $request->validate([
            'nombre' => 'sometimes|required|string|max:120',
            'notas' => 'nullable|string|max:255',
            'fecha_salida' => 'nullable|date',
        ]);

        return $this->ejecutar(fn () => $this->contenedores->actualizar($contenedor, $datos), 'Contenedor actualizado.');
    }

    public function asignarUnidades(Request $request, Contenedor $contenedor): RedirectResponse
    {
        $datos = $request->validate([
            'lineas' => 'required|array|min:1',
            'lineas.*.compra_producto_id' => 'required|integer|exists:compra_producto,id',
            'lineas.*.cantidad' => 'required|integer|min:0',
        ]);

        return $this->ejecutar(fn () => $this->contenedores->asignarUnidades($contenedor, $datos['lineas']), 'Unidades del contenedor actualizadas.');
    }

    public function storeCargo(Request $request, Contenedor $contenedor): RedirectResponse
    {
        $datos = $request->validate([
            'concepto' => 'required|string|max:120',
            'nota' => 'nullable|string|max:255',
            'monto' => 'required|numeric|min:0.01',
            'cuenta_id' => 'required|integer|exists:cuentas,id',
            'fecha' => 'nullable|date',
        ]);

        return $this->ejecutar(fn () => $this->casillero->registrarCargoContenedor($request->user(), $contenedor, $datos), 'Cargo anotado en el contenedor.');
    }

    public function cancelar(Contenedor $contenedor): RedirectResponse
    {
        return $this->ejecutar(fn () => $this->contenedores->cancelar($contenedor), 'Contenedor cancelado: sus unidades volvieron al casillero.');
    }

    /**
     * @param  callable(): mixed  $accion
     */
    private function ejecutar(callable $accion, string $exito): RedirectResponse
    {
        try {
            $accion();
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return back()->with('success', $exito);
    }

    /**
     * Líneas de compra con unidades esperando en Panamá, listas para asignar a un contenedor.
     *
     * @return array<int, array<string, mixed>>
     */
    private function lineasDisponibles(): array
    {
        $compras = Compra::enCasillero()->with(['cliente', 'productos'])->orderBy('id')->get();

        $asignadas = ContenedorLinea::whereIn('compra_producto_id', CompraProducto::whereIn('compra_id', $compras->pluck('id'))->select('id'))
            ->selectRaw('compra_producto_id, SUM(cantidad) as total')
            ->groupBy('compra_producto_id')
            ->pluck('total', 'compra_producto_id');

        $disponibles = [];

        foreach ($compras as $compra) {
            foreach ($compra->productos as $producto) {
                $lineaId = (int) $producto->pivot->id;
                $enCasillero = (int) $producto->pivot->cantidad - (int) ($asignadas[$lineaId] ?? 0);

                if ($enCasillero > 0) {
                    $disponibles[] = [
                        'compra_producto_id' => $lineaId,
                        'compra_id' => $compra->id,
                        'proveedor' => $compra->cliente?->nombre_cliente,
                        'producto' => $producto->nombre_producto,
                        'en_casillero' => $enCasillero,
                        'precio' => (float) $producto->pivot->precio,
                    ];
                }
            }
        }

        return $disponibles;
    }

    /**
     * @return array<string, mixed>
     */
    private function shapeContenedor(Contenedor $contenedor): array
    {
        $lineas = $contenedor->lineas->map(fn (ContenedorLinea $linea) => [
            'compra_producto_id' => $linea->compra_producto_id,
            'compra_id' => $linea->compraProducto->compra_id,
            'proveedor' => $linea->compraProducto->compra?->cliente?->nombre_cliente,
            'producto' => $linea->compraProducto->producto?->nombre_producto,
            'cantidad' => $linea->cantidad,
            'precio' => (float) $linea->compraProducto->precio,
            'valor' => round($linea->cantidad * (float) $linea->compraProducto->precio, 2),
        ])->values();

        return [
            'id' => $contenedor->id,
            'nombre' => $contenedor->nombre,
            'notas' => $contenedor->notas,
            'fecha_salida' => $contenedor->fecha_salida?->toDateString(),
            'unidades' => $lineas->sum('cantidad'),
            'valor_mercancia_usd' => round($lineas->sum('valor'), 2),
            'cargos_usd' => round((float) $contenedor->cargos->sum('monto_usd'), 2),
            'cargos' => $contenedor->cargos->map(fn (CasilleroCargo $cargo) => [
                'id' => $cargo->id,
                'concepto' => $cargo->concepto,
                'monto_usd' => $cargo->monto_usd,
                'fecha' => $cargo->fecha->toDateString(),
            ])->values(),
            'lineas' => $lineas,
        ];
    }
}
