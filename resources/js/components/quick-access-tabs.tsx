import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ClipboardClock, ShoppingBasket, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

// Accesos rápidos del encabezado (reemplaza al riel flotante del borde derecho, que tapaba contenido).
// Cápsula de íconos: el acceso de la página en la que estás se expande y muestra su nombre; los demás
// muestran su nombre en un tooltip al acercar el mouse (o al enfocarlos con el teclado). Notificaciones
// no va acá: ya tiene su campana en el mismo encabezado.
interface AccesoRapido {
    title: string;
    /** Nombre de la ruta (ziggy). */
    ruta: string;
    icon: LucideIcon;
    roles: ('admin' | 'moderador' | 'vendedor')[];
    /** Si la página actual (sin query) pertenece a este acceso. */
    estaActivo: (pathname: string) => boolean;
}

const ACCESOS: AccesoRapido[] = [
    {
        title: 'Cierres de Caja',
        ruta: 'ventas.cierres',
        icon: ClipboardClock,
        roles: ['admin', 'moderador', 'vendedor'],
        estaActivo: (pathname) => pathname.startsWith('/vendor/cierres'),
    },
    {
        title: 'Mis Ventas',
        ruta: 'ventas.listado',
        icon: ShoppingBasket,
        roles: ['admin', 'moderador', 'vendedor'],
        // El listado y el detalle de una venta (/ventas/123/show) son "Mis Ventas".
        estaActivo: (pathname) => pathname.startsWith('/ventas/listado') || /^\/ventas\/\d+/.test(pathname),
    },
];

const etiquetaVariants = {
    initial: { width: 0, opacity: 0 },
    animate: { width: 'auto', opacity: 1, transition: { delay: 0.05, duration: 0.2, ease: 'easeOut' as const } },
    exit: { width: 0, opacity: 0, transition: { duration: 0.1, ease: 'easeIn' as const } },
};

export function QuickAccessTabs() {
    const { props, url } = usePage<PageProps>();
    const role = (props.auth?.user?.role || 'vendedor') as AccesoRapido['roles'][number];
    const pathname = url.split('?')[0];
    const accesos = ACCESOS.filter((acceso) => acceso.roles.includes(role));

    if (accesos.length === 0) return null;

    return (
        <nav aria-label="Accesos rápidos" className="bg-sidebar/70 border-sidebar-border flex items-center gap-1 rounded-full border p-1 shadow-sm backdrop-blur-sm">
            {accesos.map((acceso) => {
                const Icono = acceso.icon;
                const activo = acceso.estaActivo(pathname);

                const enlace = (
                    <Link
                        href={route(acceso.ruta)}
                        aria-label={acceso.title}
                        aria-current={activo ? 'page' : undefined}
                        className={cn(
                            'focus-visible:ring-ring relative flex h-9 items-center rounded-full px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                            activo ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                        )}
                    >
                        {activo && (
                            <motion.span
                                layoutId="acceso-rapido-activo"
                                className="bg-sidebar-accent border-sidebar-primary/30 absolute inset-0 rounded-full border shadow-sm"
                                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Icono className="h-5 w-5 shrink-0" />
                            <AnimatePresence>
                                {activo && (
                                    <motion.span
                                        variants={etiquetaVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="hidden overflow-hidden whitespace-nowrap md:inline-block"
                                    >
                                        {acceso.title}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </span>
                    </Link>
                );

                // El acceso activo ya muestra su nombre; los demás lo muestran en un tooltip.
                if (activo) {
                    return <div key={acceso.ruta}>{enlace}</div>;
                }

                return (
                    <Tooltip key={acceso.ruta}>
                        <TooltipTrigger asChild>{enlace}</TooltipTrigger>
                        <TooltipContent side="bottom">{acceso.title}</TooltipContent>
                    </Tooltip>
                );
            })}
        </nav>
    );
}
