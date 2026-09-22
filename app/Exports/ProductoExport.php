<?php

namespace App\Exports;

use App\Models\Producto;
use App\Services\ValorInventarioService;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProductoExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    private $almacenId;

    /**
     * Costo real por lote de cada producto en este almacén (clave "producto_id-almacen_id"),
     * cargado una sola vez para todo el export (ver ValorInventarioService).
     *
     * @var array<string, array{costo: float, valor: float}>|null
     */
    private ?array $costosReales = null;

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
            'Color',
            'Código de Barras',
            'Categoría',
            'Costo Unitario',
            'Cantidad en Almacén',
            'Valor Total',
            '¿Stock Bajo?',
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

        // Costo real por lote en este almacén (incluye prorrateos); sin lotes, cae al costo de la ficha.
        $this->costosReales ??= app(ValorInventarioService::class)->costosPorProductoAlmacen((int) $this->almacenId);
        $costoReal = $this->costosReales[$producto->id.'-'.$this->almacenId] ?? null;
        $costoUnitario = $costoReal['costo'] ?? (float) $producto->precio_compra_producto;
        $valorTotal = $costoReal['valor'] ?? $costoUnitario * $cantidadAlmacen;

        // Determinar si tiene stock bajo (menos de 3 unidades)
        $stockBajo = $cantidadAlmacen < 3 ? 'SÍ' : 'NO';

        return [
            $producto->id,
            $producto->nombre_producto,
            $producto->marca_producto ?? '',
            $producto->modelo_producto ?? '',
            $producto->capacidad_producto ?? '',
            $producto->color_producto ?? '',
            $producto->codigo_producto ?? '',
            $producto->categoria->nombre_categoria ?? 'Sin categoría',
            number_format($costoUnitario, 2, '.', ''),
            $cantidadAlmacen,
            number_format($valorTotal, 2, '.', ''),
            $stockBajo,
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
