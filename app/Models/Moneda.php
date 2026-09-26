<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Moneda extends Model
{
    use HasFactory;

    protected $fillable = [
        'codigo_moneda',
        'nombre_moneda',
        'simbolo_moneda',
        'imagen',
        'tasa_cambio',
        'estado',
        'principal',
    ];

    protected $casts = [
        'tasa_cambio' => 'decimal:2',
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

        // Toda moneda nueva nace con métodos de pago (por defecto los dos y las vías de su ámbito); el CRUD
        // de Monedas luego ajusta cuáles admite.
        static::created(fn (Moneda $moneda) => $moneda->configurarMetodosPorDefecto());
    }

    /**
     * Métodos de pago que admite esta moneda (efectivo / transferencia).
     */
    public function metodosPago(): BelongsToMany
    {
        return $this->belongsToMany(MetodoPago::class, 'moneda_metodo_pago')->orderBy('orden');
    }

    /**
     * Vías de pago que admite esta moneda dentro de la transferencia.
     */
    public function viasPago(): BelongsToMany
    {
        return $this->belongsToMany(ViaPago::class, 'moneda_via_pago')->orderBy('orden');
    }

    /**
     * Configuración inicial: los dos métodos y las vías del ámbito de la moneda — CUP con las cubanas
     * (EnZona, Transfermóvil) y las demás con las internacionales.
     */
    public function configurarMetodosPorDefecto(): void
    {
        $ambito = strtoupper((string) $this->codigo_moneda) === 'CUP' ? 'cuba' : 'internacional';

        $this->metodosPago()->syncWithoutDetaching(MetodoPago::where('activo', true)->pluck('id'));
        $this->viasPago()->syncWithoutDetaching(ViaPago::where('activo', true)->where('ambito', $ambito)->pluck('id'));
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
