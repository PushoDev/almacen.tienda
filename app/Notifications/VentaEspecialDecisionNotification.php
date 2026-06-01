<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VentaEspecialDecisionNotification extends Notification
{
    use Queueable;

    public $venta;
    public $decision;

    public function __construct($venta, string $decision)
    {
        $this->venta    = $venta;
        $this->decision = $decision; // 'aprobada' | 'rechazada'
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $aprobada = $this->decision === 'aprobada';

        return [
            'type'     => 'venta_especial_decision',
            'title'    => $aprobada ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
            'message'  => $aprobada
                ? "Tu solicitud especial #{$this->venta->id} fue aprobada. Ya puedes agregar el receptor para completarla."
                : "Tu solicitud especial #{$this->venta->id} fue rechazada. El stock ha sido revertido.",
            'venta_id' => $this->venta->id,
            'decision' => $this->decision,
            'icon'     => $aprobada ? 'check-circle' : 'x-circle',
            'color'    => $aprobada ? 'green' : 'red',
        ];
    }
}
