<?php

namespace App\Http\Middleware;

use App\Models\Moneda;
use App\Services\CatalogoTarjetasService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'tasas' => fn () => Moneda::where('estado', true)
                ->orderBy('principal', 'desc')
                ->orderBy('codigo_moneda')
                ->get(['codigo_moneda', 'nombre_moneda', 'tasa_cambio', 'principal', 'imagen'])
                ->map(fn (Moneda $moneda) => [
                    'codigo_moneda' => $moneda->codigo_moneda,
                    'nombre_moneda' => $moneda->nombre_moneda,
                    'tasa_cambio' => $moneda->tasa_cambio,
                    'principal' => $moneda->principal,
                    'imagen_url' => CatalogoTarjetasService::monedaImagenPorSlug($moneda->imagen)['imagen_url'] ?? null,
                ]),
            'turno' => fn () => $this->turnoCompartido($request),
        ];
    }

    /**
     * Feature "Atendido por" / Turnos: null para admin y para invitados (nunca capturan
     * turno). Para moderador/vendedor, arma lo que necesita el diálogo bloqueante global
     * y el indicador del header — ver App\Models\User::requiereCapturaTurno()/turnoActivo().
     *
     * @return array{requiereCaptura: bool, nombreVendedor: ?string, sugerido: ?string, historial: array<int, string>}|null
     */
    private function turnoCompartido(Request $request): ?array
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['moderador', 'vendedor'])) {
            return null;
        }

        $activo = $user->turnoActivo();

        return [
            'requiereCaptura' => $user->requiereCapturaTurno(),
            'nombreVendedor' => $activo?->nombre_vendedor,
            'sugerido' => $activo?->nombre_vendedor,
            // Distinct sin ORDER BY en la misma query (MySQL error 3065 con DISTINCT+ORDER BY
            // sobre columna no seleccionada) — se deduplica en PHP conservando el orden.
            'historial' => $user->turnosVendedor()
                ->latest('iniciado_en')
                ->limit(50)
                ->pluck('nombre_vendedor')
                ->unique()
                ->values()
                ->take(10)
                ->all(),
        ];
    }
}
