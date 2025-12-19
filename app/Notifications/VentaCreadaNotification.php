<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VentaCreadaNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public $venta;

    /**
     * Create a new notification instance.
     */
    public function __construct($venta)
    {
        $this->venta = $venta;
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
        return [
            'type' => 'venta_creada',
            'title' => 'Nueva Venta',
            'message' => "Venta #{$this->venta->id} creada por {$this->venta->usuario->name}",
            'amount' => $this->venta->total,
            'venta_id' => $this->venta->id,
            'icon' => 'shopping-cart',
            'color' => 'green'
        ];
    }
}
