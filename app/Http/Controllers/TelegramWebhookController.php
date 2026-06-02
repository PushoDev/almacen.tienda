<?php

namespace App\Http\Controllers;

use App\Models\AlmacenProducto;
use App\Models\Almacen;
use App\Models\HistorialStock;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\VentaEspecialDecisionNotification;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Telegram\Bot\Laravel\Facades\Telegram;

class TelegramWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $secret = $request->header('X-Telegram-Bot-Api-Secret-Token');
        if ($secret !== config('services.telegram.webhook_secret')) {
            return response()->json(['ok' => false], 403);
        }

        $update = $request->all();

        if (isset($update['callback_query'])) {
            return $this->handleCallbackQuery($update['callback_query']);
        }

        if (isset($update['message'])) {
            return $this->handleMessage($update['message']);
        }

        return response()->json(['ok' => true]);
    }

    // ─── Comandos de texto ────────────────────────────────────────────────────

    private function handleMessage(array $message)
    {
        $chatId = $message['chat']['id'];
        $text   = trim($message['text'] ?? '');

        // Comando /vincular — disponible antes de verificar admin
        if (str_starts_with($text, '/vincular')) {
            return $this->cmdVincular($chatId, $text);
        }

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

    private function cmdVincular(int|string $chatId, string $text): \Illuminate\Http\JsonResponse
    {
        $partes = explode(' ', $text);
        $token  = strtoupper(trim($partes[1] ?? ''));

        if (empty($token)) {
            $this->sendMessage($chatId, "Uso: /vincular TU_CODIGO\n\nObtén tu código en Configuración de Perfil dentro de la app.");
            return response()->json(['ok' => true]);
        }

        $user = User::where('telegram_link_token', $token)->first();

        if (! $user) {
            $this->sendMessage($chatId, '❌ Código inválido o expirado. Genera uno nuevo desde tu perfil en la app.');
            return response()->json(['ok' => true]);
        }

        $user->update([
            'telegram_chat_id'    => (string) $chatId,
            'telegram_link_token' => null,
        ]);

        $this->sendMessage($chatId,
            "✅ <b>Cuenta vinculada correctamente</b>\n\n" .
            "Hola <b>{$user->name}</b>, a partir de ahora recibirás notificaciones aquí.\n\n" .
            "Escribe /ayuda para ver los comandos disponibles."
        );

        return response()->json(['ok' => true]);
    }

    private function cmdStart(int|string $chatId, User $admin): void
    {
        $this->sendMessage($chatId,
            "👋 Hola <b>{$admin->name}</b>!\n\n" .
            "Soy el bot de <b>La Glorieta Tienda</b>.\n\n" .
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
            $ventas   = Venta::where('almacen_id', $almacen->id)
                ->whereDate('created_at', $hoy)
                ->where('estado', 'completada')
                ->get();

            $count    = $ventas->count();
            $total    = round($ventas->sum('total'), 2);

            $texto .= "🏪 <b>{$almacen->nombre_almacen}</b>\n";
            $texto .= "   Ventas: {$count}  |  Total: $ {$total}\n\n";
        }

        $totalGlobal = round(Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->sum('total'), 2);
        $countGlobal = Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->count();

        $texto .= "━━━━━━━━━━━━━━\n";
        $texto .= "📦 Total global: {$countGlobal} ventas\n";
        $texto .= "💰 $ {$totalGlobal}";

        $this->sendMessage($chatId, $texto);
    }

    // ─── Botones (callback_query) ─────────────────────────────────────────────

    private function handleCallbackQuery(array $callbackQuery)
    {
        $chatId     = $callbackQuery['message']['chat']['id'];
        $messageId  = $callbackQuery['message']['message_id'];
        $callbackId = $callbackQuery['id'];
        $data       = $callbackQuery['data'] ?? '';

        $admin = $this->verificarAdmin($chatId);
        if (! $admin) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin acceso']);
            return response()->json(['ok' => true]);
        }

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
            $this->aprobarVenta($venta, $admin, $chatId, $messageId, $callbackId);
        } else {
            $this->rechazarVenta($venta, $admin, $chatId, $messageId, $callbackId);
        }

        return response()->json(['ok' => true]);
    }

    private function aprobarVenta(Venta $venta, User $admin, int|string $chatId, int $messageId, string $callbackId): void
    {
        $venta->update([
            'estado'              => 'pendiente',
            'decision_notificada' => false,
        ]);

        Telegram::editMessageText([
            'chat_id'    => $chatId,
            'message_id' => $messageId,
            'text'       => "✅ <b>Venta Especial #{$venta->id} Aprobada</b>\nAprobada por: {$admin->name}",
            'parse_mode' => 'HTML',
        ]);

        Telegram::answerCallbackQuery([
            'callback_query_id' => $callbackId,
            'text'              => '✅ Aprobada',
        ]);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'aprobada'));
        } catch (\Exception $e) {
            Log::error('Telegram aprobar — notificación fallida: ' . $e->getMessage());
        }
    }

    private function rechazarVenta(Venta $venta, User $admin, int|string $chatId, int $messageId, string $callbackId): void
    {
        $venta->load(['detalles']);

        DB::transaction(function () use ($venta, $admin) {
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)->first();

                if ($almacenProducto) {
                    $almacenProducto->increment('cantidad', $detalle->cantidad);
                }

                if ($detalle->producto_codigo_id) {
                    $codigo = ProductoCodigo::find($detalle->producto_codigo_id);
                    if ($codigo) {
                        $codigo->increment('cantidad', $detalle->cantidad);
                    }
                }

                HistorialStock::create([
                    'producto_id'       => $detalle->producto_id,
                    'almacen_id'        => $venta->almacen_id,
                    'venta_id'          => $venta->id,
                    'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
                    'cantidad_nueva'    => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
                    'diferencia'        => $detalle->cantidad,
                    'tipo'              => 'venta_anulada',
                    'observaciones'     => 'Stock revertido por rechazo desde Telegram',
                    'user_id'           => $admin->id,
                ]);
            }

            $venta->update([
                'estado'              => 'rechazada',
                'decision_notificada' => false,
            ]);
        });

        Telegram::editMessageText([
            'chat_id'    => $chatId,
            'message_id' => $messageId,
            'text'       => "❌ <b>Venta Especial #{$venta->id} Rechazada</b>\nRechazada por: {$admin->name}",
            'parse_mode' => 'HTML',
        ]);

        Telegram::answerCallbackQuery([
            'callback_query_id' => $callbackId,
            'text'              => '❌ Rechazada',
        ]);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
        } catch (\Exception $e) {
            Log::error('Telegram rechazar — notificación fallida: ' . $e->getMessage());
        }
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
