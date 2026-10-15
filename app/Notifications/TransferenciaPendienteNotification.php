<?php

namespace App\Notifications;

use App\Models\TransferenciaPendiente;
use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Aviso de un envío de dinero que espera confirmación (o de lo que pasó con él). Solo campana: el bot de
 * Telegram para estos envíos queda pendiente de la actualización de notificaciones.
 */
class TransferenciaPendienteNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    /**
     * @param  bool  $requiereAccion  true solo en el aviso de un envío recién registrado, que alguien debe
     *                                confirmar: es el único que va por push; lo que pasó después queda en la campana.
     */
    public function __construct(public TransferenciaPendiente $envio, public string $mensaje, public bool $requiereAccion = false) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->conPushSi(['database'], $notifiable, $this->requiereAccion);
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        return $this->mensajePush(
            'Envío de dinero por confirmar',
            $this->mensaje,
            route('transacciones.envios.index'),
            'envio-'.$this->envio->id,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'transferencia_pendiente',
            'title' => 'Envío de dinero',
            'message' => $this->mensaje,
            'transferencia_pendiente_id' => $this->envio->id,
            'estado' => $this->envio->estado,
        ];
    }
}
