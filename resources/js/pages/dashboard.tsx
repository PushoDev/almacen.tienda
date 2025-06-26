import HeadingSmall from '@/components/heading-small';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ScrollProgress } from '@/components/ui/scroll';
import AppLayout from '@/layouts/app-layout';
import { ComprasVentasCharts } from '@/layouts/charts/ChartCompraVenta';
import WidgetInventario from '@/layouts/home/WidgetInventario';
import WidgetTransacciones from '@/layouts/home/WidgetTransacciones';
import WidgetVenta from '@/layouts/home/WidgetVenta';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ComputerIcon, LucideBaggageClaim, ShoppingBagIcon } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario" />
            <ScrollProgress />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="rounded-lg bg-blue-500 px-2 py-1 text-sm text-white shadow-lg">Opciones Generales</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ComputerIcon
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* OPciones */}
                <div className="animate__animated animate__flipInX grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Widget de Compra */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-red-800 to-red-400">
                        <CursorProvider>
                            <CursorFollow>
                                <div className="rounded-lg bg-red-500 px-2 py-1 text-sm text-white shadow-lg">Comprar Nuevos Productos</div>
                            </CursorFollow>
                        </CursorProvider>
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <ShoppingBagIcon className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <LucideBaggageClaim className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <h3 className="font-sans text-4xl font-bold text-white">Comprar</h3>
                                <span className="text-lg text-white">Adquirir Productos Nuevos</span>
                            </div>
                            {/* Link {route('comprar.index' */}
                            <Link href={route('comprar.index')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-red-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-red-800">
                                    Acceder a Compra
                                </button>
                            </Link>
                        </div>

                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Widget de Venta */}
                    <div>
                        <WidgetVenta />
                    </div>
                    {/* Widget de Transacciones */}
                    <div>
                        <WidgetTransacciones />
                    </div>
                    {/* Widget de Inventario */}
                    <div>
                        <WidgetInventario />
                    </div>
                </div>

                {/* Charts */}
                <div>
                    <ComprasVentasCharts />
                </div>
                {/* Tablas */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
