<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CierreCaja extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cierre_cajas';

    protected $fillable = [
        'user_id',
        'revisor_id',
        'fecha_apertura',
        'fecha_cierre',
        'saldo_inicial',
        'ventas_efectivo',
        'ventas_otros',
        'total_gastos',
        'total_devoluciones',
        'saldo_esperado',
        'saldo_contado',
        'diferencia',
        'observaciones',
        'comprobante_url',
        'estado',
        'detalles',
    ];

    protected $casts = [
        'fecha_apertura' => 'datetime',
        'fecha_cierre' => 'datetime',
        'saldo_inicial' => 'decimal:2',
        'ventas_efectivo' => 'decimal:2',
        'ventas_otros' => 'decimal:2',
        'total_gastos' => 'decimal:2',
        'total_devoluciones' => 'decimal:2',
        'saldo_esperado' => 'decimal:2',
        'saldo_contado' => 'decimal:2',
        'diferencia' => 'decimal:2',
        'detalles' => 'array',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function revisor()
    {
        return $this->belongsTo(User::class, 'revisor_id');
    }

    public function tieneDiferencia(): bool
    {
        return abs($this->diferencia) > 0.01;
    }
}
