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
        $base = [
            'type' => 'venta_creada',
            'title' => 'Nueva Venta',
            'amount' => $this->venta->total,
            'venta_id' => $this->venta->id,
            'almacen_id' => $this->venta->almacen_id,
            'cuenta_id' => $this->venta->cuenta_id,
            'icon' => 'shopping-cart',
            'color' => 'green'
        ];

        // Mensaje personalizado según el rol del notificado
        if ($notifiable->role === 'vendedor') {
            // Verificar si es en su almacén o cuenta
            $esSuAlmacen = $notifiable->almacenes()->where('almacens.id', $this->venta->almacen_id)->exists();
            $esSuCuenta = $this->venta->cuenta_id && 
                          $notifiable->cuentas()->where('cuentas.id', $this->venta->cuenta_id)->exists();
            
            if ($esSuAlmacen || $esSuCuenta) {
                $base['message'] = "Nueva venta #{$this->venta->id} en tus áreas por {$this->venta->usuario->name}";
                $base['context'] = 'tu_operacion';
                $base['priority'] = 'high';
            } else {
                $base['message'] = "Nueva venta #{$this->venta->id} creada por {$this->venta->usuario->name}";
                $base['context'] = 'general';
            }
        } else {
            // Admin y moderador ven mensaje general
            $base['message'] = "Venta #{$this->venta->id} creada por {$this->venta->usuario->name}";
            $base['context'] = 'sistema';
        }

        return $base;
    }
}
