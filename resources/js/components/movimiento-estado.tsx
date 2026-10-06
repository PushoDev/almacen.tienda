import { CheckCircle2, Clock, Package, Send, XCircle } from 'lucide-react';
import React from 'react';

// Mismos tokens que Movimientos/Show.tsx (basados en opacidad, funcionan en claro/oscuro) —
// un solo lugar para no repetir esta lógica en la pantalla de trabajo, el historial y el timeline.
const ESTADO_BADGE: Record<string, { badgeClass: string; icon: React.ReactNode }> = {
    pendiente_confirmacion: { badgeClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: <Clock className="h-3.5 w-3.5" /> },
    en_transito: { badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: <Send className="h-3.5 w-3.5" /> },
    recibido_parcial: { badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', icon: <Package className="h-3.5 w-3.5" /> },
    recibido_completo: { badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    rechazado: { badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <XCircle className="h-3.5 w-3.5" /> },
    cancelado: { badgeClass: 'bg-muted text-muted-foreground border-border', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export function EstadoBadge({ estado, label }: { estado: string; label: string }) {
    const config = ESTADO_BADGE[estado] ?? ESTADO_BADGE.cancelado;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
            {config.icon}
            {label}
        </span>
    );
}

interface MovimientoConDetalles {
    estado: string;
    detalles?: Array<{
        cantidad_solicitada: number;
        cantidad_despachada: number;
        cantidad_recibida: number | null;
    }>;
}

// Texto de unidades según hasta dónde llegó el movimiento: en un recibido parcial lo solicitado
// ya no cuenta la historia, hay que mostrar cuánto llegó de lo despachado.
export function resumenUnidades(movimiento: MovimientoConDetalles): string {
    const detalles = movimiento.detalles ?? [];
    const suma = (campo: 'cantidad_solicitada' | 'cantidad_despachada' | 'cantidad_recibida') =>
        detalles.reduce((total, detalle) => total + (detalle[campo] ?? 0), 0);

    const unidades = (cantidad: number, singular: string, plural: string) => `${cantidad} ${cantidad === 1 ? singular : plural}`;

    if (movimiento.estado === 'recibido_completo' || movimiento.estado === 'recibido_parcial') {
        const recibidas = suma('cantidad_recibida');
        const despachadas = suma('cantidad_despachada');

        return recibidas === despachadas
            ? unidades(recibidas, 'unidad recibida', 'unidades recibidas')
            : `${recibidas} de ${unidades(despachadas, 'unidad recibida', 'unidades recibidas')}`;
    }

    if (movimiento.estado === 'en_transito') {
        return unidades(suma('cantidad_despachada'), 'unidad en camino', 'unidades en camino');
    }

    return unidades(suma('cantidad_solicitada'), 'unidad solicitada', 'unidades solicitadas');
}
