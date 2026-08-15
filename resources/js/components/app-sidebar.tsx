import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type Auth, type NavItem } from '@/types';
import type { PageProps as InertiaPageProps } from '@inertiajs/core';
import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    ChartNoAxesCombinedIcon,
    Contact,
    FileText,
    HandCoins,
    Landmark,
    LayoutGrid,
    Package,
    Repeat,
    ShoppingBasket,
    ShoppingCart,
    StoreIcon,
    Users,
    CalendarIcon,
} from 'lucide-react';
import AppLogo from './app-logo';

// Definición completa de tipos
interface PageProps extends InertiaPageProps {
    auth: Auth;
    [key: string]: unknown;
}

const allNavItems: NavItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
        icon: LayoutGrid,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Resumen Financiero',
        href: '/logistica',
        icon: ChartNoAxesCombinedIcon,
        roles: ['admin'],
    },
    {
        title: 'Gestión de Monedas',
        href: '/monedas',
        icon: HandCoins,
        roles: ['admin'],
    },
    {
        title: 'Almacenes o Tiendas',
        href: '/almacenes',
        icon: StoreIcon,
        roles: ['admin', 'moderador'],
    },
    {
        title: 'Mis Puntos de Ventas',
        href: '/almacenes',
        icon: StoreIcon,
        roles: ['vendedor'],
    },
    {
        title: 'Movimientos',
        href: '/movimientos',
        icon: Repeat,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Categorias',
        href: '/categorias',
        icon: StoreIcon,
        roles: ['admin', 'moderador'],
    },
    {
        title: 'Productos',
        href: '/listado-productos',
        icon: Package,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Inventario Disponible',
        href: '/disponibles',
        icon: ShoppingBasket,
        roles: ['admin', 'moderador'],
    },
    {
        title: 'Mi Inventario',
        href: '/disponibles',
        icon: ShoppingBasket,
        roles: ['vendedor'],
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
        icon: ShoppingCart,
        roles: ['admin', 'moderador'],
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
        icon: Landmark,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Clientes',
        href: '/clientes',
        icon: Users,
        roles: ['admin', 'moderador'],
    },
    {
        title: 'Reportes',
        href: '/reportes',
        icon: FileText,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Empleados',
        href: '/empleados',
        icon: Contact,
        roles: ['admin'],
    },
    {
        title: 'Calendario de Historial',
        href: '#',
        icon: CalendarIcon,
        roles: ['admin'],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Documentación',
        href: 'https://documentacion-glorietapos.vercel.app/',
        icon: BookOpen,
        roles: ['moderador', 'vendedor'],
    },
];

export function AppSidebar() {
    const { props } = usePage<PageProps>();
    const role = props.auth.user?.role || 'vendedor';
    const mainNavItems = allNavItems.filter((item) => item.roles.includes(role));

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems.filter((item) => item.roles.includes(role))} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
