<?php

namespace App\Models;

use Database\Factories\MetodoPagoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Método de pago del catálogo (efectivo / transferencia). Cada moneda elige cuáles admite.
 */
class MetodoPago extends Model
{
    /** @use HasFactory<MetodoPagoFactory> */
    use HasFactory;

    protected $table = 'metodos_pago';

    protected $fillable = ['slug', 'nombre', 'imagen', 'orden', 'activo'];

    protected function casts(): array
    {
        return ['activo' => 'boolean', 'orden' => 'integer'];
    }

    public function monedas(): BelongsToMany
    {
        return $this->belongsToMany(Moneda::class, 'moneda_metodo_pago');
    }

    /**
     * URL del logo (`public/projects/metodos_pago/{imagen}.webp`); null si no tiene imagen.
     */
    public function imagenUrl(): ?string
    {
        return $this->imagen ? asset('projects/metodos_pago/'.$this->imagen.'.webp') : null;
    }
}
