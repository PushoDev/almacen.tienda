<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Producto;

class RegenerarBarcodeImages extends Command
{
    protected $signature = 'productos:regenerar-barcodes';
    protected $description = 'Regenera imágenes de códigos de barras que no existen';

    public function handle()
    {
        $productos = Producto::all();

        foreach ($productos as $producto) {
            if ($producto->codigo_producto && !$producto->barcodeImageExists()) {
                $producto->regenerarBarcodeImage();
                $this->info("Imagen regenerada para producto: {$producto->nombre_producto}");
            }
        }

        $this->info('Regeneración completada.');
    }
}
