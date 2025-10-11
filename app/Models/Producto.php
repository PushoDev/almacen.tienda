<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Milon\Barcode\Facades\DNS1DFacade as DNS1D;
use Illuminate\Support\Facades\Storage;
use Exception;

class Producto extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'productos';

    protected $fillable = [
        'nombre_producto',
        'marca_producto',
        'modelo_producto',
        'capacidad_producto',
        'codigo_producto',
        'barcode_image',
        'categoria_id',
        'precio_compra_producto',
        'imagen_producto',
    ];

    protected $casts = [
        'precio_compra_producto' => 'decimal:2',
    ];

    protected $appends = ['imagen_url', 'cantidad_total', 'stock_bajo', 'barcode_image_url'];

    /**
     * Boot method para generar automáticamente el código de barras y su imagen
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($producto) {
            if (empty($producto->codigo_producto)) {
                $codigo = self::generarCodigoBarras($producto);
                $producto->codigo_producto = $codigo;

                // Generar la imagen del código de barras
                try {
                    $producto->barcode_image = self::generarImagenBarcode($codigo);
                } catch (Exception $e) {
                    // Si falla la generación de imagen, al menos guardamos el código
                    logger()->error('Error generando imagen de código de barras: ' . $e->getMessage());
                }
            }
        });

        static::updating(function ($producto) {
            // Si alguno de los campos base cambia, regenerar el código e imagen
            if ($producto->isDirty(['nombre_producto', 'marca_producto', 'modelo_producto', 'capacidad_producto'])) {
                $codigo = self::generarCodigoBarras($producto);
                $producto->codigo_producto = $codigo;

                try {
                    $producto->barcode_image = self::generarImagenBarcode($codigo);
                } catch (Exception $e) {
                    logger()->error('Error generando imagen de código de barras: ' . $e->getMessage());
                }
            }

            // Si solo cambió el código manualmente, regenerar la imagen
            elseif ($producto->isDirty('codigo_producto')) {
                try {
                    $producto->barcode_image = self::generarImagenBarcode($producto->codigo_producto);
                } catch (Exception $e) {
                    logger()->error('Error generando imagen de código de barras: ' . $e->getMessage());
                }
            }
        });
    }

    /**
     * Genera el código de barras automáticamente (texto)
     */
    public static function generarCodigoBarras($producto)
    {
        // Obtener las primeras 3 letras de cada campo (solo letras)
        $nombre = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->nombre_producto)), 0, 3);
        $marca = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->marca_producto ?? '')), 0, 3);
        $modelo = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->modelo_producto ?? '')), 0, 3);

        // Limpiar capacidad (solo números)
        $capacidad = preg_replace('/[^0-9]/', '', $producto->capacidad_producto ?? '');

        // Rellenar con 'X' si algún campo está vacío
        $nombre = str_pad($nombre, 3, 'X');
        $marca = str_pad($marca, 3, 'X');
        $modelo = str_pad($modelo, 3, 'X');

        // Parte fija del código
        $parteFija = $nombre . $marca . $modelo . $capacidad;

        // Si la parte fija tiene más de 14 caracteres, truncar a 14
        if (strlen($parteFija) > 14) {
            $parteFija = substr($parteFija, 0, 14);
        }

        // Calcular cuántos dígitos aleatorios necesitamos
        $longitudFija = strlen($parteFija);
        $digitosAleatoriosNecesarios = 14 - $longitudFija;

        // Generar números aleatorios si se necesitan
        $numerosAleatorios = '';
        if ($digitosAleatoriosNecesarios > 0) {
            $min = pow(10, $digitosAleatoriosNecesarios - 1);
            $max = pow(10, $digitosAleatoriosNecesarios) - 1;
            $numerosAleatorios = rand($min, $max);
        }

        $codigo = $parteFija . $numerosAleatorios;

        // Asegurar que tenga exactamente 14 caracteres
        return substr($codigo, 0, 14);
    }

    /**
     * Genera la imagen del código de barras y devuelve la ruta
     */
    public static function generarImagenBarcode($codigo)
    {
        // Asegurarse de que el directorio exista
        $directory = 'barcodes';
        if (!Storage::disk('public')->exists($directory)) {
            Storage::disk('public')->makeDirectory($directory);
        }

        // Verificar que el código no esté vacío
        if (empty($codigo)) {
            throw new Exception('El código para generar el código de barras está vacío');
        }

        // Generar el código de barras en formato PNG
        // CODE128 es compatible con la mayoría de lectores
        $barcodePNG = DNS1D::getBarcodePNG($codigo, 'C128', 2, 60, [0, 0, 0], true);

        // Verificar que se generó correctamente
        if (empty($barcodePNG)) {
            throw new Exception('No se pudo generar la imagen del código de barras');
        }

        // Decodificar la cadena base64 y guardar el archivo
        $imageData = base64_decode($barcodePNG);

        if ($imageData === false) {
            throw new Exception('Error al decodificar la imagen del código de barras');
        }

        $fileName = $directory . '/' . $codigo . '.png';

        // Guardar la imagen
        $saved = Storage::disk('public')->put($fileName, $imageData);

        if (!$saved) {
            throw new Exception('No se pudo guardar la imagen del código de barras en el almacenamiento');
        }

        return $fileName;
    }

    /**
     * Accesor para la URL de la imagen del código de barras
     */
    public function getBarcodeImageUrlAttribute()
    {
        if (!$this->barcode_image) {
            return null;
        }

        // Verificar si el archivo existe
        if (!Storage::disk('public')->exists($this->barcode_image)) {
            return null;
        }

        return asset('storage/' . $this->barcode_image);
    }

    /**
     * Regenera la imagen del código de barras
     */
    public function regenerarBarcodeImage()
    {
        try {
            $this->barcode_image = self::generarImagenBarcode($this->codigo_producto);
            return $this->save();
        } catch (Exception $e) {
            logger()->error('Error regenerando imagen de código de barras: ' . $e->getMessage());
            return false;
        }
    }

    // 🔹 Relación con categoría
    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    // 🔹 Relación con almacenes
    public function almacenes()
    {
        return $this->belongsToMany(Almacen::class, 'almacen_producto')
            ->withPivot('cantidad')
            ->withTimestamps();
    }

    // 🔹 Relación con vendedores
    public function vendedores()
    {
        return $this->belongsToMany(User::class, 'producto_vendedors')
            ->using(ProductoVendedor::class)
            ->withPivot('precio_venta', 'venta_ganancia')
            ->withTimestamps();
    }

    // 🔥 Cantidad total en todos los almacenes
    public function getCantidadTotalAttribute(): int
    {
        return $this->almacenes->sum('pivot.cantidad');
    }

    // 🔥 Stock bajo si es menor a 3
    public function getStockBajoAttribute(): bool
    {
        return $this->cantidad_total < 3;
    }

    // 🔥 Accesor para URL de imagen
    public function getImagenUrlAttribute(): string
    {
        if (!$this->imagen_producto) {
            return asset('storage/productos/producto-default.png');
        }

        // Verificar si existe la imagen
        if (!Storage::disk('public')->exists($this->imagen_producto)) {
            return asset('storage/productos/producto-default.png');
        }

        return asset('storage/' . $this->imagen_producto);
    }

    /**
     * Scope para buscar por código de barras
     */
    public function scopePorCodigo($query, $codigo)
    {
        return $query->where('codigo_producto', $codigo);
    }

    /**
     * Scope para buscar productos por partes del nombre, marca o modelo
     */
    public function scopeBuscar($query, $termino)
    {
        return $query->where('nombre_producto', 'LIKE', "%{$termino}%")
            ->orWhere('marca_producto', 'LIKE', "%{$termino}%")
            ->orWhere('modelo_producto', 'LIKE', "%{$termino}%")
            ->orWhere('codigo_producto', 'LIKE', "%{$termino}%");
    }

    /**
     * Verifica si la imagen del código de barras existe físicamente
     */
    public function barcodeImageExists(): bool
    {
        return $this->barcode_image && Storage::disk('public')->exists($this->barcode_image);
    }

    /**
     * Elimina la imagen física del código de barras
     */
    public function eliminarBarcodeImage(): bool
    {
        if ($this->barcode_image && Storage::disk('public')->exists($this->barcode_image)) {
            return Storage::disk('public')->delete($this->barcode_image);
        }
        return false;
    }
}
