<?php

namespace App\Models;

use Exception;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Milon\Barcode\Facades\DNS1DFacade as DNS1D;

class ProductoCodigo extends Model
{
    use HasFactory;

    protected $fillable = [
        'producto_id',
        'codigo_barras',
        'cantidad',
        'es_default',
        'imagen_barcode',
    ];

    /**
     * Relación con el producto principal
     */
    public function producto()
    {
        return $this->belongsTo(Producto::class);
    }

    /**
     * Genera el código de barras automáticamente (texto). La parte fija (nombre+marca+modelo+
     * capacidad) se recorta a 10 caracteres para dejar SIEMPRE al menos 4 dígitos al azar —
     * antes, con una capacidad de 5+ dígitos (ej. "20000 MAH"), la parte fija llegaba a 14
     * caracteres y no quedaba ningún dígito al azar: dos fichas del mismo producto (mismo
     * nombre/marca/modelo/capacidad, el caso típico de la duplicación de fichas por precio,
     * ver CompraController::store()) generaban el código IDÉNTICO siempre, no a veces. Esto ya
     * había pasado en 5 productos reales antes de este fix (2026-09-28) — ver
     * generarYGuardarDefault(), que además revisa que el código no exista todavía.
     */
    public static function generarCodigoBarras($producto)
    {
        $nombre = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->nombre_producto)), 0, 3);
        $marca = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->marca_producto ?? '')), 0, 3);
        $modelo = substr(strtoupper(preg_replace('/[^a-zA-Z]/', '', $producto->modelo_producto ?? '')), 0, 3);
        $capacidad = preg_replace('/[^0-9]/', '', $producto->capacidad_producto ?? '');

        $nombre = str_pad($nombre, 3, 'X');
        $marca = str_pad($marca, 3, 'X');
        $modelo = str_pad($modelo, 3, 'X');

        $parteFija = substr($nombre.$marca.$modelo.$capacidad, 0, 10);

        $digitosAleatorios = 14 - strlen($parteFija);
        $min = (int) pow(10, $digitosAleatorios - 1);
        $max = (int) pow(10, $digitosAleatorios) - 1;

        return $parteFija.rand($min, $max);
    }

    /**
     * Genera la imagen del código de barras y devuelve la ruta
     */
    public static function generarImagenBarcode($codigo)
    {
        $directory = public_path('barcodes');
        if (! file_exists($directory)) {
            mkdir($directory, 0755, true);
        }

        if (empty($codigo)) {
            throw new Exception('El código para generar el código de barras está vacío');
        }

        $barcodePNG = DNS1D::getBarcodePNG($codigo, 'C128', 2, 60, [0, 0, 0], true);

        if (empty($barcodePNG)) {
            throw new Exception('No se pudo generar la imagen del código de barras');
        }

        $imageData = base64_decode($barcodePNG);

        if ($imageData === false) {
            throw new Exception('Error al decodificar la imagen del código de barras');
        }

        $fileName = $codigo.'.png';
        $fullPath = $directory.'/'.$fileName;

        $saved = file_put_contents($fullPath, $imageData);

        if ($saved === false) {
            throw new Exception('No se pudo guardar la imagen del código de barras en el almacenamiento');
        }

        return 'barcodes/'.$fileName;
    }

    /**
     * Helper genérico para crear un código autogenerado para un producto.
     */
    public static function generarYGuardarDefault(Producto $producto, int $cantidad = 0)
    {
        // El sufijo al azar hace la colisión improbable, no imposible — se revisa contra la
        // tabla y se reintenta hasta encontrar uno libre, así queda garantizado siempre.
        do {
            $codigo_texto = self::generarCodigoBarras($producto);
        } while (self::where('codigo_barras', $codigo_texto)->exists());

        $imagen = null;

        try {
            $imagen = self::generarImagenBarcode($codigo_texto);
        } catch (Exception $e) {
            logger()->error('Error generando imagen de código de barras: '.$e->getMessage());
        }

        return self::create([
            'producto_id' => $producto->id,
            'codigo_barras' => $codigo_texto,
            'cantidad' => $cantidad,
            'es_default' => true,
            'imagen_barcode' => $imagen,
        ]);
    }
}
