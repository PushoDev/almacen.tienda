<?php

namespace App\Notifications;

use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

class MovimientoStockNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

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
        return $this->conPushSi(['database'], $notifiable, $this->correspondePush($notifiable));
    }

    /**
     * Push solo cuando el movimiento exige acción o algo salió mal: al enviarse (lo recibe el destino)
     * y al llegar con discrepancia o ser rechazado (lo ve el origen). Creado, editado y recibido
     * completo quedan solo en la campana. Admin y moderador reciben los tres.
     */
    private function correspondePush(object $notifiable): bool
    {
        $esDeDestino = fn (): bool => $this->movimiento->almacen_destino_id
            && $notifiable->almacenes()->where('almacens.id', $this->movimiento->almacen_destino_id)->exists();
        $esDeOrigen = fn (): bool => $this->movimiento->almacen_origen_id
            && $notifiable->almacenes()->where('almacens.id', $this->movimiento->almacen_origen_id)->exists();

        return match ($this->movimiento->estado) {
            'en_transito' => $this->esAdminOModerador($notifiable) || $esDeDestino(),
            'recibido_parcial', 'rechazado' => $this->esAdminOModerador($notifiable) || $esDeOrigen(),
            default => false,
        };
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        $titulo = match ($this->movimiento->estado) {
            'en_transito' => 'Movimiento en camino',
            'recibido_parcial' => 'Movimiento recibido con discrepancia',
            'rechazado' => 'Movimiento rechazado',
            default => 'Movimiento de inventario',
        };

        return $this->mensajePush(
            $titulo,
            $this->mensaje,
            route('movimientos.show', $this->movimiento->id),
            'movimiento-'.$this->movimiento->id,
        );
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
            'color' => 'blue',
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
