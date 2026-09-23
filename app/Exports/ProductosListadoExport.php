<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Excel del listado general de Productos: las mismas filas y cifras que la tabla de
 * `Productos/Index` (las arma `ProductoController::filaListado()`), sin paginar. Sirve para
 * comparar contra las fórmulas del cliente: el costo es el promedio ponderado real de
 * `lotes_stock` y el importe es costo × cantidad, igual que la tabla.
 *
 * Al final agrega el total de las filas exportadas y, para quien ve costos, el "Total General"
 * de la tarjeta "Valor Total" (inventario completo, sin filtros) — si no coinciden entre sí, esa
 * diferencia es justo lo que hay que revisar.
 */
class ProductosListadoExport implements FromArray, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithStyles
{
    /**
     * @param  array<int, array<string, mixed>>  $filas  filas ya armadas por `ProductoController::filaListado()`
     * @param  bool  $incluirCostos  false para quien no ve datos sensibles (sin Costo ni Importe)
     * @param  string|null  $almacenNombre  almacén filtrado, o null si el listado es de todos
     * @param  float|null  $totalGeneral  valor total del inventario completo; null si no se muestra
     */
    public function __construct(
        private array $filas,
        private bool $incluirCostos,
        private ?string $almacenNombre = null,
        private ?float $totalGeneral = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        $encabezados = ['ID', 'Nombre', 'Marca', 'Modelo', 'Capacidad', 'Color', 'Código', 'Categoría'];

        if ($this->incluirCostos) {
            $encabezados[] = $this->almacenNombre ? "Costo en {$this->almacenNombre}" : 'Costo (promedio)';
        }

        $encabezados[] = $this->almacenNombre ? "Cant. en {$this->almacenNombre}" : 'Cant (total)';

        if ($this->incluirCostos) {
            $encabezados[] = 'Importe';
        }

        $encabezados[] = '¿Stock bajo?';

        return $encabezados;
    }

    /**
     * @return array<int, array<int, mixed>>
     */
    public function array(): array
    {
        $cantidadTotal = 0;
        $importeTotal = 0.0;
        $datos = [];

        foreach ($this->filas as $fila) {
            $importe = $fila['precio_compra_producto'] * $fila['cantidad_total'];
            $cantidadTotal += $fila['cantidad_total'];
            $importeTotal += $importe;

            $datos[] = $this->armarFila(
                [
                    $fila['id'],
                    $fila['nombre_producto'],
                    $fila['marca_producto'] ?? '',
                    $fila['modelo_producto'] ?? '',
                    $fila['capacidad_producto'] ?? '',
                    $fila['color_producto'] ?? '',
                    $fila['codigo_producto'] ?? '',
                    $fila['categoria'] ?? 'Sin categoría',
                ],
                $fila['precio_compra_producto'],
                $fila['cantidad_total'],
                $importe,
                $fila['stock_bajo'] ? 'SÍ' : 'NO',
            );
        }

        $datos[] = $this->armarFila(
            ['', 'TOTAL DE LAS '.count($this->filas).' FILAS EXPORTADAS', '', '', '', '', '', ''],
            null,
            $cantidadTotal,
            $importeTotal,
            '',
        );

        if ($this->incluirCostos && $this->totalGeneral !== null) {
            $datos[] = $this->armarFila(
                ['', 'TOTAL GENERAL DEL INVENTARIO COMPLETO (sin filtros, igual a la tarjeta "Valor Total")', '', '', '', '', '', ''],
                null,
                null,
                $this->totalGeneral,
                '',
            );
        }

        return $datos;
    }

    /**
     * Columnas monetarias con separador de miles y 2 decimales (siguen siendo números, se pueden sumar).
     *
     * @return array<string, string>
     */
    public function columnFormats(): array
    {
        return $this->incluirCostos
            ? ['I' => '#,##0.00', 'J' => '#,##0', 'K' => '#,##0.00']
            : ['I' => '#,##0'];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function styles(Worksheet $sheet): array
    {
        $sheet->freezePane('A2');

        $primeraFilaTotales = count($this->filas) + 2;
        $ultimaFilaTotales = $primeraFilaTotales + ($this->incluirCostos && $this->totalGeneral !== null ? 1 : 0);
        $estilos = [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => '0F766E']],
                'alignment' => ['horizontal' => 'center', 'vertical' => 'center'],
            ],
        ];

        foreach (range($primeraFilaTotales, $ultimaFilaTotales) as $fila) {
            $estilos[$fila] = [
                'font' => ['bold' => true],
                'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'E2E8F0']],
            ];
        }

        return $estilos;
    }

    /**
     * Completa una fila con las columnas variables según el rol: Costo e Importe solo si se incluyen costos.
     *
     * @param  array<int, mixed>  $base  las 8 columnas de identificación (ID … Categoría)
     * @return array<int, mixed>
     */
    private function armarFila(array $base, ?float $costo, ?int $cantidad, float $importe, string $stockBajo): array
    {
        $fila = $base;

        if ($this->incluirCostos) {
            $fila[] = $costo;
        }

        $fila[] = $cantidad;

        if ($this->incluirCostos) {
            $fila[] = $importe;
        }

        $fila[] = $stockBajo;

        return $fila;
    }
}
