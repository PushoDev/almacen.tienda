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
        'comisiones_gestor',
        'comisiones_gestor_detalles',
        'saldo_esperado',
        'saldo_contado',
        'diferencia',
        'observaciones',
        'estado',
        'detalles',
        'arqueo_detalles',
        'confirmacion_transferencias',
    ];

    protected $casts = [
        'fecha_apertura' => 'datetime',
        'fecha_cierre' => 'datetime',
        // Usar floats para que JSON entregue números y el frontend pueda usar toFixed sin conversiones
        'saldo_inicial' => 'float',
        'ventas_efectivo' => 'float',
        'ventas_otros' => 'float',
        'total_gastos' => 'float',
        'total_devoluciones' => 'float',
        'comisiones_gestor' => 'float',
        'saldo_esperado' => 'float',
        'saldo_contado' => 'float',
        'diferencia' => 'float',
        'detalles' => 'array',
        'arqueo_detalles' => 'array',
        'confirmacion_transferencias' => 'array',
        'comisiones_gestor_detalles' => 'array',
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
