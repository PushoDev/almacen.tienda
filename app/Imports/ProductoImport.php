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

class ProductoImport implements ToModel, WithHeadingRow, WithValidation, WithBatchInserts, WithChunkReading
{
    private $almacenId;
    private $categorias = [];
    private $almacen;

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;
        $this->almacen = Almacen::find($almacenId);

        if (!$this->almacen) {
            throw new \Exception("El almacén con ID {$almacenId} no existe");
        }

        // Precargar categorías para mejor performance
        $this->categorias = Categoria::pluck('id', 'nombre_categoria')->toArray();
    }

    public function model(array $row)
    {
        // Validar que tengamos los datos mínimos
        if (empty($row['nombre_producto']) || empty($row['categoria'])) {
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
        }

        // Buscar producto por código o crear uno nuevo
        $codigo = $row['codigo'] ?? null;
        $producto = null;

        if ($codigo) {
            $producto = Producto::where('codigo_producto', $codigo)->first();
        }

        if (!$producto) {
            // Crear nuevo producto
            $producto = new Producto([
                'nombre_producto' => $row['nombre_producto'],
                'marca_producto' => $row['marca'] ?? null,
                'codigo_producto' => $codigo,
                'categoria_id' => $categoriaId,
                'precio_compra_producto' => $row['precio_compra'] ?? 0,
                'imagen_producto' => $row['imagen'] ?? 'productos/producto-default.png',
            ]);
            $producto->save();
        } else {
            // Actualizar producto existente
            $producto->update([
                'nombre_producto' => $row['nombre_producto'],
                'marca_producto' => $row['marca'] ?? $producto->marca_producto,
                'categoria_id' => $categoriaId,
                'precio_compra_producto' => $row['precio_compra'] ?? $producto->precio_compra_producto,
            ]);
        }

        // Asignar producto al almacén con cantidad
        $cantidad = $row['cantidad'] ?? 0;

        $almacenProducto = AlmacenProducto::firstOrNew([
            'almacen_id' => $this->almacenId,
            'producto_id' => $producto->id
        ]);

        $almacenProducto->cantidad = $cantidad;
        $almacenProducto->save();

        return $producto;
    }

    public function rules(): array
    {
        return [
            'nombre_producto' => 'required|string|max:255',
            'categoria' => 'required|string|max:255',
            'precio_compra' => 'required|numeric|min:0',
            'codigo' => 'sometimes|unique:productos,codigo_producto',
            'cantidad' => 'required|integer|min:0',
            'marca' => 'sometimes|string|max:255',
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
            'codigo.unique' => 'El código ya existe en la base de datos',
        ];
    }

    public function batchSize(): int
    {
        return 100;
    }

    public function chunkSize(): int
    {
        return 100;
    }
}
