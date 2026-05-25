<?php

namespace App\Imports;

use App\Models\Producto;
use App\Models\PrecioHistorial;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithStartRow;

class PreciosVendedorImport implements ToCollection, WithStartRow
{
    public int $actualizados = 0;
    public int $omitidos = 0;
    public array $errores = [];
    private int $almacenIdExcel = 0;

    public function __construct(
        private int $almacenId,
        private int $userId,
        private string $userRole
    ) {}

    // Los datos empiezan en la fila 2 (fila 1 = encabezados)
    public function startRow(): int
    {
        return 2;
    }

    public function collection(Collection $rows)
    {
        $saveUserId = in_array($this->userRole, ['admin', 'moderador']) ? 1 : $this->userId;

        foreach ($rows as $index => $row) {
            $productoId  = isset($row[0]) ? (int) $row[0] : null;
            $precioVenta = isset($row[4]) && $row[4] !== '' && $row[4] !== null ? (float) $row[4] : null;
            $comision    = isset($row[5]) && $row[5] !== '' && $row[5] !== null ? (float) $row[5] : null;

            // Si ambas celdas editables están vacías, omitir la fila
            if ($precioVenta === null && $comision === null) {
                $this->omitidos++;
                continue;
            }

            if (!$productoId || $productoId <= 0) {
                $this->errores[] = "Fila " . ($index + 2) . ": ID de producto inválido.";
                continue;
            }

            // Verificar que el producto exista y pertenezca al almacén
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

                // Obtener precio anterior para historial
                $registroActual = DB::table('producto_vendedors')
                    ->where('producto_id', $productoId)
                    ->where('almacen_id', $this->almacenId)
                    ->where('user_id', $saveUserId)
                    ->first();

                $updateData = ['updated_at' => now()];

                if ($precioVenta !== null && $precioVenta >= 0.01) {
                    $precioVenta = round($precioVenta, 2);
                    $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);
                    $updateData['precio_venta'] = $precioVenta;
                    $updateData['venta_ganancia'] = $ganancia;

                    // Registrar en historial si el precio cambió
                    $precioAnterior = $registroActual?->precio_venta;
                    if ($precioAnterior !== null && round((float) $precioAnterior, 2) !== $precioVenta) {
                        PrecioHistorial::create([
                            'producto_id' => $productoId,
                            'user_id'     => $this->userId,
                            'almacen_id'  => $this->almacenId,
                            'precio_anterior' => $precioAnterior,
                            'precio_nuevo'    => $precioVenta,
                            'accion'          => 'Importación Excel - Almacén ID ' . $this->almacenId,
                        ]);
                    }
                }

                if ($comision !== null && $comision >= 0) {
                    $updateData['comision'] = round($comision, 2);
                }

                DB::table('producto_vendedors')->updateOrInsert(
                    [
                        'producto_id' => $productoId,
                        'user_id'     => $saveUserId,
                        'almacen_id'  => $this->almacenId,
                    ],
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
