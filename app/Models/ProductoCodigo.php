<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Milon\Barcode\Facades\DNS1DFacade as DNS1D;
use Exception;

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
     * Genera el código de barras automáticamente (texto)
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

        $parteFija = $nombre . $marca . $modelo . $capacidad;

        if (strlen($parteFija) > 14) {
            $parteFija = substr($parteFija, 0, 14);
        }

        $longitudFija = strlen($parteFija);
        $digitosAleatoriosNecesarios = 14 - $longitudFija;

        $numerosAleatorios = '';
        if ($digitosAleatoriosNecesarios > 0) {
            $min = pow(10, $digitosAleatoriosNecesarios - 1);
            $max = pow(10, $digitosAleatoriosNecesarios) - 1;
            $numerosAleatorios = rand($min, $max);
        }

        $codigo = $parteFija . $numerosAleatorios;

        return substr($codigo, 0, 14);
    }

    /**
     * Genera la imagen del código de barras y devuelve la ruta
     */
    public static function generarImagenBarcode($codigo)
    {
        $directory = public_path('barcodes');
        if (!file_exists($directory)) {
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

        $fileName = $codigo . '.png';
        $fullPath = $directory . '/' . $fileName;

        $saved = file_put_contents($fullPath, $imageData);

        if ($saved === false) {
            throw new Exception('No se pudo guardar la imagen del código de barras en el almacenamiento');
        }

        return 'barcodes/' . $fileName;
    }

    /**
     * Helper genérico para crear un código autogenerado para un producto.
     */
    public static function generarYGuardarDefault(Producto $producto, int $cantidad = 0)
    {
        $codigo_texto = self::generarCodigoBarras($producto);
        $imagen = null;

        try {
            $imagen = self::generarImagenBarcode($codigo_texto);
        } catch (Exception $e) {
            logger()->error('Error generando imagen de código de barras: ' . $e->getMessage());
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
