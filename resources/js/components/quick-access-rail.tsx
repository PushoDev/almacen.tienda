import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { type NavItem, type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bell, ClipboardClock, Eye, ReceiptText, ShoppingBasket } from 'lucide-react';

// Riel de accesos rápidos, global (todas las páginas, vía AppSidebarLayout) — NO reemplaza
// nada existente (Cierres de Caja / Mis Ventas siguen también como botones dentro del POS,
// Vendor/Index.tsx). Es un segundo camino más corto para llegar a lo mismo. A propósito no
// reutiliza el componente Sidebar de shadcn: ese vive detrás de un único SidebarProvider
// global (ver components/app-shell.tsx) que controla un solo estado abierto/colapsado — una
// segunda instancia de Sidebar compartiría ese mismo estado con el de la izquierda en vez de
// ser independiente. Por eso es standalone, fijo, sin colapsar, con Tooltip en vez de labels.
const quickAccessItems: NavItem[] = [
    {
        title: 'Cierres de Caja',
        href: '/vendor/cierres',
        icon: ClipboardClock,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Mis Ventas',
        href: '/ventas/listado',
        icon: ShoppingBasket,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Notificaciones',
        href: '/notifications/history',
        icon: Bell,
        roles: ['admin', 'moderador', 'vendedor'],
    },
];

export function QuickAccessRail() {
    const { props } = usePage<PageProps>();
    const role = props.auth?.user?.role || 'vendedor';
    const items = quickAccessItems.filter((item) => item.roles.includes(role as 'admin' | 'moderador' | 'vendedor'));

    if (items.length === 0) return null;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="bg-sidebar border-sidebar-border fixed top-1/2 right-0 z-40 flex -translate-y-1/2 flex-col gap-1 rounded-l-xl border border-r-0 p-1.5 shadow-lg">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                                    )}
                                >
                                    {Icon && <Icon className="h-5 w-5" />}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>{item.title}</p>
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </div>
        </TooltipProvider>
    );
}
