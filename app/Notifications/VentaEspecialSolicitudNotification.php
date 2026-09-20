<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class VentaEspecialSolicitudNotification extends Notification
{
    use Queueable;

    public $venta;

    public function __construct($venta)
    {
        $this->venta = $venta;
    }

    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if ($notifiable->role === 'admin' && $notifiable->telegram_chat_id) {
            $channels[] = TelegramChannel::class;
        }

        return $channels;
    }

    public function toTelegram(object $notifiable): array
    {
        $texto = "🔔 <b>Solicitud de Venta Especial</b>\n\n";
        $texto .= "📋 Venta #: {$this->venta->id}\n";
        $texto .= "👤 Vendedor: {$this->venta->usuario->name}\n";
        $texto .= "📝 Motivo: {$this->venta->nota_venta_especial}\n";
        $texto .= "💵 Total: $ {$this->venta->total}\n";
        $texto .= '🕐 '.now()->format('d/m/Y H:i');

        return [
            'text' => $texto,
            'parse_mode' => 'HTML',
            'reply_markup' => json_encode([
                'inline_keyboard' => [[
                    ['text' => '✅ Aprobar',  'callback_data' => "aprobar_venta:{$this->venta->id}"],
                    ['text' => '❌ Rechazar', 'callback_data' => "rechazar_venta:{$this->venta->id}"],
                ]],
            ]),
        ];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'venta_especial_solicitud',
            'title' => 'Solicitud de Venta Especial',
            'message' => "El vendedor {$this->venta->usuario->name} solicita una venta especial #{$this->venta->id}. Motivo: {$this->venta->nota_venta_especial}",
            'venta_id' => $this->venta->id,
            'icon' => 'alert-triangle',
            'color' => 'amber',
            'priority' => 'high',
        ];
    }
}
