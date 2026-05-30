<?php

namespace App\Imports;

use App\Models\PrecioHistorial;
use App\Models\Producto;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithStartRow;

class PreciosVendedorImport implements ToCollection, WithStartRow
{
    public int $actualizados = 0;
    public int $omitidos     = 0;
    public array $errores    = [];

    public function __construct(
        private int $almacenId,
        private int $userId
    ) {}

    public function startRow(): int
    {
        return 2;
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $productoId  = isset($row[0]) ? (int) $row[0] : null;
            $precioVenta = isset($row[4]) && $row[4] !== '' && $row[4] !== null ? (float) $row[4] : null;
            $comision    = isset($row[5]) && $row[5] !== '' && $row[5] !== null ? (float) $row[5] : null;

            if ($precioVenta === null && $comision === null) {
                $this->omitidos++;
                continue;
            }

            if (!$productoId || $productoId <= 0) {
                $this->errores[] = "Fila " . ($index + 2) . ": ID de producto inválido.";
                continue;
            }

            $existe = DB::table('almacen_producto')
                ->where('almacen_id', $this->almacenId)
                ->where('producto_id', $productoId)
                ->exists();

            if (!$existe) {
                $this->errores[] = "Fila " . ($index + 2) . ": Producto ID {$productoId} no existe en este almacén.";
                continue;
            }

            try {
                $producto = Producto::find($productoId);
                if (!$producto) {
                    $this->errores[] = "Fila " . ($index + 2) . ": Producto ID {$productoId} no encontrado.";
                    continue;
                }

                $registroActual = DB::table('producto_vendedors')
                    ->where('producto_id', $productoId)
                    ->where('almacen_id', $this->almacenId)
                    ->first();

                $updateData = [
                    'puesto_por_user_id' => $this->userId,
                    'updated_at'         => now(),
                ];

                if ($precioVenta !== null && $precioVenta >= 0.01) {
                    $precioVenta = round($precioVenta, 2);
                    $ganancia    = round($precioVenta - $producto->precio_compra_producto, 2);
                    $updateData['precio_venta']    = $precioVenta;
                    $updateData['venta_ganancia']  = $ganancia;

                    $precioAnterior = $registroActual?->precio_venta;
                    $precioCambio   = $precioAnterior === null || round((float) $precioAnterior, 2) !== $precioVenta;

                    if ($precioCambio) {
                        PrecioHistorial::create([
                            'producto_id'     => $productoId,
                            'user_id'         => $this->userId,
                            'almacen_id'      => $this->almacenId,
                            'precio_anterior' => $precioAnterior,
                            'precio_nuevo'    => $precioVenta,
                            'comision'        => $comision ?? (float) ($registroActual?->comision ?? 0),
                            'accion'          => 'Importación Excel - Almacén ID ' . $this->almacenId,
                        ]);
                    }
                }

                if ($comision !== null && $comision >= 0) {
                    $updateData['comision'] = round($comision, 2);
                }

                DB::table('producto_vendedors')->updateOrInsert(
                    ['producto_id' => $productoId, 'almacen_id' => $this->almacenId],
                    $updateData
                );

                $this->actualizados++;
            } catch (\Exception $e) {
                Log::error("Error importando precio para producto ID {$productoId}: " . $e->getMessage());
                $this->errores[] = "Fila " . ($index + 2) . ": Error al procesar producto ID {$productoId}.";
            }
        }
    }
}
