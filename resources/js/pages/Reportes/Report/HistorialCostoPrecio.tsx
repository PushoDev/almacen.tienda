import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { TrendingDown, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';

interface HistorialItem {
    id: number;
    producto: string;
    marca: string;
    usuario: string;
    precio_anterior: number;
    precio_nuevo: number;
    diferencia: number;
    stock_momento: number;
    impacto_financiero: number;
    impacto_formateado: string;
    es_perdida: boolean;
    es_ganancia: boolean;
    motivo: string | null;
    fecha: string;
}

interface Stats {
    total_ganancias: number;
    total_perdidas: number;
    neto_impacto: number;
    numero_cambios: number;
    cambios_con_ganancia: number;
    cambios_con_perdida: number;
}

interface PaginatedData {
    data: HistorialItem[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
}

interface Props {
    historial: PaginatedData;
    stats: Stats;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: route('reportes.index') },
    { title: 'Historial Precio de Costo', href: route('reportes.historial_costo_precio') },
];

const fmt = (value: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

export default function HistorialCostoPrecioPage({ historial, stats }: Props) {
    const netoPositivo = stats.neto_impacto >= 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Cambios de Precio de Costo" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de Cambios de Precio de Costo"
                        description="Registro auditado de modificaciones al precio de costo con impacto financiero estimado."
                    />
                    <DollarSign
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-green-50 p-4 dark:bg-green-950">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-green-600 dark:text-green-400">Ganancia en papel</p>
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    +{fmt(stats.total_ganancias)}
                                </p>
                                <p className="text-xs text-green-500">{stats.cambios_con_ganancia} cambios</p>
                            </div>
                            <TrendingUp className="text-green-500" size={32} />
                        </div>
                    </div>

                    <div className="rounded-xl border bg-red-50 p-4 dark:bg-red-950">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-red-600 dark:text-red-400">Pérdida en papel</p>
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                    -{fmt(stats.total_perdidas)}
                                </p>
                                <p className="text-xs text-red-500">{stats.cambios_con_perdida} cambios</p>
                            </div>
                            <TrendingDown className="text-red-500" size={32} />
                        </div>
                    </div>

                    <div className={`rounded-xl border p-4 ${netoPositivo ? 'bg-blue-50 dark:bg-blue-950' : 'bg-orange-50 dark:bg-orange-950'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm ${netoPositivo ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                    Impacto neto
                                </p>
                                <p className={`text-2xl font-bold ${netoPositivo ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                                    {netoPositivo ? '+' : ''}{fmt(stats.neto_impacto)}
                                </p>
                            </div>
                            <BarChart3 className={netoPositivo ? 'text-blue-500' : 'text-orange-500'} size={32} />
                        </div>
                    </div>

                    <div className="rounded-xl border bg-gray-50 p-4 dark:bg-gray-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total cambios</p>
                                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                                    {stats.numero_cambios}
                                </p>
                            </div>
                            <DollarSign className="text-gray-400" size={32} />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Tabla */}
                <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-900">
                    <div className="p-4">
                        <h2 className="text-lg font-semibold">Registro de cambios</h2>
                        <p className="text-sm text-gray-500">
                            {historial.total} registro{historial.total !== 1 ? 's' : ''} en total
                        </p>
                    </div>

                    {historial.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Producto</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Usuario</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Costo anterior</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Costo nuevo</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Stock</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-400">Impacto financiero</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Motivo</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {historial.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{item.producto}</p>
                                                {item.marca && <p className="text-xs text-gray-400">{item.marca}</p>}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{item.usuario}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">${fmt(item.precio_anterior)}</td>
                                            <td className="px-4 py-3 text-right font-medium">${fmt(item.precio_nuevo)}</td>
                                            <td className="px-4 py-3 text-right">{item.stock_momento}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-semibold ${item.es_ganancia ? 'text-green-600' : item.es_perdida ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {item.impacto_formateado}
                                                </span>
                                                <span className="ml-1 text-xs">
                                                    {item.es_ganancia ? (
                                                        <TrendingUp size={12} className="inline text-green-500" />
                                                    ) : item.es_perdida ? (
                                                        <TrendingDown size={12} className="inline text-red-500" />
                                                    ) : null}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{item.motivo ?? '-'}</td>
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.fecha}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-500">
                            No hay cambios de precio de costo registrados aún.
                        </div>
                    )}

                    {/* Paginación */}
                    {historial.last_page > 1 && (
                        <div className="flex items-center justify-between border-t p-4">
                            <p className="text-sm text-gray-500">
                                Página {historial.current_page} de {historial.last_page}
                            </p>
                            <div className="flex gap-2">
                                {historial.prev_page_url && (
                                    <Link
                                        href={historial.prev_page_url}
                                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        Anterior
                                    </Link>
                                )}
                                {historial.next_page_url && (
                                    <Link
                                        href={historial.next_page_url}
                                        className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                                    >
                                        Siguiente
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
