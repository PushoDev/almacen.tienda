<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TasaCambio extends Model
{
    //
    use HasFactory;

    protected $table = 'tasa_cambios';
    protected $fillable = ['tasa', 'fecha_actualizacion'];
    public $timestamps = false;

    // Obtiene la tasa actual
    public static function getTasa()
    {
        $registro = static::find(1); // Solo hay un registro
        return $registro ? $registro->tasa : 325.0;
    }

    // Actualiza la tasa manualmente
    public static function setTasa($nuevaTasa)
    {
        $registro = static::find(1);
        if ($registro) {
            $registro->tasa = $nuevaTasa;
            $registro->fecha_actualizacion = now();
            $registro->save();
        } else {
            static::create([
                'tasa' => $nuevaTasa,
                'fecha_actualizacion' => now(),
            ]);
        }
    }
}
