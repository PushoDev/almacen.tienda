<?php


namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DestinatarioVenta extends Model
{
    protected $table = 'destinatarios_venta';

    protected $fillable = [
        'venta_id',
        'nombre',
        'apellidos',
        'carnet_identidad',
        'direccion_residencia',
        'telefono_contacto',
        'parentesco_cliente',
        'observaciones'
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class);
    }
}
