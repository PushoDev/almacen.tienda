<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Notifications\Concerns\EnviaAvisoPush;
use App\Services\FechaNegocio;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

class VentaEspecialSolicitudNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    public $venta;

    public function __construct($venta)
    {
        $this->venta = $venta;
    }

    public function via(object $notifiable): array
    {
        // Push: el admin siempre; el moderador solo si es de tipo 'descuento' (la de 'bajo_costo' solo
        // la decide un admin, avisarle al moderador sería ruido).
        $puedeDecidir = $notifiable->role === 'admin'
            || ($notifiable->role === 'moderador' && $this->venta->tipo_venta_especial === 'descuento');

        $channels = $this->conPushSi(['database'], $notifiable, $puedeDecidir);

        // Telegram: quien puede decidir (con los botones Aprobar/Rechazar). Mismo criterio que el push.
        if ($puedeDecidir && $notifiable->tieneTelegram()) {
            $channels[] = TelegramChannel::class;
        }

        return $channels;
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        return $this->mensajePush(
            'Solicitud de venta especial',
            "{$this->venta->usuario->name} pide aprobar la venta #{$this->venta->id}. Motivo: {$this->venta->nota_venta_especial}",
            route('ventas.show', $this->venta->id),
            'venta-especial-'.$this->venta->id,
        );
    }

    public function toTelegram(object $notifiable): array
    {
        $texto = "🔔 <b>Solicitud de Venta Especial</b>\n\n";
        $texto .= "📋 Venta #: {$this->venta->id}\n";
        $texto .= "👤 Vendedor: {$this->venta->usuario->name}\n";
        $texto .= "📝 Motivo: {$this->venta->nota_venta_especial}\n";
        $texto .= "💵 Total: $ {$this->venta->total}\n";
        $texto .= '🕐 '.FechaNegocio::ahora()->format('d/m/Y H:i');

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
