<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\CierreCaja;
use App\Models\HistorialStock;
use App\Models\Movimiento;
use App\Models\MovimientoFinanciero;
use App\Models\ProductoCodigo;
use App\Models\TelegramVinculo;
use App\Models\TransferenciaPendiente;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\VentaEspecialDecisionNotification;
use App\Services\AvisoVendedoresAlmacen;
use App\Services\CodigoStockService;
use App\Services\FechaNegocio;
use App\Services\LoteConsumoService;
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
            return $this->cmdVincular($chatId, $text, $message['from'] ?? []);
        }

        $usuario = $this->verificarUsuario($chatId);
        if (! $usuario) {
            $this->sendMessage($chatId, '⛔ No tienes acceso a este bot.');

            return response()->json(['ok' => true]);
        }

        // Los reportes generales son de admin y moderador; el vendedor solo consulta lo suyo.
        $global = $this->esGlobal($usuario);
        $soloGlobal = fn (callable $accion) => $global
            ? $accion()
            : $this->sendMessage($chatId, '⛔ Este comando es solo para administradores y moderadores.');

        match (true) {
            str_starts_with($text, '/start') => $this->cmdStart($chatId, $usuario),
            str_starts_with($text, '/menu') => $this->cmdMenu($chatId, $usuario),
            str_starts_with($text, '/pendientes') => $this->cmdPendientes($chatId, $usuario),
            str_starts_with($text, '/reporte') => $soloGlobal(fn () => $this->cmdReporte($chatId)),
            str_starts_with($text, '/estadocierres') => $soloGlobal(fn () => $this->cmdEstadoCierres($chatId)),
            str_starts_with($text, '/cierres') => $soloGlobal(fn () => $this->cmdCierres($chatId)),
            str_starts_with($text, '/movimientos') => $soloGlobal(fn () => $this->cmdMovimientos($chatId)),
            str_starts_with($text, '/ayuda') => $this->cmdAyuda($chatId, $usuario),
            default => $this->sendMessage($chatId, 'Comando no reconocido. Escribe /menu.'),
        };

        return response()->json(['ok' => true]);
    }

    /**
     * Vincula este chat a la cuenta dueña del código. El código NO se gasta: varias personas (los
     * responsables de turno de una misma cuenta) pueden vincular su Telegram con el mismo. Para cortar
     * el acceso se regenera el código y/o se desconecta a cada persona desde Configuración › Perfil.
     *
     * @param  array<string, mixed>  $from  Datos de quien escribe, tal como los manda Telegram
     */
    private function cmdVincular(int|string $chatId, string $text, array $from = []): JsonResponse
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

        $nombre = trim(($from['first_name'] ?? '').' '.($from['last_name'] ?? ''))
            ?: (isset($from['username']) ? '@'.$from['username'] : null);

        // Un chat solo puede pertenecer a una cuenta: si ya estaba en otra, pasa a esta.
        TelegramVinculo::updateOrCreate(
            ['chat_id' => (string) $chatId],
            ['user_id' => $user->id, 'nombre' => $nombre, 'vinculado_en' => now()]
        );

        $this->sendMessage($chatId,
            "✅ <b>Cuenta vinculada correctamente a {$user->name}.</b>\n\n".
            "👋 ¡Bienvenido(a)!\n".
            "Soy <b>GloriBot</b>, tu asistente virtual para ayudarte a gestionar y consultar información de forma rápida y sencilla. 🚀\n\n".
            "Para comenzar, escribe / y selecciona la opción que necesites. Te guiaré paso a paso para acceder a las herramientas y funciones disponibles.\n\n".
            "✨ <i>Desarrollado por PushoDev, impulsando soluciones tecnológicas para hacer tu trabajo más eficiente.</i>\n\n".
            '¡Comencemos! 🎯'
        );

        return response()->json(['ok' => true]);
    }

    private function cmdStart(int|string $chatId, User $usuario): void
    {
        $this->sendMessage($chatId,
            "👋 ¡Hola de nuevo, <b>{$usuario->name}</b>!\n\n".
            "Soy <b>GloriBot</b>, tu asistente virtual de La Glorieta Tienda. 🚀\n\n".
            'Escribe /menu para ver lo que puedes consultar.'
        );
    }

    private function cmdAyuda(int|string $chatId, User $usuario): void
    {
        $texto = "📋 <b>Comandos disponibles:</b>\n\n".
            "/menu — Menú con botones\n".
            "/pendientes — Lo que espera tu acción\n";

        if ($this->esGlobal($usuario)) {
            $texto .= "/reporte — Ventas del día por almacén\n".
                "/estadocierres — Quiénes ya cerraron hoy y quiénes faltan\n".
                "/cierres — Ver cierres de caja por usuario\n".
                "/movimientos — Ver gastos, ingresos y transferencias\n";
        }

        $this->sendMessage($chatId, $texto.'/ayuda — Ver esta ayuda');
    }

    /**
     * Menú con botones: en vez de empujar un aviso por cada operación, cada quien consulta a demanda lo
     * que le interesa. El vendedor solo ve las opciones de su cuenta.
     */
    private function cmdMenu(int|string $chatId, User $usuario): void
    {
        $filas = [[['text' => '📌 Pendientes (lo que espera mi acción)', 'callback_data' => 'menu:pendientes']]];

        if ($this->esGlobal($usuario)) {
            $filas[] = [
                ['text' => '📊 Reporte del día', 'callback_data' => 'menu:reporte'],
                ['text' => '🔒 Cierres', 'callback_data' => 'menu:cierres'],
            ];
            $filas[] = [
                ['text' => '🕐 Quiénes faltan por cerrar', 'callback_data' => 'menu:estadocierres'],
                ['text' => '💸 Movimientos', 'callback_data' => 'menu:movimientos'],
            ];
        }

        $filas[] = [['text' => '❓ Ayuda', 'callback_data' => 'menu:ayuda']];

        try {
            Telegram::sendMessage([
                'chat_id' => $chatId,
                'text' => "🤖 <b>¿Qué quieres consultar, {$usuario->name}?</b>",
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode(['inline_keyboard' => $filas]),
            ]);
        } catch (\Exception $e) {
            Log::error('Telegram cmdMenu error: '.$e->getMessage());
        }
    }

    /**
     * Lo que está esperando una acción de esta persona: ventas especiales por decidir, envíos de dinero
     * por confirmar y movimientos de inventario en camino. Admin y moderador ven todo lo que pueden
     * decidir; el vendedor solo lo de su cuenta. Las ventas especiales llevan botones para decidir.
     */
    private function cmdPendientes(int|string $chatId, User $usuario): void
    {
        $global = $this->esGlobal($usuario);

        $ventas = Venta::where('estado', 'solicitud_especial')
            ->when($usuario->role === 'moderador', fn ($q) => $q->where(fn ($sub) => $sub->whereNull('tipo_venta_especial')->orWhere('tipo_venta_especial', '!=', 'bajo_costo')))
            ->when(! $global, fn ($q) => $q->where('user_id', $usuario->id));

        $envios = TransferenciaPendiente::where('estado', TransferenciaPendiente::ESTADO_EN_TRANSITO)
            ->when(! $global, fn ($q) => $q
                ->whereIn('cuenta_destino_id', $usuario->cuentas()->pluck('cuentas.id'))
                ->where('user_id', '!=', $usuario->id));

        $movimientos = Movimiento::where('estado', 'en_transito')
            ->when(! $global, fn ($q) => $q->whereIn('almacen_destino_id', $usuario->almacenes()->pluck('almacens.id')));

        $totalVentas = (clone $ventas)->count();
        $totalEnvios = (clone $envios)->count();
        $totalMovimientos = (clone $movimientos)->count();

        if ($totalVentas + $totalEnvios + $totalMovimientos === 0) {
            $this->sendMessage($chatId, '✅ <b>No tienes nada pendiente.</b>');

            return;
        }

        $texto = "📌 <b>Pendientes</b>\n";
        $botones = [];

        if ($totalVentas > 0) {
            $texto .= "\n🔔 <b>Ventas especiales por decidir ({$totalVentas})</b>\n";

            foreach ($ventas->with('usuario')->latest()->limit(5)->get() as $venta) {
                $enlace = route('ventas.show', $venta->id);
                $texto .= "• <a href=\"{$enlace}\">Venta #{$venta->id}</a> — {$venta->usuario?->name} — $ ".number_format((float) $venta->total, 2)."\n";

                if ($global) {
                    $botones[] = [
                        ['text' => "✅ Aprobar #{$venta->id}", 'callback_data' => "aprobar_venta:{$venta->id}"],
                        ['text' => "❌ Rechazar #{$venta->id}", 'callback_data' => "rechazar_venta:{$venta->id}"],
                    ];
                }
            }
        }

        if ($totalEnvios > 0) {
            $texto .= "\n💸 <b>Envíos de dinero por confirmar ({$totalEnvios})</b>\n";

            foreach ($envios->with('usuario')->latest()->limit(5)->get() as $envio) {
                $texto .= "• #{$envio->id} — {$envio->usuario?->name} — {$envio->monto} {$envio->moneda}\n";
            }

            $texto .= '<a href="'.route('transacciones.envios.index').'">Abrir envíos en la app</a>'."\n";
        }

        if ($totalMovimientos > 0) {
            $texto .= "\n🚚 <b>Movimientos en camino ({$totalMovimientos})</b>\n";

            foreach ($movimientos->with(['almacenOrigen', 'almacenDestino'])->latest()->limit(5)->get() as $movimiento) {
                $enlace = route('movimientos.show', $movimiento->id);
                $texto .= "• <a href=\"{$enlace}\">Movimiento #{$movimiento->id}</a> — {$movimiento->almacenOrigen?->nombre_almacen} → {$movimiento->almacenDestino?->nombre_almacen}\n";
            }
        }

        try {
            Telegram::sendMessage(array_filter([
                'chat_id' => $chatId,
                'text' => $texto,
                'parse_mode' => 'HTML',
                'disable_web_page_preview' => true,
                'reply_markup' => $botones ? json_encode(['inline_keyboard' => $botones]) : null,
            ]));
        } catch (\Exception $e) {
            Log::error('Telegram cmdPendientes error: '.$e->getMessage());
        }
    }

    private function cmdReporte(int|string $chatId): void
    {
        $hoy = FechaNegocio::ahora();
        $rangoHoy = FechaNegocio::rangoDelDiaUtc($hoy->toDateString());
        $almacenes = Almacen::all();

        if ($almacenes->isEmpty()) {
            $this->sendMessage($chatId, 'No hay almacenes registrados.');

            return;
        }

        $texto = '📊 <b>Reporte del día '.$hoy->format('d/m/Y')."</b>\n\n";

        foreach ($almacenes as $almacen) {
            $ventas = Venta::where('almacen_id', $almacen->id)
                ->whereBetween('created_at', $rangoHoy)
                ->where('estado', 'completada')
                ->get();

            $texto .= "🏪 <b>{$almacen->nombre_almacen}</b>\n";
            $texto .= "   Ventas: {$ventas->count()}  |  Total: $ ".round($ventas->sum('total'), 2)."\n\n";
        }

        $countGlobal = Venta::whereBetween('created_at', $rangoHoy)->where('estado', 'completada')->count();
        $totalGlobal = round(Venta::whereBetween('created_at', $rangoHoy)->where('estado', 'completada')->sum('total'), 2);

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
        $hoy = FechaNegocio::ahora();

        $usuarios = User::whereIn('role', ['moderador', 'vendedor'])->orderBy('name')->get();

        if ($usuarios->isEmpty()) {
            $this->sendMessage($chatId, 'No hay usuarios moderador/vendedor registrados.');

            return;
        }

        $cierresHoy = CierreCaja::whereIn('user_id', $usuarios->pluck('id'))
            ->whereBetween('fecha_cierre', FechaNegocio::rangoDelDiaUtc($hoy->toDateString()))
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
                $hora = $cierre->fecha_cierre ? FechaNegocio::aZonaDelNegocio($cierre->fecha_cierre)->format('H:i') : '—';
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

        $usuario = $this->verificarUsuario($chatId);
        if (! $usuario) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin acceso']);

            return response()->json(['ok' => true]);
        }

        // Botones del menú
        if (str_starts_with($data, 'menu:')) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId]);
            $this->opcionDeMenu(substr($data, 5), $chatId, $usuario);

            return response()->json(['ok' => true]);
        }

        // Reportes con filtros y decisiones: solo admin y moderador (el vendedor no llega aquí)
        if (! $this->esGlobal($usuario)) {
            Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin permiso']);

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

        // Misma regla que la web: la de 'descuento' la deciden admin y moderador; la que baja del
        // costo ('bajo_costo') solo un admin.
        $puedeDecidir = $venta->tipo_venta_especial === 'bajo_costo'
            ? $usuario->role === 'admin'
            : $this->esGlobal($usuario);

        if (! $puedeDecidir) {
            Telegram::answerCallbackQuery([
                'callback_query_id' => $callbackId,
                'text' => '⛔ Esta solicitud solo la puede decidir un administrador.',
            ]);

            return response()->json(['ok' => true]);
        }

        if ($accion === 'aprobar_venta') {
            $this->aprobarVenta($venta, $usuario, $chatId, $messageId, $callbackId);
        } else {
            $this->rechazarVenta($venta, $usuario, $chatId, $messageId, $callbackId);
        }

        return response()->json(['ok' => true]);
    }

    private function opcionDeMenu(string $opcion, int|string $chatId, User $usuario): void
    {
        $global = $this->esGlobal($usuario);

        match (true) {
            $opcion === 'pendientes' => $this->cmdPendientes($chatId, $usuario),
            $opcion === 'ayuda' => $this->cmdAyuda($chatId, $usuario),
            $opcion === 'reporte' && $global => $this->cmdReporte($chatId),
            $opcion === 'cierres' && $global => $this->cmdCierres($chatId),
            $opcion === 'estadocierres' && $global => $this->cmdEstadoCierres($chatId),
            $opcion === 'movimientos' && $global => $this->cmdMovimientos($chatId),
            default => $this->sendMessage($chatId, '⛔ Opción no disponible para tu rol.'),
        };
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
            'hoy' => $query->where('fecha_cierre', '>=', FechaNegocio::inicioDeHaceDiasUtc(0)),
            '3d' => $query->where('fecha_cierre', '>=', FechaNegocio::inicioDeHaceDiasUtc(3)),
            '5d' => $query->where('fecha_cierre', '>=', FechaNegocio::inicioDeHaceDiasUtc(5)),
            'mes' => $query->whereBetween('fecha_cierre', FechaNegocio::rangoDelMesActualUtc()),
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
            $apertura = $cierre->fecha_apertura ? FechaNegocio::aZonaDelNegocio($cierre->fecha_apertura)->format('d/m/Y H:i') : '—';
            $fechaCierre = $cierre->fecha_cierre ? FechaNegocio::aZonaDelNegocio($cierre->fecha_cierre)->format('d/m/Y H:i') : '—';

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
            'hoy' => $query->where('created_at', '>=', FechaNegocio::inicioDeHaceDiasUtc(0)),
            '3d' => $query->where('created_at', '>=', FechaNegocio::inicioDeHaceDiasUtc(3)),
            '5d' => $query->where('created_at', '>=', FechaNegocio::inicioDeHaceDiasUtc(5)),
            'mes' => $query->whereBetween('created_at', FechaNegocio::rangoDelMesActualUtc()),
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
            $texto .= "   👤 {$mov->user->name} — ".FechaNegocio::aZonaDelNegocio($mov->created_at)->format('d/m H:i')."\n";
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

        app(AvisoVendedoresAlmacen::class)->porVenta($venta, 'rechazada', $admin);

        try {
            Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
        } catch (\Exception $e) {
            Log::error('Telegram rechazar — notificación fallida: '.$e->getMessage());
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /**
     * El usuario dueño de este chat (cualquier rol). Un chat pertenece a una sola cuenta.
     */
    private function verificarUsuario(int|string $chatId): ?User
    {
        return User::whereHas('telegramVinculos', fn ($query) => $query->where('chat_id', (string) $chatId))->first();
    }

    private function esGlobal(User $usuario): bool
    {
        return in_array($usuario->role, ['admin', 'moderador'], true);
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
