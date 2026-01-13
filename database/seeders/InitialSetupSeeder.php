<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Producto;

class InitialSetupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear un almacén por defecto si no existe
        $almacen = Almacen::firstOrCreate([
            'nombre_almacen' => 'Almacén Principal'
        ], [
            'tipo_almacen' => 'almacen',
            'telefono_almacen' => '0000000000',
        ]);

        // Crear categoría por defecto
        $categoria = Categoria::firstOrCreate([
            'nombre_categoria' => 'General'
        ], [
            'descripcion_categoria' => 'Categoría por defecto',
            'activar_categoria' => true,
        ]);

        // Crear un producto por defecto si no existen
        if (Producto::count() === 0) {
            $producto = Producto::create([
                'nombre_producto' => 'Producto de ejemplo',
                'marca_producto' => 'Marca',
                'modelo_producto' => 'Modelo',
                'capacidad_producto' => null,
                'categoria_id' => $categoria->id,
                'precio_compra_producto' => 0,
                'precio_venta_actualizado' => 0,
                'descripcion_producto' => 'Producto creado automáticamente tras despliegue.',
                'imagen_producto' => 'productos/producto-default.png',
                'activo' => true,
            ]);

            // Asociar al almacén con cantidad 0
            $producto->almacenes()->attach($almacen->id, ['cantidad' => 0]);
        }
    }
}
