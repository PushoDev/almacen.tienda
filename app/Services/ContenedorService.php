<?php

namespace App\Services;

use App\Models\CasilleroCargo;
use App\Models\Compra;
use App\Models\CompraProducto;
use App\Models\Contenedor;
use App\Models\ContenedorLinea;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Casillero de Compras, Fase 2: arma contenedores con parte de lo que espera en el casillero. Un
 * contenedor lleva "12 de X, 30 de Y"; lo que no sube se queda en el casillero para el siguiente.
 * Los cargos del contenedor (transporte marítimo y otros) los anota CasilleroService.
 *
 * Nada de esto toca el stock: el stock entra una sola vez, al llegar al almacén (Fase 4), y ahí los
 * cargos se reparten entre los productos que de verdad llegaron.
 */
class ContenedorService
{
    /**
     * @param  array{nombre: string, notas?: ?string, fecha_salida?: ?string}  $datos
     */
    public function crear(User $usuario, array $datos): Contenedor
    {
        return Contenedor::create([
            'user_id' => $usuario->id,
            'nombre' => trim($datos['nombre']),
            'notas' => $datos['notas'] ?? null,
            'fecha_salida' => $datos['fecha_salida'] ?? null,
            'estado' => Contenedor::ESTADO_ABIERTO,
        ]);
    }

    /**
     * @param  array{nombre?: string, notas?: ?string, fecha_salida?: ?string}  $datos
     *
     * @throws DomainException si el contenedor no está abierto
     */
    public function actualizar(Contenedor $contenedor, array $datos): Contenedor
    {
        return DB::transaction(function () use ($contenedor, $datos): Contenedor {
            $contenedor = $this->abiertoBloqueado($contenedor);

            $contenedor->update(array_filter([
                'nombre' => isset($datos['nombre']) ? trim($datos['nombre']) : null,
                'notas' => $datos['notas'] ?? null,
                'fecha_salida' => $datos['fecha_salida'] ?? null,
            ], fn ($valor) => $valor !== null));

            return $contenedor;
        });
    }

    /**
     * Fija cuántas unidades de cada línea de compra suben a este contenedor (no suma a lo que ya
     * llevaba: reemplaza). Una cantidad 0 saca la línea del contenedor. Cada compra pasa a
     * `contenedor` cuando ya no le queda nada esperando en Panamá, y vuelve al casillero si se le
     * devuelven unidades.
     *
     * @param  array<int, array{compra_producto_id: int, cantidad: int}>  $lineas
     *
     * @throws DomainException si el contenedor no está abierto, una compra no es del casillero o se piden más unidades de las disponibles
     */
    public function asignarUnidades(Contenedor $contenedor, array $lineas): Contenedor
    {
        if ($lineas === []) {
            throw new DomainException('Elige al menos una línea de compra.');
        }

        return DB::transaction(function () use ($contenedor, $lineas): Contenedor {
            $contenedor = $this->abiertoBloqueado($contenedor);

            $cantidades = [];
            foreach ($lineas as $linea) {
                $cantidades[(int) $linea['compra_producto_id']] = (int) $linea['cantidad'];
            }

            $lineasDeCompra = CompraProducto::whereIn('id', array_keys($cantidades))->lockForUpdate()->get()->keyBy('id');

            if ($lineasDeCompra->count() !== count($cantidades)) {
                throw new DomainException('Alguna de las líneas elegidas no existe.');
            }

            $compraIds = $lineasDeCompra->pluck('compra_id')->unique()->all();
            $compras = Compra::whereIn('id', $compraIds)->lockForUpdate()->get()->keyBy('id');

            foreach ($cantidades as $lineaId => $cantidad) {
                $linea = $lineasDeCompra[$lineaId];
                $compra = $compras[$linea->compra_id];

                if (! $compra->esDelCasillero() || $compra->estado !== 'pendiente') {
                    throw new DomainException("La compra #{$compra->id} no está en el casillero.");
                }

                if ($cantidad < 0) {
                    throw new DomainException('La cantidad no puede ser negativa.');
                }

                $enOtrosContenedores = (int) ContenedorLinea::where('compra_producto_id', $lineaId)
                    ->where('contenedor_id', '!=', $contenedor->id)
                    ->sum('cantidad');
                $disponibles = (int) $linea->cantidad - $enOtrosContenedores;

                if ($cantidad > $disponibles) {
                    throw new DomainException("De la línea #{$lineaId} (compra #{$compra->id}) solo hay {$disponibles} unidades disponibles para este contenedor.");
                }

                if ($cantidad === 0) {
                    ContenedorLinea::where('contenedor_id', $contenedor->id)->where('compra_producto_id', $lineaId)->delete();
                } else {
                    ContenedorLinea::updateOrCreate(
                        ['contenedor_id' => $contenedor->id, 'compra_producto_id' => $lineaId],
                        ['cantidad' => $cantidad],
                    );
                }
            }

            foreach ($compraIds as $compraId) {
                $this->recalcularEtapa($compraId);
            }

            return $contenedor->load('lineas');
        });
    }

    /**
     * Cancela un contenedor abierto: sus unidades vuelven al casillero. No se cancela con cargos
     * activos: primero se anulan (el dinero vuelve a la cuenta).
     *
     * @throws DomainException si no está abierto o tiene cargos activos
     */
    public function cancelar(Contenedor $contenedor): Contenedor
    {
        return DB::transaction(function () use ($contenedor): Contenedor {
            $contenedor = $this->abiertoBloqueado($contenedor);

            if ($contenedor->cargos()->where('estado', CasilleroCargo::ESTADO_ACTIVO)->exists()) {
                throw new DomainException('Este contenedor tiene cargos activos: anúlalos antes de cancelarlo.');
            }

            $compraIds = CompraProducto::whereIn('id', $contenedor->lineas()->pluck('compra_producto_id'))
                ->pluck('compra_id')
                ->unique()
                ->all();

            $contenedor->lineas()->delete();
            $contenedor->update(['estado' => Contenedor::ESTADO_CANCELADO]);

            foreach ($compraIds as $compraId) {
                $this->recalcularEtapa($compraId);
            }

            return $contenedor;
        });
    }

    /** Unidades de una línea de compra que siguen esperando en Panamá (sin contenedor). */
    public function unidadesEnCasillero(CompraProducto $linea): int
    {
        return max(0, (int) $linea->cantidad - (int) ContenedorLinea::where('compra_producto_id', $linea->id)->sum('cantidad'));
    }

    /**
     * La compra pasa a `contenedor` cuando todas sus unidades están asignadas y vuelve a
     * `casillero` si le queda algo esperando. Solo aplica a compras del casillero pendientes.
     */
    private function recalcularEtapa(int $compraId): void
    {
        $total = (int) CompraProducto::where('compra_id', $compraId)->sum('cantidad');
        $asignadas = (int) ContenedorLinea::whereIn('compra_producto_id', CompraProducto::where('compra_id', $compraId)->select('id'))->sum('cantidad');

        Compra::whereKey($compraId)
            ->where('flujo', Compra::FLUJO_CASILLERO)
            ->where('estado', 'pendiente')
            ->update(['etapa' => $asignadas >= $total ? Compra::ETAPA_CONTENEDOR : Compra::ETAPA_CASILLERO]);
    }

    private function abiertoBloqueado(Contenedor $contenedor): Contenedor
    {
        $contenedor = Contenedor::whereKey($contenedor->id)->lockForUpdate()->firstOrFail();

        if (! $contenedor->estaAbierto()) {
            throw new DomainException('El contenedor ya no está abierto.');
        }

        return $contenedor;
    }
}
