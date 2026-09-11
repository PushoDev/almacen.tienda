---
paths:
  - app/Http/Controllers/TelegramWebhookController.php
---

# Controllers

## Registrar el webhook de Telegram con `secret_token`, nunca con `telegram:webhook --setup`
`TelegramWebhookController::handle()` exige el header `X-Telegram-Bot-Api-Secret-Token` (comparado contra `services.telegram.webhook_secret`) o responde 403. El comando nativo del paquete `php artisan telegram:webhook --setup` (`vendor/irazasyed/telegram-bot-sdk/.../WebhookCommand.php`) NUNCA manda `secret_token` a Telegram — solo `url`/`certificate`/`allowed_updates`. Usarlo deja el webhook registrado pero todo mensaje entrante vuelve con 403 "Wrong response from the webhook", indistinguible a simple vista de un webhook mal registrado.

Para (re)registrar el webhook en producción (ej. después de `migrate:fresh`), usar SIEMPRE una llamada manual que incluya `secret_token`, no el comando `--setup`:

```php
Http::post("https://api.telegram.org/bot" . config('telegram.bots.mybot.token') . "/setWebhook", [
    'url' => config('telegram.bots.mybot.webhook_url'),
    'secret_token' => config('services.telegram.webhook_secret'),
]);
```

`php artisan telegram:webhook --info` sí sirve para diagnosticar (revisa `Last Error Message`).

Además: `migrate:fresh` resetea `users.telegram_chat_id`/`telegram_link_token` de todos los usuarios (no se siembran en `DatabaseSeeder`) — cada admin/moderador debe regenerar su código en Configuración de Perfil y volver a mandar `/vincular CODIGO`. Y las notificaciones salientes van por `QUEUE_CONNECTION=database`, así que el worker de cola debe estar corriendo (Supervisor en producción).
