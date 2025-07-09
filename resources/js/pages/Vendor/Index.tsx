import { PinList } from '@/components/animated/pin-list';
import HeadingSmall from '@/components/heading-small';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertTriangle, Box, GitCommit, KeyRound, Regex, ShoppingBag } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Nueva Compra',
        href: 'comprar',
    },
    {
        title: 'Realizar Venta',
        href: '#',
    },
];

const ITEMS = [
    {
        id: 1,
        name: 'Commit Zone',
        info: 'Code updates · Closes 9:00 PM',
        icon: GitCommit,
        pinned: true,
    },
    {
        id: 2,
        name: '404 Room',
        info: 'Fixing errors · Open 24 hours',
        icon: AlertTriangle,
        pinned: true,
    },
    {
        id: 3,
        name: 'NPM Stop',
        info: 'Install stuff · Closes 8:00 PM',
        icon: Box,
        pinned: false,
    },
    {
        id: 4,
        name: 'Token Lock',
        info: 'Login stuff · Open 24 hours',
        icon: KeyRound,
        pinned: false,
    },
    {
        id: 5,
        name: 'Regex Zone',
        info: 'Find words · Closes 9:00 PM',
        icon: Regex,
        pinned: false,
    },
];

export default function PuntoVentaPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto Venta" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />
                {/* POS - Punto de Venta */}
                <PinList items={ITEMS} />
            </div>
        </AppLayout>
    );
}
