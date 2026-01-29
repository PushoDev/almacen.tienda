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
        $base = [
            'type' => 'movimiento_stock',
            'title' => 'Movimiento de Inventario',
            'message' => $this->mensaje,
            'movimiento_id' => $this->movimiento->id,
            'estado' => $this->movimiento->estado,
            'almacen_origen_id' => $this->movimiento->almacen_origen_id,
            'almacen_destino_id' => $this->movimiento->almacen_destino_id,
            'icon' => 'truck',
            'color' => 'blue'
        ];

        // Mensaje personalizado según el rol del notificado
        if ($notifiable->role === 'vendedor') {
            // Verificar si involucra sus almacenes
            $esSuAlmacenOrigen = $this->movimiento->almacen_origen_id && 
                                $notifiable->almacenes()->where('almacens.id', $this->movimiento->almacen_origen_id)->exists();
            $esSuAlmacenDestino = $this->movimiento->almacen_destino_id && 
                                 $notifiable->almacenes()->where('almacens.id', $this->movimiento->almacen_destino_id)->exists();
            
            if ($esSuAlmacenOrigen || $esSuAlmacenDestino) {
                $base['message'] = "Movimiento #{$this->movimiento->id} en tus áreas: {$this->movimiento->estado}";
                $base['context'] = 'tu_operacion';
                $base['priority'] = 'high';
            } else {
                $base['message'] = "Movimiento #{$this->movimiento->id}: {$this->movimiento->estado}";
                $base['context'] = 'general';
            }
        } else {
            // Admin y moderador ven mensaje general
            $base['message'] = $this->mensaje;
            $base['context'] = 'sistema';
        }

        return $base;
    }
}
