<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Moneda extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_moneda',
        'nombre_moneda',
        'simbolo_moneda',
        'imagen',
        'tasa_cambio',
        'commission',
        'estado',
        'principal',
    ];

    protected $casts = [
        'tasa_cambio' => 'decimal:2',
        'commission' => 'decimal:2',
        'estado' => 'boolean',
        'principal' => 'boolean',
    ];

    protected static function booted()
    {
        static::saving(function ($moneda) {
            // Si se marca como principal, quitar principal de otras monedas
            if ($moneda->principal) {
                self::where('id', '!=', $moneda->id)->update(['principal' => false]);
            }
        });
    }

    /**
     * Scope para monedas activas
     */
    public function scopeActivas($query)
    {
        return $query->where('estado', true);
    }

    /**
     * Scope para moneda principal
     */
    public function scopePrincipal($query)
    {
        return $query->where('principal', true);
    }
}
