<?php

namespace App\Services;

use App\Models\PrecioHistorial;
use App\Models\Producto;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Fusión de fichas hermanas (ver FichasHermanasService) en una sola ficha.
 *
 * Antes (hasta 2026-09-22) la fusión sumaba stock y borraba las demás fichas con
 * `$producto->delete()` — y como las 13 tablas que apuntan a `productos` tienen ON DELETE
 * CASCADE, eso borraba también sus líneas de venta, de compra, lotes (con su costo real),
 * líneas de movimiento, precios de venta e historiales. Ahora todo eso se REASIGNA a la ficha
 * conservada y solo se borra la ficha vacía al final: el historial queda intacto y cada lote
 * mantiene su propio costo.
 */
class FusionProductosService
{
    /**
     * Tablas cuyo historial se reasigna tal cual a la ficha conservada => columna del producto.
     *
     * @var array<string, string>
     */
    private const TABLAS_REASIGNABLES = [
        'venta_detalles' => 'producto_id',
        'compra_producto' => 'producto_id',
        'lotes_stock' => 'producto_id',
        'movimiento_detalles' => 'producto_id',
        'movimientos_pendientes' => 'producto_id',
        'historial_precio_costos' => 'producto_id',
        'historial_stock' => 'producto_id',
        'precio_historials' => 'producto_id',
        'cost_distribution_items' => 'product_id',
        'costo_historials' => 'product_id',
    ];

    public function __construct(private FichasHermanasService $fichasHermanas) {}

    /**
     * Almacenes donde las fichas tienen precios de venta distintos entre sí (precio o comisión)
     * — ahí la fusión necesita que alguien elija con qué precio queda la ficha resultante.
     * Por cada almacén: el precio de cada ficha y un promedio ponderado por stock sugerido.
     *
     * @param  Collection<int, Producto>  $fichas
     * @return array<int, array{almacen_id: int, nombre_almacen: string, precios: array<int, array{producto_id: int, precio_venta: float, comision: float, stock: int}>, promedio_ponderado: float}>
     */
    public function conflictosDePrecio(Collection $fichas): array
    {
        return DB::table('producto_vendedors as pv')
            ->join('almacens as a', 'a.id', '=', 'pv.almacen_id')
            ->leftJoin('almacen_producto as ap', function ($join) {
                $join->on('ap.producto_id', '=', 'pv.producto_id')->on('ap.almacen_id', '=', 'pv.almacen_id');
            })
            ->whereIn('pv.producto_id', $fichas->pluck('id'))
            ->where('pv.precio_venta', '>', 0)
            ->select('pv.almacen_id', 'a.nombre_almacen', 'pv.producto_id', 'pv.precio_venta', 'pv.comision', 'ap.cantidad')
            ->orderBy('pv.almacen_id')
            ->orderBy('pv.producto_id')
            ->get()
            ->groupBy('almacen_id')
            ->filter(fn (Collection $filas) => $filas->map(fn ($f) => $this->firmaPrecio($f))->unique()->count() > 1)
            ->map(function (Collection $filas, $almacenId) {
                $stockTotal = $filas->sum(fn ($f) => (int) $f->cantidad);
                $promedio = $stockTotal > 0
                    ? $filas->sum(fn ($f) => (float) $f->precio_venta * (int) $f->cantidad) / $stockTotal
                    : $filas->avg(fn ($f) => (float) $f->precio_venta);

                return [
                    'almacen_id' => (int) $almacenId,
                    'nombre_almacen' => $filas->first()->nombre_almacen,
                    'precios' => $filas->map(fn ($f) => [
                        'producto_id' => (int) $f->producto_id,
                        'precio_venta' => round((float) $f->precio_venta, 2),
                        'comision' => round((float) $f->comision, 2),
                        'stock' => (int) $f->cantidad,
                    ])->values()->all(),
                    'promedio_ponderado' => round($promedio, 2),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Fusiona `$eliminar` dentro de `$conservar`.
     *
     * @param  Collection<int, Producto>  $eliminar
     * @param  array<int, array{precio_venta: float, comision?: float|null}>  $preciosPorAlmacen  almacen_id => precio elegido; obligatorio para cada almacén de conflictosDePrecio()
     * @return array{producto_id: int, fichas_fusionadas: int, cantidad_total: int, registros_reasignados: array<string, int>}
     *
     * @throws ValidationException si las fichas no son hermanas o falta resolver algún precio
     */
    public function fusionar(Producto $conservar, Collection $eliminar, array $preciosPorAlmacen, User $user): array
    {
        $clave = $this->fichasHermanas->clave($conservar);
        $ajenas = $eliminar->reject(fn (Producto $p) => $this->fichasHermanas->clave($p) === $clave);
        if ($ajenas->isNotEmpty()) {
            throw ValidationException::withMessages([
                'productos_eliminar_ids' => 'Solo se pueden fusionar fichas del mismo producto (nombre, marca, modelo, capacidad y color). No coinciden: #'.$ajenas->pluck('id')->implode(', #').'.',
            ]);
        }

        $todas = collect([$conservar])->merge($eliminar)->values();
        $sinResolver = collect($this->conflictosDePrecio($todas))
            ->reject(fn ($conflicto) => isset($preciosPorAlmacen[$conflicto['almacen_id']]));
        if ($sinResolver->isNotEmpty()) {
            throw ValidationException::withMessages([
                'precios_por_almacen' => 'Las fichas tienen precios de venta distintos en: '.$sinResolver->pluck('nombre_almacen')->implode(', ').'. Elige con qué precio queda cada uno.',
            ]);
        }

        $eliminarIds = $eliminar->pluck('id')->all();

        return DB::transaction(function () use ($conservar, $eliminarIds, $todas, $preciosPorAlmacen, $user) {
            $this->fusionarStock($conservar->id, $eliminarIds);

            $reasignados = [];
            foreach (self::TABLAS_REASIGNABLES as $tabla => $columna) {
                $reasignados[$tabla] = DB::table($tabla)->whereIn($columna, $eliminarIds)->update([$columna => $conservar->id]);
            }

            $this->fusionarCodigos($conservar->id, $eliminarIds);

            // Después de mover los lotes: el costo real del almacén ya incluye los de las fichas eliminadas.
            $conservar->refresh();
            $this->fusionarPrecios($conservar, $eliminarIds, $todas, $preciosPorAlmacen, $user);

            Producto::whereIn('id', $eliminarIds)->get()->each->delete();

            return [
                'producto_id' => $conservar->id,
                'fichas_fusionadas' => count($eliminarIds),
                'cantidad_total' => (int) DB::table('almacen_producto')->where('producto_id', $conservar->id)->sum('cantidad'),
                'registros_reasignados' => $reasignados,
            ];
        });
    }

    /**
     * Suma el stock (y lo que está en tránsito) de cada almacén en la fila de la ficha conservada.
     *
     * @param  array<int, int>  $eliminarIds
     */
    private function fusionarStock(int $conservarId, array $eliminarIds): void
    {
        $filas = DB::table('almacen_producto')->whereIn('producto_id', $eliminarIds)->get();

        foreach ($filas->groupBy('almacen_id') as $almacenId => $filasAlmacen) {
            $cantidad = (int) $filasAlmacen->sum('cantidad');
            $enTransito = (int) $filasAlmacen->sum('cantidad_en_transito');
            $existente = DB::table('almacen_producto')->where('producto_id', $conservarId)->where('almacen_id', $almacenId)->first();

            if ($existente) {
                DB::table('almacen_producto')->where('id', $existente->id)->update([
                    'cantidad' => (int) $existente->cantidad + $cantidad,
                    'cantidad_en_transito' => (int) $existente->cantidad_en_transito + $enTransito,
                    'updated_at' => now(),
                ]);
            } else {
                DB::table('almacen_producto')->insert([
                    'producto_id' => $conservarId,
                    'almacen_id' => $almacenId,
                    'cantidad' => $cantidad,
                    'cantidad_en_transito' => $enTransito,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        DB::table('almacen_producto')->whereIn('producto_id', $eliminarIds)->delete();
    }

    /**
     * Pasa los códigos de barras a la ficha conservada. Si un código ya existe ahí, las líneas
     * de venta que lo usaban pasan a apuntar al código equivalente antes de borrar el repetido.
     *
     * @param  array<int, int>  $eliminarIds
     */
    private function fusionarCodigos(int $conservarId, array $eliminarIds): void
    {
        $existentes = DB::table('producto_codigos')->where('producto_id', $conservarId)->pluck('id', 'codigo_barras');
        $conservarTieneDefault = DB::table('producto_codigos')->where('producto_id', $conservarId)->where('es_default', true)->exists();

        foreach (DB::table('producto_codigos')->whereIn('producto_id', $eliminarIds)->orderBy('id')->get() as $codigo) {
            if (isset($existentes[$codigo->codigo_barras])) {
                DB::table('venta_detalles')->where('producto_codigo_id', $codigo->id)->update(['producto_codigo_id' => $existentes[$codigo->codigo_barras]]);
                DB::table('producto_codigos')->where('id', $codigo->id)->delete();

                continue;
            }

            DB::table('producto_codigos')->where('id', $codigo->id)->update([
                'producto_id' => $conservarId,
                'es_default' => $conservarTieneDefault ? false : $codigo->es_default,
            ]);
            $existentes[$codigo->codigo_barras] = $codigo->id;
            $conservarTieneDefault = $conservarTieneDefault || $codigo->es_default;
        }
    }

    /**
     * Deja una sola fila de precio de venta por almacén, en la ficha conservada: el precio
     * elegido donde había conflicto, o el único precio existente donde todas coincidían.
     *
     * @param  array<int, int>  $eliminarIds
     * @param  Collection<int, Producto>  $todas
     * @param  array<int, array{precio_venta: float, comision?: float|null}>  $preciosPorAlmacen
     */
    private function fusionarPrecios(Producto $conservar, array $eliminarIds, Collection $todas, array $preciosPorAlmacen, User $user): void
    {
        $filas = DB::table('producto_vendedors')->whereIn('producto_id', $todas->pluck('id'))->get();
        $idsFusionados = '#'.$todas->pluck('id')->implode(', #');

        foreach ($filas->groupBy('almacen_id') as $almacenId => $filasAlmacen) {
            $actual = $filasAlmacen->firstWhere('producto_id', $conservar->id);
            $conPrecio = $filasAlmacen->filter(fn ($f) => (float) $f->precio_venta > 0);
            $referencia = $actual && (float) $actual->precio_venta > 0 ? $actual : $conPrecio->first();

            if (isset($preciosPorAlmacen[$almacenId])) {
                $precio = round((float) $preciosPorAlmacen[$almacenId]['precio_venta'], 2);
                $comision = round((float) ($preciosPorAlmacen[$almacenId]['comision'] ?? $referencia?->comision ?? 0), 2);
            } elseif ($referencia) {
                $precio = round((float) $referencia->precio_venta, 2);
                $comision = round((float) $referencia->comision, 2);
            } else {
                // Ninguna ficha tenía precio en este almacén: si la conservada tenía fila, se queda como está.
                DB::table('producto_vendedors')->whereIn('producto_id', $eliminarIds)->where('almacen_id', $almacenId)->delete();

                continue;
            }

            $precioAnterior = $actual?->precio_venta !== null ? round((float) $actual->precio_venta, 2) : null;
            $cambio = $precioAnterior !== $precio;

            DB::table('producto_vendedors')->whereIn('producto_id', $eliminarIds)->where('almacen_id', $almacenId)->delete();
            DB::table('producto_vendedors')->updateOrInsert(
                ['producto_id' => $conservar->id, 'almacen_id' => $almacenId],
                [
                    'precio_venta' => $precio,
                    'comision' => $comision,
                    'venta_ganancia' => round($precio - $conservar->costoEnAlmacen((int) $almacenId), 2),
                    'precio_de_grupo' => false,
                    'puesto_por_user_id' => $cambio ? $user->id : ($actual->puesto_por_user_id ?? $referencia->puesto_por_user_id),
                    'updated_at' => now(),
                ]
            );

            if ($cambio) {
                PrecioHistorial::create([
                    'producto_id' => $conservar->id,
                    'user_id' => $user->id,
                    'almacen_id' => $almacenId,
                    'precio_anterior' => $precioAnterior,
                    'precio_nuevo' => $precio,
                    'comision' => $comision,
                    'accion' => "Fusión de productos ({$idsFusionados}) - Almacén ID {$almacenId}",
                ]);
            }
        }
    }

    /**
     * Precio + comisión de una fila, para comparar si dos fichas venden igual.
     */
    private function firmaPrecio(object $fila): string
    {
        return number_format((float) $fila->precio_venta, 2, '.', '').'|'.number_format((float) $fila->comision, 2, '.', '');
    }
}
