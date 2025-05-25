<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    use HasFactory;

    // Atributos que pueden ser asignados masivamente
    protected $fillable = [
        'nombre_cliente',
        'telefono_cliente',
        'direccion_cliente',
        'ciudad_cliente',
    ];

    // Desactivar marcas de tiempo si no son necesarias (opcional)
    public $timestamps = true;

    // Relaciones (si las hay en el futuro)
    // Ejemplo: public function ventas() { return $this->hasMany(Venta::class); }
}
