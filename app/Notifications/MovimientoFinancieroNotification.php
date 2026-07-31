<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class MovimientoFinancieroNotification extends Notification
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public $movimiento;
    public $tipoOperacion;
    public $entidadAfectada;

    /**
     * Create a new notification instance.
     */
    public function __construct($movimiento, $tipoOperacion = null, $entidadAfectada = null)
    {
        $this->movimiento = $movimiento;
        $this->tipoOperacion = $tipoOperacion ?? $this->determinarTipoOperacion();
        $this->entidadAfectada = $entidadAfectada ?? $this->determinarEntidadAfectada();
    }

    /**
     * Get notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];

        if (!$notifiable->telegram_chat_id) {
            return $channels;
        }

        if ($notifiable->role === 'admin') {
            $channels[] = \App\Channels\TelegramChannel::class;
        } elseif ($notifiable->role === 'vendedor') {
            $esSuCuentaOrigen = $this->movimiento->cuenta_origen_id &&
                $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_origen_id)->exists();
            $esSuCuentaDestino = $this->movimiento->cuenta_destino_id &&
                $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_destino_id)->exists();

            if ($esSuCuentaOrigen || $esSuCuentaDestino) {
                $channels[] = \App\Channels\TelegramChannel::class;
            }
        }

        return $channels;
    }

    /**
     * Get the Telegram representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toTelegram(object $notifiable): array
    {
        $monto = number_format($this->movimiento->monto, 2);

        switch ($this->tipoOperacion) {
            case 'gasto':
                $nombreOrigen = $this->movimiento->cuentaOrigen->nombre_cuenta ??
                    ($this->movimiento->clienteOrigen->nombre_cliente ?? 'Desconocido');
                $icon = '🔴';
                $titulo = 'Gasto Registrado';
                $detalle = "📤 Desde: {$nombreOrigen}";
                break;

            case 'ingreso':
                $nombreDestino = $this->movimiento->cuentaDestino->nombre_cuenta ??
                    ($this->movimiento->clienteDestino->nombre_cliente ??
                    ($this->movimiento->proveedorDestino->nombre_proveedor ?? 'Desconocido'));
                $icon = '🟢';
                $titulo = 'Ingreso Registrado';
                $detalle = "📥 Hacia: {$nombreDestino}";
                break;

            case 'transferencia':
            default:
                $nombreOrigen = $this->movimiento->cuentaOrigen->nombre_cuenta ??
                    ($this->movimiento->clienteOrigen->nombre_cliente ?? 'Desconocido');
                $nombreDestino = $this->movimiento->cuentaDestino->nombre_cuenta ??
                    ($this->movimiento->clienteDestino->nombre_cliente ??
                    ($this->movimiento->proveedorDestino->nombre_proveedor ?? 'Desconocido'));
                $icon = '🔄';
                $titulo = 'Transferencia Registrada';
                $detalle = "📤 De: {$nombreOrigen}\n📥 A: {$nombreDestino}";
                break;
        }

        $texto  = "{$icon} <b>{$titulo}</b>\n";
        $texto .= "💰 Monto: $ {$monto} {$this->movimiento->moneda}\n";
        $texto .= "{$detalle}\n";
        $texto .= "👤 Registrado por: {$this->movimiento->user->name}\n";
        $texto .= "🕐 " . now()->format('d/m/Y H:i');

        return [
            'text'       => $texto,
            'parse_mode' => 'HTML',
        ];
    }

    /**
     * Get array representation of notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        // Estructura base consistente con VentaCreadaNotification
        $base = [
            'type' => 'movimiento_financiero',
            'movimiento_id' => $this->movimiento->id,
            'monto' => $this->movimiento->monto,
            'moneda' => $this->movimiento->moneda,
            'cuenta_origen_id' => $this->movimiento->cuenta_origen_id,
            'cuenta_destino_id' => $this->movimiento->cuenta_destino_id,
            'icon' => 'dollar-sign',
            'color' => 'blue'
        ];

        // Mensaje personalizado según el rol del notificado
        if ($notifiable->role === 'vendedor') {
            // Verificar si involucra sus cuentas
            $esSuCuentaOrigen = $this->movimiento->cuenta_origen_id && 
                                $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_origen_id)->exists();
            $esSuCuentaDestino = $this->movimiento->cuenta_destino_id && 
                                 $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_destino_id)->exists();
            
            if ($esSuCuentaOrigen || $esSuCuentaDestino) {
                $this->construirMensajeVendedor($base, $notifiable);
            } else {
                $this->construirMensajeGeneral($base, $notifiable);
            }
        } else {
            // Admin y moderador ven mensaje general
            $this->construirMensajeGeneral($base, $notifiable);
        }

        return $base;
    }

    /**
     * Determina el tipo de operación basado en el movimiento
     */
    private function determinarTipoOperacion(): string
    {
        switch ($this->movimiento->tipo_movimiento_id) {
            case 1:
                return 'gasto';
            case 2:
                return 'ingreso';
            case 3:
                return 'transferencia';
            default:
                return 'desconocido';
        }
    }

    /**
     * Determina la entidad afectada principal
     */
    private function determinarEntidadAfectada(): array
    {
        $entidades = [];

        if ($this->movimiento->cuenta_origen_id) {
            $entidades[] = [
                'tipo' => 'cuenta',
                'id' => $this->movimiento->cuenta_origen_id,
                'rol' => 'origen'
            ];
        }

        if ($this->movimiento->cuenta_destino_id) {
            $entidades[] = [
                'tipo' => 'cuenta',
                'id' => $this->movimiento->cuenta_destino_id,
                'rol' => 'destino'
            ];
        }

        return $entidades;
    }

    /**
     * Construye mensaje para vendedor
     */
    private function construirMensajeVendedor(array &$base, object $notifiable): void
    {
        switch ($this->tipoOperacion) {
            case 'gasto':
                $esSuCuenta = $this->movimiento->cuenta_origen_id && 
                               $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_origen_id)->exists();
                if ($esSuCuenta) {
                    $base['title'] = 'Gasto en tu Cuenta';
                    $base['message'] = "Gasto de {$this->movimiento->monto} {$this->movimiento->moneda} en tu cuenta por {$this->movimiento->user->name}";
                    $base['context'] = 'tu_operacion';
                    $base['priority'] = 'high';
                    $base['icon'] = 'arrow-down-circle';
                    $base['color'] = 'red';
                } else {
                    $base['title'] = 'Gasto Registrado';
                    $base['message'] = "Gasto de {$this->movimiento->monto} {$this->movimiento->moneda} por {$this->movimiento->user->name}";
                    $base['context'] = 'general';
                    $base['priority'] = 'normal';
                    $base['icon'] = 'arrow-down-circle';
                    $base['color'] = 'orange';
                }
                break;

            case 'ingreso':
                $esSuCuenta = $this->movimiento->cuenta_destino_id && 
                               $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_destino_id)->exists();
                if ($esSuCuenta) {
                    $base['title'] = 'Ingreso a tu Cuenta';
                    $base['message'] = "Ingreso de {$this->movimiento->monto} {$this->movimiento->moneda} a tu cuenta por {$this->movimiento->user->name}";
                    $base['context'] = 'tu_operacion';
                    $base['priority'] = 'high';
                    $base['icon'] = 'arrow-up-circle';
                    $base['color'] = 'green';
                } else {
                    $base['title'] = 'Ingreso Registrado';
                    $base['message'] = "Ingreso de {$this->movimiento->monto} {$this->movimiento->moneda} por {$this->movimiento->user->name}";
                    $base['context'] = 'general';
                    $base['priority'] = 'normal';
                    $base['icon'] = 'arrow-up-circle';
                    $base['color'] = 'blue';
                }
                break;

            case 'transferencia':
                $esSuCuentaOrigen = $this->movimiento->cuenta_origen_id && 
                                   $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_origen_id)->exists();
                $esSuCuentaDestino = $this->movimiento->cuenta_destino_id && 
                                    $notifiable->cuentas()->where('cuentas.id', $this->movimiento->cuenta_destino_id)->exists();
                
                if ($esSuCuentaOrigen || $esSuCuentaDestino) {
                    if ($esSuCuentaOrigen) {
                        $base['title'] = 'Salida de tu Cuenta';
                        $base['message'] = "Transferencia de {$this->movimiento->monto} {$this->movimiento->moneda} desde tu cuenta por {$this->movimiento->user->name}";
                        $base['icon'] = 'arrow-right';
                        $base['color'] = 'orange';
                    } else {
                        $base['title'] = 'Entrada a tu Cuenta';
                        $base['message'] = "Transferencia de {$this->movimiento->monto} {$this->movimiento->moneda} a tu cuenta por {$this->movimiento->user->name}";
                        $base['icon'] = 'arrow-left';
                        $base['color'] = 'green';
                    }
                    $base['context'] = 'tu_operacion';
                    $base['priority'] = 'high';
                } else {
                    $base['title'] = 'Transferencia Registrada';
                    $base['message'] = "Transferencia de {$this->movimiento->monto} {$this->movimiento->moneda} por {$this->movimiento->user->name}";
                    $base['context'] = 'general';
                    $base['priority'] = 'normal';
                    $base['icon'] = 'arrow-right-left';
                    $base['color'] = 'blue';
                }
                break;
        }
    }

    /**
     * Construye mensaje general para admins/moderadores
     */
    private function construirMensajeGeneral(array &$base, object $notifiable): void
    {
        switch ($this->tipoOperacion) {
            case 'gasto':
                $nombreOrigen = $this->movimiento->cuentaOrigen->nombre_cuenta ?? 
                               ($this->movimiento->clienteOrigen->nombre_cliente ?? 'Desconocido');
                $base['title'] = 'Gasto Registrado';
                $base['message'] = "Gasto de {$this->movimiento->monto} {$this->movimiento->moneda} desde {$nombreOrigen} por {$this->movimiento->user->name}";
                $base['context'] = 'sistema';
                $base['icon'] = 'arrow-down-circle';
                $base['color'] = 'red';
                break;

            case 'ingreso':
                $nombreDestino = $this->movimiento->cuentaDestino->nombre_cuenta ?? 
                                ($this->movimiento->clienteDestino->nombre_cliente ?? 
                                ($this->movimiento->proveedorDestino->nombre_proveedor ?? 'Desconocido'));
                $base['title'] = 'Ingreso Registrado';
                $base['message'] = "Ingreso de {$this->movimiento->monto} {$this->movimiento->moneda} a {$nombreDestino} por {$this->movimiento->user->name}";
                $base['context'] = 'sistema';
                $base['icon'] = 'arrow-up-circle';
                $base['color'] = 'green';
                break;

            case 'transferencia':
                $nombreOrigen = $this->movimiento->cuentaOrigen->nombre_cuenta ?? 
                               ($this->movimiento->clienteOrigen->nombre_cliente ?? 'Desconocido');
                $nombreDestino = $this->movimiento->cuentaDestino->nombre_cuenta ?? 
                                ($this->movimiento->clienteDestino->nombre_cliente ?? 
                                ($this->movimiento->proveedorDestino->nombre_proveedor ?? 'Desconocido'));
                $base['title'] = 'Transferencia Registrada';
                $base['message'] = "Transferencia de {$this->movimiento->monto} {$this->movimiento->moneda} de {$nombreOrigen} a {$nombreDestino} por {$this->movimiento->user->name}";
                $base['context'] = 'sistema';
                $base['icon'] = 'arrow-right-left';
                $base['color'] = 'blue';
                break;
        }
    }
}