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
        'productos_creados'      => 0,
        'productos_actualizados' => 0,
        'filas_procesadas'       => 0,
        'filas_omitidas'         => 0,
    ];

    public function __construct($almacenId = 1)
    {
        $this->almacenId = $almacenId;

        if (!Almacen::find($almacenId)) {
            throw new \Exception("El almacén con ID {$almacenId} no existe.");
        }

        $this->categorias = Categoria::pluck('id', 'nombre_categoria')->toArray();
    }

    public function model(array $row)
    {
        try {
            $this->estadisticas['filas_procesadas']++;

            $row = array_map(function ($value) {
                return is_string($value) ? trim($value) : $value;
            }, $row);

            // Único campo verdaderamente obligatorio: nombre del producto
            if (empty($row['nombre_producto'])) {
                $this->estadisticas['filas_omitidas']++;
                Log::warning('Fila omitida - nombre_producto vacío', ['fila' => $this->estadisticas['filas_procesadas']]);
                return null;
            }

            // precio_compra es obligatorio porque no se puede editar después
            $precioRaw = $row['precio_compra'] ?? null;
            $precio = $this->normalizarPrecio($precioRaw);

            if (is_null($precio)) {
                $this->estadisticas['filas_omitidas']++;
                Log::warning('Fila omitida - precio_compra vacío o inválido', [
                    'nombre'        => $row['nombre_producto'],
                    'precio_raw'    => $precioRaw,
                ]);
                return null;
            }

            // Categoría: opcional, default "Sin Categoría"
            $categoriaNombre = !empty($row['categoria']) ? $row['categoria'] : 'Sin Categoría';

            if (isset($this->categorias[$categoriaNombre])) {
                $categoriaId = $this->categorias[$categoriaNombre];
            } else {
                $categoria = Categoria::create([
                    'nombre_categoria'    => $categoriaNombre,
                    'descripcion_categoria' => 'Importado desde Excel',
                    'activar_categoria'   => true,
                ]);
                $categoriaId = $categoria->id;
                $this->categorias[$categoriaNombre] = $categoriaId;
                Log::info("Categoría creada: {$categoriaNombre}");
            }

            $nombreProducto = $row['nombre_producto'];
            $marca          = !empty($row['marca'])     ? $row['marca']     : null;
            $modelo         = !empty($row['modelo'])    ? $row['modelo']    : null;
            $capacidad      = !empty($row['capacidad']) ? $row['capacidad'] : null;
            $color          = !empty($row['color'])     ? $row['color']     : null;
            $cantidad       = $this->normalizarCantidad($row['cantidad'] ?? null);

            // Búsqueda correcta con NULL: where('col', null) no funciona en SQL
            $query = Producto::where('nombre_producto', $nombreProducto);

            if (is_null($marca)) {
                $query->whereNull('marca_producto');
            } else {
                $query->where('marca_producto', $marca);
            }

            if (is_null($modelo)) {
                $query->whereNull('modelo_producto');
            } else {
                $query->where('modelo_producto', $modelo);
            }

            $producto = $query->first();

            if (!$producto) {
                $producto = Producto::create([
                    'nombre_producto'         => $nombreProducto,
                    'marca_producto'          => $marca,
                    'modelo_producto'         => $modelo,
                    'capacidad_producto'      => $capacidad,
                    'color_producto'          => $color,
                    'categoria_id'            => $categoriaId,
                    'precio_compra_producto'  => $precio,
                    'imagen_producto'         => 'productos/producto-default.png',
                ]);
                $this->estadisticas['productos_creados']++;
                Log::info("Producto creado: {$nombreProducto}", [
                    'producto_id' => $producto->id,
                    'almacen_id'  => $this->almacenId,
                    'cantidad'    => $cantidad,
                ]);
            } else {
                $producto->update([
                    'categoria_id'           => $categoriaId,
                    'precio_compra_producto' => $precio,
                ]);
                $this->estadisticas['productos_actualizados']++;
                Log::info("Producto actualizado: {$nombreProducto}", [
                    'producto_id' => $producto->id,
                    'almacen_id'  => $this->almacenId,
                ]);
            }

            // Códigos de barras
            $codigoBarrasInput = trim((string) ($row['codigo_barras'] ?? ''));
            if ($codigoBarrasInput !== '') {
                $esPrimerCodigo = !\App\Models\ProductoCodigo::where('producto_id', $producto->id)->exists();
                $productoCodigo = \App\Models\ProductoCodigo::firstOrNew([
                    'producto_id'    => $producto->id,
                    'codigo_barras'  => $codigoBarrasInput,
                ]);
                $productoCodigo->cantidad = ($productoCodigo->cantidad ?? 0) + $cantidad;
                if (!$productoCodigo->exists) {
                    $productoCodigo->es_default = $esPrimerCodigo;
                }
                $productoCodigo->save();
            } else {
                $defaultCodigo = \App\Models\ProductoCodigo::where('producto_id', $producto->id)
                    ->where('es_default', true)
                    ->first();

                if ($defaultCodigo) {
                    $defaultCodigo->increment('cantidad', $cantidad);
                } else {
                    \App\Models\ProductoCodigo::generarYGuardarDefault($producto, $cantidad);
                }
            }

            // Almacén: incrementar si ya existe, crear si no
            $almacenProducto = AlmacenProducto::where('almacen_id', $this->almacenId)
                ->where('producto_id', $producto->id)
                ->first();

            if ($almacenProducto) {
                $cantidadAnterior = $almacenProducto->cantidad;
                $almacenProducto->increment('cantidad', $cantidad);
                Log::info("Cantidad incrementada en almacén", [
                    'producto_id'       => $producto->id,
                    'cantidad_anterior' => $cantidadAnterior,
                    'cantidad_agregada' => $cantidad,
                    'cantidad_total'    => $cantidadAnterior + $cantidad,
                    'almacen_id'        => $this->almacenId,
                ]);
            } else {
                AlmacenProducto::create([
                    'almacen_id'  => $this->almacenId,
                    'producto_id' => $producto->id,
                    'cantidad'    => $cantidad,
                ]);
                Log::info("Producto asignado al almacén", [
                    'producto_id' => $producto->id,
                    'cantidad'    => $cantidad,
                    'almacen_id'  => $this->almacenId,
                ]);
            }

            return null;
        } catch (\Exception $e) {
            Log::error("Error procesando fila: " . $e->getMessage(), [
                'fila'       => $row,
                'almacen_id' => $this->almacenId,
            ]);
            $this->estadisticas['filas_omitidas']++;
            return null;
        }
    }

    /**
     * Normaliza el precio de compra aceptando cualquier formato que el usuario pueda escribir:
     * "45.00", "45,00", "$45", "Q 45.50", "1,234.56", "1.234,56"
     */
    private function normalizarPrecio($value): ?float
    {
        if (is_null($value) || trim((string) $value) === '') {
            return null;
        }

        if (is_numeric($value)) {
            return floatval($value);
        }

        // Quitar símbolos de moneda y espacios, dejar solo dígitos, coma y punto
        $val = preg_replace('/[^\d,\.]/', '', trim((string) $value));

        if ($val === '') {
            return null;
        }

        $hasComma  = strpos($val, ',') !== false;
        $hasPeriod = strpos($val, '.') !== false;

        if ($hasComma && $hasPeriod) {
            // Determinar cuál es separador decimal según el último
            if (strrpos($val, ',') > strrpos($val, '.')) {
                // Formato europeo: 1.234,56 → 1234.56
                $val = str_replace('.', '', $val);
                $val = str_replace(',', '.', $val);
            } else {
                // Formato anglosajón: 1,234.56 → 1234.56
                $val = str_replace(',', '', $val);
            }
        } elseif ($hasComma) {
            // Solo coma: puede ser decimal (45,00) o miles (1,234)
            $partes = explode(',', $val);
            if (count($partes) === 2 && strlen($partes[1]) <= 2) {
                $val = $partes[0] . '.' . $partes[1];
            } else {
                $val = str_replace(',', '', $val);
            }
        }
        // Solo punto: ya válido

        return is_numeric($val) ? floatval($val) : null;
    }

    /**
     * Convierte cantidad a entero tolerando valores decimales (5.0 → 5) y vacíos (→ 0)
     */
    private function normalizarCantidad($value): int
    {
        if (is_null($value) || trim((string) $value) === '') {
            return 0;
        }
        return (int) floatval($value);
    }

    public function rules(): array
    {
        return [
            'nombre_producto' => 'sometimes|nullable|string|max:255',
            'categoria'       => 'sometimes|nullable|string|max:255',
            'marca'           => 'sometimes|nullable|string|max:255',
            'modelo'          => 'sometimes|nullable|string|max:255',
            'capacidad'       => 'sometimes|nullable|string|max:255',
            'color'           => 'sometimes|nullable|string|max:100',
            'precio_compra'   => 'sometimes|nullable',
            'cantidad'        => 'sometimes|nullable',
            'codigo_barras'   => 'sometimes|nullable|string|max:255',
        ];
    }

    public function prepareForValidation($data, $index)
    {
        foreach (['nombre_producto', 'categoria', 'marca', 'modelo', 'capacidad', 'color'] as $field) {
            if (array_key_exists($field, $data) && !is_null($data[$field])) {
                $data[$field] = trim((string) $data[$field]) ?: null;
            }
        }

        if (array_key_exists('precio_compra', $data)) {
            $normalizado = $this->normalizarPrecio($data['precio_compra']);
            $data['precio_compra'] = is_null($normalizado) ? null : (string) $normalizado;
        }

        if (array_key_exists('cantidad', $data)) {
            $data['cantidad'] = (string) $this->normalizarCantidad($data['cantidad']);
        }

        return $data;
    }

    public function customValidationMessages()
    {
        return [
            'nombre_producto.string' => 'El nombre debe ser texto',
            'nombre_producto.max'    => 'El nombre no puede superar 255 caracteres',
        ];
    }

    public function chunkSize(): int
    {
        return 100;
    }

    public function getEstadisticas()
    {
        return $this->estadisticas;
    }
}
