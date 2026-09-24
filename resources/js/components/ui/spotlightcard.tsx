import { cn } from '@/lib/utils';
import * as React from 'react';

interface SpotlightCardProps extends React.ComponentProps<'div'> {
    /** Color del borde animado: verde si hay stock, rojo si está agotado. */
    estado: 'disponible' | 'agotado';
}

/**
 * Tarjeta con un destello que da la vuelta al borde. Los estilos (`.spotlight-card`) están en
 * resources/css/app.css; este componente solo elige el color según el estado. No le pone fondo,
 * padding ni borde propios: se los da quien la usa con `className`.
 */
export default function SpotlightCard({ estado, className, ...props }: SpotlightCardProps) {
    return <div data-estado={estado} className={cn('spotlight-card', className)} {...props} />;
}
