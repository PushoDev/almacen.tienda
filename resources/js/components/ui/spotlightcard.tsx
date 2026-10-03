import { cn } from '@/lib/utils';
import * as React from 'react';

interface SpotlightCardProps extends React.ComponentProps<'div'> {
    /**
     * Color del borde animado: verde si hay stock ('disponible'), rojo si está agotado ('agotado'),
     * ámbar en una venta especial ('especial') y rojo en una venta bajo costo ('bajo-costo').
     * En las tarjetas de cuenta distingue el tipo: esmeralda para 'efectivo' y azul para 'tarjeta'.
     * En las tarjetas asignadas de Empleados: esmeralda para acceso 'completo' y ámbar para 'cobro'.
     * 'global' (violeta): acceso global de admin/moderador en Empleados. 'sin-comision' (fucsia):
     * venta "de la agencia" sin comisión (Cierres, 2026-10-03) — color propio, sin pisar 'global'.
     * 'indigo': widgets neutros de conteo (ej. "Cantidad de Unidades" en Productos/Index.tsx).
     */
    estado:
        | 'disponible'
        | 'agotado'
        | 'especial'
        | 'bajo-costo'
        | 'efectivo'
        | 'tarjeta'
        | 'completo'
        | 'cobro'
        | 'global'
        | 'sin-comision'
        | 'indigo';
}

/**
 * Tarjeta con un destello que da la vuelta al borde. Los estilos (`.spotlight-card`) están en
 * resources/css/app.css; este componente solo elige el color según el estado. No le pone fondo,
 * padding ni borde propios: se los da quien la usa con `className`.
 */
export default function SpotlightCard({ estado, className, ...props }: SpotlightCardProps) {
    return <div data-estado={estado} className={cn('spotlight-card', className)} {...props} />;
}
