<?php

namespace App\Notifications;

use App\Models\Almacen;
use App\Models\User;
use App\Notifications\Concerns\DescribeLineasDeStock;
use App\Notifications\Concerns\EnviaAvisoPush;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * Aviso al vendedor de un almacén cuando otra persona le cambia el stock sin pasar por una venta:
 * una compra aprobada o una importación de Excel (o su "deshacer"). Es solo informativo.
 *
 * `$tipo` es uno de: compra, importacion, importacion_revertida. `$resumen` identifica la operación
 * ("compra #12"), `$lineas` son los productos que entraron o salieron (producto_id y cantidad) y `$url`
 * es la pantalla donde ver el detalle. En el aviso cada producto sale con su detalle y el stock que
 * quedó en el almacén.
 */
class StockCambiadoEnTuAlmacenNotification extends Notification
{
    use DescribeLineasDeStock, EnviaAvisoPush, Queueable;

    /** @var array<int, array<string, mixed>>|null */
    private ?array $lineasCalculadas = null;

    /**
     * @param  array<int, array{producto_id: int, cantidad: int}>  $lineas
     */
    public function __construct(
        public Almacen $almacen,
        public string $tipo,
        public string $resumen,
        public array $lineas,
        public string $url,
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
            'Cambió el stock de tu almacén',
            $this->mensaje(),
            $this->url,
            'stock-almacen-'.$this->almacen->id.'-'.$this->tipo,
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $descuentaStock = $this->tipo === 'importacion_revertida';

        return [
            'type' => 'stock_cambiado_en_tu_almacen',
            'title' => 'Cambió el stock de tu almacén',
            'message' => $this->mensaje(),
            'tipo' => $this->tipo,
            'almacen_id' => $this->almacen->id,
            'productos' => $this->lineasConStock(),
            'url' => $this->url,
            'hecho_por_id' => $this->autor?->id,
            'icon' => $descuentaStock ? 'package-minus' : 'package-plus',
            'color' => $descuentaStock ? 'amber' : 'green',
            'context' => 'tu_operacion',
            'priority' => 'high',
        ];
    }

    /**
     * @return array<int, array{producto_id: int, nombre: string|null, detalle: string, cantidad: int, stock_actual: int}>
     */
    private function lineasConStock(): array
    {
        return $this->lineasCalculadas ??= $this->detalleDeLineas($this->almacen->id, $this->lineas);
    }

    private function mensaje(): string
    {
        $autor = $this->autor?->name ?? 'Alguien';
        $almacen = $this->almacen->nombre_almacen;
        $productos = $this->textoDeLineas($this->lineasConStock());

        return match ($this->tipo) {
            'compra' => "{$autor} aprobó una compra que sumó stock a tu almacén {$almacen} ({$this->resumen}): {$productos}",
            'importacion_revertida' => "{$autor} deshizo una importación en tu almacén {$almacen} ({$this->resumen}): {$productos}",
            default => "{$autor} importó productos a tu almacén {$almacen} ({$this->resumen}): {$productos}",
        };
    }
}
