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
                'producto_vendedors.precio_venta',
                'producto_vendedors.comision'
            )
            ->orderBy('productos.nombre_producto')
            ->get()
            ->map(fn($row) => [
                $row->producto_id,
                $row->nombre_producto,
                $row->nombre_categoria ?? 'Sin categoría',
                $row->precio_venta !== null ? (float) $row->precio_venta : null,
                $row->comision !== null ? (float) $row->comision : null,
            ]);

        return $productos;
    }

    public function headings(): array
    {
        return ['ID', 'Producto', 'Categoría', 'Precio Venta', 'Comisión'];
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
                $sheet->getStyle('A1:E1')->applyFromArray($headerStyle);
                $sheet->getRowDimension(1)->setRowHeight(24);

                // --- Columnas protegidas (ID, Producto, Categoría) ---
                $protectedStyle = [
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'f1f5f9']],
                    'font' => ['color' => ['rgb' => '64748b']],
                    'protection' => ['locked' => true],
                ];

                if ($lastRow > 1) {
                    $sheet->getStyle("A2:C{$lastRow}")->applyFromArray($protectedStyle);

                    // Columnas editables (Precio Venta, Comisión) en amarillo suave
                    $editableStyle = [
                        'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fefce8']],
                        'font' => ['color' => ['rgb' => '1e293b']],
                        'protection' => ['locked' => false],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
                        'numberFormat' => ['formatCode' => '#,##0.00'],
                    ];
                    $sheet->getStyle("D2:E{$lastRow}")->applyFromArray($editableStyle);

                    // Bordes para todas las filas de datos
                    $sheet->getStyle("A2:E{$lastRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'e2e8f0']]],
                    ]);

                    // Alinear ID al centro
                    $sheet->getStyle("A2:A{$lastRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                }

                // --- Anchos de columna ---
                $sheet->getColumnDimension('A')->setWidth(8);   // ID
                $sheet->getColumnDimension('B')->setWidth(35);  // Producto
                $sheet->getColumnDimension('C')->setWidth(20);  // Categoría
                $sheet->getColumnDimension('D')->setWidth(16);  // Precio Venta
                $sheet->getColumnDimension('E')->setWidth(14);  // Comisión

                // --- Ocultar columna A (ID) ---
                $sheet->getColumnDimension('A')->setVisible(false);

                // --- Proteger la hoja: solo D y E editables ---
                $sheet->getProtection()->setSheet(true);
                $sheet->getProtection()->setPassword('almacen_precios');

                // Encabezado también bloqueado
                $sheet->getStyle('A1:E1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);

                // Nota de ayuda en la celda F1
                $sheet->setCellValue('F1', '⚠ Solo edite Precio Venta (D) y Comisión (E). Deje en blanco para no modificar.');
                $sheet->getStyle('F1')->applyFromArray([
                    'font' => ['italic' => true, 'color' => ['rgb' => 'dc2626'], 'size' => 9],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'fef2f2']],
                ]);
                $sheet->getColumnDimension('F')->setWidth(60);

                // Almacen ID en una celda oculta para validación en el import
                $sheet->setCellValue('G1', $this->almacenId);
                $sheet->getColumnDimension('G')->setVisible(false);
                $sheet->getStyle('G1')->getProtection()->setLocked(Protection::PROTECTION_PROTECTED);
            },
        ];
    }
}
