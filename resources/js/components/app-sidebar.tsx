import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type Auth, type NavItem } from '@/types';
import type { PageProps as InertiaPageProps } from '@inertiajs/core';
import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Cctv,
    ChartNoAxesCombinedIcon,
    Contact,
    FileText,
    GitCommit,
    Landmark,
    LayoutGrid,
    Package,
    Repeat,
    ShoppingCart,
    StoreIcon,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

// Definición completa de tipos
interface PageProps extends InertiaPageProps {
    auth: Auth;
    [key: string]: unknown;
}

const allNavItems: NavItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
        icon: LayoutGrid,
        roles: ['admin'],
    },
    {
        title: 'Punto de Venta',
        href: '/vendedor',
        icon: LayoutGrid,
        roles: ['vendedor'],
    },
    {
        title: 'Logistica Total',
        href: '/logistica',
        icon: ChartNoAxesCombinedIcon,
        roles: ['admin'],
    },
    {
        title: 'Almacenes o Tiendas',
        href: '/almacenes',
        icon: StoreIcon,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Movimientos',
        href: '/movimientos',
        icon: Repeat,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Categorias',
        href: '/categorias',
        icon: StoreIcon,
        roles: ['admin'],
    },
    {
        title: 'Productos',
        href: '/productos',
        icon: Package,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
        icon: ShoppingCart,
        roles: ['admin'],
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
        icon: Landmark,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Clientes',
        href: '/clientes',
        icon: Users,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Reportes',
        href: '/reportes',
        icon: FileText,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Empleados',
        href: '/empleados',
        icon: Contact,
        roles: ['admin'],
    },
    {
        title: 'Seguimientos',
        href: '#',
        icon: Cctv,
        roles: ['admin'],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repositorio',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: GitCommit,
        roles: ['admin', 'vendedor'],
    },
    {
        title: 'Documentación',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
        roles: ['admin', 'vendedor'],
    },
];

export function AppSidebar() {
    const { props } = usePage<PageProps>();
    const role = props.auth.user?.role || 'vendedor';
    const mainNavItems = allNavItems.filter((item) => item.roles.includes(role));

    return (
        <Sidebar collapsible="icon" variant="floating">
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
