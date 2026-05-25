<?php

namespace App\Exports;

use App\Models\Almacen;
use App\Models\Producto;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Protection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class PreciosVendedorExport implements
    FromCollection,
    WithHeadings,
    WithStyles,
    WithEvents
{
    public function __construct(
        private int $almacenId,
        private int $userId,
        private string $userRole
    ) {}

    public function collection()
    {
        $saveUserId = in_array($this->userRole, ['admin', 'moderador']) ? 1 : $this->userId;

        $productos = DB::table('almacen_producto')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->leftJoin('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->leftJoin('producto_vendedors', function ($join) use ($saveUserId) {
                $join->on('productos.id', '=', 'producto_vendedors.producto_id')
                    ->on('almacen_producto.almacen_id', '=', 'producto_vendedors.almacen_id')
                    ->where('producto_vendedors.user_id', $saveUserId);
            })
            ->where('almacen_producto.almacen_id', $this->almacenId)
            ->where('almacen_producto.cantidad', '>', 0)
            ->select(
                'productos.id as producto_id',
                'productos.nombre_producto',
                'categorias.nombre_categoria',
                'almacen_producto.cantidad as stock',
                'producto_vendedors.precio_venta',
                'producto_vendedors.comision'
            )
            ->orderBy('productos.nombre_producto')
            ->get()
            ->map(fn($row) => [
                $row->producto_id,
                $row->nombre_producto,
                $row->nombre_categoria ?? 'Sin categoría',
                (int) $row->stock,
                $row->precio_venta !== null ? (float) $row->precio_venta : null,
                $row->comision !== null ? (float) $row->comision : null,
            ]);

        return $productos;
    }

    public function headings(): array
    {
        return ['ID', 'Producto', 'Categoría', 'Stock', 'Precio Venta', 'Comisión'];
    }

    public function styles(Worksheet $sheet)
    {
        return [];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $lastRow = $sheet->getHighestRow();

                // --- Fila de encabezado ---
                $headerStyle = [
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1e40af']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '93c5fd']]],
                ];
                $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);
                $sheet->getRowDimension(1)->setRowHeight(24);

                // --- Columnas protegidas (ID, Producto, Categoría, Stock) ---
                $protectedStyle = [
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'f1f5f9']],
                    'font' => ['color' => ['rgb' => '64748b']],
                    'protection' => ['locked' => true],
                ];

                if ($lastRow > 1) {
                    $sheet->getStyle("A2:D{$lastRow}")->applyFromArray($protectedStyle);

                    // Stock: alineado al centro con formato entero
                    $sheet->getStyle("D2:D{$lastRow}")->applyFromArray([
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'numberFormat' => ['formatCode' => '#,##0'],
                    ]);

                    // Columnas editables (Precio Venta, Comisión) en amarillo suave
                    $editableStyle = [
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fefce8']],
                        'font' => ['color' => ['rgb' => '1e293b']],
                        'protection' => ['locked' => false],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
                        'numberFormat' => ['formatCode' => '#,##0.00'],
                    ];
                    $sheet->getStyle("E2:F{$lastRow}")->applyFromArray($editableStyle);

                    // Bordes para todas las filas de datos
                    $sheet->getStyle("A2:F{$lastRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'e2e8f0']]],
                    ]);

                    // Alinear ID al centro
                    $sheet->getStyle("A2:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                }

                // --- Anchos de columna ---
                $sheet->getColumnDimension('A')->setWidth(8);   // ID
                $sheet->getColumnDimension('B')->setWidth(35);  // Producto
                $sheet->getColumnDimension('C')->setWidth(20);  // Categoría
                $sheet->getColumnDimension('D')->setWidth(10);  // Stock
                $sheet->getColumnDimension('E')->setWidth(16);  // Precio Venta
                $sheet->getColumnDimension('F')->setWidth(14);  // Comisión

                // --- Proteger la hoja: solo E y F editables ---
                $sheet->getProtection()->setSheet(true);
                $sheet->getProtection()->setPassword('almacen_precios');

                // Encabezado también bloqueado
                $sheet->getStyle('A1:F1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);

                // Nota de ayuda en la celda G1
                $sheet->setCellValue('G1', '⚠ Solo edite Precio Venta (E) y Comisión (F). Deje en blanco para no modificar.');
                $sheet->getStyle('G1')->applyFromArray([
                    'font' => ['italic' => true, 'color' => ['rgb' => 'dc2626'], 'size' => 9],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fef2f2']],
                ]);
                $sheet->getColumnDimension('G')->setWidth(65);

                // Almacen ID en celda oculta para referencia
                $sheet->setCellValue('H1', $this->almacenId);
                $sheet->getColumnDimension('H')->setVisible(false);
                $sheet->getStyle('H1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);
            },
        ];
    }
}
