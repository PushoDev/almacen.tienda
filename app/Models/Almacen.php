<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class Almacen extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';
    protected $table = 'almacens';

    protected $fillable = [
        'nombre_almacen',
        'telefono_almacen',
        'correo_almacen',
        'provincia_almacen',
        'ciudad_almacen',
        'notas_almacen'
    ];




    // Relacion: Tabla de los productos
    public function productos()
    {
        return $this->hasMany(Producto::class);
    }

    // Relación: Un almacén puede tener muchas compras
    public function compras()
    {
        return $this->hasMany(Compra::class);
    }

    // Listar los Productos por almacen
    public function getProductosConCantidad()
    {
        return DB::table('compra_producto')
            ->join('compras', 'compra_producto.compra_id', '=', 'compras.id')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->where('compras.almacen_id', $this->id)
            ->select(
                'productos.id',
                'productos.nombre_producto as nombre',
                DB::raw('SUM(compra_producto.cantidad) as cantidad_total')
            )
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderBy('nombre')
            ->get();
    }
}
