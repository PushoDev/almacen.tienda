<?php

namespace App\Notifications;

use App\Models\TransferenciaPendiente;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Aviso de un envío de dinero que espera confirmación (o de lo que pasó con él). Solo campana: el bot de
 * Telegram para estos envíos queda pendiente de la actualización de notificaciones.
 */
class TransferenciaPendienteNotification extends Notification
{
    use Queueable;

    public function __construct(public TransferenciaPendiente $envio, public string $mensaje) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
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
