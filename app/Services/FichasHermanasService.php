<?php

namespace App\Services;

use App\Models\Producto;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * "Fichas hermanas": el mismo producto físico registrado como 2+ fichas (`productos`) distintas
 * — mismo nombre, marca, modelo, capacidad y color. Pasa sobre todo por Compras (que entre el
 * 2026-09-18 y el 2026-09-20 creaba una ficha nueva por cada compra) y por la importación de
 * Excel. Cada ficha puede tener su propio costo por lote y su propio precio de venta por almacén.
 *
 * Único criterio de identidad para: la detección de duplicados de Productos, la fusión
 * (FusionProductosService) y el "precio del grupo" de /disponibles.
 */
class FichasHermanasService
{
    /**
     * Clave de identidad del producto: nombre|marca|modelo|capacidad|color normalizados
     * (minúsculas, espacios colapsados, sin las comillas/tildes sueltas que aparecen en la
     * capacidad del catálogo real, ej. 3.5´ / 3.5" / 3.5¨). Vacío y nulo cuentan igual.
     */
    public function clave(Producto $producto): string
    {
        $capacidad = str_replace(['´', '¨', '"'], '', (string) $producto->capacidad_producto);

        return collect([
            $producto->nombre_producto,
            $producto->marca_producto,
            $producto->modelo_producto,
            $capacidad,
            $producto->color_producto,
        ])
            ->map(fn ($valor) => mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string) $valor))))
            ->implode('|');
    }

    /**
     * Grupos de fichas hermanas de todo el catálogo (solo claves con 2+ fichas).
     *
     * @return Collection<string, Collection<int, Producto>> clave => fichas, ordenadas por id
     */
    public function grupos(): Collection
    {
        return Producto::whereNotNull('nombre_producto')
            ->orderBy('id')
            ->get()
            ->groupBy(fn (Producto $producto) => $this->clave($producto))
            ->filter(fn (Collection $fichas) => $fichas->count() > 1);
    }

    /**
     * Fichas hermanas de un producto (incluido él mismo), por id.
     *
     * @return Collection<int, Producto>
     */
    public function hermanasDe(Producto $producto): Collection
    {
        $clave = $this->clave($producto);

        // Prefiltro barato en SQL por nombre (LOWER/TRIM funciona igual en MySQL y SQLite); la
        // comparación exacta de la clave completa se hace en PHP.
        return Producto::whereRaw('LOWER(TRIM(nombre_producto)) = ?', [mb_strtolower(trim((string) $producto->nombre_producto))])
            ->orderBy('id')
            ->get()
            ->filter(fn (Producto $candidato) => $this->clave($candidato) === $clave)
            ->values();
    }

    /**
     * Fichas hermanas de un producto que tienen stock en un almacén (incluido él mismo si tiene).
     *
     * @return Collection<int, Producto>
     */
    public function hermanasConStockEnAlmacen(Producto $producto, int $almacenId): Collection
    {
        $hermanas = $this->hermanasDe($producto);

        $conStock = DB::table('almacen_producto')
            ->where('almacen_id', $almacenId)
            ->whereIn('producto_id', $hermanas->pluck('id'))
            ->where('cantidad', '>', 0)
            ->pluck('producto_id')
            ->all();

        return $hermanas->filter(fn (Producto $ficha) => in_array($ficha->id, $conStock))->values();
    }
}
