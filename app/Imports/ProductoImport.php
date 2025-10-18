<?php

namespace App\Imports;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Almacen;
use App\Models\AlmacenProducto;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithBatchInserts;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Support\Facades\Log;

class ProductoImport implements ToModel, WithHeadingRow, WithValidation, WithBatchInserts, WithChunkReading
{
    private $almacenId;
    private $categorias = [];

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;

        // Precargar categorías para mejor performance
        $this->categorias = Categoria::pluck('id', 'nombre_categoria')->toArray();
    }

    public function model(array $row)
    {
        try {
            Log::info('Procesando fila:', $row);

            // Validar que tengamos los datos mínimos
            if (empty($row['nombre_producto']) || empty($row['categoria'])) {
                Log::warning('Fila omitida - datos mínimos faltantes');
                return null;
            }

            // Buscar o crear categoría
            $categoriaNombre = $row['categoria'];
            if (isset($this->categorias[$categoriaNombre])) {
                $categoriaId = $this->categorias[$categoriaNombre];
            } else {
                $categoria = Categoria::create([
                    'nombre_categoria' => $categoriaNombre,
                    'descripcion_categoria' => 'Importado desde Excel'
                ]);
                $categoriaId = $categoria->id;
                $this->categorias[$categoriaNombre] = $categoriaId;
                Log::info("Categoría creada: {$categoriaNombre}");
            }

            // Buscar producto existente
            $producto = Producto::where('nombre_producto', $row['nombre_producto'])
                ->where('marca_producto', $row['marca'] ?? null)
                ->where('modelo_producto', $row['modelo'] ?? null)
                ->first();

            if (!$producto) {
                // Crear nuevo producto
                $producto = Producto::create([
                    'nombre_producto' => $row['nombre_producto'],
                    'marca_producto' => $row['marca'] ?? null,
                    'modelo_producto' => $row['modelo'] ?? null,
                    'capacidad_producto' => $row['capacidad'] ?? null,
                    'categoria_id' => $categoriaId,
                    'precio_compra_producto' => $row['precio_compra'] ?? 0,
                    'imagen_producto' => 'productos/producto-default.png',
                ]);
                Log::info("Producto creado: {$row['nombre_producto']}");
            } else {
                // Actualizar producto existente
                $producto->update([
                    'categoria_id' => $categoriaId,
                    'precio_compra_producto' => $row['precio_compra'] ?? $producto->precio_compra_producto,
                ]);
                Log::info("Producto actualizado: {$row['nombre_producto']}");
            }

            // Asignar producto al almacén con cantidad
            $cantidad = $row['cantidad'] ?? 0;

            AlmacenProducto::updateOrCreate(
                [
                    'almacen_id' => $this->almacenId,
                    'producto_id' => $producto->id
                ],
                [
                    'cantidad' => $cantidad
                ]
            );

            Log::info("Producto asignado al almacén: {$producto->id} con cantidad: {$cantidad}");

            return $producto;
        } catch (\Exception $e) {
            Log::error("Error procesando fila: " . $e->getMessage());
            Log::error("Fila con error: " . json_encode($row));
            return null;
        }
    }

    public function rules(): array
    {
        return [
            'nombre_producto' => 'required|string|max:255',
            'categoria' => 'required|string|max:255',
            'precio_compra' => 'required|numeric|min:0',
            'cantidad' => 'required|integer|min:0',
            'marca' => 'sometimes|string|max:255',
            'modelo' => 'sometimes|string|max:255',
            'capacidad' => 'sometimes|string|max:255',
        ];
    }

    public function customValidationMessages()
    {
        return [
            'nombre_producto.required' => 'El nombre del producto es obligatorio',
            'categoria.required' => 'La categoría es obligatoria',
            'precio_compra.required' => 'El precio de compra es obligatorio',
            'precio_compra.numeric' => 'El precio de compra debe ser un número',
            'cantidad.required' => 'La cantidad es obligatoria',
            'cantidad.integer' => 'La cantidad debe ser un número entero',
        ];
    }

    public function batchSize(): int
    {
        return 50;
    }

    public function chunkSize(): int
    {
        return 50;
    }
}
