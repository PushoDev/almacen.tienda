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
        return Producto::with(['categoria', 'almacenes'])->get();
    }

    public function headings(): array
    {
        return [
            'ID',
            'Nombre del Producto',
            'Marca',
            'Modelo',
            'Capacidad',
            'Código de Barras',
            'Categoría',
            'Precio de Compra',
            'Stock Total', // Cambiado de "Cantidad en Almacén" a "Stock Total"
            '¿Stock Bajo?'
        ];
    }

    public function map($producto): array
    {
        return [
            $producto->id,
            $producto->nombre_producto,
            $producto->marca_producto,
            $producto->modelo_producto,
            $producto->capacidad_producto,
            $producto->codigo_producto,
            $producto->categoria->nombre_categoria ?? 'Sin categoría',
            $producto->precio_compra_producto,
            $producto->cantidad_total, // Usamos el atributo calculado cantidad_total
            $producto->stock_bajo ? 'SÍ' : 'NO'
        ];
    }
}
