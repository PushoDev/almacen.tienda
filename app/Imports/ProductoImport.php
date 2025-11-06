<?php

namespace App\Imports;

use App\Models\Producto;
use App\Models\Categoria;
use App\Models\Almacen;
use App\Models\AlmacenProducto;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithValidation;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Illuminate\Support\Facades\Log;

class ProductoImport implements ToModel, WithHeadingRow, WithValidation, WithChunkReading
{
    private $almacenId;
    private $categorias = [];
    private $estadisticas = [
        'productos_creados' => 0,
        'productos_actualizados' => 0,
        'filas_procesadas' => 0,
        'filas_omitidas' => 0,
    ];

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;

        // Validar que el almacén existe
        if (!Almacen::find($almacenId)) {
            throw new \Exception("El almacén con ID {$almacenId} no existe.");
        }

        // Precargar categorías para mejor performance
        $this->categorias = Categoria::pluck('id', 'nombre_categoria')->toArray();
    }

    /**
     * Procesa cada fila del archivo Excel
     * NO devuelve modelos - todo se procesa manualmente aquí
     */
    public function model(array $row)
    {
        try {
            $this->estadisticas['filas_procesadas']++;

            // Limpiar espacios en blanco de todos los datos
            $row = array_map(function ($value) {
                return is_string($value) ? trim($value) : $value;
            }, $row);

            // Validar que tengamos los datos mínimos
            if (empty($row['nombre_producto']) || empty($row['categoria'])) {
                Log::warning('Fila omitida - datos mínimos faltantes', $row);
                $this->estadisticas['filas_omitidas']++;
                return null;
            }

            // Buscar o crear categoría
            $categoriaNombre = $row['categoria'];
            if (isset($this->categorias[$categoriaNombre])) {
                $categoriaId = $this->categorias[$categoriaNombre];
            } else {
                $categoria = Categoria::create([
                    'nombre_categoria' => $categoriaNombre,
                    'descripcion_categoria' => 'Importado desde Excel',
                    'activar_categoria' => true,
                ]);
                $categoriaId = $categoria->id;
                $this->categorias[$categoriaNombre] = $categoriaId;
                Log::info("Categoría creada: {$categoriaNombre}");
            }

            // Preparar datos del producto (ya están limpios)
            $nombreProducto = $row['nombre_producto'];
            $marca = isset($row['marca']) && !empty($row['marca']) ? $row['marca'] : null;
            $modelo = isset($row['modelo']) && !empty($row['modelo']) ? $row['modelo'] : null;
            $capacidad = isset($row['capacidad']) && !empty($row['capacidad']) ? $row['capacidad'] : null;
            $precio = floatval($row['precio_compra'] ?? 0);
            $cantidad = intval($row['cantidad'] ?? 0);

            // Buscar producto existente
            $producto = Producto::where('nombre_producto', $nombreProducto)
                ->where('marca_producto', $marca)
                ->where('modelo_producto', $modelo)
                ->first();

            if (!$producto) {
                // Crear nuevo producto
                $producto = Producto::create([
                    'nombre_producto' => $nombreProducto,
                    'marca_producto' => $marca,
                    'modelo_producto' => $modelo,
                    'capacidad_producto' => $capacidad,
                    'categoria_id' => $categoriaId,
                    'precio_compra_producto' => $precio,
                    'imagen_producto' => 'productos/producto-default.png',
                ]);
                $this->estadisticas['productos_creados']++;
                Log::info("✓ Producto creado: {$nombreProducto}", [
                    'producto_id' => $producto->id,
                    'almacen_id' => $this->almacenId,
                    'cantidad' => $cantidad,
                ]);
            } else {
                // Actualizar producto existente (precio y categoría)
                $producto->update([
                    'categoria_id' => $categoriaId,
                    'precio_compra_producto' => $precio,
                ]);
                $this->estadisticas['productos_actualizados']++;
                Log::info("✓ Producto actualizado: {$nombreProducto}", [
                    'producto_id' => $producto->id,
                    'almacen_id' => $this->almacenId,
                ]);
            }

            // Asignar/actualizar producto en el almacén con cantidad
            // IMPORTANTE: INCREMENTAR cantidad si ya existe, no reemplazar
            $almacenProducto = AlmacenProducto::where('almacen_id', $this->almacenId)
                ->where('producto_id', $producto->id)
                ->first();

            if ($almacenProducto) {
                // Producto ya existe en el almacén: INCREMENTAR cantidad
                $cantidadAnterior = $almacenProducto->cantidad;
                $almacenProducto->increment('cantidad', $cantidad);
                Log::info("📦 Cantidad incrementada en almacén", [
                    'producto_id' => $producto->id,
                    'cantidad_anterior' => $cantidadAnterior,
                    'cantidad_agregada' => $cantidad,
                    'cantidad_total' => $cantidadAnterior + $cantidad,
                    'almacen_id' => $this->almacenId,
                    'producto' => $nombreProducto,
                ]);
            } else {
                // Producto nuevo en el almacén: CREAR con cantidad inicial
                AlmacenProducto::create([
                    'almacen_id' => $this->almacenId,
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad
                ]);
                Log::info("📦 Producto asignado al almacén", [
                    'producto_id' => $producto->id,
                    'cantidad' => $cantidad,
                    'almacen_id' => $this->almacenId,
                    'producto' => $nombreProducto,
                ]);
            }

            // NO devolver nada - ya procesamos todo manualmente
            return null;
        } catch (\Exception $e) {
            Log::error("Error procesando fila: " . $e->getMessage(), [
                'fila' => $row,
                'almacen_id' => $this->almacenId,
            ]);
            $this->estadisticas['filas_omitidas']++;
            return null;
        }
    }

    /**
     * Reglas de validación
     */
    public function rules(): array
    {
        return [
            'nombre_producto' => 'required|string|max:255',
            'categoria' => 'required|string|max:255',
            'precio_compra' => 'required|numeric|min:0',
            'cantidad' => 'required|integer',
            'marca' => 'sometimes|nullable|string|max:255',
            'modelo' => 'sometimes|nullable|string|max:255',
            'capacidad' => 'sometimes|nullable|string|max:255',
        ];
    }

    /**
     * Mensajes de validación personalizados
     */
    public function customValidationMessages()
    {
        return [
            'nombre_producto.required' => 'El nombre del producto es obligatorio',
            'nombre_producto.string' => 'El nombre debe ser texto',
            'categoria.required' => 'La categoría es obligatoria',
            'categoria.string' => 'La categoría debe ser texto',
            'precio_compra.required' => 'El precio de compra es obligatorio',
            'precio_compra.numeric' => 'El precio debe ser un número válido',
            'precio_compra.min' => 'El precio debe ser mayor o igual a 0',
            'cantidad.required' => 'La cantidad es obligatoria',
            'cantidad.integer' => 'La cantidad debe ser un número entero',
            'cantidad.min' => 'La cantidad debe ser mayor o igual a 0',
        ];
    }

    /**
     * Tamaño del chunk para lectura
     */
    public function chunkSize(): int
    {
        return 100;
    }

    /**
     * Obtiene las estadísticas de la importación
     */
    public function getEstadisticas()
    {
        return $this->estadisticas;
    }
}
