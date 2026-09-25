<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportacionBorrador extends Model
{
    use HasFactory;

    protected $table = 'importaciones_borradores';

    protected $fillable = [
        'user_id',
        'almacen_id',
        'nombre_archivo',
        'hash_archivo',
        'filas',
    ];

    /**
     * `filas`: lista de filas editables, cada una con las columnas de la plantilla como texto
     * (ver ProductoBorradorLector::COLUMNAS).
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'filas' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }
}
