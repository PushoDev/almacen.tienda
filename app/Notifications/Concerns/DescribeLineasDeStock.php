<?php

namespace App\Notifications\Concerns;

use App\Models\AlmacenProducto;
use App\Models\Producto;

/**
 * Cómo se cuentan los productos en los avisos de stock al vendedor: cada línea con su detalle (marca,
 * modelo, capacidad y color) y lo que hay AHORA en el almacén. Se calcula al enviar el aviso, cuando el
 * cambio de stock ya se hizo, así que `stock_actual` es cómo quedó el inventario.
 */
trait DescribeLineasDeStock
{
    /**
     * Junta las líneas del mismo producto y les agrega nombre, detalle (categoría, marca, modelo, capacidad
     * y color, los que existan) y stock actual del almacén.
     *
     * @param  iterable<int, array{producto_id: int, cantidad: int}>  $lineas
     * @return array<int, array{producto_id: int, nombre: string|null, detalle: string, cantidad: int, stock_actual: int}>
     */
    protected function detalleDeLineas(int $almacenId, iterable $lineas): array
    {
        $porProducto = collect($lineas)
            ->groupBy('producto_id')
            ->map(fn ($grupo) => (int) $grupo->sum('cantidad'));

        $productos = Producto::with('categoria:id,nombre_categoria')->whereIn('id', $porProducto->keys())->get()->keyBy('id');
        $stocks = AlmacenProducto::where('almacen_id', $almacenId)
            ->whereIn('producto_id', $porProducto->keys())
            ->pluck('cantidad', 'producto_id');

        return $porProducto->map(function (int $cantidad, int|string $productoId) use ($productos, $stocks): array {
            $producto = $productos->get($productoId);

            return [
                'producto_id' => (int) $productoId,
                'nombre' => $producto?->nombre_producto,
                'detalle' => collect([$producto?->categoria?->nombre_categoria, $producto?->marca_producto, $producto?->modelo_producto, $producto?->capacidad_producto, $producto?->color_producto])
                    ->filter(fn ($dato) => filled($dato) && strtoupper(trim((string) $dato)) !== 'N/A')
                    ->implode(' · '),
                'cantidad' => $cantidad,
                'stock_actual' => (int) ($stocks[$productoId] ?? 0),
            ];
        })->values()->all();
    }

    /**
     * "2 × Panel (Marca · Modelo · 2L), ahora hay 48" por cada producto, separados por punto y coma.
     *
     * @param  array<int, array{nombre: string|null, detalle: string, cantidad: int, stock_actual: int}>  $lineas
     */
    protected function textoDeLineas(array $lineas): string
    {
        return collect($lineas)
            ->map(fn (array $linea): string => "{$linea['cantidad']} × {$linea['nombre']}"
                .($linea['detalle'] !== '' ? " ({$linea['detalle']})" : '')
                .", ahora hay {$linea['stock_actual']}")
            ->implode('; ');
    }
}
