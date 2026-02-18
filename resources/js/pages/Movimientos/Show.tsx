import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, Movimiento } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Calendar, Caravan, CheckCircle2, Clock, MapPin, Package, Send, Truck, User, XCircle } from 'lucide-react';

interface PageProps {
    movimiento: Movimiento;
    estados: Record<string, string>;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Movimientos',
        href: '/movimientos',
    },
];

export default function MovimientoShow() {
    const { movimiento, estados } = usePage<PageProps>().props;

    const getEstadoBadge = (estado: string) => {
        const baseClasses = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold';
        const estadoClasses: Record<string, string> = {
            pendiente_confirmacion: 'bg-yellow-100 text-yellow-800',
            en_transito: 'bg-orange-100 text-orange-800',
            recibido_parcial: 'bg-cyan-100 text-cyan-800',
            recibido_completo: 'bg-green-100 text-green-800',
            rechazado: 'bg-red-100 text-red-800',
            cancelado: 'bg-gray-100 text-gray-800',
        };

        return (
            <span className={`${baseClasses} ${estadoClasses[estado] || 'bg-gray-100 text-gray-800'}`}>
                {estado === 'pendiente_confirmacion' && <Clock className="h-3.5 w-3.5" />}
                {estado === 'en_transito' && <Send className="h-3.5 w-3.5" />}
                {estado === 'recibido_parcial' && <Package className="h-3.5 w-3.5" />}
                {estado === 'recibido_completo' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {estado === 'rechazado' && <XCircle className="h-3.5 w-3.5" />}
                {estados[estado] || estado}
            </span>
        );
    };

    const getTimelineIcon = (estado: string) => {
        switch (estado) {
            case 'pendiente_confirmacion':
                return <Clock className="h-4 w-4" />;
            case 'en_transito':
                return <Truck className="h-4 w-4" />;
            case 'recibido_completo':
            case 'recibido_parcial':
                return <Package className="h-4 w-4" />;
            case 'rechazado':
                return <XCircle className="h-4 w-4" />;
            default:
                return <CheckCircle2 className="h-4 w-4" />;
        }
    };

    const sortedSeguimientos = [...(movimiento.seguimientos || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Movimiento #${movimiento.id}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header con botón volver */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    <Caravan
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/movimientos"
                            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Detalle del Movimiento #{movimiento.id}</h1>
                            <p className="text-sm text-gray-500">
                                {movimiento.estado === 'rechazado' ? 'Movimiento rechazado' : 'Movimiento recibido'}
                            </p>
                        </div>
                    </div>
                    {getEstadoBadge(movimiento.estado)}
                </div>

                {/* Widgets Grid - 4 columnas */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Widget 1: ID + Estado */}
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                            <Package className="h-4 w-4" />
                            Identificador
                        </div>
                        <div className="mt-2 text-2xl font-bold text-gray-900">#{movimiento.id}</div>
                        <div className="mt-1 text-sm text-gray-500">{estados[movimiento.estado]}</div>
                    </div>

                    {/* Widget 2: Origen → Destino */}
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                            <MapPin className="h-4 w-4" />
                            Ruta
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                            <span className="truncate text-gray-900">{movimiento.almacen_origen?.nombre_almacen}</span>
                            <ArrowLeft className="h-3 w-3 rotate-180 text-gray-400" />
                            <span className="truncate text-gray-900">{movimiento.almacen_destino?.nombre_almacen}</span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            {movimiento.almacen_origen?.tipo_almacen} → {movimiento.almacen_destino?.tipo_almacen}
                        </div>
                    </div>

                    {/* Widget 3: Fechas */}
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                            <Calendar className="h-4 w-4" />
                            Fechas
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Creación:</span>
                                <span className="font-medium text-gray-900">{new Date(movimiento.created_at).toLocaleDateString('es-ES')}</span>
                            </div>
                            {movimiento.fecha_envio && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Envío:</span>
                                    <span className="font-medium text-gray-900">{new Date(movimiento.fecha_envio).toLocaleDateString('es-ES')}</span>
                                </div>
                            )}
                            {movimiento.fecha_recepcion && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Recepción:</span>
                                    <span className="font-medium text-gray-900">
                                        {new Date(movimiento.fecha_recepcion).toLocaleDateString('es-ES')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Widget 4: Solicitante + Guía */}
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                            <User className="h-4 w-4" />
                            Información
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500">Solicitante:</span>
                                <span className="font-medium text-gray-900">{movimiento.usuario?.name}</span>
                            </div>
                            {movimiento.guia_transporte && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Guía:</span>
                                    <span className="font-medium text-gray-900">{movimiento.guia_transporte}</span>
                                </div>
                            )}
                            {movimiento.transportista && (
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Transportista:</span>
                                    <span className="font-medium text-gray-900">{movimiento.transportista}</span>
                                </div>
                            )}
                            {!movimiento.guia_transporte && !movimiento.transportista && (
                                <span className="text-xs text-gray-400">Sin información de transporte</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Observaciones */}
                {movimiento.observaciones && (
                    <div className="bg-card rounded-xl border p-4 shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500">Observaciones</h3>
                        <p className="mt-1 text-sm text-gray-900">{movimiento.observaciones}</p>
                    </div>
                )}

                {/* Tabla de Productos */}
                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="border-b px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">Productos del Movimiento</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                    <th className="px-4 py-3 text-left font-semibold">Marca</th>
                                    <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                    <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                    <th className="px-4 py-3 text-center font-semibold">Solicitada</th>
                                    <th className="px-4 py-3 text-center font-semibold">Enviada</th>
                                    <th className="px-4 py-3 text-center font-semibold">Recibida</th>
                                    <th className="px-4 py-3 text-center font-semibold">Diferencia</th>
                                    <th className="px-4 py-3 text-left font-semibold">Observaciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {movimiento.detalles?.map((detalle) => {
                                    const diferencia = (detalle.cantidad_recibida ?? 0) - detalle.cantidad_despachada;
                                    return (
                                        <tr key={detalle.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{detalle.producto?.nombre_producto}</div>
                                                <div className="text-xs text-gray-500">{detalle.producto?.categoria?.nombre_categoria}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{detalle.producto?.marca_producto}</td>
                                            <td className="px-4 py-3 text-gray-600">{detalle.producto?.modelo_producto}</td>
                                            <td className="px-4 py-3 text-gray-600">{detalle.producto?.capacidad_producto || 'N/A'}</td>
                                            <td className="px-4 py-3 text-center font-medium">{detalle.cantidad_solicitada}</td>
                                            <td className="px-4 py-3 text-center font-medium">{detalle.cantidad_despachada}</td>
                                            <td className="px-4 py-3 text-center font-medium">{detalle.cantidad_recibida ?? '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {diferencia !== 0 ? (
                                                    <span
                                                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${diferencia > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {diferencia > 0 ? '+' : ''}
                                                        {diferencia}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">{detalle.observaciones || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timeline de Seguimiento */}
                <div className="bg-card rounded-xl border shadow-sm">
                    <div className="border-b px-6 py-4">
                        <h2 className="text-lg font-semibold text-gray-900">Historial de Seguimiento</h2>
                    </div>
                    <div className="p-6">
                        <div className="relative">
                            {/* Línea vertical */}
                            <div className="absolute top-0 left-4 h-full w-0.5 bg-gray-200" />

                            {/* Eventos */}
                            <div className="space-y-6">
                                {sortedSeguimientos.map((seguimiento, index) => {
                                    const isLast = index === sortedSeguimientos.length - 1;
                                    return (
                                        <div key={seguimiento.id} className="relative flex gap-4">
                                            {/* Icono */}
                                            <div
                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isLast ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                                                    }`}
                                            >
                                                {getTimelineIcon(seguimiento.estado)}
                                            </div>

                                            {/* Contenido */}
                                            <div className="flex-1 pb-6">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${seguimiento.estado === 'pendiente_confirmacion'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : seguimiento.estado === 'en_transito'
                                                                ? 'bg-orange-100 text-orange-800'
                                                                : seguimiento.estado === 'recibido_completo'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : seguimiento.estado === 'recibido_parcial'
                                                                        ? 'bg-cyan-100 text-cyan-800'
                                                                        : 'bg-red-100 text-red-800'
                                                            }`}
                                                    >
                                                        {estados[seguimiento.estado]}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(seguimiento.created_at).toLocaleString('es-ES')}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-gray-700">{seguimiento.observaciones}</p>
                                                <p className="mt-1 text-xs text-gray-400">Por: {seguimiento.usuario?.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
