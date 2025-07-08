<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Venta extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'almacen_id',
        'cliente_id',
        'total',
        'detalles_venta',
    ];

    protected $casts = [
        'total' => 'decimal:2',
    ];

    // Relación con el usuario que realizó la venta
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Relación con el almacén donde se realizó la venta
    public function almacen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class);
    }

    // Relación opcional con cliente (si usas clientes)
    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    // Relación con los productos vendidos (venta_detalle)
    public function detalles(): HasMany
    {
        return $this->hasMany(VentaDetalle::class);
    }

    // Relación con los pagos realizados
    public function pagos(): HasMany
    {
        return $this->hasMany(PagoVenta::class);
    }
}
