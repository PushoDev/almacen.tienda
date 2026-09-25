<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Lee un Excel de productos SIN guardar nada, solo para armar el borrador que el usuario revisa
 * y edita antes de importar. Las columnas son las mismas de ProductoImport / de la plantilla.
 */
class ProductoBorradorLector implements WithHeadingRow
{
    /** @var list<string> */
    public const COLUMNAS = [
        'nombre_producto',
        'categoria',
        'marca',
        'modelo',
        'capacidad',
        'color',
        'precio_compra',
        'cantidad',
        'codigo_barras',
    ];

    /**
     * Normaliza las filas leídas: solo las columnas conocidas, todo como texto y sin las filas
     * completamente vacías (Excel suele arrastrar filas en blanco al final).
     *
     * @param  array<int, array<string, mixed>>  $filasCrudas
     * @return list<array<string, string>>
     */
    public static function normalizar(array $filasCrudas): array
    {
        $filas = [];

        foreach ($filasCrudas as $cruda) {
            $fila = [];
            foreach (self::COLUMNAS as $columna) {
                $fila[$columna] = self::comoTexto($cruda[$columna] ?? null);
            }

            if (array_filter($fila, fn (string $valor) => $valor !== '') !== []) {
                $filas[] = $fila;
            }
        }

        return $filas;
    }

    private static function comoTexto(mixed $valor): string
    {
        if ($valor === null) {
            return '';
        }

        if (is_float($valor) && floor($valor) === $valor && abs($valor) < 1e15) {
            return (string) (int) $valor;
        }

        return trim((string) $valor);
    }
}
