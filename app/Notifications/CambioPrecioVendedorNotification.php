<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class CambioPrecioVendedorNotification extends Notification
{
    use Queueable;

    public $producto;
    public $almacen;
    public $vendedor;
    public $precioAnterior;
    public $precioNuevo;

    public function __construct($producto, $almacen, $vendedor, $precioAnterior, $precioNuevo)
    {
        $this->producto = $producto;
        $this->almacen = $almacen;
        $this->vendedor = $vendedor;
        $this->precioAnterior = $precioAnterior;
        $this->precioNuevo = $precioNuevo;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'cambio_precio',
            'title' => 'Cambio de Precio por Vendedor',
            'message' => "El vendedor {$this->vendedor->name} cambió el precio del producto {$this->producto->nombre_producto} en el almacén {$this->almacen->nombre_almacen}",
            'producto_id' => $this->producto->id,
            'producto_nombre' => $this->producto->nombre_producto,
            'almacen_id' => $this->almacen->id,
            'almacen_nombre' => $this->almacen->nombre_almacen,
            'vendedor_id' => $this->vendedor->id,
            'vendedor_nombre' => $this->vendedor->name,
            'precio_anterior' => $this->precioAnterior,
            'precio_nuevo' => $this->precioNuevo,
            'icon' => 'dollar-sign',
            'color' => 'amber'
        ];
    }
}
