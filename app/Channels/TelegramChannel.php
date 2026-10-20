<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramChannel
{
    /**
     * Envía el mensaje a TODOS los Telegram vinculados del usuario (los responsables de turno de una
     * misma cuenta). Si uno falla no se corta el envío a los demás.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $chats = (array) $notifiable->routeNotificationForTelegram();

        if ($chats === []) {
            return;
        }

        if (! method_exists($notification, 'toTelegram')) {
            return;
        }

        $payload = $notification->toTelegram($notifiable);

        if (empty($payload)) {
            return;
        }

        foreach ($chats as $chatId) {
            try {
                Telegram::sendMessage(array_merge(['chat_id' => $chatId], $payload));
            } catch (\Exception $e) {
                Log::error("Error enviando notificación Telegram al chat {$chatId}: ".$e->getMessage());
            }
        }
    }
}
