<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class PlantillaProductoExport implements FromArray, WithEvents, WithTitle
{
    private const MAX_ROWS = 500;

    // Filas de ejemplo (se cuentan desde la fila 2, después del encabezado)
    private const EXAMPLE_ROWS = [
        ['Cable HDMI 2.0',       'Cables y Conectores', 'Anker',    'A8740',      '2 metros', 'Negro',  45.00,  10, '7501234567890'],
        ['Mouse Inalámbrico',    'Periféricos',          'Logitech', 'M185',       '',         'Gris',  125.50,  5, ''],
        ['Teclado Mecánico USB', 'Periféricos',          'Redragon', 'K552',       '',         '',       89.99,  3, '7891234500001'],
        ['Memoria USB 32GB',     'Almacenamiento',       'Kingston', 'DT50',       '32GB',     'Azul',   55.00, 15, ''],
        ['Disco Duro Externo',   'Almacenamiento',       'Seagate',  'Backup Plus','1TB',      '',      350.00,  2, '7501098765432'],
    ];

    public function array(): array
    {
        $rows = [
            [
                'nombre_producto',
                'categoria',
                'marca',
                'modelo',
                'capacidad',
                'color',
                'precio_compra',
                'cantidad',
                'codigo_barras',
            ],
        ];

        foreach (self::EXAMPLE_ROWS as $example) {
            $rows[] = $example;
        }

        return $rows;
    }

    public function title(): string
    {
        return 'Productos';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet    = $event->sheet->getDelegate();
                $maxRow   = self::MAX_ROWS + 1;
                $examples = count(self::EXAMPLE_ROWS);

                // ── Estilos de cabecera ───────────────────────────────────────
                $requiredStyle = [
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'C0392B']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '999999']]],
                ];
                $optionalStyle = [
                    'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2980B9']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '999999']]],
                ];

                $sheet->getStyle('A1')->applyFromArray($requiredStyle);
                $sheet->getStyle('G1')->applyFromArray($requiredStyle);
                foreach (['B1', 'C1', 'D1', 'E1', 'F1', 'H1', 'I1'] as $cell) {
                    $sheet->getStyle($cell)->applyFromArray($optionalStyle);
                }

                // ── Filas de ejemplo: fondo verde claro ──────────────────────
                $lastExampleRow = 1 + $examples;
                $sheet->getStyle("A2:I{$lastExampleRow}")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F5E9']],
                    'font' => ['italic' => true, 'color' => ['rgb' => '2D6A4F']],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['rgb' => 'A5D6A7']],
                    ],
                ]);

                // ── Formatos de columna ───────────────────────────────────────
                // precio_compra: número con decimales (columna G tras insertar color)
                $sheet->getStyle("G2:G{$maxRow}")
                    ->getNumberFormat()->setFormatCode('#,##0.00');

                // cantidad: entero
                $sheet->getStyle("H2:H{$maxRow}")
                    ->getNumberFormat()->setFormatCode('0');

                // codigo_barras: texto puro (evita notación científica)
                $sheet->getStyle("I2:I{$maxRow}")
                    ->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);

                // ── Anchos de columna ─────────────────────────────────────────
                $sheet->getColumnDimension('A')->setWidth(32);
                $sheet->getColumnDimension('B')->setWidth(24);
                $sheet->getColumnDimension('C')->setWidth(18);
                $sheet->getColumnDimension('D')->setWidth(18);
                $sheet->getColumnDimension('E')->setWidth(16);
                $sheet->getColumnDimension('F')->setWidth(16); // color
                $sheet->getColumnDimension('G')->setWidth(16); // precio_compra
                $sheet->getColumnDimension('H')->setWidth(12); // cantidad
                $sheet->getColumnDimension('I')->setWidth(24); // codigo_barras

                $sheet->getRowDimension(1)->setRowHeight(28);

                // ── Congelar cabecera ─────────────────────────────────────────
                $sheet->freezePane('A2');

                // ── Borde sutil en el área de datos vacía ────────────────────
                $dataStart = $lastExampleRow + 1;
                if ($dataStart <= $maxRow) {
                    $sheet->getStyle("A{$dataStart}:I{$maxRow}")->applyFromArray([
                        'borders' => [
                            'allBorders' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['rgb' => 'DDDDDD']],
                        ],
                    ]);
                }

                // ── Comentarios/tooltips en cabeceras ────────────────────────
                $comentarios = [
                    'A1' => "OBLIGATORIO\nNombre del producto.\nEjemplo: Cable HDMI 2.0",
                    'B1' => "Opcional\nCategoría. Si se deja vacío\nse asigna 'Sin Categoría'.\nEjemplo: Cables y Conectores",
                    'C1' => "Opcional\nMarca del producto.\nEjemplo: Anker, Samsung",
                    'D1' => "Opcional\nModelo del producto.\nEjemplo: A8740",
                    'E1' => "Opcional\nCapacidad o especificación.\nEjemplo: 256GB, 2 metros",
                    'F1' => "Opcional\nColor del producto.\nEjemplo: Negro, Rojo, Azul",
                    'G1' => "OBLIGATORIO\nPrecio de compra (solo números).\nEjemplo: 45.00 o 125.50\nNo usar símbolos como \$ o Q.",
                    'H1' => "Opcional\nCantidad en inventario.\nSi se deja vacío se asigna 0.\nEjemplo: 10",
                    'I1' => "Opcional\nCódigo de barras.\nEjemplo: 7501234567890",
                ];

                foreach ($comentarios as $celda => $texto) {
                    $comment = $sheet->getComment($celda);
                    $comment->getText()->createTextRun($texto);
                    $comment->setWidth('180pt');
                    $comment->setHeight('90pt');
                }
            },
        ];
    }
}
