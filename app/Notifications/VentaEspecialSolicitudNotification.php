<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VentaEspecialSolicitudNotification extends Notification
{
    use Queueable;

    public $venta;

    public function __construct($venta)
    {
        $this->venta = $venta;
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type'      => 'venta_especial_solicitud',
            'title'     => 'Solicitud de Venta Especial',
            'message'   => "El vendedor {$this->venta->usuario->name} solicita una venta especial #{$this->venta->id}. Motivo: {$this->venta->nota_venta_especial}",
            'venta_id'  => $this->venta->id,
            'icon'      => 'alert-triangle',
            'color'     => 'amber',
            'priority'  => 'high',
        ];
    }
}
