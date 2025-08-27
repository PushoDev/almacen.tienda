<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TasaCambioMLC extends Model
{
    //
    use HasFactory;

    protected $table = 'tasamlc_temp';

    protected $fillable = ['tasa_mlc', 'fecha_actualizacion'];

    public $timestamps = false;

    // Obtener la tasa actual
    public static function getTasaMLC()
    {
        $registro = static::find(1);
        return $registro ? $registro->tasa : 1.50;
    }
}
