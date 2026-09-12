<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cuenta extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';

    protected $table = 'cuentas';

    protected $fillable = [
        'nombre_cuenta',
        'saldo_cuenta',
        'tipo_moneda',
        'tipo_cuenta',
        'moneda_id',
        'notas_cuenta',
        'tipo',
        'estado',
        'tipo_titular',
        'imagen',
        'tipo_banco',
    ];

    protected $casts = [
        'saldo_cuenta' => 'double',
        'estado' => 'string',
        'tipo_cuenta' => 'string',
        'tipo_moneda' => 'string',
        'tipo' => 'string',
        'tipo_titular' => 'string',
    ];

    // Relacion con las monedas
    public function moneda(): BelongsTo
    {
        return $this->belongsTo(Moneda::class);
    }

    // Relación muchos a muchos con usuarios
    public function users()
    {
        return $this->belongsToMany(User::class, 'user_cuentas');
    }

    // Relación con compras (opcional) - MANTENIDA
    public function compras()
    {
        return $this->belongsToMany(Compra::class, 'compra_pago')
            ->withPivot('monto');
    }

    // NUEVAS RELACIONES con Movimientos Financieros
    public function movimientosOrigen()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cuenta_origen_id');
    }

    public function movimientosDestino()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'cuenta_destino_id');
    }
}
