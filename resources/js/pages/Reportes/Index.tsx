import HeadingSmall from '@/components/heading-small';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { ChartsReportePage } from '@/layouts/charts/ChartReportesGral';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Boxes,
    CalendarClock,
    CalendarHeart,
    CalendarRange,
    FileBox,
    HandCoins,
    HeartHandshake,
    LibraryBig,
    LucideBaggageClaim,
    ShoppingBagIcon,
    ShoppingBasket,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Reportes',
        href: '#',
    },
];

export default function ReportesPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Reporte General del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <LibraryBig
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Ver Reportes */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Productos Mas Comprados */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-indigo-800 to-indigo-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <ShoppingBagIcon className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <ShoppingBasket className="h-8 w-8 animate-pulse text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Productos Más Comprados</span>
                            </div>
                            {/* Link {route('comprar.index' */}

                            <Link href={route('reportes.productos_mas_comprados')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-indigo-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-indigo-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Compras por Período */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-slate-800 to-slate-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <LucideBaggageClaim className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <CalendarClock className="h-8 w-8 animate-pulse text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Compras por Período</span>
                            </div>

                            <Link href={route('reportes.compras_por_periodo')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-slate-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-slate-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Balance Mensual */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-orange-800 to-orange-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <CalendarHeart className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <CalendarRange className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Balance Mensual</span>
                            </div>

                            <Link href={route('reportes.balance_gastos_mensuales')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-orange-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-orange-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Compras por Proveedor */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-yellow-800 to-yellow-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <HandCoins className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <HeartHandshake className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Compras por Proveedor</span>
                            </div>

                            <Link href={route('reportes.compras_por_proveedor')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-yellow-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-yellow-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Cantidad de Productos por Almacén */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-800 to-emerald-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <Boxes className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <Boxes className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Productos por Almacén</span>
                            </div>

                            <Link href={route('reportes.productos_por_almacen')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-emerald-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-emerald-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Lista detallada de productos por almacén */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-sky-800 to-sky-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <FileBox className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <FileBox className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Detalles por Almacén</span>
                            </div>

                            <Link href={route('reportes.productos_por_almacen_detalle')}>
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-sky-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-sky-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    {/* Par otros reportes, faltarian 6 entonces */}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-sky-800 to-sky-400">
                        {/* Ícono de fondo transparente */}
                        <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                            <FileBox className="h-48 w-48 text-white" />
                        </div>
                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <FileBox className="h-8 w-8 text-white" />
                            </div>
                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <span className="text-lg text-white">Ver historial de precios</span>
                            </div>

                            <Link href="#">
                                <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-sky-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-sky-800">
                                    Ver más ...
                                </button>
                            </Link>
                        </div>
                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>

                {/* Charts Reportes */}
                <Separator className="col-span-4" />
                <div>
                    <ChartsReportePage />
                </div>
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
