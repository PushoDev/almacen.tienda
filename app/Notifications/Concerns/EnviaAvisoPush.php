<?php

namespace App\Notifications\Concerns;

use Illuminate\Support\Facades\Auth;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Piezas comunes de los avisos push (navegador). Solo se usa en las notificaciones que exigen una
 * acción del usuario: el resto queda en la campana. Cada notificación decide en su `via()` a quién
 * le corresponde; este trait agrega el canal y descarta a quien hizo la acción.
 */
trait EnviaAvisoPush
{
    /**
     * Agrega el canal push si corresponde y el destinatario no es quien hizo la acción.
     *
     * @param  array<int, string>  $canales
     * @return array<int, string>
     */
    protected function conPushSi(array $canales, object $notifiable, bool $corresponde): array
    {
        if ($corresponde && ! $this->esQuienHizoLaAccion($notifiable)) {
            $canales[] = WebPushChannel::class;
        }

        return $canales;
    }

    /**
     * Todas las notificaciones push se disparan dentro de la petición de quien actúa, así que el
     * usuario autenticado es el autor. Sin sesión (scheduler, bot) nadie queda excluido.
     */
    protected function esQuienHizoLaAccion(object $notifiable): bool
    {
        $autorId = Auth::id();

        return $autorId !== null && $autorId === $notifiable->getKey();
    }

    protected function esAdminOModerador(object $notifiable): bool
    {
        return in_array($notifiable->role, ['admin', 'moderador'], true);
    }

    protected function mensajePush(string $titulo, string $cuerpo, string $url, string $tag): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($titulo)
            ->icon('/apple-touch-icon.png')
            ->body($cuerpo)
            ->tag($tag)
            ->data(['url' => $url]);
    }
}
