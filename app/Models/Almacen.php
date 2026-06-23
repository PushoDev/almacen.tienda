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
        'tipo_almacen',
        'telefono_almacen',
        'correo_almacen',
        'provincia_almacen',
        'ciudad_almacen',
        'notas_almacen',
        'nombre_responsable',
        'apellido_responsable',
        'carnet_responsable',
        'telefono_responsable',
        'mensajero_cuenta_id',
    ];

    /**
     * Undocumented function
     * ✅ Relación inversa con User
     * @return void
     */
    public function usuarios()
    {
        return $this->belongsToMany(User::class, 'user_almacens')
            ->using(UserAlmacen::class);
    }

    // Relación: Productos en el almacén
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'almacen_producto')
            ->withPivot('cantidad');
    }

    // Almacén por defecto
    public static function getDefault()
    {
        return self::where('nombre_almacen', 'Almacén de Conservas')->firstOrFail();
    }

    public function mensajeroCuenta()
    {
        return $this->belongsTo(Cuenta::class, 'mensajero_cuenta_id');
    }

    // Relación: Compras
    public function compras()
    {
        return $this->hasMany(Compra::class);
    }

    /**
     * Obtiene productos con cantidad total en el almacén
     *
     * @return \Illuminate\Support\Collection
     */
    public function getProductosConCantidad()
    {
        return DB::table('almacen_producto')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->leftJoin('categorias', 'productos.categoria_id', '=', 'categorias.id')
            ->where('almacen_producto.almacen_id', $this->id)
            ->select(
                'productos.id',
                'productos.nombre_producto as nombre',
                'productos.marca_producto',
                'productos.modelo_producto',
                'productos.capacidad_producto',
                'productos.codigo_producto',
                'productos.imagen_producto',
                'categorias.nombre_categoria as categoria',
                DB::raw('SUM(almacen_producto.cantidad) as cantidad_total')
            )
            ->groupBy(
                'productos.id',
                'productos.nombre_producto',
                'productos.marca_producto',
                'productos.modelo_producto',
                'productos.capacidad_producto',
                'productos.codigo_producto',
                'productos.imagen_producto',
                'categorias.nombre_categoria'
            )
            ->orderBy('productos.nombre_producto')
            ->get();
    }
}
