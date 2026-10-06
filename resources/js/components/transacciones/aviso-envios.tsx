import { formatear } from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Truck } from 'lucide-react';

interface ResumenEnvios {
    total: number;
    por_confirmar: number;
    montos: Array<{ moneda: string; monto: number }>;
}

/**
 * Aviso pequeño bajo el encabezado de las pantallas donde se mira el dinero: mientras un envío está en tránsito su
 * monto no está en ninguna cuenta, así que esto evita que se olvide. El servidor solo manda el resumen en esas
 * pantallas y solo con lo que el usuario puede ver; no aparece si no hay nada abierto. `visible` deja a la pantalla
 * ocultarlo según el rol (por ejemplo, el Resumen Financiero no es para el vendedor).
 */
export default function AvisoEnvios({ visible = true }: { visible?: boolean }) {
    const { enviosAbiertos } = usePage().props as { enviosAbiertos?: ResumenEnvios | null };

    if (!visible || !enviosAbiertos || enviosAbiertos.total === 0) {
        return null;
    }

    const { total, por_confirmar: porConfirmar, montos } = enviosAbiertos;

    return (
        <Link
            href={porConfirmar > 0 ? route('transacciones.envios.index', { estado: 'por_confirmar' }) : route('transacciones.envios.index')}
            className="block"
        >
            <SpotlightCard
                estado="especial"
                role="status"
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-2.5 text-sm backdrop-blur-sm"
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    <Truck className="h-4 w-4" />
                </span>
                <span className="font-semibold">
                    {total} {total === 1 ? 'envío de dinero en tránsito' : 'envíos de dinero en tránsito'}
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                    {montos.map(({ moneda, monto }) => (
                        <Badge
                            key={moneda}
                            className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 font-bold text-white shadow-sm shadow-amber-500/30"
                        >
                            {moneda} {formatear(monto)}
                        </Badge>
                    ))}
                </span>
                <span className="text-muted-foreground text-xs">Ese dinero no está en ninguna cuenta hasta que se confirme.</span>
                {porConfirmar > 0 && (
                    <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30">
                        {porConfirmar} por confirmar por ti
                    </Badge>
                )}
                <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs font-semibold">
                    Ver envíos <ArrowRight className="h-3.5 w-3.5" />
                </span>
            </SpotlightCard>
        </Link>
    );
}
