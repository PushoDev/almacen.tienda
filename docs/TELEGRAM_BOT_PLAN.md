# Plan de Implementación — Bot de Telegram

**Rama:** `feature/bot-telegram`  
**Fecha de implementación:** 2026-06-02  
**Alcance inicial:** Solo usuarios con rol `admin`

---

## Qué va a hacer el bot (alcance día 1)

| Funcionalidad | Dirección | Descripción |
|---|---|---|
| Notificación de cierre de caja | Push → Admin | Se envía automáticamente cuando un vendedor cierra caja |
| Notificación de venta especial (solicitud) | Push → Admin | Mensaje con botones **[✅ Aprobar] [❌ Rechazar]** |
| Aprobar / Rechazar venta especial | Botón → Acción | Admin toca el botón → se ejecuta la lógica en el backend |
| Reporte del día por almacén | Comando `/reporte` | Admin escribe el comando y recibe ventas del día agrupadas por almacén |

---

## Por qué usar el paquete `irazasyed/telegram-bot-sdk`

Sin paquete puedes enviar mensajes simples con `Http::post()`. Pero en cuanto necesitas:

- **Inline keyboards** (botones en el mensaje)
- **Callback queries** (procesar qué botón presionó el admin)
- **Editar mensajes** (actualizar el mensaje después de aprobar/rechazar)

...el JSON se vuelve complejo de manejar a mano. El paquete abstrae todo eso limpiamente y **funciona perfectamente en Hostinger** — es PHP puro, sin demonios ni workers especiales.

---

## Flujo de venta especial con botones

```
Vendedor solicita venta especial
        ↓
Bot envía al admin:
  "🔔 Venta especial #42 — Motivo: regalo cliente
   Vendedor: Juan | Total: $150"
   [✅ Aprobar]   [❌ Rechazar]
        ↓
Admin toca el botón en Telegram
        ↓
Webhook recibe callback_query con data: "aprobar_venta:42" o "rechazar_venta:42"
        ↓
Backend ejecuta la lógica de aprobación/rechazo
        ↓
Bot edita el mensaje original → "✅ Aprobada por Admin"
        ↓
Vendedor recibe notificación (database) de la decisión
```

---

## Arquitectura

```
Laravel App
    │
    ├── Notifications (push automático)
    │       └── usa Telegram SDK ──→ Bot API (mensajes + inline keyboards)
    │
    └── TelegramWebhookController
            POST /telegram/webhook
                ├── message      → procesa comandos (/start, /reporte, /ayuda)
                └── callback_query → procesa botones (aprobar/rechazar venta especial)
```

---

## Paso 0 — Crear el bot en Telegram (BotFather)

1. Abrir Telegram → buscar `@BotFather`
2. Enviar `/newbot`
3. Nombre del bot: ej. `Almacen Tienda Bot`
4. Username: debe terminar en `bot`, ej. `almacen_tienda_bot`
5. BotFather entrega el **TOKEN** — guardarlo para el `.env`
6. Para obtener tu `chat_id` como admin:
   - Enviar cualquier mensaje al bot
   - Visitar: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Buscar el campo `"id"` dentro de `"chat"` — ese es tu chat_id personal

---

## Paso 1 — Instalar el paquete

```bash
composer require irazasyed/telegram-bot-sdk
```

Publicar configuración:
```bash
php artisan vendor:publish --tag=telegram-config
```

Esto crea `config/telegram.php`.

---

## Paso 2 — Variables de entorno

Agregar al `.env` (y también a `.env.example`):

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=una_cadena_aleatoria_segura
```

En `config/telegram.php` el token ya se lee de `TELEGRAM_BOT_TOKEN` automáticamente.

Agregar a `config/services.php` solo el secret del webhook:
```php
'telegram' => [
    'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
],
```

---

## Paso 3 — Migración: campo `telegram_chat_id` en users

```bash
php artisan make:migration add_telegram_chat_id_to_users_table
```

Contenido:
```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->string('telegram_chat_id')->nullable()->after('avatar');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('telegram_chat_id');
    });
}
```

```bash
php artisan migrate
```

---

## Paso 4 — Actualizar el modelo `User`

```php
// Agregar al fillable
protected $fillable = [
    'name',
    'email',
    'password',
    'avatar',
    'role',
    'telegram_chat_id',   // ← nuevo
];

// Método requerido por el SDK para saber a quién enviar
public function routeNotificationForTelegram(): ?string
{
    return $this->telegram_chat_id;
}
```

---

## Paso 5 — Actualizar `UserController`

**Validación** (agregar en `store()` y `update()`):
```php
'telegram_chat_id' => 'nullable|string|max:50',
```

**En `store()`:**
```php
$user = User::create([
    'name'             => $validated['name'],
    'email'            => $validated['email'],
    'password'         => Hash::make($validated['password']),
    'role'             => $validated['role'],
    'telegram_chat_id' => $validated['telegram_chat_id'] ?? null,
]);
```

**En `update()`:**
```php
$user->update([
    'name'             => $validated['name'],
    'email'            => $validated['email'],
    'role'             => $validated['role'],
    'password'         => $validated['password'] ? Hash::make($validated['password']) : $user->password,
    'telegram_chat_id' => $validated['telegram_chat_id'] ?? null,
]);
```

---

## Paso 6 — Frontend: campo en formularios de Empleados

En `resources/js/Pages/Empleados/Create.tsx` y `Edit.tsx`, agregar input para `telegram_chat_id`. Solo visible para `admin` y `moderador`:

```tsx
{['admin', 'moderador'].includes(form.role) && (
    <div>
        <Label>Telegram Chat ID</Label>
        <Input
            placeholder="Ej: 123456789"
            value={form.telegram_chat_id ?? ''}
            onChange={e => setData('telegram_chat_id', e.target.value)}
        />
        <p className="text-xs text-muted-foreground mt-1">
            Envía un mensaje al bot y obtén tu chat_id desde la API de Telegram.
        </p>
    </div>
)}
```

---

## Paso 7 — Crear el TelegramChannel (usando el SDK)

Crear `app/Channels/TelegramChannel.php`:

```php
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
            Log::error('Error enviando notificación Telegram: ' . $e->getMessage());
        }
    }
}
```

---

## Paso 8 — Actualizar las Notificaciones

### `CierreCajaNotification`

```php
public function via(object $notifiable): array
{
    $channels = ['database'];
    if ($notifiable->role === 'admin' && $notifiable->telegram_chat_id) {
        $channels[] = \App\Channels\TelegramChannel::class;
    }
    return $channels;
}

public function toTelegram(object $notifiable): array
{
    $esDescuadre = abs($this->cierre->diferencia) > 0.01;
    $icon        = $esDescuadre ? '⚠️' : '✅';
    $diferencia  = number_format(abs($this->cierre->diferencia), 2);

    $texto  = "{$icon} <b>Cierre de Caja #{$this->cierre->id}</b>\n";
    $texto .= "👤 Vendedor: {$this->cierre->usuario->name}\n";
    $texto .= "💰 Saldo esperado: $ {$this->cierre->saldo_esperado}\n";
    $texto .= "💵 Saldo contado: $ {$this->cierre->saldo_contado}\n";
    $texto .= $esDescuadre
        ? "❌ Descuadre: $ {$diferencia}\n"
        : "✅ Sin descuadre\n";
    $texto .= "🕐 " . now()->format('d/m/Y H:i');

    return [
        'text'       => $texto,
        'parse_mode' => 'HTML',
    ];
}
```

### `VentaEspecialSolicitudNotification` — con botones Aprobar / Rechazar

```php
public function via(object $notifiable): array
{
    $channels = ['database'];
    if ($notifiable->role === 'admin' && $notifiable->telegram_chat_id) {
        $channels[] = \App\Channels\TelegramChannel::class;
    }
    return $channels;
}

public function toTelegram(object $notifiable): array
{
    $texto  = "🔔 <b>Solicitud de Venta Especial</b>\n\n";
    $texto .= "📋 Venta #: {$this->venta->id}\n";
    $texto .= "👤 Vendedor: {$this->venta->usuario->name}\n";
    $texto .= "📝 Motivo: {$this->venta->nota_venta_especial}\n";
    $texto .= "💵 Total: $ {$this->venta->total}\n";
    $texto .= "🕐 " . now()->format('d/m/Y H:i');

    return [
        'text'         => $texto,
        'parse_mode'   => 'HTML',
        'reply_markup' => json_encode([
            'inline_keyboard' => [[
                ['text' => '✅ Aprobar',  'callback_data' => "aprobar_venta:{$this->venta->id}"],
                ['text' => '❌ Rechazar', 'callback_data' => "rechazar_venta:{$this->venta->id}"],
            ]],
        ]),
    ];
}
```

### `VentaEspecialDecisionNotification`

Sin cambios — esta notificación va al vendedor, que por ahora no usa Telegram. Se queda solo en `database`.

---

## Paso 9 — TelegramWebhookController

```bash
php artisan make:controller TelegramWebhookController
```

`app/Http/Controllers/TelegramWebhookController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Venta;
use App\Models\Almacen;
use App\Notifications\VentaEspecialDecisionNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramWebhookController extends Controller
{
    public function handle(Request $request)
    {
        // Verificar el secret header de seguridad
        $secret = $request->header('X-Telegram-Bot-Api-Secret-Token');
        if ($secret !== config('services.telegram.webhook_secret')) {
            return response()->json(['ok' => false], 403);
        }

        $update = $request->all();

        // Procesar botones (callback_query)
        if (isset($update['callback_query'])) {
            return $this->handleCallbackQuery($update['callback_query']);
        }

        // Procesar mensajes de texto (comandos)
        if (isset($update['message'])) {
            return $this->handleMessage($update['message']);
        }

        return response()->json(['ok' => true]);
    }

    // ─── Manejo de comandos de texto ─────────────────────────────────────────

    private function handleMessage(array $message)
    {
        $chatId = $message['chat']['id'];
        $text   = trim($message['text'] ?? '');

        $admin = $this->verificarAdmin($chatId);
        if (! $admin) {
            $this->sendMessage($chatId, '⛔ No tienes acceso a este bot.');
            return response()->json(['ok' => true]);
        }

        match (true) {
            str_starts_with($text, '/start')   => $this->cmdStart($chatId, $admin),
            str_starts_with($text, '/reporte') => $this->cmdReporte($chatId),
            str_starts_with($text, '/ayuda')   => $this->cmdAyuda($chatId),
            default => $this->sendMessage($chatId, "Comando no reconocido. Escribe /ayuda."),
        };

        return response()->json(['ok' => true]);
    }

    private function cmdStart(int|string $chatId, User $admin): void
    {
        $this->sendMessage($chatId,
            "👋 Hola <b>{$admin->name}</b>!\n\n" .
            "Soy el bot de <b>Almacén Tienda</b>.\n\n" .
            "Escribe /ayuda para ver qué puedo hacer."
        );
    }

    private function cmdAyuda(int|string $chatId): void
    {
        $this->sendMessage($chatId,
            "📋 <b>Comandos disponibles:</b>\n\n" .
            "/reporte — Ventas del día por almacén\n" .
            "/ayuda — Ver esta ayuda"
        );
    }

    private function cmdReporte(int|string $chatId): void
    {
        $hoy      = Carbon::today();
        $almacenes = Almacen::all();

        if ($almacenes->isEmpty()) {
            $this->sendMessage($chatId, 'No hay almacenes registrados.');
            return;
        }

        $texto = "📊 <b>Reporte del día " . $hoy->format('d/m/Y') . "</b>\n\n";

        foreach ($almacenes as $almacen) {
            $ventas     = Venta::where('almacen_id', $almacen->id)
                ->whereDate('created_at', $hoy)
                ->where('estado', 'completada')
                ->get();

            $count      = $ventas->count();
            $totalUSD   = round($ventas->sum('total'), 2);

            $texto .= "🏪 <b>{$almacen->nombre_almacen}</b>\n";
            $texto .= "   Ventas: {$count}  |  Total: $ {$totalUSD}\n\n";
        }

        $totalGlobal = round(
            Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->sum('total'),
            2
        );
        $countGlobal = Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->count();

        $texto .= "━━━━━━━━━━━━━━\n";
        $texto .= "📦 Total global: {$countGlobal} ventas\n";
        $texto .= "💰 $ {$totalGlobal}";

        $this->sendMessage($chatId, $texto);
    }

    // ─── Manejo de botones ───────────────────────────────────────────────────

    private function handleCallbackQuery(array $callbackQuery)
    {
        $chatId      = $callbackQuery['message']['chat']['id'];
        $messageId   = $callbackQuery['message']['message_id'];
        $callbackId  = $callbackQuery['id'];
        $data        = $callbackQuery['data'] ?? '';

        $admin = $this->verificarAdmin($chatId);
        if (! $admin) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin acceso']);
            return response()->json(['ok' => true]);
        }

        // Parsear la acción: "aprobar_venta:42" o "rechazar_venta:42"
        [$accion, $ventaId] = explode(':', $data) + [null, null];

        if (! $ventaId || ! in_array($accion, ['aprobar_venta', 'rechazar_venta'])) {
            return response()->json(['ok' => true]);
        }

        $venta = Venta::find($ventaId);

        if (! $venta) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '❌ Venta no encontrada']);
            return response()->json(['ok' => true]);
        }

        if ($venta->estado !== 'solicitud_especial') {
            Telegram::answerCallbackQuery([
                'callback_query_id' => $callbackId,
                'text'              => 'Esta solicitud ya fue procesada.',
            ]);
            return response()->json(['ok' => true]);
        }

        if ($accion === 'aprobar_venta') {
            $venta->update(['estado' => 'pendiente']);
            $decision = 'aprobada';
            $textoEdicion = "✅ <b>Venta Especial #{$venta->id} Aprobada</b>\nAprobada por: {$admin->name}";
        } else {
            // Rechazar: revertir stock y marcar como rechazada
            $venta->update(['estado' => 'rechazada']);
            $decision = 'rechazada';
            $textoEdicion = "❌ <b>Venta Especial #{$venta->id} Rechazada</b>\nRechazada por: {$admin->name}";

            // Aquí va la lógica de reversión de stock si aplica
            // (la misma lógica que usa VentaController::rechazar)
        }

        // Editar el mensaje original quitando los botones
        Telegram::editMessageText([
            'chat_id'      => $chatId,
            'message_id'   => $messageId,
            'text'         => $textoEdicion,
            'parse_mode'   => 'HTML',
        ]);

        // Responder al callback (quita el "reloj" del botón en Telegram)
        Telegram::answerCallbackQuery([
            'callback_query_id' => $callbackId,
            'text'              => $decision === 'aprobada' ? '✅ Aprobada' : '❌ Rechazada',
        ]);

        // Notificar al vendedor por database
        $vendedor = User::find($venta->user_id);
        if ($vendedor) {
            $vendedor->notify(new VentaEspecialDecisionNotification($venta, $decision));
        }

        return response()->json(['ok' => true]);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private function verificarAdmin(int|string $chatId): ?User
    {
        return User::where('telegram_chat_id', (string) $chatId)
                   ->where('role', 'admin')
                   ->first();
    }

    private function sendMessage(int|string $chatId, string $text): void
    {
        try {
            Telegram::sendMessage([
                'chat_id'    => $chatId,
                'text'       => $text,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram sendMessage error: ' . $e->getMessage());
        }
    }
}
```

---

## Paso 10 — Ruta del webhook

En `routes/api.php`:
```php
Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramWebhookController::class, 'handle']);
```

La ruta de API en Laravel ya está excluida de CSRF por defecto — no necesitas modificar `VerifyCsrfToken`.

---

## Paso 11 — Registrar el webhook con Telegram

Solo se hace **una vez**, en producción (requiere HTTPS):

```bash
php artisan tinker
```

```php
use Illuminate\Support\Facades\Http;

Http::post("https://api.telegram.org/bot" . config('telegram.bots.mybot.token') . "/setWebhook", [
    'url'          => 'https://tu-dominio.com/api/telegram/webhook',
    'secret_token' => config('services.telegram.webhook_secret'),
]);
```

Para desarrollo local usar **ngrok**:
```bash
ngrok http 8000
# Luego registrar la URL de ngrok como webhook (temporal)
```

---

## Resumen de archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `.env` + `.env.example` | Agregar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` |
| `config/services.php` | Agregar `webhook_secret` |
| `config/telegram.php` | Publicado por el paquete — revisar configuración del bot |
| `database/migrations/..._add_telegram_chat_id_to_users_table.php` | Crear |
| `app/Models/User.php` | Agregar `telegram_chat_id` al fillable + `routeNotificationForTelegram()` |
| `app/Http/Controllers/UserController.php` | Aceptar `telegram_chat_id` en store/update |
| `resources/js/Pages/Empleados/Create.tsx` | Campo telegram_chat_id para admin/moderador |
| `resources/js/Pages/Empleados/Edit.tsx` | Campo telegram_chat_id para admin/moderador |
| `app/Channels/TelegramChannel.php` | Crear (canal custom usando SDK) |
| `app/Notifications/CierreCajaNotification.php` | Agregar canal + método `toTelegram()` |
| `app/Notifications/VentaEspecialSolicitudNotification.php` | Agregar canal + `toTelegram()` con inline keyboard |
| `app/Http/Controllers/TelegramWebhookController.php` | Crear (comandos + callback_query) |
| `routes/api.php` | Agregar ruta del webhook |

---

## Orden de implementación recomendado

1. `composer require irazasyed/telegram-bot-sdk` + `php artisan vendor:publish --tag=telegram-config`
2. Variables de entorno (`.env`) y `config/services.php`
3. Migración + `php artisan migrate`
4. Modelo `User` + `UserController`
5. Frontend (formularios Empleados)
6. `TelegramChannel` (canal custom)
7. Notificaciones (`CierreCajaNotification`, `VentaEspecialSolicitudNotification`)
8. `TelegramWebhookController` + ruta en `api.php`
9. Registrar webhook en Telegram (con ngrok en dev, con HTTPS en Hostinger)

---

## Notas importantes

- El `telegram_chat_id` es un número entero que Telegram devuelve — se guarda como `string` en la BD sin problema.
- Si un admin no tiene `telegram_chat_id` configurado, todo sigue funcionando (solo `database`).
- La lógica de reversión de stock en el rechazo desde Telegram debe ser la **misma** que usa `VentaController::rechazar()` — extráela a un método de servicio para reutilizarla.
- Vendedores no usan Telegram en esta fase.
- Hostinger: el paquete es PHP puro, no necesita configuración especial del servidor.
