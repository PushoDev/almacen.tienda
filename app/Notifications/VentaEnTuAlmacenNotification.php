<?php

namespace App\Notifications;

use App\Models\User;
use App\Models\Venta;
use App\Notifications\Concerns\DescribeLineasDeStock;
use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Aviso al vendedor dueño de un almacén cuando otra persona (admin, moderador u otro vendedor
 * del mismo almacén) cambia su stock por una venta: la vendió, la anuló, la devolvió o rechazó
 * su solicitud especial. Es solo informativo, no mueve su caja ni sus comisiones.
 *
 * `$accion` es una de: vendida, cancelada, devuelta, rechazada. `$autor` es quien hizo la acción
 * (por defecto, quien creó la venta).
 */
class VentaEnTuAlmacenNotification extends Notification
{
    use DescribeLineasDeStock, EnviaAvisoPush, Queueable;

    /** @var array<int, array<string, mixed>>|null */
    private ?array $lineasCalculadas = null;

    public function __construct(
        public Venta $venta,
        public string $accion = 'vendida',
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
            $this->titulo(),
            $this->mensaje(),
            route('ventas.show', $this->venta->id),
            'venta-en-almacen-'.$this->venta->id.'-'.$this->accion,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $descuentaStock = $this->accion === 'vendida';

        return [
            'type' => 'venta_en_tu_almacen',
            'title' => $this->titulo(),
            'message' => $this->mensaje(),
            'accion' => $this->accion,
            'venta_id' => $this->venta->id,
            'almacen_id' => $this->venta->almacen_id,
            'productos' => $this->lineas(),
            'hecho_por_id' => $this->autor()?->id,
            'icon' => $descuentaStock ? 'package-minus' : 'package-plus',
            'color' => $descuentaStock ? 'amber' : 'green',
            'context' => 'tu_operacion',
            'priority' => 'high',
        ];
    }

    private function autor(): ?User
    {
        return $this->autor ?? $this->venta->usuario;
    }

    private function titulo(): string
    {
        return $this->accion === 'vendida' ? 'Se vendió de tu almacén' : 'Stock devuelto a tu almacén';
    }

    /**
     * Productos de la venta con su detalle y el stock que quedó en el almacén (se calcula una sola vez).
     *
     * @return array<int, array{producto_id: int, nombre: string|null, detalle: string, cantidad: int, stock_actual: int}>
     */
    private function lineas(): array
    {
        return $this->lineasCalculadas ??= $this->detalleDeLineas(
            (int) $this->venta->almacen_id,
            $this->venta->detalles()->get(['producto_id', 'cantidad'])->map(fn ($detalle): array => [
                'producto_id' => (int) $detalle->producto_id,
                'cantidad' => (int) $detalle->cantidad,
            ]),
        );
    }

    private function mensaje(): string
    {
        $this->venta->loadMissing(['usuario:id,name', 'almacen:id,nombre_almacen']);

        $productos = $this->textoDeLineas($this->lineas());

        $autor = $this->autor()?->name;
        $almacen = $this->venta->almacen?->nombre_almacen;
        $id = $this->venta->id;

        return match ($this->accion) {
            'cancelada' => "{$autor} anuló la venta #{$id} de tu almacén {$almacen}; el stock volvió: {$productos}",
            'devuelta' => "{$autor} procesó la devolución de la venta #{$id} de tu almacén {$almacen}; el stock volvió: {$productos}",
            'rechazada' => "{$autor} rechazó la solicitud especial #{$id} de tu almacén {$almacen}; el stock volvió: {$productos}",
            default => "{$autor} vendió de tu almacén {$almacen} (venta #{$id}): {$productos}",
        };
    }
}
