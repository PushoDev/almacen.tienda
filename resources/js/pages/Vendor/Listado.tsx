import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Calendar,
    Clock,
    DollarSign,
    Eye,
    FileText,
    Filter,
    Package,
    Search,
    Sheet,
    ShoppingCart,
    Store,
    User,
    XCircle,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Punto de Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Listado de Ventas',
        href: '#',
    },
];

interface Venta {
    id: number;
    cliente: {
        id: number;
        nombre: string;
    } | null;
    almacen: {
        id: number;
        nombre: string;
    };
    usuario: {
        id: number;
        nombre: string;
    };
    total: number; // ✅ Ya debe venir como número desde el backend
    estado: string;
    total_pagado: number; // ✅ Ya debe venir como número desde el backend
    restante: number; // ✅ Ya debe venir como número desde el backend
    cantidad_items: number;
    fecha: string;
    fecha_iso: string;
}

interface Filters {
    estado?: string;
    almacen_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
}

interface Almacen {
    id: number;
    nombre_almacen: string;
}

interface EstadoVenta {
    value: string;
    label: string;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface VentasPagination {
    data: Venta[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
}

interface PageProps {
    ventas: VentasPagination;
    filters: Filters;
    almacenes: Almacen[];
    estados_venta: EstadoVenta[];
    [key: string]: unknown; // ✅ Para cumplir con la restricción de PageProps
}

export default function ListadoVentas() {
    const { props } = usePage<PageProps>();
    const { ventas, filters, almacenes, estados_venta } = props;

    const [localFilters, setLocalFilters] = useState<Filters>(filters || {});
    const [showFilters, setShowFilters] = useState(false);

    const handleFilter = (e: FormEvent) => {
        e.preventDefault();
        router.get(route('ventas.listado'), localFilters as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({});
        router.get(
            route('ventas.listado'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const getEstadoBadge = (estado: string) => {
        const config = {
            pendiente: { bg: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Pendiente' },
            completada: { bg: 'bg-green-100 text-green-800 border-green-200', icon: BadgeCheck, label: 'Completada' },
            cancelada: { bg: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Cancelada' },
        }[estado] || { bg: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock, label: estado };

        const IconComponent = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${config.bg}`}>
                <IconComponent size={12} />
                {config.label}
            </span>
        );
    };

    const getPagoBadge = (venta: Venta) => {
        if (venta.estado === 'cancelada') {
            return (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                    Anulada
                </span>
            );
        }

        // ✅ CORRECCIÓN: Asegurar que restante sea número
        const restante = Number(venta.restante);
        const totalPagado = Number(venta.total_pagado);

        if (restante <= 0) {
            return (
                <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    Pagado
                </span>
            );
        }

        if (totalPagado > 0) {
            return (
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                    Parcial
                </span>
            );
        }

        return (
            <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                Pendiente
            </span>
        );
    };

    // ✅ FUNCIÓN SEGURA para formatear montos
    const formatMonto = (monto: number | string): string => {
        const numero = typeof monto === 'string' ? parseFloat(monto) : monto;
        return isNaN(numero) ? '0.00' : numero.toFixed(2);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Listado de Ventas" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Listado de Ventas" description="Resumen completo De ventas realizadas" />

                    <ShoppingCart
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />
                {/* Header con título y acciones */}
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="mt-1 text-gray-600 dark:text-gray-400">{ventas.total} ventas encontradas</p>
                    </div>

                    <div className="flex gap-2">
                        {/* Botón Exportar PDF */}
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>

                        {/* Botón Exportar Excel */}
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-lg font-semibold">
                            <Filter size={18} />
                            Filtros
                        </h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                                <Filter size={16} />
                                {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                            </Button>
                            <Button variant="outline" size="sm" onClick={clearFilters}>
                                <XCircle size={16} />
                                Limpiar
                            </Button>
                        </div>
                    </div>

                    {showFilters && (
                        <form onSubmit={handleFilter} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {/* Filtro por Estado */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Estado</label>
                                <select
                                    value={localFilters.estado || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, estado: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                                >
                                    <option value="">Todos los estados</option>
                                    {estados_venta.map((estado) => (
                                        <option key={estado.value} value={estado.value}>
                                            {estado.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro por Almacén */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Almacén</label>
                                <select
                                    value={localFilters.almacen_id || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, almacen_id: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                                >
                                    <option value="">Todos los almacenes</option>
                                    {almacenes.map((almacen) => (
                                        <option key={almacen.id} value={almacen.id.toString()}>
                                            {almacen.nombre_almacen}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Filtro por Fecha Desde */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Fecha Desde</label>
                                <input
                                    type="date"
                                    value={localFilters.fecha_desde || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, fecha_desde: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>

                            {/* Filtro por Fecha Hasta */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Fecha Hasta</label>
                                <input
                                    type="date"
                                    value={localFilters.fecha_hasta || ''}
                                    onChange={(e) => setLocalFilters({ ...localFilters, fecha_hasta: e.target.value })}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
                                />
                            </div>

                            {/* Botón Aplicar Filtros */}
                            <div className="flex justify-end md:col-span-2 lg:col-span-4">
                                <Button type="submit" className="flex items-center gap-2">
                                    <Search size={16} />
                                    Aplicar Filtros
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Lista de Ventas */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    {ventas.data.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No se encontraron ventas</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No hay ventas que coincidan con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Venta
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Cliente
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Almacén
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Items
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Total
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Estado / Pago
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {ventas.data.map((venta) => (
                                        <tr key={venta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">Venta #{venta.id}</div>
                                                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                                            <User size={12} />
                                                            {venta.usuario.nombre}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {venta.cliente?.nombre || 'Cliente no especificado'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                                                    <Store size={14} />
                                                    {venta.almacen.nombre}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                                                    <Package size={14} />
                                                    {venta.cantidad_items} items
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
                                                    <DollarSign size={14} />
                                                    {/* ✅ CORRECCIÓN: Usar formatMonto en lugar de toFixed directamente */}
                                                    {formatMonto(venta.total)} USD
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Pagado: {formatMonto(venta.total_pagado)} USD
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {getEstadoBadge(venta.estado)}
                                                    {getPagoBadge(venta)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                                                    <Calendar size={14} />
                                                    {venta.fecha}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                                <Link href={route('ventas.show', venta.id)}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="curosr-pointer flex cursor-pointer items-center gap-1"
                                                    >
                                                        <Eye size={14} />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {ventas.data.length > 0 && (
                        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Mostrando {ventas.data.length} de {ventas.total} resultados
                                </div>
                                <div className="flex gap-1">
                                    {ventas.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            preserveState
                                            preserveScroll
                                            className={`rounded-md px-3 py-1 text-sm ${
                                                link.active
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                            } ${!link.url ? 'cursor-not-allowed opacity-50' : ''}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
