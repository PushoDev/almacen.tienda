<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Models\Venta;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notificación de Devolución de Venta — solo se dispara cuando una venta ya
 * COMPLETADA se revierte (VentaController::anularVenta()). Anular una venta
 * pendiente nunca movió dinero real, así que no dispara esta notificación.
 */
class VentaDevueltaNotification extends Notification
{
    use Queueable;

    public function __construct(public Venta $venta) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // Mismo criterio que RemesaNotification/MovimientoFinancieroNotification::via()
        // — admin y moderador reciben Telegram, el chequeo de rol va explícito acá
        // también (ver bug B10 en docs/ESTADO_DESARROLLO.md).
        if ($notifiable->telegram_chat_id && in_array($notifiable->role, ['admin', 'moderador'])) {
            $channels[] = TelegramChannel::class;
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function toTelegram(object $notifiable): array
    {
        $monto = number_format((float) $this->venta->total, 2);
        $moneda = $this->venta->moneda?->codigo_moneda ?? '';

        $texto = "🟠 <b>Venta Devuelta</b>\n";
        $texto .= "🧾 Venta #{$this->venta->id}\n";
        $texto .= "💰 Monto: {$moneda} {$monto}\n";
        $texto .= "❗ Motivo: {$this->venta->motivo_anulacion}\n";
        if ($this->venta->detalle_anulacion) {
            $texto .= "📝 Detalle: {$this->venta->detalle_anulacion}\n";
        }
        $texto .= "👤 Procesado por: {$this->venta->usuario->name}\n";
        $texto .= '🕐 '.now()->format('d/m/Y H:i');

        return [
            'text' => $texto,
            'parse_mode' => 'HTML',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'venta_devuelta',
            'venta_id' => $this->venta->id,
            'title' => 'Venta Devuelta',
            'message' => "Venta #{$this->venta->id} devuelta por {$this->venta->usuario->name}",
            'icon' => 'undo',
            'color' => 'orange',
        ];
    }
}
