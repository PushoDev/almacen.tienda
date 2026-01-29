<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CierreCajaNotification extends Notification
{
    use Queueable;

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
        return ['database'];
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
            'color' => $esDescuadre ? 'red' : 'purple'
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
