<?php

namespace App\Services;

use App\Imports\ProductoImport;
use App\Models\Almacen;
use App\Models\ImportacionProducto;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Ejecuta una importación de productos y la deja en el historial. Lo comparten la importación
 * directa de un archivo (ProductoController::import) y la confirmación de un borrador ya
 * revisado (ImportacionBorradorController::confirmar): mismo importador, mismo historial.
 */
class ImportacionProductosService
{
    /**
     * Importación anterior, completada, del mismo archivo en el mismo almacén (una fallida o
     * revertida no cuenta: no quedó nada importado).
     */
    public function buscarPrevia(int $almacenId, string $hashArchivo): ?ImportacionProducto
    {
        return ImportacionProducto::with('user:id,name')
            ->where('hash_archivo', $hashArchivo)
            ->where('almacen_id', $almacenId)
            ->whereIn('estado', ['completada', 'con_omitidas'])
            ->latest('id')
            ->first();
    }

    /**
     * @return array{id: int, nombre_archivo: string, fecha: string, usuario: string|null}
     */
    public function avisoRepetida(ImportacionProducto $previa): array
    {
        return [
            'id' => $previa->id,
            'nombre_archivo' => $previa->nombre_archivo,
            'fecha' => $previa->created_at->toIso8601String(),
            'usuario' => $previa->user?->name,
        ];
    }

    /**
     * Todo o nada: si algo falla se deshace todo, se deja la importación como `fallida` en el
     * historial (escrita DESPUÉS del rollBack, o se habría deshecho con él) y se vuelve a lanzar.
     *
     * @param  Closure(ProductoImport): void  $cargar  Alimenta al importador: lee un archivo o le pasa filas ya editadas
     *
     * @throws \Throwable
     */
    public function ejecutar(User $usuario, Almacen $almacen, string $nombreArchivo, string $hashArchivo, Closure $cargar): ImportacionProducto
    {
        DB::beginTransaction();

        try {
            $importacion = ImportacionProducto::create([
                'user_id' => $usuario->id,
                'almacen_id' => $almacen->id,
                'nombre_archivo' => $nombreArchivo,
                'hash_archivo' => $hashArchivo,
            ]);

            $importador = new ProductoImport($almacen->id, $importacion);
            $cargar($importador);
            $stats = $importador->getEstadisticas();

            $importacion->update([
                'estado' => $stats['filas_omitidas'] > 0 ? 'con_omitidas' : 'completada',
                'filas_procesadas' => $stats['filas_procesadas'],
                'productos_creados' => $stats['productos_creados'],
                'productos_actualizados' => $stats['productos_actualizados'],
                'productos_sin_stock' => $stats['productos_sin_stock'],
                'filas_omitidas' => $stats['filas_omitidas'],
                'lotes_creados' => $stats['lotes_creados'],
                'unidades_importadas' => $stats['unidades_importadas'],
            ]);

            DB::commit();

            return $importacion;
        } catch (\Throwable $e) {
            DB::rollBack();

            ImportacionProducto::create([
                'user_id' => $usuario->id,
                'almacen_id' => $almacen->id,
                'nombre_archivo' => $nombreArchivo,
                'hash_archivo' => $hashArchivo,
                'estado' => 'fallida',
                'mensaje_error' => $e instanceof ValidationException
                    ? collect($e->errors())->flatten()->implode(' ')
                    : $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Resultado de una importación para el diálogo del frontend (contadores + primeras omitidas).
     *
     * @return array<string, mixed>
     */
    public function resultadoParaVista(ImportacionProducto $importacion, Almacen $almacen): array
    {
        return [
            'id' => $importacion->id,
            'nombre_archivo' => $importacion->nombre_archivo,
            'almacen' => $almacen->nombre_almacen,
            'estado' => $importacion->estado,
            'filas_procesadas' => $importacion->filas_procesadas,
            'productos_creados' => $importacion->productos_creados,
            'productos_actualizados' => $importacion->productos_actualizados,
            'productos_sin_stock' => $importacion->productos_sin_stock,
            'lotes_creados' => $importacion->lotes_creados,
            'unidades_importadas' => $importacion->unidades_importadas,
            'filas_omitidas' => $importacion->filas_omitidas,
            // Primeras filas omitidas con su motivo; el detalle completo está en el historial.
            'omitidas' => $importacion->filas()->where('resultado', 'omitida')->orderBy('fila')->limit(10)->get(['fila', 'nombre_producto', 'motivo'])->all(),
        ];
    }

    /**
     * Texto del aviso (flash `success`) con los contadores.
     */
    public function mensajeResumen(ImportacionProducto $importacion): string
    {
        $mensaje = "✓ Importación #{$importacion->id} completada correctamente.\n";
        $mensaje .= "• Productos creados: {$importacion->productos_creados}\n";
        $mensaje .= "• Productos actualizados: {$importacion->productos_actualizados}\n";
        $mensaje .= "• Lotes creados: {$importacion->lotes_creados} ({$importacion->unidades_importadas} unidades)\n";
        if ($importacion->productos_sin_stock > 0) {
            $mensaje .= "• Productos registrados sin stock: {$importacion->productos_sin_stock}\n";
        }
        $mensaje .= "• Total procesado: {$importacion->filas_procesadas}\n";
        if ($importacion->filas_omitidas > 0) {
            $mensaje .= "⚠ Filas omitidas: {$importacion->filas_omitidas} (ver el detalle en el historial de importaciones)";
        }

        return $mensaje;
    }
}
