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

    /**
     * Undocumented function
     * ✅ Relación inversa con User
     * @return void
     */
    public function usuarios()
    {
        return $this->belongsToMany(User::class, 'user_almacens')
            ->using(UserAlmacen::class)
            ->withTimestamps();
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
            ->where('almacen_producto.almacen_id', $this->id)
            ->select(
                'productos.id',
                'productos.nombre_producto as nombre',
                DB::raw('SUM(almacen_producto.cantidad) as cantidad_total')
            )
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderBy('productos.nombre_producto')
            ->get();
    }
}
