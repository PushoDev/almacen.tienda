<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

/**
 * Plantilla de importación de productos: la hoja "Productos" (la que se llena y se importa, DEBE
 * ir primero porque el importador lee la primera hoja) y la hoja "Instrucciones".
 */
class PlantillaProductoLibro implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new PlantillaProductoExport,
            new PlantillaInstruccionesExport,
        ];
    }
}
