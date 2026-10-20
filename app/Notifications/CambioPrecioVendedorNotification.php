<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class CambioPrecioVendedorNotification extends Notification
{
    use Queueable;

    public $producto;

    public $almacen;

    public $vendedor;

    public $precioAnterior;

    public $precioNuevo;

    public int $cantidad = 1;

    public function __construct($producto, $almacen, $vendedor, $precioAnterior, $precioNuevo)
    {
        $this->producto = $producto;
        $this->almacen = $almacen;
        $this->vendedor = $vendedor;
        $this->precioAnterior = $precioAnterior;
        $this->precioNuevo = $precioNuevo;
    }

    /**
     * Minutos durante los que los cambios de un mismo vendedor en un mismo almacén se agrupan
     * en un solo aviso sin leer (una carga de precios dispara cientos de cambios seguidos).
     */
    public const MINUTOS_DE_AGRUPACION = 60;

    /**
     * Avisa al admin del cambio de precio. Si ya tiene un aviso sin leer y reciente del mismo
     * vendedor y almacén, lo actualiza (contador y último producto) en vez de crear otro.
     */
    public static function notificarAgrupado(User $admin, $producto, $almacen, $vendedor, $precioAnterior, $precioNuevo): void
    {
        $nuevo = new self($producto, $almacen, $vendedor, $precioAnterior, $precioNuevo);

        $existente = $admin->unreadNotifications()
            ->where('type', self::class)
            ->where('data->vendedor_id', $vendedor->id)
            ->where('data->almacen_id', $almacen->id)
            ->where('created_at', '>=', now()->subMinutes(self::MINUTOS_DE_AGRUPACION))
            ->latest()
            ->first();

        if ($existente === null) {
            $admin->notify($nuevo);

            return;
        }

        $nuevo->cantidad = ((int) ($existente->data['cantidad'] ?? 1)) + 1;

        $existente->forceFill(['data' => $nuevo->toArray($admin), 'created_at' => now()])->save();
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $mensaje = $this->cantidad > 1
            ? "El vendedor {$this->vendedor->name} cambió el precio de {$this->cantidad} productos en el almacén {$this->almacen->nombre_almacen}"
            : "El vendedor {$this->vendedor->name} cambió el precio del producto {$this->producto->nombre_producto} en el almacén {$this->almacen->nombre_almacen}";

        return [
            'type' => 'cambio_precio',
            'title' => 'Cambio de Precio por Vendedor',
            'message' => $mensaje,
            'cantidad' => $this->cantidad,
            'producto_id' => $this->producto->id,
            'producto_nombre' => $this->producto->nombre_producto,
            'almacen_id' => $this->almacen->id,
            'almacen_nombre' => $this->almacen->nombre_almacen,
            'vendedor_id' => $this->vendedor->id,
            'vendedor_nombre' => $this->vendedor->name,
            'precio_anterior' => $this->precioAnterior,
            'precio_nuevo' => $this->precioNuevo,
            'icon' => 'dollar-sign',
            'color' => 'amber',
        ];
    }
}
