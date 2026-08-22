import { cn } from '@/lib/utils';
import { type NavItem, type PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Bell, ClipboardClock, ShoppingBasket } from 'lucide-react';
import { useEffect, useState } from 'react';

// Riel de accesos rápidos, global (todas las páginas, vía AppSidebarLayout) — NO reemplaza
// nada existente (Cierres de Caja / Mis Ventas siguen también como botones dentro del POS,
// Vendor/Index.tsx). Es un segundo camino más corto para llegar a lo mismo. A propósito no
// reutiliza el componente Sidebar de shadcn: ese vive detrás de un único SidebarProvider
// global (ver components/app-shell.tsx) que controla un solo estado abierto/colapsado — una
// segunda instancia de Sidebar compartiría ese mismo estado con el de la izquierda en vez de
// ser independiente. Por eso es standalone, fijo, sin colapsar.
//
// "Dynamic Island": colapsada es una cápsula angosta con solo íconos; al pasar el mouse por
// CUALQUIER parte de la cápsula, toda se expande junta (no un tooltip por ícono) revelando
// las etiquetas — un solo bloque animado, no 3 popups independientes.
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

const NOTIFICACIONES_HREF = '/notifications/history';

export function QuickAccessRail() {
    const { props } = usePage<PageProps>();
    const role = props.auth?.user?.role || 'vendedor';
    const items = quickAccessItems.filter((item) => item.roles.includes(role as 'admin' | 'moderador' | 'vendedor'));

    // Mismo endpoint y cadencia que Notifications/NotificationBell.tsx (poll cada 30s vía
    // notifications.index) — es la parte "dinámica" real de la isla: el ícono de
    // Notificaciones lleva el conteo sin leer, visible incluso con la cápsula colapsada.
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        let activo = true;
        const fetchUnread = () => {
            axios
                .get(route('notifications.index'))
                .then((res) => {
                    if (activo) setUnreadCount(res.data.count ?? 0);
                })
                .catch(() => {});
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        return () => {
            activo = false;
            clearInterval(interval);
        };
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="group fixed top-1/2 right-0 z-40 -translate-y-1/2">
            <div className="bg-sidebar border-sidebar-border flex flex-col gap-1 rounded-l-2xl border border-r-0 p-2 shadow-lg transition-shadow duration-300 ease-out group-hover:shadow-2xl">
                {items.map((item) => {
                    const Icon = item.icon;
                    const esNotificaciones = item.href === NOTIFICACIONES_HREF;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                'flex h-10 items-center gap-3 rounded-xl px-2.5 transition-colors',
                            )}
                        >
                            <span className="relative shrink-0">
                                {Icon && <Icon className="h-5 w-5" />}
                                {esNotificaciones && unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-bold text-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </span>
                            <span
                                className={cn(
                                    'max-w-0 overflow-hidden text-sm font-medium whitespace-nowrap opacity-0',
                                    'transition-all duration-300 ease-out group-hover:max-w-[140px] group-hover:opacity-100',
                                )}
                            >
                                {item.title}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
