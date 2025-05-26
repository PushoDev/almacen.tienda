import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Cctv,
    ChartNoAxesCombinedIcon,
    FileText,
    Folder,
    Landmark,
    LayoutGrid,
    Package,
    Repeat,
    ShoppingCart,
    StoreIcon,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Logistica Total',
        href: '/logistica',
        icon: ChartNoAxesCombinedIcon,
    },
    {
        title: 'Almacenes o Tiendas',
        href: '/almacenes',
        icon: StoreIcon,
    },
    {
        title: 'Movimientos',
        href: '#',
        icon: Repeat,
    },
    {
        title: 'Cataegorias',
        href: '/categorias',
        icon: StoreIcon,
    },
    {
        title: 'Productos',
        href: '/productos',
        icon: Package,
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
        icon: ShoppingCart,
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
        icon: Landmark,
    },
    {
        title: 'Clientes',
        href: '/clientes',
        icon: Users,
    },
    {
        title: 'Reportes',
        href: '/reportes',
        icon: FileText,
    },
    {
        title: 'Seguimientos',
        href: '#',
        icon: Cctv,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
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
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
