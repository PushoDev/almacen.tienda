<?php

namespace App\Notifications;

use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

class VentaEspecialDecisionNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    public $venta;

    public $decision;

    public function __construct($venta, string $decision)
    {
        $this->venta = $venta;
        $this->decision = $decision; // 'aprobada' | 'rechazada'
    }

    public function via(object $notifiable): array
    {
        // Solo la recibe el vendedor que pidió la venta, que está esperando la respuesta.
        return $this->conPushSi(['database'], $notifiable, true);
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        $aprobada = $this->decision === 'aprobada';

        return $this->mensajePush(
            $aprobada ? 'Solicitud aprobada' : 'Solicitud rechazada',
            $aprobada
                ? "Tu solicitud especial #{$this->venta->id} fue aprobada. Ya puedes completarla."
                : "Tu solicitud especial #{$this->venta->id} fue rechazada.",
            route('ventas.show', $this->venta->id),
            'venta-especial-'.$this->venta->id,
        );
    }

    public function toArray(object $notifiable): array
    {
        $aprobada = $this->decision === 'aprobada';

        return [
            'type' => 'venta_especial_decision',
            'title' => $aprobada ? 'Solicitud Aprobada' : 'Solicitud Rechazada',
            'message' => $aprobada
                ? "Tu solicitud especial #{$this->venta->id} fue aprobada. Ya puedes agregar el receptor para completarla."
                : "Tu solicitud especial #{$this->venta->id} fue rechazada. El stock ha sido revertido.",
            'venta_id' => $this->venta->id,
            'decision' => $this->decision,
            'icon' => $aprobada ? 'check-circle' : 'x-circle',
            'color' => $aprobada ? 'green' : 'red',
        ];
    }
}
