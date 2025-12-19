<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MovimientoStockNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public $movimiento;
    public $mensaje;

    /**
     * Create a new notification instance.
     */
    public function __construct($movimiento, $mensaje = null)
    {
        $this->movimiento = $movimiento;
        $this->mensaje = $mensaje ?? "Movimiento #{$movimiento->id} actualizado: {$movimiento->estado}";
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
            'type' => 'movimiento_stock',
            'title' => 'Movimiento de Inventario',
            'message' => $this->mensaje,
            'movimiento_id' => $this->movimiento->id,
            'estado' => $this->movimiento->estado,
            'icon' => 'truck',
            'color' => 'blue'
        ];
    }
}
