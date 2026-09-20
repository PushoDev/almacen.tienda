<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class NotificationService
{
    /**
     * Obtiene los usuarios que deben recibir notificaciones basado en la operación
     */
    public function getUsuariosParaNotificar(array $operacion): Collection
    {
        $usuarios = collect();

        // Siempre incluir admins y moderadores
        $admins = User::whereIn('role', ['admin', 'moderador'])->get();
        $usuarios = $usuarios->merge($admins);

        // Agregar vendedores según el tipo de operación
        if (isset($operacion['almacen_id'])) {
            $vendedoresAlmacen = User::whereHas('almacenes',
                fn ($query) => $query->where('almacens.id', $operacion['almacen_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresAlmacen);
        }

        if (isset($operacion['almacen_origen_id'])) {
            $vendedoresOrigen = User::whereHas('almacenes',
                fn ($query) => $query->where('almacens.id', $operacion['almacen_origen_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresOrigen);
        }

        if (isset($operacion['almacen_destino_id'])) {
            $vendedoresDestino = User::whereHas('almacenes',
                fn ($query) => $query->where('almacens.id', $operacion['almacen_destino_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresDestino);
        }

        if (isset($operacion['cuenta_id'])) {
            $vendedoresCuenta = User::whereHas('cuentas',
                fn ($query) => $query->where('cuentas.id', $operacion['cuenta_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresCuenta);
        }

        if (isset($operacion['cuenta_origen_id'])) {
            $vendedoresCuentaOrigen = User::whereHas('cuentas',
                fn ($query) => $query->where('cuentas.id', $operacion['cuenta_origen_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresCuentaOrigen);
        }

        if (isset($operacion['cuenta_destino_id'])) {
            $vendedoresCuentaDestino = User::whereHas('cuentas',
                fn ($query) => $query->where('cuentas.id', $operacion['cuenta_destino_id'])
            )->where('role', 'vendedor')->get();
            $usuarios = $usuarios->merge($vendedoresCuentaDestino);
        }

        // Eliminar duplicados
        $usuarios = $usuarios->unique('id');

        // Excluir solo al vendedor que realizó la operación (no a admins/moderadores)
        $usuarioCreadorId = $operacion['usuario_creador_id'] ?? null;
        if ($usuarioCreadorId) {
            $usuarioCreador = User::find($usuarioCreadorId);
            // Solo excluir si es un vendedor, admins/moderadores deben ver todo
            if ($usuarioCreador && $usuarioCreador->role === 'vendedor') {
                $usuarios = $usuarios->filter(function ($user) use ($usuarioCreadorId) {
                    return $user->id !== $usuarioCreadorId;
                });
            }
        }

        return $usuarios;
    }

    /**
     * Prepara datos para notificación de venta
     */
    public function prepararDatosVenta($venta): array
    {
        return [
            'tipo' => 'venta',
            'almacen_id' => $venta->almacen_id,
            'cuenta_id' => $venta->cuenta_id ?? null,
            'usuario_creador_id' => $venta->usuario_id,
            'venta' => $venta,
        ];
    }

    /**
     * Prepara datos para notificación de movimiento
     */
    public function prepararDatosMovimiento($movimiento): array
    {
        return [
            'tipo' => 'movimiento',
            'almacen_origen_id' => $movimiento->almacen_origen_id,
            'almacen_destino_id' => $movimiento->almacen_destino_id,
            'usuario_creador_id' => $movimiento->usuario_id,
            'movimiento' => $movimiento,
        ];
    }

    /**
     * Prepara datos para notificación de cierre de caja
     */
    public function prepararDatosCierreCaja($cierre): array
    {
        return [
            'tipo' => 'cierre_caja',
            'cuenta_id' => $cierre->cuenta_id,
            'usuario_creador_id' => $cierre->usuario_id,
            'cierre' => $cierre,
        ];
    }

    /**
     * Prepara datos para notificación de movimiento financiero (gasto/ingreso)
     */
    public function prepararDatosMovimientoFinanciero($movimiento): array
    {
        $datos = [
            'tipo' => 'movimiento_financiero',
            'usuario_creador_id' => $movimiento->user_id,
            'movimiento' => $movimiento,
        ];

        // Agregar cuenta origen si existe
        if ($movimiento->cuenta_origen_id) {
            $datos['cuenta_id'] = $movimiento->cuenta_origen_id;
        }

        // Agregar cuenta destino si existe
        if ($movimiento->cuenta_destino_id) {
            $datos['cuenta_destino_id'] = $movimiento->cuenta_destino_id;
        }

        return $datos;
    }

    /**
     * Prepara datos para notificación de transferencia
     */
    public function prepararDatosTransferencia($movimiento): array
    {
        return [
            'tipo' => 'transferencia',
            'cuenta_origen_id' => $movimiento->cuenta_origen_id,
            'cuenta_destino_id' => $movimiento->cuenta_destino_id,
            'usuario_creador_id' => $movimiento->user_id,
            'movimiento' => $movimiento,
        ];
    }

    /**
     * Prepara datos para notificación de gasto de transportación
     */
    public function prepararDatosGastoTransportacion($movimiento, $cuentaId): array
    {
        return [
            'tipo' => 'gasto_transportacion',
            'cuenta_id' => $cuentaId,
            'usuario_creador_id' => $movimiento->user_id,
            'movimiento' => $movimiento,
        ];
    }
}
