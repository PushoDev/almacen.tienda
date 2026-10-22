<?php

namespace App\Services;

use App\Models\Almacen;
use App\Models\User;
use App\Models\Venta;
use App\Notifications\StockCambiadoEnTuAlmacenNotification;
use App\Notifications\VentaEnTuAlmacenNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Avisa a los vendedores asignados a un almacén cuando otra persona le cambia el stock sin que ellos
 * lo hayan hecho (venta, anulación, devolución, compra, importación). Nunca avisa a quien hizo la
 * acción y un fallo al notificar nunca debe tumbar la operación que lo originó.
 */
class AvisoVendedoresAlmacen
{
    /**
     * Una venta, anulación, devolución o rechazo de solicitud especial. Al rechazar tampoco se avisa a
     * quien pidió la venta, que ya recibe el aviso de la decisión.
     *
     * @param  'vendida'|'cancelada'|'devuelta'|'rechazada'  $accion
     */
    public function porVenta(Venta $venta, string $accion, ?User $autor): void
    {
        try {
            $excluidos = array_filter([$autor?->id, $accion === 'rechazada' ? $venta->user_id : null]);

            Notification::send(
                $this->vendedoresDe($venta->almacen, $excluidos),
                new VentaEnTuAlmacenNotification($venta, $accion, $autor),
            );
        } catch (\Exception $e) {
            Log::error('Error avisando al vendedor del almacén: '.$e->getMessage());
        }
    }

    /**
     * Un cambio de stock que no es una venta. `$lineas` son los productos que entraron o salieron.
     *
     * @param  'compra'|'importacion'|'importacion_revertida'  $tipo
     * @param  array<int, array{producto_id: int, cantidad: int}>  $lineas
     */
    public function porCambioDeStock(Almacen $almacen, string $tipo, string $resumen, array $lineas, string $url, ?User $autor): void
    {
        try {
            Notification::send(
                $this->vendedoresDe($almacen, array_filter([$autor?->id])),
                new StockCambiadoEnTuAlmacenNotification($almacen, $tipo, $resumen, $lineas, $url, $autor),
            );
        } catch (\Exception $e) {
            Log::error('Error avisando el cambio de stock al vendedor del almacén: '.$e->getMessage());
        }
    }

    /**
     * @param  array<int, int>  $excluidos
     * @return Collection<int, User>
     */
    private function vendedoresDe(Almacen $almacen, array $excluidos)
    {
        return $almacen->usuarios()
            ->where('role', 'vendedor')
            ->whereKeyNot($excluidos)
            ->get();
    }
}
