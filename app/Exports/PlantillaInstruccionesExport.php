<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Hoja "Instrucciones" de la plantilla de importación: cómo llenar la hoja "Productos", qué pasa
 * al importar y un ejemplo ya lleno. Va DESPUÉS de "Productos": el importador lee la primera hoja.
 */
class PlantillaInstruccionesExport implements FromArray, WithEvents, WithTitle
{
    private const VERDE = '217346';

    /** @var list<list<string|int|float>> */
    private array $filas = [];

    /** @var array<int, string> fila de la hoja => tipo de estilo (titulo|seccion|encabezado|ejemplo) */
    private array $estilos = [];

    public function array(): array
    {
        $this->filas = [];
        $this->estilos = [];

        $this->agregar(['Cómo llenar la plantilla de importación de productos'], 'titulo');
        $this->agregar(['Llena la hoja "Productos" (la primera pestaña), una fila por producto. Nada se guarda en el inventario hasta que revises y confirmes en el sistema.']);
        $this->agregar(['']);

        $this->agregar(['1. Pasos'], 'seccion');
        $this->agregar(['1) Llena la hoja "Productos" desde la fila 2 y NO cambies los nombres de las columnas de la fila 1.']);
        $this->agregar(['2) En el sistema: Productos → Importar → elige el almacén y sube el archivo.']);
        $this->agregar(['3) Se abre una hoja de revisión: corrige lo que haga falta (puedes editar, agregar y borrar filas) y confirma.']);
        $this->agregar(['4) Si algo salió mal, puedes deshacer la importación desde el historial mientras nada se haya vendido ni movido.']);
        $this->agregar(['']);

        $this->agregar(['2. Columnas'], 'seccion');
        $this->agregar(['Columna', '¿Obligatoria?', 'Qué escribir', 'Ejemplo'], 'encabezado');
        $this->agregar(['nombre_producto', 'SÍ', 'Nombre del producto. Sin nombre, la fila se omite.', 'Cable HDMI 2.0']);
        $this->agregar(['categoria', 'No', 'Categoría. Vacía = "Sin Categoría". Máximo 20 caracteres.', 'Cables y Conectores']);
        $this->agregar(['marca', 'No', 'Marca del producto.', 'Anker']);
        $this->agregar(['modelo', 'No', 'Modelo del producto.', 'A8740']);
        $this->agregar(['capacidad', 'No', 'Capacidad o especificación.', '2 metros']);
        $this->agregar(['color', 'No', 'Color del producto.', 'Negro']);
        $this->agregar(['precio_compra', 'SÍ, si hay cantidad', 'Costo de compra de UNA unidad, solo el número (45.00 o 45,00). No puede ser negativo. Si la cantidad es 0 puede ir vacío.', '45.00']);
        $this->agregar(['cantidad', 'No', 'Unidades que entran a este almacén. 0 o vacío = el producto solo se registra, sin stock. No puede ser negativa.', '10']);
        $this->agregar(['codigo_barras', 'No', 'Código de barras. Vacío = el sistema genera uno.', '7501234567890']);
        $this->agregar(['']);

        $this->agregar(['3. Qué pasa al importar'], 'seccion');
        $this->agregar(['• Cada fila con cantidad crea un LOTE NUEVO en el almacén elegido, con el precio_compra de esa fila (aunque el producto ya exista con el mismo costo).']);
        $this->agregar(['• Si el producto ya existe (mismo nombre, marca, modelo, capacidad y color), se suma su stock y NO cambia su costo.']);
        $this->agregar(['• Las filas con cantidad 0 o vacía dejan el producto registrado sin stock: sirven de historial de lo que has tenido para volver a comprar.']);
        $this->agregar(['• Importar nunca resta stock. Las filas completamente vacías se ignoran.']);
        $this->agregar(['• Los productos nuevos no tienen precio de venta todavía: asígnalo en Precios de Venta para que aparezcan en el POS.']);
        $this->agregar(['• Si subes el mismo archivo otra vez al mismo almacén, el sistema te avisa antes de duplicar el stock.']);
        $this->agregar(['• Límites: archivo Excel (.xlsx o .xls) de hasta 5 MB y 20 000 filas.']);
        $this->agregar(['']);

        $this->agregar(['4. Ejemplo (así se ve la hoja "Productos" ya llena; no lo copies tal cual)'], 'seccion');
        $this->agregar(['nombre_producto', 'categoria', 'marca', 'modelo', 'capacidad', 'color', 'precio_compra', 'cantidad', 'codigo_barras'], 'encabezado');
        foreach (PlantillaProductoExport::EJEMPLOS as $ejemplo) {
            $this->agregar($ejemplo, 'ejemplo');
        }
        $this->agregar(['Última fila del ejemplo: cantidad 0 → se registra el producto sin stock.']);

        return $this->filas;
    }

    public function title(): string
    {
        return 'Instrucciones';
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                $sheet->setShowGridlines(false);
                $sheet->getTabColor()->setRGB(self::VERDE);

                foreach (['A' => 30, 'B' => 22, 'C' => 60, 'D' => 26, 'E' => 16, 'F' => 14, 'G' => 16, 'H' => 12, 'I' => 22] as $columna => $ancho) {
                    $sheet->getColumnDimension($columna)->setWidth($ancho);
                }

                foreach ($this->estilos as $fila => $tipo) {
                    $rango = "A{$fila}:I{$fila}";
                    match ($tipo) {
                        'titulo' => $this->estiloTitulo($sheet, $fila),
                        'seccion' => $sheet->getStyle($rango)->applyFromArray([
                            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => self::VERDE]],
                            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => self::VERDE]]],
                        ]),
                        'encabezado' => $sheet->getStyle($rango)->applyFromArray([
                            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::VERDE]],
                            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        ]),
                        'ejemplo' => $sheet->getStyle($rango)->applyFromArray([
                            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8F5E9']],
                            'font' => ['italic' => true, 'color' => ['rgb' => '2D6A4F']],
                            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['rgb' => 'A5D6A7']]],
                        ]),
                        default => null,
                    };
                }

                // La tabla de columnas: el "qué escribir" (col. C) se ajusta al ancho de la celda.
                $sheet->getStyle('C1:C'.count($this->filas))->getAlignment()->setWrapText(true)->setVertical(Alignment::VERTICAL_TOP);
                $sheet->getStyle('A1:I'.count($this->filas))->getAlignment()->setVertical(Alignment::VERTICAL_TOP);
                // Código de barras del ejemplo como texto (evita notación científica)
                $sheet->getStyle('I1:I'.count($this->filas))->getNumberFormat()->setFormatCode(NumberFormat::FORMAT_TEXT);
            },
        ];
    }

    /**
     * @param  list<string|int|float>  $fila
     */
    private function agregar(array $fila, ?string $estilo = null): void
    {
        $this->filas[] = $fila;
        if ($estilo !== null) {
            $this->estilos[count($this->filas)] = $estilo;
        }
    }

    private function estiloTitulo(Worksheet $sheet, int $fila): void
    {
        $sheet->getStyle("A{$fila}:I{$fila}")->applyFromArray([
            'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::VERDE]],
        ]);
        $sheet->getRowDimension($fila)->setRowHeight(26);
    }
}
