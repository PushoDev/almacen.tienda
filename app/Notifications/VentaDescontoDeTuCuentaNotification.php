<?php

namespace App\Notifications;

use App\Models\Cuenta;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Aviso al vendedor dueño de una cuenta cuando otra persona aprueba una venta y de esa cuenta sale
 * la mensajería o la comisión. `$concepto` es `mensajeria` o `comision`.
 */
class VentaDescontoDeTuCuentaNotification extends Notification
{
    use EnviaAvisoPush, Queueable;

    public function __construct(
        public Venta $venta,
        public Cuenta $cuenta,
        public string $concepto,
        public float $monto,
        public ?User $autor = null,
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return $this->conPushSi(['database'], $notifiable, true);
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        return $this->mensajePush(
            'Se descontó de tu cuenta',
            $this->mensaje(),
            route('ventas.show', $this->venta->id),
            'venta-cuenta-'.$this->venta->id.'-'.$this->concepto,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'venta_descuento_cuenta',
            'title' => 'Se descontó de tu cuenta',
            'message' => $this->mensaje(),
            'concepto' => $this->concepto,
            'monto' => $this->monto,
            'venta_id' => $this->venta->id,
            'cuenta_id' => $this->cuenta->id,
            'hecho_por_id' => $this->autor?->id,
            'icon' => 'wallet',
            'color' => 'amber',
            'context' => 'tu_operacion',
            'priority' => 'high',
        ];
    }

    private function mensaje(): string
    {
        $this->cuenta->loadMissing('moneda:id,codigo_moneda');

        $concepto = $this->concepto === 'comision' ? 'la comisión' : 'la mensajería';
        $monto = number_format($this->monto, 2);

        return "{$this->autor?->name} aprobó la venta #{$this->venta->id} y descontó {$monto} {$this->cuenta->moneda?->codigo_moneda} "
            ."de tu cuenta {$this->cuenta->nombre_cuenta} por {$concepto}";
    }
}
