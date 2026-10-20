<?php

namespace App\Http\Controllers;

use App\Models\CasilleroCargo;
use App\Models\Compra;
use App\Models\Cuenta;
use App\Services\CasilleroService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Casillero de Compras (solo administrador): las compras que esperan en Panamá sin stock y los
 * cargos a mano que se les anotan. Ver docs/plan-casillero-de-compras.md (Fase 1).
 */
class CasilleroController extends Controller
{
    public function __construct(private CasilleroService $casillero) {}

    public function index(): Response
    {
        $compras = Compra::enCasillero()
            ->with(['cliente', 'productos.categoria', 'cargosCasillero' => fn ($q) => $q->where('casillero_cargos.estado', CasilleroCargo::ESTADO_ACTIVO)])
            ->orderBy('fecha_compra')
            ->orderBy('id')
            ->get()
            ->map(fn (Compra $compra) => $this->shapeCompra($compra));

        $cuentasUsd = Cuenta::query()
            ->whereHas('moneda', fn ($q) => $q->where('codigo_moneda', CasilleroService::MONEDA_CARGOS_PANAMA)->where('estado', true))
            ->where('estado', 'activa')
            ->with('moneda')
            ->orderBy('nombre_cuenta')
            ->get(['id', 'nombre_cuenta', 'saldo_cuenta', 'moneda_id']);

        return Inertia::render('Casillero/Index', [
            'compras' => $compras,
            'cuentas' => $cuentasUsd,
            'resumen' => [
                'compras' => $compras->count(),
                'valor_mercancia_usd' => round($compras->sum('total_compra'), 2),
                'cargos_usd' => round($compras->sum('cargos_usd'), 2),
            ],
        ]);
    }

    public function storeCargo(Request $request): RedirectResponse
    {
        $datos = $request->validate([
            'compra_ids' => 'required|array|min:1',
            'compra_ids.*' => 'required|integer|distinct|exists:compras,id',
            'concepto' => 'required|string|max:120',
            'nota' => 'nullable|string|max:255',
            'monto' => 'required|numeric|min:0.01',
            'cuenta_id' => 'required|integer|exists:cuentas,id',
            'fecha' => 'nullable|date',
        ]);

        try {
            $cargo = $this->casillero->registrarCargo($request->user(), $datos);
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return back()->with('success', "Cargo «{$cargo->concepto}» de {$cargo->monto_usd} USD anotado en ".$cargo->compras->count().' compra(s).');
    }

    public function anularCargo(Request $request, CasilleroCargo $cargo): RedirectResponse
    {
        $datos = $request->validate(['motivo' => 'required|string|max:255']);

        try {
            $this->casillero->anularCargo($cargo, $datos['motivo']);
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return back()->with('success', 'Cargo anulado: el dinero volvió a la cuenta.');
    }

    public function llegadaPanama(Request $request, Compra $compra): RedirectResponse
    {
        $datos = $request->validate(['fecha' => 'required|date']);

        try {
            $this->casillero->marcarLlegadaPanama($compra, $datos['fecha']);
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }

        return back()->with('success', 'Llegada a Panamá anotada.');
    }

    /**
     * @return array<string, mixed>
     */
    private function shapeCompra(Compra $compra): array
    {
        $cargos = $compra->cargosCasillero;

        return [
            'id' => $compra->id,
            'fecha_compra' => substr((string) $compra->fecha_compra, 0, 10),
            'llegada_panama_at' => $compra->llegada_panama_at?->toDateString(),
            'proveedor' => $compra->cliente?->nombre_cliente,
            'total_compra' => (float) $compra->total_compra,
            'cargos_usd' => round((float) $cargos->sum('monto_usd'), 2),
            'cargos' => $cargos->map(fn (CasilleroCargo $cargo) => [
                'id' => $cargo->id,
                'concepto' => $cargo->concepto,
                'monto_usd' => $cargo->monto_usd,
                'fecha' => $cargo->fecha->toDateString(),
            ])->values(),
            'productos' => $compra->productos->map(fn ($producto) => [
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'modelo_producto' => $producto->modelo_producto,
                'categoria' => $producto->categoria?->nombre_categoria,
                'cantidad' => (int) $producto->pivot->cantidad,
                'precio' => (float) $producto->pivot->precio,
            ])->values(),
        ];
    }
}
