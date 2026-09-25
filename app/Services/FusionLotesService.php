<?php

namespace App\Services;

use App\Models\Compra;
use App\Models\CompraProducto;
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
     * Sin prorrateo, las unidades que llegaron por un movimiento no tienen por qué seguir en un lote
     * aparte: se ACUMULAN al lote que el destino ya tenía del mismo producto cuando es idéntico —
     * mismo costo, sin precio propio y sin un prorrateo pendiente que después le cambiaría el costo
     * a las unidades ajenas. Si no hay un lote así, el lote del movimiento se queda como está.
     *
     * Se llama cuando el movimiento ya no tiene nada que prorratear: al recibirlo si nunca requirió
     * prorrateo, o al eliminarlo de la lista de pendientes. El lote del movimiento NO se borra (las
     * ventas que ya salieron de él conservan su costo): queda en 0 con `fusionado_en_lote_id`
     * apuntando al lote que absorbió sus unidades, y la acumulación queda auditada en `lote_fusions`.
     *
     * @return int Cantidad de lotes del movimiento que se acumularon en otro
     */
    public function acumularMovimientoEnLoteExistente(Movimiento $movimiento, User $user): int
    {
        return DB::transaction(function () use ($movimiento, $user) {
            $lotes = LoteStock::where('movimiento_id', $movimiento->id)
                ->where('cantidad_disponible', '>', 0)
                ->whereNull('fusionado_en_lote_id')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            return $this->acumularEnLoteIdentico($lotes, $user, movimientoActualId: $movimiento->id);
        });
    }

    /**
     * Lo mismo para una compra: sin prorrateo (la compra se elimina de la lista de pendientes), los
     * lotes que creó al aprobarse se acumulan al lote idéntico que el almacén ya tenía.
     *
     * @return int Cantidad de lotes de la compra que se acumularon en otro
     */
    public function acumularCompraEnLoteExistente(Compra $compra, User $user): int
    {
        return DB::transaction(function () use ($compra, $user) {
            $lotes = LoteStock::whereIn('compra_producto_id', CompraProducto::where('compra_id', $compra->id)->select('id'))
                ->where('cantidad_disponible', '>', 0)
                ->whereNull('fusionado_en_lote_id')
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            return $this->acumularEnLoteIdentico($lotes, $user, compraActualId: $compra->id);
        });
    }

    /**
     * Acumula cada lote dado en un lote idéntico del mismo producto y almacén (ver
     * acumularMovimientoEnLoteExistente()). El destino NO puede ser: un lote de esta misma
     * operación, uno con precio propio, uno ya fusionado, ni uno cuyo costo todavía puede cambiar
     * por un prorrateo pendiente (de un movimiento o de una compra sin decidir): las unidades
     * acumuladas recibirían un incremento que no les corresponde.
     *
     * Límite conocido: no se sigue la cadena `lote_origen_id` — un lote de un movimiento ya decidido
     * que descienda de una compra pendiente sí puede ser destino.
     *
     * @param  Collection<int, LoteStock>  $lotes
     */
    private function acumularEnLoteIdentico(Collection $lotes, User $user, ?int $movimientoActualId = null, ?int $compraActualId = null): int
    {
        if ($lotes->isEmpty()) {
            return 0;
        }

        $movimientosPendientes = Movimiento::where('requiere_prorrateo', true)
            ->whereNull('prorrateo_decision')
            ->when($movimientoActualId !== null, fn ($query) => $query->where('id', '!=', $movimientoActualId))
            ->pluck('id')
            ->all();

        $comprasPendientes = Compra::where('estado', 'aprobada')
            ->whereNull('prorrateo_decision')
            ->when($compraActualId !== null, fn ($query) => $query->where('id', '!=', $compraActualId))
            ->select('id');

        $idsDeLaOperacion = $lotes->pluck('id')->all();
        $acumulados = 0;
        // Lotes de esta misma operación que ya quedaron como base de su producto+costo, para que
        // dos partes con igual costo tampoco queden separadas.
        $bases = [];

        foreach ($lotes as $lote) {
            $clave = $lote->producto_id.'|'.round((float) $lote->precio_costo, 2);

            $destino = $bases[$clave] ?? LoteStock::where('producto_id', $lote->producto_id)
                ->where('almacen_id', $lote->almacen_id)
                ->whereNotIn('id', $idsDeLaOperacion)
                ->where('cantidad_disponible', '>', 0)
                ->whereNull('fusionado_en_lote_id')
                ->whereNull('precio_venta')
                ->where('precio_costo', $lote->precio_costo)
                ->when($movimientosPendientes !== [], fn ($query) => $query->where(
                    fn ($q) => $q->whereNull('movimiento_id')->orWhereNotIn('movimiento_id', $movimientosPendientes)
                ))
                ->where(fn ($q) => $q->whereNull('compra_producto_id')
                    ->orWhereNotIn('compra_producto_id', CompraProducto::select('id')->whereIn('compra_id', $comprasPendientes)))
                ->orderBy('created_at')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            if (! $destino) {
                $bases[$clave] = $lote;

                continue;
            }

            $unidades = (int) $lote->cantidad_disponible;
            $destino->increment('cantidad', $unidades);
            $destino->increment('cantidad_disponible', $unidades);
            $lote->update(['cantidad_disponible' => 0, 'fusionado_en_lote_id' => $destino->id]);

            LoteFusion::create([
                'producto_id' => $lote->producto_id,
                'almacen_id' => $lote->almacen_id,
                'lote_resultante_id' => $destino->id,
                'user_id' => $user->id,
                'lotes_origen' => [[
                    'id' => $lote->id,
                    'codigo' => $lote->codigo,
                    'cantidad' => $unidades,
                    'precio_costo' => (float) $lote->precio_costo,
                    'precio_venta' => null,
                ]],
                'cantidad_total' => (int) $destino->fresh()->cantidad_disponible,
                'costo_resultante' => round((float) $destino->precio_costo, 2),
            ]);

            $acumulados++;
        }

        return $acumulados;
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

        // Un prorrateo sin decidir NO bloquea la fusión: el prorrateo es opcional (el cliente lo dejó
        // explícito). La interfaz avisa que, si el movimiento se prorratea después, el incremento ya
        // no llegará a las unidades fusionadas (mismo límite que ya tienen los lotes de una compra).
    }
}
