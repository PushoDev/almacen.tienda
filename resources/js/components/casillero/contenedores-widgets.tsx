import { Badge } from '@/components/ui/badge';
import SpotlightCard from '@/components/ui/spotlightcard';
import { cn } from '@/lib/utils';
import { Banknote, Boxes, Container, Receipt } from 'lucide-react';
import { formatearUsd, ResumenContenedores } from './tipos-casillero';

interface ContenedoresWidgetsProps {
    resumen: ResumenContenedores;
}

/** Cuatro widgets de lectura sobre lo que ya salió de Panamá en contenedores abiertos. */
export default function ContenedoresWidgets({ resumen }: ContenedoresWidgetsProps) {
    const widgets = [
        {
            titulo: 'Contenedores abiertos',
            valor: String(resumen.contenedores),
            detalle: 'Armados y sin cerrar',
            icono: Container,
            estado: 'global' as const,
            borde: 'border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/10',
            circulo: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
            badge: 'from-violet-500 to-violet-600 shadow-violet-500/30',
        },
        {
            titulo: 'Unidades a bordo',
            valor: String(resumen.unidades),
            detalle: 'Ya subieron y no están en el inventario',
            icono: Boxes,
            estado: 'indigo' as const,
            borde: 'border-indigo-400/30 bg-indigo-500/5 dark:bg-indigo-500/10',
            circulo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
            badge: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
        },
        {
            titulo: 'Mercancía a bordo',
            valor: formatearUsd(resumen.valor_mercancia_usd),
            detalle: 'A costo de compra',
            icono: Banknote,
            estado: 'disponible' as const,
            borde: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
            circulo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            badge: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
        },
        {
            titulo: 'Cargos de contenedor',
            valor: formatearUsd(resumen.cargos_usd),
            detalle: 'Transporte marítimo y otros',
            icono: Receipt,
            estado: 'especial' as const,
            borde: 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10',
            circulo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            badge: 'from-amber-500 to-orange-500 shadow-amber-500/30',
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {widgets.map(({ titulo, valor, detalle, icono: Icono, estado, borde, circulo, badge }) => (
                <SpotlightCard key={titulo} estado={estado} className={cn('rounded-lg border p-4 shadow-sm backdrop-blur-sm', borde)}>
                    <div className="mb-2 flex items-center gap-2">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', circulo)}>
                            <Icono className="h-4 w-4" />
                        </span>
                        <p className="text-muted-foreground text-sm font-medium">{titulo}</p>
                    </div>
                    <Badge className={cn('gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md', badge)}>{valor}</Badge>
                    <p className="text-muted-foreground mt-2 text-xs">{detalle}</p>
                </SpotlightCard>
            ))}
        </div>
    );
}
