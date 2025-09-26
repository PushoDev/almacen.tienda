<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TasaCambio extends Model
{
    use HasFactory;

    protected $table = 'tasa_cambios';
    
    // ACTUALIZADO: Para incluir las monedas base y destino
    protected $fillable = ['moneda_base', 'moneda_destino', 'tasa', 'fecha_actualizacion'];
    
    // Cambiamos a 'true' ya que incluimos $table->timestamps() en la migración modificada.
    public $timestamps = true; 

    /**
     * Obtiene la tasa para un par específico de monedas.
     * @param string $base Moneda base (ej: 'USD')
     * @param string $destino Moneda destino (ej: 'CUP')
     * @return float|null
     */
    public static function getTasa($base, $destino): ?float
    {
        // Si las monedas son iguales, la tasa es 1.0 por definición
        if ($base === $destino) {
            return 1.0;
        }

        $registro = static::where('moneda_base', $base)
                          ->where('moneda_destino', $destino)
                          ->first();
                          
        // Devolvemos la tasa o null si no se encuentra
        return $registro ? (float) $registro->tasa : null;
    }

    /**
     * Actualiza o crea la tasa para un par específico.
     */
    public static function setTasa($base, $destino, $nuevaTasa): void
    {
        static::updateOrCreate(
            ['moneda_base' => $base, 'moneda_destino' => $destino],
            ['tasa' => $nuevaTasa, 'fecha_actualizacion' => now()]
        );
    }
}