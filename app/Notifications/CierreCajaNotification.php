<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CierreCajaNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public $cierre;

    /**
     * Create a new notification instance.
     */
    public function __construct($cierre)
    {
        $this->cierre = $cierre;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $esDescuadre = abs($this->cierre->diferencia) > 0.01;
        $mensaje = $esDescuadre
            ? "⚠️ Descuadre en Cierre #{$this->cierre->id}: {$this->cierre->diferencia}"
            : "Cierre #{$this->cierre->id} realizado correctamente.";

        return [
            'type' => 'cierre_caja',
            'title' => $esDescuadre ? 'Alerta de Cierre' : 'Cierre de Caja',
            'message' => $mensaje,
            'cierre_id' => $this->cierre->id,
            'diferencia' => $this->cierre->diferencia,
            'is_alert' => $esDescuadre,
            'icon' => 'lock',
            'color' => $esDescuadre ? 'red' : 'purple'
        ];
    }
}
