<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Notifications\Concerns\EnviaAvisoPush;
use App\Services\FechaNegocio;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

class CierreCajaNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    /**
     * Create a new notification instance.
     */
    public $cierre;

    /**
     * Create a new notification instance.
     */
    public function __construct($cierre)
    {
        $this->cierre = $cierre;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        // Push: solo admin y moderador (nunca a quien hizo el cierre). La campana no cambia.
        $channels = $this->conPushSi(['database'], $notifiable, $this->esAdminOModerador($notifiable));

        if (! $notifiable->tieneTelegram()) {
            return $channels;
        }

        if ($notifiable->role === 'admin') {
            $channels[] = TelegramChannel::class;
        } elseif ($notifiable->role === 'vendedor') {
            $esSuCuenta = $notifiable->cuentas()->where('cuentas.id', $this->cierre->cuenta_id)->exists();
            if ($esSuCuenta) {
                $channels[] = TelegramChannel::class;
            }
        }

        return $channels;
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        $esDescuadre = abs($this->cierre->diferencia) > 0.01;
        $quien = $this->cierre->usuario->name ?? 'Un usuario';

        return $this->mensajePush(
            $esDescuadre ? 'Cierre de caja con descuadre' : 'Cierre de caja realizado',
            $esDescuadre
                ? "{$quien} cerró la caja con una diferencia de ".number_format(abs($this->cierre->diferencia), 2).'.'
                : "{$quien} cerró la caja sin descuadre.",
            route('ventas.cierres.show', $this->cierre->id),
            'cierre-caja-'.$this->cierre->id,
        );
    }

    public function toTelegram(object $notifiable): array
    {
        $esDescuadre = abs($this->cierre->diferencia) > 0.01;
        $icon = $esDescuadre ? '⚠️' : '✅';
        $diferencia = number_format(abs($this->cierre->diferencia), 2);

        $texto = "{$icon} <b>Cierre de Caja #{$this->cierre->id}</b>\n";
        $texto .= "👤 Vendedor: {$this->cierre->usuario->name}\n";
        $texto .= "💰 Saldo esperado: $ {$this->cierre->saldo_esperado}\n";
        $texto .= "💵 Saldo contado: $ {$this->cierre->saldo_contado}\n";
        $texto .= $esDescuadre
            ? "❌ Descuadre: $ {$diferencia}\n"
            : "✅ Sin descuadre\n";
        $texto .= '🕐 '.FechaNegocio::ahora()->format('d/m/Y H:i');

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
        $esDescuadre = abs($this->cierre->diferencia) > 0.01;

        $base = [
            'type' => 'cierre_caja',
            'cierre_id' => $this->cierre->id,
            'cuenta_id' => $this->cierre->cuenta_id,
            'diferencia' => $this->cierre->diferencia,
            'is_alert' => $esDescuadre,
            'icon' => 'lock',
            'color' => $esDescuadre ? 'red' : 'purple',
        ];

        // Mensaje personalizado según el rol del notificado
        if ($notifiable->role === 'vendedor') {
            // Verificar si es de su cuenta
            $esSuCuenta = $notifiable->cuentas()->where('cuentas.id', $this->cierre->cuenta_id)->exists();

            if ($esSuCuenta) {
                $mensaje = $esDescuadre
                    ? "⚠️ Descuadre en tu cuenta Cierre #{$this->cierre->id}: {$this->cierre->diferencia}"
                    : "Cierre de tu cuenta #{$this->cierre->id} realizado correctamente.";
                $base['message'] = $mensaje;
                $base['title'] = $esDescuadre ? 'Alerta de tu Cuenta' : 'Cierre de tu Cuenta';
                $base['context'] = 'tu_operacion';
                $base['priority'] = $esDescuadre ? 'critical' : 'high';
            } else {
                $mensaje = $esDescuadre
                    ? "⚠️ Descuadre en Cierre #{$this->cierre->id}: {$this->cierre->diferencia}"
                    : "Cierre #{$this->cierre->id} realizado correctamente.";
                $base['message'] = $mensaje;
                $base['title'] = $esDescuadre ? 'Alerta de Cierre' : 'Cierre de Caja';
                $base['context'] = 'general';
            }
        } else {
            // Admin y moderador ven mensaje completo
            $mensaje = $esDescuadre
                ? "⚠️ Descuadre en Cierre #{$this->cierre->id}: {$this->cierre->diferencia}"
                : "Cierre #{$this->cierre->id} realizado correctamente.";
            $base['message'] = $mensaje;
            $base['title'] = $esDescuadre ? 'Alerta de Cierre' : 'Cierre de Caja';
            $base['context'] = 'sistema';
        }

        return $base;
    }
}
