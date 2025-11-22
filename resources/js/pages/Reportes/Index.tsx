import HeadingSmall from '@/components/heading-small';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { ChartsReportePage } from '@/layouts/charts/ChartReportesGral';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AreaChart,
    Archive,
    Boxes,
    CalendarClock,
    DollarSign,
    FileBox,
    History,
    Landmark,
    LibraryBig,
    AlertTriangle,
    ShoppingBasket,
    TrendingUp,
    Users,
} from 'lucide-react';
import React from 'react';

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

interface ReportCardProps {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
    colors: string; // e.g., 'from-blue-800 to-blue-400'
}

const reportesComprasInventario: ReportCardProps[] = [
    {
        title: 'Productos Más Comprados',
        description: 'Top 10 productos más adquiridos.',
        href: route('reportes.productos_mas_comprados'),
        icon: ShoppingBasket,
        colors: 'from-indigo-800 to-indigo-400',
    },
    {
        title: 'Compras por Período',
        description: 'Historial de compras en un rango de fechas.',
        href: route('reportes.compras_por_periodo'),
        icon: CalendarClock,
        colors: 'from-slate-800 to-slate-400',
    },
    {
        title: 'Balance de Gastos Mensuales',
        description: 'Total de gastos de compras por mes.',
        href: route('reportes.balance_gastos_mensuales'),
        icon: AreaChart,
        colors: 'from-orange-800 to-orange-400',
    },
    {
        title: 'Inventario por Almacén',
        description: 'Resumen de unidades y tipos de producto por almacén.',
        href: route('reportes.inventario_por_almacen'),
        icon: Boxes,
        colors: 'from-emerald-800 to-emerald-400',
    },
    {
        title: 'Inventario Detallado',
        description: 'Lista detallada del stock actual por almacén.',
        href: route('reportes.inventario_detallado_por_almacen'),
        icon: FileBox,
        colors: 'from-sky-800 to-sky-400',
    },
    {
        title: 'Alerta de Stock Bajo',
        description: 'Productos con 5 o menos unidades restantes.',
        href: route('reportes.reporte_stock_bajo'),
        icon: AlertTriangle,
        colors: 'from-red-800 to-red-400',
    },
    {
        title: 'Valor del Inventario',
        description: 'Valor total del stock a precio de costo.',
        href: route('reportes.valor_inventario'),
        icon: Archive,
        colors: 'from-lime-800 to-lime-400',
    },
];

const reportesVentasRentabilidad: ReportCardProps[] = [
    {
        title: 'Productos Más Vendidos',
        description: 'Top 10 productos con más ventas.',
        href: route('reportes.productos_mas_vendidos'),
        icon: TrendingUp,
        colors: 'from-cyan-800 to-cyan-400',
    },
    {
        title: 'Ventas por Período',
        description: 'Historial de ventas completadas.',
        href: route('reportes.ventas_por_periodo'),
        icon: CalendarClock,
        colors: 'from-teal-800 to-teal-400',
    },
    {
        title: 'Ventas por Vendedor',
        description: 'Rendimiento y total vendido por vendedor.',
        href: route('reportes.ventas_por_vendedor'),
        icon: Users,
        colors: 'from-fuchsia-800 to-fuchsia-400',
    },
    {
        title: 'Reporte de Ganancias',
        description: 'Análisis de rentabilidad por venta.',
        href: route('reportes.reporte_ganancias'),
        icon: DollarSign,
        colors: 'from-green-800 to-green-400',
    },
];

const reportesFinanzasOtros: ReportCardProps[] = [
    {
        title: 'Historial de Precios',
        description: 'Registro de todos los cambios de precios de venta.',
        href: route('reportes.historial_precios'),
        icon: History,
        colors: 'from-amber-800 to-amber-400',
    },
    {
        title: 'Movimientos Financieros',
        description: 'Historial de ingresos, gastos y transferencias.',
        href: route('reportes.movimientos_financieros'),
        icon: Landmark,
        colors: 'from-gray-800 to-gray-500',
    },
];

const ReportCard: React.FC<ReportCardProps> = ({ title, href, icon: Icon, colors }) => (
    <div className={`border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br ${colors}`}>
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <Icon className="h-48 w-48 text-white" />
        </div>
        <div className="relative z-10 h-full p-6">
            <div className="absolute top-4 left-4">
                <Icon className="h-8 w-8 animate-pulse text-white" />
            </div>
            <div className="flex h-full flex-col items-end justify-center space-y-2">
                <span className="text-lg text-white text-right">{title}</span>
            </div>
            <Link href={href}>
                <button className={`absolute right-4 bottom-4 ms-2 rounded-md px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer bg-black/20 hover:bg-white/90 hover:text-black`}>
                    Ver más ...
                </button>
            </Link>
        </div>
        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
    </div>
);

const ReportSection: React.FC<{ title: string; reports: ReportCardProps[] }> = ({ title, reports }) => (
    <>
        <div className="col-span-full">
            <h2 className="text-xl font-semibold">{title}</h2>
            <Separator className="mt-2" />
        </div>
        {reports.map((report) => (
            <ReportCard key={report.href} {...report} />
        ))}
    </>
);

export default function ReportesPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reportes" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte General del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    <LibraryBig
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <ReportSection title="Compras e Inventario" reports={reportesComprasInventario} />
                    <ReportSection title="Ventas y Rentabilidad" reports={reportesVentasRentabilidad} />
                    <ReportSection title="Finanzas y Otros" reports={reportesFinanzasOtros} />
                </div>

                <Separator className="col-span-4" />
                <div>
                    <ChartsReportePage />
                </div>
            </div>
        </AppLayout>
    );
}
