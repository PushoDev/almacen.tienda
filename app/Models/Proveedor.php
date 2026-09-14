<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    use HasFactory;

    protected $primaryKey = 'id';

    protected $fillable = [
        'nombre_proveedor',
        'telefono_proveedor',
        'correo_proveedor',
        'localidad_proveedor',
        'notas_proveedor',
        'saldo_proveedor',
    ];

    protected $casts = [
        'saldo_proveedor' => 'decimal:2',
    ];

    // Validación similar a la de Cliente para el saldo
    public function setSaldoProveedorAttribute($value)
    {
        if (! is_null($value) && (! is_numeric($value) || $value < -9999999 || $value > 9999999)) {
            throw new \InvalidArgumentException('El valor del saldo debe estar entre -9999999 y 9999999');
        }
        $this->attributes['saldo_proveedor'] = $value;
    }

    // En el modelo Proveedor, actualiza los scopes:
    public function scopeConSaldoPositivo($query)
    {
        return $query->where('saldo_proveedor', '>', 0);
    }

    public function scopeConSaldoNegativo($query)
    {
        return $query->where('saldo_proveedor', '<', 0);
    }

    /**
     * Detalles de los Proveedores
     */
    // Relación: Un proveedor puede tener muchas compras
    public function compras()
    {
        return $this->hasMany(Compra::class);
    }

    // Relación: En cuanto a movimientos financieros
    public function movimientosComoDestino()
    {
        return $this->hasMany(MovimientoFinanciero::class, 'proveedor_destino_id');
    }

    // Relación con remesas donde el proveedor es la entrada
    public function remesasComoEntrada()
    {
        return $this->hasMany(Remesa::class, 'entrada_proveedor_id')
            ->orderBy('fecha_operacion', 'desc');
    }

    // Relación con remesas donde el proveedor es la salida
    public function remesasComoSalida()
    {
        return $this->hasMany(Remesa::class, 'salida_proveedor_id')
            ->orderBy('fecha_operacion', 'desc');
    }
}
