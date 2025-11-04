<?php

namespace App\Exports;

use App\Models\Producto;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductoExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    private $almacenId;

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;
    }

    /**
     * Obtiene la colección de productos filtrados por almacén
     */
    public function collection()
    {
        return Producto::with(['categoria', 'almacenes'])
            ->whereHas('almacenes', function ($query) {
                $query->where('almacen_id', $this->almacenId);
            })
            ->get();
    }

    /**
     * Define los encabezados del Excel
     */
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
            'Cantidad en Almacén',
            'Valor Total',
            '¿Stock Bajo?'
        ];
    }

    /**
     * Mapea cada fila de datos del producto
     */
    public function map($producto): array
    {
        // Obtener la cantidad específica del almacén
        $cantidadAlmacen = $producto->almacenes
            ->where('pivot.almacen_id', $this->almacenId)
            ->first()
            ?->pivot->cantidad ?? 0;

        $valorTotal = $producto->precio_compra_producto * $cantidadAlmacen;

        // Determinar si tiene stock bajo (menos de 3 unidades)
        $stockBajo = $cantidadAlmacen < 3 ? 'SÍ' : 'NO';

        return [
            $producto->id,
            $producto->nombre_producto,
            $producto->marca_producto ?? '',
            $producto->modelo_producto ?? '',
            $producto->capacidad_producto ?? '',
            $producto->codigo_producto ?? '',
            $producto->categoria->nombre_categoria ?? 'Sin categoría',
            number_format($producto->precio_compra_producto, 2, '.', ''),
            $cantidadAlmacen,
            number_format($valorTotal, 2, '.', ''),
            $stockBajo
        ];
    }

    /**
     * Estilos del Excel
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
            ],
        ];
    }
}
