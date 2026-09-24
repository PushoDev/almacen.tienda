<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\CierreCaja;
use App\Models\HistorialStock;
use App\Models\MovimientoFinanciero;
use App\Models\ProductoCodigo;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\VentaEspecialDecisionNotification;
use App\Services\CodigoStockService;
use App\Services\LoteConsumoService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
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
        $text = trim($message['text'] ?? '');

        if (str_starts_with($text, '/vincular')) {
            return $this->cmdVincular($chatId, $text);
        }

        $admin = $this->verificarAdmin($chatId);
        if (! $admin) {
            $this->sendMessage($chatId, '⛔ No tienes acceso a este bot.');

            return response()->json(['ok' => true]);
        }

        match (true) {
            str_starts_with($text, '/start') => $this->cmdStart($chatId, $admin),
            str_starts_with($text, '/reporte') => $this->cmdReporte($chatId),
            str_starts_with($text, '/estadocierres') => $this->cmdEstadoCierres($chatId),
            str_starts_with($text, '/cierres') => $this->cmdCierres($chatId),
            str_starts_with($text, '/movimientos') => $this->cmdMovimientos($chatId),
            str_starts_with($text, '/ayuda') => $this->cmdAyuda($chatId),
            default => $this->sendMessage($chatId, 'Comando no reconocido. Escribe /ayuda.'),
        };

        return response()->json(['ok' => true]);
    }

    private function cmdVincular(int|string $chatId, string $text): JsonResponse
    {
        $partes = explode(' ', $text);
        $token = strtoupper(trim($partes[1] ?? ''));

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
            'telegram_chat_id' => (string) $chatId,
            'telegram_link_token' => null,
        ]);

        $this->sendMessage($chatId,
            "✅ <b>Cuenta vinculada correctamente, {$user->name}.</b>\n\n".
            "👋 ¡Bienvenido(a)!\n".
            "Soy <b>GloriBot</b>, tu asistente virtual para ayudarte a gestionar y consultar información de forma rápida y sencilla. 🚀\n\n".
            "Para comenzar, escribe / y selecciona la opción que necesites. Te guiaré paso a paso para acceder a las herramientas y funciones disponibles.\n\n".
            "✨ <i>Desarrollado por PushoDev, impulsando soluciones tecnológicas para hacer tu trabajo más eficiente.</i>\n\n".
            '¡Comencemos! 🎯'
        );

        return response()->json(['ok' => true]);
    }

    private function cmdStart(int|string $chatId, User $admin): void
    {
        $this->sendMessage($chatId,
            "👋 ¡Hola de nuevo, <b>{$admin->name}</b>!\n\n".
            "Soy <b>GloriBot</b>, tu asistente virtual de La Glorieta Tienda. 🚀\n\n".
            'Escribe /ayuda para ver los comandos disponibles.'
        );
    }

    private function cmdAyuda(int|string $chatId): void
    {
        $this->sendMessage($chatId,
            "📋 <b>Comandos disponibles:</b>\n\n".
            "/reporte — Ventas del día por almacén\n".
            "/estadocierres — Quiénes ya cerraron hoy y quiénes faltan\n".
            "/cierres — Ver cierres de caja por usuario\n".
            "/movimientos — Ver gastos, ingresos y transferencias\n".
            '/ayuda — Ver esta ayuda'
        );
    }

    private function cmdReporte(int|string $chatId): void
    {
        $hoy = Carbon::today();
        $almacenes = Almacen::all();

        if ($almacenes->isEmpty()) {
            $this->sendMessage($chatId, 'No hay almacenes registrados.');

            return;
        }

        $texto = '📊 <b>Reporte del día '.$hoy->format('d/m/Y')."</b>\n\n";

        foreach ($almacenes as $almacen) {
            $ventas = Venta::where('almacen_id', $almacen->id)
                ->whereDate('created_at', $hoy)
                ->where('estado', 'completada')
                ->get();

            $texto .= "🏪 <b>{$almacen->nombre_almacen}</b>\n";
            $texto .= "   Ventas: {$ventas->count()}  |  Total: $ ".round($ventas->sum('total'), 2)."\n\n";
        }

        $countGlobal = Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->count();
        $totalGlobal = round(Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->sum('total'), 2);

        $texto .= "━━━━━━━━━━━━━━\n";
        $texto .= "📦 Total global: {$countGlobal} ventas\n";
        $texto .= "💰 $ {$totalGlobal}";

        $this->sendMessage($chatId, $texto);
    }

    private function cmdCierres(int|string $chatId): void
    {
        $userIds = CierreCaja::distinct()->pluck('user_id');
        $usuarios = User::whereIn('id', $userIds)->orderBy('name')->get();

        if ($usuarios->isEmpty()) {
            $this->sendMessage($chatId, '🔒 No hay cierres de caja registrados.');

            return;
        }

        $keyboard = [];
        $row = [];

        foreach ($usuarios as $usuario) {
            $row[] = ['text' => "👤 {$usuario->name}", 'callback_data' => "cu:{$usuario->id}"];
            if (count($row) === 2) {
                $keyboard[] = $row;
                $row = [];
            }
        }

        if (! empty($row)) {
            $keyboard[] = $row;
        }

        try {
            Telegram::sendMessage([
                'chat_id' => $chatId,
                'text' => "🔒 <b>Cierres de Caja</b>\n\nSelecciona un usuario para ver sus cierres:",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram cmdCierres error: '.$e->getMessage());
        }
    }

    private function cmdEstadoCierres(int|string $chatId): void
    {
        $hoy = Carbon::today();

        $usuarios = User::whereIn('role', ['moderador', 'vendedor'])->orderBy('name')->get();

        if ($usuarios->isEmpty()) {
            $this->sendMessage($chatId, 'No hay usuarios moderador/vendedor registrados.');

            return;
        }

        $cierresHoy = CierreCaja::whereIn('user_id', $usuarios->pluck('id'))
            ->whereDate('fecha_cierre', $hoy)
            ->orderBy('fecha_cierre')
            ->get()
            ->keyBy('user_id');

        $cerraron = $usuarios->filter(fn (User $u) => $cierresHoy->has($u->id));
        $pendientes = $usuarios->reject(fn (User $u) => $cierresHoy->has($u->id));

        $texto = '📊 <b>Estado de Cierres — '.$hoy->format('d/m/Y')."</b>\n\n";

        $texto .= '✅ <b>Ya cerraron ('.$cerraron->count().")</b>\n";
        if ($cerraron->isEmpty()) {
            $texto .= "—\n";
        } else {
            foreach ($cerraron as $usuario) {
                $cierre = $cierresHoy->get($usuario->id);
                $icon = $cierre->tieneDiferencia() ? '⚠️' : '✅';
                $hora = $cierre->fecha_cierre?->format('H:i') ?? '—';
                $texto .= "{$icon} {$usuario->name} — {$hora}\n";
            }
        }

        $texto .= "\n🟠 <b>Faltan por cerrar (".$pendientes->count().")</b>\n";
        if ($pendientes->isEmpty()) {
            $texto .= "—\n";
        } else {
            foreach ($pendientes as $usuario) {
                $texto .= "🟠 {$usuario->name} ({$usuario->role})\n";
            }
        }

        $this->sendMessage($chatId, $texto);
    }

    private function cmdMovimientos(int|string $chatId): void
    {
        $keyboard = [
            [
                ['text' => '📅 Hoy',      'callback_data' => 'mf:hoy'],
                ['text' => '📅 3 días',   'callback_data' => 'mf:3d'],
            ],
            [
                ['text' => '📅 5 días',   'callback_data' => 'mf:5d'],
                ['text' => '📅 Este mes', 'callback_data' => 'mf:mes'],
            ],
            [
                ['text' => '📋 Todos',    'callback_data' => 'mf:todo'],
            ],
        ];

        try {
            Telegram::sendMessage([
                'chat_id' => $chatId,
                'text' => "💰 <b>Movimientos Financieros</b>\n\nSelecciona el período:",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram cmdMovimientos error: '.$e->getMessage());
        }
    }

    // ─── Botones (callback_query) ─────────────────────────────────────────────

    private function handleCallbackQuery(array $callbackQuery)
    {
        $chatId = $callbackQuery['message']['chat']['id'];
        $messageId = $callbackQuery['message']['message_id'];
        $callbackId = $callbackQuery['id'];
        $data = $callbackQuery['data'] ?? '';

        $admin = $this->verificarAdmin($chatId);
        if (! $admin) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin acceso']);

            return response()->json(['ok' => true]);
        }

        // Cierres — paso 1: usuario seleccionado
        if (str_starts_with($data, 'cu:')) {
            $this->handleCierresUsuario($data, $chatId, $messageId, $callbackId);

            return response()->json(['ok' => true]);
        }

        // Cierres — paso 2: filtro seleccionado
        if (str_starts_with($data, 'cf:')) {
            $this->handleCierresFiltro($data, $chatId, $messageId, $callbackId);

            return response()->json(['ok' => true]);
        }

        // Movimientos financieros — filtro seleccionado
        if (str_starts_with($data, 'mf:')) {
            $this->handleMovimientosFiltro($data, $chatId, $messageId, $callbackId);

            return response()->json(['ok' => true]);
        }

        // Ventas especiales — aprobar / rechazar
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
                'text' => 'Esta solicitud ya fue procesada.',
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

    private function handleCierresUsuario(string $data, int|string $chatId, int $messageId, string $callbackId): void
    {
        $userId = (int) substr($data, 3); // quitar "cu:"
        $usuario = User::find($userId);

        if (! $usuario) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => 'Usuario no encontrado']);

            return;
        }

        $keyboard = [
            [
                ['text' => '📅 Hoy',      'callback_data' => "cf:{$userId}:hoy"],
                ['text' => '📅 3 días',   'callback_data' => "cf:{$userId}:3d"],
            ],
            [
                ['text' => '📅 5 días',   'callback_data' => "cf:{$userId}:5d"],
                ['text' => '📅 Este mes', 'callback_data' => "cf:{$userId}:mes"],
            ],
            [
                ['text' => '📋 Todos',    'callback_data' => "cf:{$userId}:todo"],
            ],
        ];

        try {
            Telegram::editMessageText([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => "🔒 <b>Cierres de {$usuario->name}</b>\n\nSelecciona el período:",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $keyboard]),
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram handleCierresUsuario error: '.$e->getMessage());
        }

        Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);
    }

    private function handleCierresFiltro(string $data, int|string $chatId, int $messageId, string $callbackId): void
    {
        // data = "cf:{userId}:{filtro}"
        $parts = explode(':', $data);
        $userId = (int) ($parts[1] ?? 0);
        $filtro = $parts[2] ?? 'hoy';

        $usuario = User::find($userId);

        if (! $usuario) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => 'Usuario no encontrado']);

            return;
        }

        $labels = [
            'hoy' => 'Hoy',
            '3d' => 'Últimos 3 días',
            '5d' => 'Últimos 5 días',
            'mes' => 'Este mes',
            'todo' => 'Todos',
        ];

        $query = CierreCaja::where('user_id', $userId)->orderBy('fecha_cierre', 'desc');

        match ($filtro) {
            'hoy' => $query->whereDate('fecha_cierre', Carbon::today()),
            '3d' => $query->where('fecha_cierre', '>=', Carbon::now()->subDays(3)->startOfDay()),
            '5d' => $query->where('fecha_cierre', '>=', Carbon::now()->subDays(5)->startOfDay()),
            'mes' => $query->whereMonth('fecha_cierre', Carbon::now()->month)
                ->whereYear('fecha_cierre', Carbon::now()->year),
            default => null,
        };

        $cierres = $query->limit(10)->get();
        $label = $labels[$filtro] ?? $filtro;

        if ($cierres->isEmpty()) {
            try {
                Telegram::editMessageText([
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'text' => "🔒 <b>Cierres de {$usuario->name}</b> — {$label}\n\nNo hay cierres en este período.",
                    'parse_mode' => 'HTML',
                ]);
            } catch (\Exception $e) {
                Log::error('Telegram handleCierresFiltro (vacío) error: '.$e->getMessage());
            }
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);

            return;
        }

        $texto = "🔒 <b>Cierres de {$usuario->name}</b> — {$label}\n\n";

        foreach ($cierres as $cierre) {
            $esDescuadre = $cierre->tieneDiferencia();
            $icon = $esDescuadre ? '⚠️' : '✅';
            $apertura = $cierre->fecha_apertura?->format('d/m/Y H:i') ?? '—';
            $fechaCierre = $cierre->fecha_cierre?->format('d/m/Y H:i') ?? '—';

            $texto .= "{$icon} <b>Cierre #{$cierre->id}</b>\n";
            $texto .= "📅 Apertura: {$apertura}\n";
            $texto .= "🔒 Cierre: {$fechaCierre}\n";
            $texto .= '💰 Efectivo: $ '.number_format($cierre->ventas_efectivo, 2)."\n";
            $texto .= '💳 Otros: $ '.number_format($cierre->ventas_otros, 2)."\n";
            $texto .= '📊 Esperado: $ '.number_format($cierre->saldo_esperado, 2).' | Contado: $ '.number_format($cierre->saldo_contado, 2)."\n";

            if ($esDescuadre) {
                $texto .= '❌ Descuadre: $ '.number_format(abs($cierre->diferencia), 2)."\n";
            } else {
                $texto .= "✅ Sin descuadre\n";
            }

            if (! empty($cierre->observaciones)) {
                $texto .= "📝 {$cierre->observaciones}\n";
            }

            $texto .= "━━━━━━━━━━━━━━\n";
        }

        $count = $cierres->count();
        $sufijo = $count >= 10
            ? "\n<i>Mostrando los últimos 10 cierres.</i>"
            : "\n<i>Total: {$count} cierre(s)</i>";

        $texto .= $sufijo;

        try {
            Telegram::editMessageText([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $texto,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Exception $e) {
            // Si el mensaje es demasiado largo, enviarlo como nuevo
            $this->sendMessage($chatId, $texto);
        }

        Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);
    }

    private function handleMovimientosFiltro(string $data, int|string $chatId, int $messageId, string $callbackId): void
    {
        $filtro = substr($data, 3); // quitar "mf:"

        $labels = [
            'hoy' => 'Hoy',
            '3d' => 'Últimos 3 días',
            '5d' => 'Últimos 5 días',
            'mes' => 'Este mes',
            'todo' => 'Todos',
        ];

        $query = MovimientoFinanciero::with(['user', 'cuentaOrigen', 'cuentaDestino', 'clienteOrigen', 'clienteDestino', 'proveedorDestino'])
            ->orderBy('created_at', 'desc');

        match ($filtro) {
            'hoy' => $query->whereDate('created_at', Carbon::today()),
            '3d' => $query->where('created_at', '>=', Carbon::now()->subDays(3)->startOfDay()),
            '5d' => $query->where('created_at', '>=', Carbon::now()->subDays(5)->startOfDay()),
            'mes' => $query->whereMonth('created_at', Carbon::now()->month)
                ->whereYear('created_at', Carbon::now()->year),
            default => null,
        };

        $movimientos = $query->limit(10)->get();
        $label = $labels[$filtro] ?? $filtro;

        if ($movimientos->isEmpty()) {
            try {
                Telegram::editMessageText([
                    'chat_id' => $chatId,
                    'message_id' => $messageId,
                    'text' => "💰 <b>Movimientos Financieros</b> — {$label}\n\nNo hay movimientos en este período.",
                    'parse_mode' => 'HTML',
                ]);
            } catch (\Exception $e) {
                Log::error('Telegram handleMovimientosFiltro (vacío) error: '.$e->getMessage());
            }
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);

            return;
        }

        $texto = "💰 <b>Movimientos Financieros</b> — {$label}\n\n";

        foreach ($movimientos as $mov) {
            [$icon, $tipo] = match ((int) $mov->tipo_movimiento_id) {
                1 => ['🔴', 'Gasto'],
                2 => ['🟢', 'Ingreso'],
                3 => ['🔄', 'Transferencia'],
                default => ['❔', 'Movimiento'],
            };

            $origen = $mov->cuentaOrigen->nombre_cuenta ?? $mov->clienteOrigen->nombre_cliente ?? null;
            $destino = $mov->cuentaDestino->nombre_cuenta ?? $mov->clienteDestino->nombre_cliente
                ?? $mov->proveedorDestino->nombre_proveedor ?? null;

            $texto .= "{$icon} <b>{$tipo}</b> — $ ".number_format($mov->monto, 2)." {$mov->moneda}\n";
            if ($origen) {
                $texto .= "   📤 {$origen}\n";
            }
            if ($destino) {
                $texto .= "   📥 {$destino}\n";
            }
            $texto .= "   👤 {$mov->user->name} — ".$mov->created_at->format('d/m H:i')."\n";
            $texto .= "━━━━━━━━━━━━━━\n";
        }

        $count = $movimientos->count();
        $sufijo = $count >= 10
            ? "\n<i>Mostrando los últimos 10 movimientos.</i>"
            : "\n<i>Total: {$count} movimiento(s)</i>";

        $texto .= $sufijo;

        try {
            Telegram::editMessageText([
                'chat_id' => $chatId,
                'message_id' => $messageId,
                'text' => $texto,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Exception $e) {
            $this->sendMessage($chatId, $texto);
        }

        Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);
    }

    // ─── Ventas especiales ────────────────────────────────────────────────────

    private function aprobarVenta(Venta $venta, User $admin, int|string $chatId, int $messageId, string $callbackId): void
    {
        $venta->update([
            'estado' => 'pendiente',
            'decision_notificada' => false,
        ]);

        Telegram::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => "✅ <b>Venta Especial #{$venta->id} Aprobada</b>\nAprobada por: {$admin->name}",
            'parse_mode' => 'HTML',
        ]);

        Telegram::answerCallbackQuery([
            'callback_query_id' => $callbackId,
            'text' => '✅ Aprobada',
        ]);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'aprobada'));
        } catch (\Exception $e) {
            Log::error('Telegram aprobar — notificación fallida: '.$e->getMessage());
        }
    }

    private function rechazarVenta(Venta $venta, User $admin, int|string $chatId, int $messageId, string $callbackId): void
    {
        $venta->load(['detalles.loteConsumos']);

        DB::transaction(function () use ($venta, $admin) {
            foreach ($venta->detalles as $detalle) {
                $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
                    ->where('producto_id', $detalle->producto_id)->first();

                if ($almacenProducto) {
                    $almacenProducto->increment('cantidad', $detalle->cantidad);
                }

                // Igual que anularVenta(): las unidades vuelven a sus lotes.
                app(LoteConsumoService::class)->devolver($detalle, (int) $venta->almacen_id);

                if ($detalle->producto_codigo_id) {
                    $codigo = ProductoCodigo::find($detalle->producto_codigo_id);
                    if ($codigo) {
                        $codigo->increment('cantidad', $detalle->cantidad);
                        app(CodigoStockService::class)->agregar($venta->almacen_id, $codigo->id, $detalle->cantidad);
                    }
                }

                HistorialStock::create([
                    'producto_id' => $detalle->producto_id,
                    'almacen_id' => $venta->almacen_id,
                    'venta_id' => $venta->id,
                    'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
                    'cantidad_nueva' => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
                    'diferencia' => $detalle->cantidad,
                    'tipo' => 'venta_anulada',
                    'observaciones' => 'Stock revertido por rechazo desde Telegram',
                    'user_id' => $admin->id,
                ]);
            }

            $venta->update([
                'estado' => 'rechazada',
                'decision_notificada' => false,
            ]);
        });

        Telegram::editMessageText([
            'chat_id' => $chatId,
            'message_id' => $messageId,
            'text' => "❌ <b>Venta Especial #{$venta->id} Rechazada</b>\nRechazada por: {$admin->name}",
            'parse_mode' => 'HTML',
        ]);

        Telegram::answerCallbackQuery([
            'callback_query_id' => $callbackId,
            'text' => '❌ Rechazada',
        ]);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
        } catch (\Exception $e) {
            Log::error('Telegram rechazar — notificación fallida: '.$e->getMessage());
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
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'HTML',
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram sendMessage error: '.$e->getMessage());
        }
    }
}
