<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

class ProrrateoRequeridoNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    public $movimiento;

    public function __construct($movimiento)
    {
        $this->movimiento = $movimiento;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = $this->conPushSi(['database'], $notifiable, $this->esAdminOModerador($notifiable));

        if ($this->esAdminOModerador($notifiable) && $notifiable->tieneTelegram()) {
            $channels[] = TelegramChannel::class;
        }

        return $channels;
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        return $this->mensajePush(
            'Prorrateo de costos disponible',
            "Movimiento #{$this->movimiento->id} en tránsito puede prorratear costos (es opcional).",
            route('distribucion-costos.index'),
            'prorrateo-'.$this->movimiento->id,
        );
    }

    /**
     * Get the Telegram representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toTelegram(object $notifiable): array
    {
        $origen = $this->movimiento->almacenOrigen->nombre_almacen ?? 'Desconocido';
        $destino = $this->movimiento->almacenDestino->nombre_almacen ?? 'Desconocido';
        $vendedor = $this->movimiento->usuario->name ?? 'Desconocido';

        $texto = "⚖️ <b>Prorrateo de costos disponible</b>\n";
        $texto .= "Movimiento #{$this->movimiento->id}\n";
        $texto .= "📤 De: {$origen}\n";
        $texto .= "📥 A: {$destino}\n";
        $texto .= "👤 Solicitado por: {$vendedor}\n";
        $texto .= 'Es opcional — se decide desde Distribución de Costos, no bloquea la recepción.';

        return [
            'text' => $texto,
            'parse_mode' => 'HTML',
        ];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'prorrateo_requerido',
            'title' => 'Prorrateo de Costos Disponible',
            'message' => "Movimiento #{$this->movimiento->id} en tránsito puede prorratear costos (opcional).",
            'movimiento_id' => $this->movimiento->id,
            'almacen_origen_id' => $this->movimiento->almacen_origen_id,
            'almacen_destino_id' => $this->movimiento->almacen_destino_id,
            'icon' => 'scale',
            'color' => 'amber',
        ];
    }
}
