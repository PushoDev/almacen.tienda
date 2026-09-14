<?php

namespace App\Notifications;

use App\Channels\TelegramChannel;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;

/**
 * Aviso diario a los admins: qué usuarios con rol moderador/vendedor no han
 * registrado su Cierre de Caja hoy. Solo se envía a admin — es información de
 * supervisión, no algo que un moderador/vendedor necesite ver de otros.
 */
class CierresPendientesNotification extends Notification
{
    use Queueable;

    /**
     * @param  Collection<int, User>  $usuariosPendientes
     */
    public function __construct(public Collection $usuariosPendientes) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if ($notifiable->telegram_chat_id && $notifiable->role === 'admin') {
            $channels[] = TelegramChannel::class;
        }

        return $channels;
    }

    /**
     * @return array<string, mixed>
     */
    public function toTelegram(object $notifiable): array
    {
        $lista = $this->usuariosPendientes
            ->map(fn ($u) => "• {$u->name} ({$u->role})")
            ->implode("\n");

        $texto = "🟠 <b>Cierres de Caja Pendientes</b>\n";
        $texto .= "Los siguientes usuarios no han registrado su cierre hoy:\n\n";
        $texto .= $lista."\n\n";
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
            'type' => 'cierres_pendientes',
            'usuarios' => $this->usuariosPendientes->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'role' => $u->role])->values(),
            'title' => 'Cierres de Caja Pendientes',
            'message' => "{$this->usuariosPendientes->count()} usuario(s) no han registrado su cierre hoy.",
            'icon' => 'alert-triangle',
            'color' => 'orange',
        ];
    }
}
