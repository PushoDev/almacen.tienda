<?php

namespace App\Models;

use Database\Factories\ViaPagoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Vía de pago del catálogo: el canal que se usa dentro de una transferencia (Zelle, EnZona,
 * Transfermóvil…). Cada moneda elige cuáles admite.
 */
class ViaPago extends Model
{
    /** @use HasFactory<ViaPagoFactory> */
    use HasFactory;

    protected $table = 'vias_pago';

    protected $fillable = ['slug', 'nombre', 'imagen', 'ambito', 'orden', 'activo'];

    protected function casts(): array
    {
        return ['activo' => 'boolean', 'orden' => 'integer'];
    }

    public function monedas(): BelongsToMany
    {
        return $this->belongsToMany(Moneda::class, 'moneda_via_pago');
    }

    /**
     * URL del logo. Una `imagen` sin carpeta está en `public/projects/metodos_pago/`; con carpeta
     * (`card_interacionales/Zelle`) reutiliza la imagen de otro catálogo de `public/projects/`.
     *
     * Sin `imagen` asignada, si existe `public/projects/metodos_pago/{slug}.webp` se usa ese archivo: para
     * agregar el logo de una vía nueva basta con guardarlo con el nombre de su slug. Sin archivo, null (el
     * CRUD muestra un ícono).
     */
    public function imagenUrl(): ?string
    {
        if ($this->imagen) {
            $ruta = str_contains($this->imagen, '/') ? $this->imagen : 'metodos_pago/'.$this->imagen;

            return asset('projects/'.$ruta.'.webp');
        }

        return file_exists(public_path('projects/metodos_pago/'.$this->slug.'.webp'))
            ? asset('projects/metodos_pago/'.$this->slug.'.webp')
            : null;
    }
}
