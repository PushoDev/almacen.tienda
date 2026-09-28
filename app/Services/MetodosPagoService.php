<?php

namespace App\Services;

use App\Models\MetodoPago;
use App\Models\Moneda;
use App\Models\ViaPago;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Métodos y vías de pago de cada moneda (2026-09-26). El CRUD de Monedas elige, por moneda, qué métodos
 * admite (efectivo / transferencia) y, dentro de la transferencia, qué vías (Zelle, EnZona, Transfermóvil…).
 */
class MetodosPagoService
{
    /** @var Collection<string, ViaPago>|null caché por request: catálogo completo de vías, tabla chica (~14 filas) */
    private ?Collection $viasPorSlug = null;

    /**
     * Catálogo completo para los formularios de Monedas: todos los métodos y todas las vías, con su logo.
     *
     * @return array{metodos: array<int, array{slug: string, nombre: string, imagen_url: string|null}>, vias: array<int, array{slug: string, nombre: string, imagen_url: string|null, ambito: string}>}
     */
    public function catalogo(): array
    {
        return [
            'metodos' => MetodoPago::where('activo', true)->orderBy('orden')->get()
                ->map(fn (MetodoPago $metodo) => $this->metodoParaFront($metodo))->all(),
            'vias' => ViaPago::where('activo', true)->orderBy('orden')->get()
                ->map(fn (ViaPago $via) => $this->viaParaFront($via) + ['ambito' => $via->ambito])->all(),
        ];
    }

    /**
     * Lo que admite hoy una moneda, como slugs — para rellenar el formulario de edición.
     *
     * @return array{metodos: array<int, string>, vias: array<int, string>}
     */
    public function configuracion(Moneda $moneda): array
    {
        return [
            'metodos' => $moneda->metodosPago()->pluck('slug')->all(),
            'vias' => $moneda->viasPago()->pluck('slug')->all(),
        ];
    }

    /**
     * Lo que admite una moneda, ya armado para mostrarlo: los métodos, y las vías solo dentro de la
     * transferencia (el efectivo no lleva vía).
     *
     * @return array<int, array{slug: string, nombre: string, imagen_url: string|null, vias: array<int, array{slug: string, nombre: string, imagen_url: string|null}>}>
     */
    public function resumenDeMoneda(Moneda $moneda): array
    {
        $vias = $moneda->viasPago->where('activo', true);

        return $moneda->metodosPago->where('activo', true)
            ->map(fn (MetodoPago $metodo) => $this->metodoParaFront($metodo) + [
                'vias' => $metodo->slug === 'transferencia'
                    ? $vias->map(fn (ViaPago $via) => $this->viaParaFront($via))->values()->all()
                    : [],
            ])
            ->values()
            ->all();
    }

    /**
     * Reglas de validación de los campos `metodos_pago` y `vias_pago` del formulario de Monedas.
     *
     * @return array<string, mixed>
     */
    public function reglas(): array
    {
        return [
            'metodos_pago' => ['required', 'array', 'min:1'],
            'metodos_pago.*' => ['string', 'distinct', 'exists:metodos_pago,slug'],
            'vias_pago' => ['nullable', 'array'],
            'vias_pago.*' => ['string', 'distinct', 'exists:vias_pago,slug'],
        ];
    }

    /**
     * ¿Esa vía está habilitada para esa moneda? Whitelist para el pago del POS/venta pendiente — hoy el
     * servidor acepta cualquier texto en `pagos.*.via` sin cruzarlo contra la moneda elegida.
     */
    public function viaValidaParaMoneda(string $viaSlug, int $monedaId): bool
    {
        $moneda = Moneda::find($monedaId);

        return $moneda !== null && $moneda->viasPago()->where('slug', $viaSlug)->exists();
    }

    /**
     * La vía ya armada para mostrarla (nombre y logo) a partir del slug guardado en un pago — para el
     * detalle de la venta y el Cierre de Caja, que hoy solo muestran el slug en crudo.
     *
     * @return array{slug: string, nombre: string, imagen_url: string|null}|null
     */
    public function viaPorSlug(?string $slug): ?array
    {
        if (empty($slug)) {
            return null;
        }

        $this->viasPorSlug ??= ViaPago::all()->keyBy('slug');
        $via = $this->viasPorSlug->get($slug);

        return $via ? $this->viaParaFront($via) : null;
    }

    /**
     * Regla que no se expresa con `exists`: si la moneda admite transferencia, tiene que tener al menos una
     * vía; si no, ese pago quedaría sin poder elegir vía.
     */
    public function errorDeCoherencia(array $metodos, array $vias): ?string
    {
        if (in_array('transferencia', $metodos, true) && $vias === []) {
            return 'Si la moneda admite transferencia, elige al menos una vía de pago.';
        }

        return null;
    }

    /**
     * Guarda lo que admite la moneda. Las vías solo cuentan si admite transferencia: sin ella se descartan.
     *
     * @param  array<int, string>  $metodos  slugs
     * @param  array<int, string>  $vias  slugs
     */
    public function sincronizar(Moneda $moneda, array $metodos, array $vias): void
    {
        DB::transaction(function () use ($moneda, $metodos, $vias) {
            $moneda->metodosPago()->sync(MetodoPago::whereIn('slug', $metodos)->pluck('id'));
            $moneda->viasPago()->sync(
                in_array('transferencia', $metodos, true) ? ViaPago::whereIn('slug', $vias)->pluck('id') : []
            );
        });
    }

    /**
     * @return array{slug: string, nombre: string, imagen_url: string|null}
     */
    private function metodoParaFront(MetodoPago $metodo): array
    {
        return ['slug' => $metodo->slug, 'nombre' => $metodo->nombre, 'imagen_url' => $metodo->imagenUrl()];
    }

    /**
     * @return array{slug: string, nombre: string, imagen_url: string|null}
     */
    private function viaParaFront(ViaPago $via): array
    {
        return ['slug' => $via->slug, 'nombre' => $via->nombre, 'imagen_url' => $via->imagenUrl()];
    }
}
