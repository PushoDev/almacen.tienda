<?php

namespace App\Services;

use App\Models\LoteFusion;
use App\Models\LoteStock;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fusión de 2+ lotes de un mismo producto en un mismo almacén en UN solo lote, a pedido del
 * usuario (nunca automática — por defecto cada lote conserva su costo y su precio).
 *
 * El lote resultante suma las cantidades, toma el costo promedio ponderado (el valor del
 * inventario no cambia) y la fecha del lote más viejo (sigue saliendo primero en el consumo
 * FIFO). Los lotes unidos NO se borran: quedan en 0 con `fusionado_en_lote_id` apuntando al
 * resultante, para que las ventas que ya salieron de ellos conserven su costo real. Cada fusión
 * queda auditada en `lote_fusions`.
 */
class FusionLotesService
{
    /**
     * @param  array<int, int>  $loteIds
     * @param  float|null  $precioVenta  precio propio del lote resultante; null = hereda el del producto en el almacén
     *
     * @throws ValidationException
     */
    public function fusionar(int $productoId, int $almacenId, array $loteIds, ?float $precioVenta, User $user): LoteStock
    {
        return DB::transaction(function () use ($productoId, $almacenId, $loteIds, $precioVenta, $user) {
            $lotes = LoteStock::whereIn('id', $loteIds)->lockForUpdate()->orderBy('created_at')->orderBy('id')->get();

            $this->validar($lotes, $loteIds, $productoId, $almacenId);

            $cantidadTotal = (int) $lotes->sum('cantidad_disponible');
            $valorTotal = $lotes->sum(fn (LoteStock $lote) => $lote->cantidad_disponible * (float) $lote->precio_costo);
            $costoResultante = round($valorTotal / $cantidadTotal, 2);

            $resultante = LoteStock::create([
                'codigo' => LoteStock::generarCodigoFusion($productoId, $almacenId),
                'producto_id' => $productoId,
                'almacen_id' => $almacenId,
                'cantidad' => $cantidadTotal,
                'cantidad_disponible' => $cantidadTotal,
                'precio_costo' => $costoResultante,
                'precio_venta' => $precioVenta !== null ? round($precioVenta, 2) : null,
            ]);

            // Misma antigüedad que el lote más viejo unido: el consumo FIFO (LoteConsumoService)
            // ordena por created_at, y estas unidades no son "nuevas".
            $resultante->created_at = $lotes->first()->created_at;
            $resultante->save();

            LoteFusion::create([
                'producto_id' => $productoId,
                'almacen_id' => $almacenId,
                'lote_resultante_id' => $resultante->id,
                'user_id' => $user->id,
                'lotes_origen' => $lotes->map(fn (LoteStock $lote) => [
                    'id' => $lote->id,
                    'codigo' => $lote->codigo,
                    'cantidad' => $lote->cantidad_disponible,
                    'precio_costo' => (float) $lote->precio_costo,
                    'precio_venta' => $lote->precio_venta !== null ? (float) $lote->precio_venta : null,
                ])->values()->all(),
                'cantidad_total' => $cantidadTotal,
                'costo_resultante' => $costoResultante,
            ]);

            LoteStock::whereIn('id', $lotes->pluck('id'))->update([
                'cantidad_disponible' => 0,
                'fusionado_en_lote_id' => $resultante->id,
                'updated_at' => now(),
            ]);

            return $resultante->fresh();
        });
    }

    /**
     * Fusión masiva ("Fusionar lotes" de /disponibles): por cada producto, TODOS sus lotes con
     * stock en el almacén pasan a un solo lote, heredando el precio del producto. Cada producto
     * se fusiona por separado — si uno falla (ej. prorrateo pendiente) se sigue con los demás y
     * se informa el motivo para que el usuario lo revise.
     *
     * @param  array<int, int>  $productoIds
     * @return array{fusionados: array<int, array{producto_id: int, codigo: string, cantidad: int, costo: float}>, fallidos: array<int, array{producto_id: int, motivo: string}>}
     */
    public function fusionarEnAlmacen(array $productoIds, int $almacenId, User $user): array
    {
        $fusionados = [];
        $fallidos = [];

        foreach (array_unique($productoIds) as $productoId) {
            $loteIds = LoteStock::where('producto_id', $productoId)
                ->where('almacen_id', $almacenId)
                ->where('cantidad_disponible', '>', 0)
                ->pluck('id')
                ->all();

            try {
                $lote = $this->fusionar((int) $productoId, $almacenId, $loteIds, null, $user);
                $fusionados[] = [
                    'producto_id' => (int) $productoId,
                    'codigo' => $lote->codigo,
                    'cantidad' => $lote->cantidad_disponible,
                    'costo' => (float) $lote->precio_costo,
                ];
            } catch (ValidationException $e) {
                $fallidos[] = ['producto_id' => (int) $productoId, 'motivo' => collect($e->errors())->flatten()->first()];
            }
        }

        return compact('fusionados', 'fallidos');
    }

    /**
     * @param  Collection<int, LoteStock>  $lotes
     * @param  array<int, int>  $loteIds
     *
     * @throws ValidationException
     */
    private function validar(Collection $lotes, array $loteIds, int $productoId, int $almacenId): void
    {
        $falla = fn (string $mensaje) => throw ValidationException::withMessages(['lote_ids' => $mensaje]);

        if ($lotes->count() < 2 || $lotes->count() !== count(array_unique($loteIds))) {
            $falla('Selecciona al menos 2 lotes existentes para fusionar.');
        }

        if ($lotes->contains(fn (LoteStock $lote) => (int) $lote->producto_id !== $productoId || (int) $lote->almacen_id !== $almacenId)) {
            $falla('Solo se pueden fusionar lotes del mismo producto y del mismo almacén.');
        }

        $sinStock = $lotes->filter(fn (LoteStock $lote) => $lote->cantidad_disponible <= 0 || $lote->fusionado_en_lote_id !== null);
        if ($sinStock->isNotEmpty()) {
            $falla('Estos lotes no tienen stock o ya se fusionaron: '.$sinStock->pluck('codigo')->implode(', ').'.');
        }

        // Un prorrateo pendiente se aplica a los lotes que creó ESE movimiento; si ya se
        // fusionaron, el incremento no llegaría al lote resultante.
        $movimientosPendientes = Movimiento::whereIn('id', $lotes->pluck('movimiento_id')->filter())
            ->where('requiere_prorrateo', true)
            ->whereNull('prorrateo_decision')
            ->pluck('id');
        if ($movimientosPendientes->isNotEmpty()) {
            $falla('Hay un prorrateo pendiente del movimiento #'.$movimientosPendientes->implode(', #').'. Aplícalo u omítelo en Distribución de Costos antes de fusionar.');
        }
    }
}
