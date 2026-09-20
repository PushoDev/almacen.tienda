<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramChannel
{
    public function send(object $notifiable, Notification $notification): void
    {
        $chatId = $notifiable->routeNotificationForTelegram();

        if (empty($chatId)) {
            return;
        }

        if (! method_exists($notification, 'toTelegram')) {
            return;
        }

        $payload = $notification->toTelegram($notifiable);

        if (empty($payload)) {
            return;
        }

        try {
            Telegram::sendMessage(array_merge(['chat_id' => $chatId], $payload));
        } catch (\Exception $e) {
            Log::error('Error enviando notificación Telegram: '.$e->getMessage());
        }
    }
}
