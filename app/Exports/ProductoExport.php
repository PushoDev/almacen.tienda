<?php

namespace App\Exports;

use App\Models\Producto;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ProductoExport implements FromCollection, WithHeadings, WithMapping
{
    private $almacenId;

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;
    }

    public function collection()
    {
        return Producto::with(['categoria', 'almacenes' => function ($query) {
            $query->where('almacen_id', $this->almacenId);
        }])->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nombre del Producto',
            'Marca',
            'Código',
            'Categoría',
            'Precio de Compra',
            'Cantidad en Almacén',
            'Imagen',
            'Stock Total',
            '¿Stock Bajo?'
        ];
    }

    public function map($producto): array
    {
        $cantidadEnAlmacen = 0;
        if ($producto->almacenes->isNotEmpty()) {
            $cantidadEnAlmacen = $producto->almacenes->first()->pivot->cantidad ?? 0;
        }

        return [
            $producto->id,
            $producto->nombre_producto,
            $producto->marca_producto,
            $producto->codigo_producto,
            $producto->categoria->nombre_categoria ?? 'Sin categoría',
            $producto->precio_compra_producto,
            $cantidadEnAlmacen,
            $producto->imagen_producto,
            $producto->cantidad_total,
            $producto->stock_bajo ? 'SÍ' : 'NO'
        ];
    }
}
