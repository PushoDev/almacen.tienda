<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TasaCambioMLC extends Model
{
    use HasFactory;

    protected $table = 'tasamlc_temp';

    protected $fillable = ['tasa_mlc', 'fecha_actualizacion'];

    public $timestamps = false;

    // 💡 CORRECCIÓN 1: Definimos el Accessor para la columna 'tasa_mlc'
    // Esto asegura que el valor siempre se devuelva con 2 decimales (ej: "1.50").
    protected function tasaMlc(): Attribute
    {
        return Attribute::make(
            get: fn (float $value) => number_format($value, 2, '.', ''),
        );
    }

    // Obtener la tasa actual
    public static function getTasaMLC()
    {
        $registro = static::find(1);

        return $registro ? $registro->tasa_mlc : 1.50;
    }
}
