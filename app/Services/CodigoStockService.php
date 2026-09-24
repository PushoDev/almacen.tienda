<?php

namespace App\Services;

use App\Models\AlmacenProductoCodigo;
use App\Models\ProductoCodigo;
use Illuminate\Support\Collection;

/**
 * Reparto por almacén de las unidades de cada código de barras (`almacen_producto_codigos`).
 *
 * `producto_codigos.cantidad` es el total del producto en todos los almacenes; sin este reparto
 * el POS ofrecía códigos y cantidades de otros almacenes. Cada operación que mueve stock
 * (compra aprobada, venta, anulación, traslado, import) actualiza las dos cosas a la vez.
 *
 * Regla de seguridad: el reparto solo se usa cuando "cuadra" — la suma de sus filas de un
 * producto en un almacén es igual al stock real de ese almacén (`almacen_producto.cantidad`).
 * Si no cuadra (datos anteriores al reparto, o un flujo que no lo actualizó) todo se comporta
 * como antes: nunca bloquea una venta por un dato de reparto desactualizado.
 */
class CodigoStockService
{
    public function agregar(int $almacenId, int $codigoId, int $cantidad): void
    {
        if ($cantidad <= 0) {
            return;
        }

        AlmacenProductoCodigo::firstOrCreate(
            ['almacen_id' => $almacenId, 'producto_codigo_id' => $codigoId],
            ['cantidad' => 0],
        )->increment('cantidad', $cantidad);
    }

    /**
     * Resta sin pasar de 0 ni fallar: si el reparto no tiene esas unidades (datos sin cuadre),
     * simplemente no resta de más.
     */
    public function descontar(int $almacenId, int $codigoId, int $cantidad): void
    {
        if ($cantidad <= 0) {
            return;
        }

        $fila = AlmacenProductoCodigo::where('almacen_id', $almacenId)
            ->where('producto_codigo_id', $codigoId)
            ->first();

        if ($fila) {
            $fila->decrement('cantidad', min($cantidad, $fila->cantidad));
        }
    }

    /**
     * Traslado entre almacenes: las unidades salen del origen empezando por el código que más
     * tiene ahí, y llegan al destino con el mismo código. Lo que el origen no sabe de qué código
     * es (datos sin reparto) llega al código por defecto del producto.
     */
    public function mover(int $productoId, int $origenId, int $destinoId, int $cantidad): void
    {
        $restante = $cantidad;

        $filas = AlmacenProductoCodigo::where('almacen_id', $origenId)
            ->where('cantidad', '>', 0)
            ->whereIn('producto_codigo_id', ProductoCodigo::where('producto_id', $productoId)->select('id'))
            ->orderByDesc('cantidad')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($filas as $fila) {
            if ($restante <= 0) {
                break;
            }

            $tomar = min($restante, $fila->cantidad);
            $fila->decrement('cantidad', $tomar);
            $this->agregar($destinoId, $fila->producto_codigo_id, $tomar);
            $restante -= $tomar;
        }

        if ($restante > 0) {
            $porDefecto = ProductoCodigo::where('producto_id', $productoId)->orderByDesc('es_default')->orderBy('id')->first();

            if ($porDefecto) {
                $this->agregar($destinoId, $porDefecto->id, $restante);
            }
        }
    }

    /**
     * Pasa `$cantidad` unidades de un código a otro (ProductoController::transferirCodigo): en
     * cada almacén, de donde más tiene el código de origen, sin cambiar de almacén.
     */
    public function reasignar(int $codigoOrigenId, int $codigoDestinoId, int $cantidad): void
    {
        $restante = $cantidad;

        $filas = AlmacenProductoCodigo::where('producto_codigo_id', $codigoOrigenId)
            ->where('cantidad', '>', 0)
            ->orderByDesc('cantidad')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($filas as $fila) {
            if ($restante <= 0) {
                break;
            }

            $tomar = min($restante, $fila->cantidad);
            $fila->decrement('cantidad', $tomar);
            $this->agregar($fila->almacen_id, $codigoDestinoId, $tomar);
            $restante -= $tomar;
        }
    }

    /**
     * Fusión de fichas: un código repetido se borra y su reparto pasa al código equivalente.
     */
    public function unirCodigos(int $codigoRepetidoId, int $codigoConservadoId): void
    {
        $filas = AlmacenProductoCodigo::where('producto_codigo_id', $codigoRepetidoId)->get();

        foreach ($filas as $fila) {
            $this->agregar($fila->almacen_id, $codigoConservadoId, $fila->cantidad);
        }

        AlmacenProductoCodigo::where('producto_codigo_id', $codigoRepetidoId)->delete();
    }

    /**
     * Reparto de un almacén: código => unidades. Una sola consulta para todo el catálogo.
     *
     * @return Collection<int, int>
     */
    public function repartoDelAlmacen(int $almacenId): Collection
    {
        return AlmacenProductoCodigo::where('almacen_id', $almacenId)->pluck('cantidad', 'producto_codigo_id');
    }

    /**
     * Códigos de un producto tal como debe verlos el POS en ese almacén. Con reparto que cuadra
     * con el stock: solo lo que hay ahí. Sin cuadre: como antes, el total del código limitado
     * al stock del almacén.
     *
     * @param  Collection<int, ProductoCodigo>  $codigos  códigos del producto
     * @param  Collection<int, int>  $reparto  ver repartoDelAlmacen()
     * @return Collection<int, array{id: int, codigo_barras: string, cantidad: int, es_default: bool}>
     */
    public function codigosParaVenta(Collection $codigos, Collection $reparto, int $stockAlmacen): Collection
    {
        $cuadra = $this->cuadra($codigos->pluck('id'), $reparto, $stockAlmacen);

        return $codigos->map(fn (ProductoCodigo $codigo) => [
            'id' => $codigo->id,
            'codigo_barras' => $codigo->codigo_barras,
            'cantidad' => $cuadra
                ? (int) ($reparto[$codigo->id] ?? 0)
                : min((int) $codigo->cantidad, $stockAlmacen),
            'es_default' => (bool) $codigo->es_default,
        ]);
    }

    /**
     * Unidades de este código que se pueden vender en el almacén (validación al vender).
     */
    public function cantidadDisponible(int $almacenId, ProductoCodigo $codigo, int $stockAlmacen): int
    {
        $idsDelProducto = ProductoCodigo::where('producto_id', $codigo->producto_id)->pluck('id');
        $reparto = AlmacenProductoCodigo::where('almacen_id', $almacenId)
            ->whereIn('producto_codigo_id', $idsDelProducto)
            ->pluck('cantidad', 'producto_codigo_id');

        if (! $this->cuadra($idsDelProducto, $reparto, $stockAlmacen)) {
            return (int) $codigo->cantidad;
        }

        return (int) ($reparto[$codigo->id] ?? 0);
    }

    /**
     * @param  Collection<int, int>  $idsCodigos
     * @param  Collection<int, int>  $reparto
     */
    private function cuadra(Collection $idsCodigos, Collection $reparto, int $stockAlmacen): bool
    {
        return (int) $reparto->only($idsCodigos->all())->sum() === $stockAlmacen;
    }
}
