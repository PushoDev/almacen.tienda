import { Badge } from '@/components/ui/badge';
import SpotlightCard from '@/components/ui/spotlightcard';
import { cn } from '@/lib/utils';
import { Banknote, Receipt, ShoppingBasket } from 'lucide-react';
import { formatearUsd, ResumenCasillero } from './tipos-casillero';

interface CasilleroWidgetsProps {
    resumen: ResumenCasillero;
}

/** Tres widgets de lectura: cuántas compras esperan, cuánta mercancía está pagada y cuánto suman sus cargos. */
export default function CasilleroWidgets({ resumen }: CasilleroWidgetsProps) {
    const widgets = [
        {
            titulo: 'Compras en el casillero',
            valor: String(resumen.compras),
            detalle: `${resumen.unidades} unidades pagadas, sin stock y sin contenedor`,
            icono: ShoppingBasket,
            estado: 'indigo' as const,
            borde: 'border-indigo-400/30 bg-indigo-500/5 dark:bg-indigo-500/10',
            circulo: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
            badge: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
        },
        {
            titulo: 'Mercancía pagada',
            valor: formatearUsd(resumen.valor_mercancia_usd),
            detalle: 'Lo que espera en Panamá, a costo de compra, fuera del inventario',
            icono: Banknote,
            estado: 'disponible' as const,
            borde: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
            circulo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            badge: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
        },
        {
            titulo: 'Cargos anotados',
            valor: formatearUsd(resumen.cargos_usd),
            detalle: 'Estadía y otros; se sumarán al costo al llegar',
            icono: Receipt,
            estado: 'especial' as const,
            borde: 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10',
            circulo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            badge: 'from-amber-500 to-orange-500 shadow-amber-500/30',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-3">
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
