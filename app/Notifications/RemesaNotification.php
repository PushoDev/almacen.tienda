<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Models\Remesa;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Notificación de Remesa (creación o anulación) — Remesa es admin/moderador-only en
 * todo el resto de la feature, así que a diferencia de MovimientoFinancieroNotification
 * no hace falta distinguir mensaje por "es tu cuenta" (nunca hay un vendedor en la
 * audiencia real de esta notificación).
 */
class RemesaNotification extends Notification
{
    use Queueable;

    public function __construct(public Remesa $remesa, public bool $anulada = false) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        // Remesa es admin/moderador-only en toda la feature (crear, ver, anular) — no
        // basta con confiar en que la lista de destinatarios ya venga filtrada, el
        // chequeo de rol va explícito acá también, mismo criterio que
        // MovimientoFinancieroNotification::via().
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
        $nombreEntrada = $this->remesa->nombre_entrada ?? 'Desconocido';
        $nombreSalida = $this->remesa->nombre_salida ?? 'Desconocido';
        $montoEntrada = number_format((float) $this->remesa->entrada_monto, 2);
        $montoSalida = number_format((float) $this->remesa->salida_monto, 2);

        if ($this->anulada) {
            $icon = '⛔';
            $titulo = 'Remesa Anulada';
        } else {
            $icon = '🟣';
            $titulo = 'Remesa Registrada';
        }

        $texto = "{$icon} <b>{$titulo}</b>\n";
        $texto .= "📥 Entrada: {$this->remesa->entrada_moneda} {$montoEntrada} — {$nombreEntrada}\n";
        $texto .= "📤 Salida: {$this->remesa->salida_moneda} {$montoSalida} — {$nombreSalida}\n";

        if ($this->remesa->mensajero_cuenta_id) {
            $montoMensajero = number_format((float) $this->remesa->mensajero_monto, 2);
            $texto .= "🏍️ Mensajero: {$this->remesa->mensajero_moneda} {$montoMensajero} — {$this->remesa->mensajeroCuenta?->nombre_cuenta}\n";
        }

        if ($this->anulada) {
            $texto .= "❗ Motivo: {$this->remesa->motivo_anulacion}\n";
        }

        $texto .= "👤 Registrado por: {$this->remesa->user->name}\n";
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
            'type' => 'remesa',
            'remesa_id' => $this->remesa->id,
            'anulada' => $this->anulada,
            'title' => $this->anulada ? 'Operación Múltiple Anulada' : 'Operación Múltiple Registrada',
            'message' => $this->anulada
                ? "Operación Múltiple #{$this->remesa->id} anulada por {$this->remesa->user->name}"
                : "Operación Múltiple #{$this->remesa->id} registrada por {$this->remesa->user->name}",
            'icon' => $this->anulada ? 'ban' : 'send',
            'color' => $this->anulada ? 'red' : 'purple',
        ];
    }
}
