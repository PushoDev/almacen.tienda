import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
        const estadoConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            pendiente_confirmacion: {
                bg: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                text: 'Pendiente',
                icon: <Clock className="h-3.5 w-3.5" />,
            },
            en_transito: {
                bg: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                text: 'En Tránsito',
                icon: <Send className="h-3.5 w-3.5" />,
            },
            recibido_parcial: {
                bg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
                text: 'Recibido Parcial',
                icon: <Package className="h-3.5 w-3.5" />,
            },
            recibido_completo: {
                bg: 'bg-green-500/10 text-green-500 border-green-500/20',
                text: 'Recibido Completo',
                icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            },
            rechazado: {
                bg: 'bg-red-500/10 text-red-500 border-red-500/20',
                text: 'Rechazado',
                icon: <XCircle className="h-3.5 w-3.5" />,
            },
            cancelado: {
                bg: 'bg-muted text-muted-foreground border-border',
                text: 'Cancelado',
                icon: <XCircle className="h-3.5 w-3.5" />,
            },
        };

        const config = estadoConfig[estado] || estadoConfig.cancelado;

        return (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.bg}`}>
                {config.icon}
                {estados[estado] || config.text}
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

    const getTimelineColor = (estado: string) => {
        switch (estado) {
            case 'pendiente_confirmacion':
                return 'bg-yellow-500 text-white';
            case 'en_transito':
                return 'bg-orange-500 text-white';
            case 'recibido_completo':
                return 'bg-green-500 text-white';
            case 'recibido_parcial':
                return 'bg-cyan-500 text-white';
            case 'rechazado':
                return 'bg-red-500 text-white';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const sortedSeguimientos = [...(movimiento.seguimientos || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Movimiento #${movimiento.id}`} />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">

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

                {/* Header Section */}
                <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link
                                href="/movimientos"
                                className="group border-border bg-background flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-sidebar-accent hover:text-white "
                            >
                                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                                Volver
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20">
                                    <Package className="h-6 w-6 text-violet-500" />
                                </div>
                                <div>
                                    <h1 className="text-foreground flex items-center gap-2 text-2xl font-bold">
                                        Detalle del Movimiento
                                        <span className="text-violet-500">#{movimiento.id}</span>
                                    </h1>
                                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                                        {movimiento.estado === 'rechazado' ? (
                                            <>
                                                <XCircle className="h-4 w-4 text-red-500" />
                                                <span className="text-red-500">Movimiento rechazado</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                <span>Movimiento recibido</span>
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {getEstadoBadge(movimiento.estado)}
                    </div>
                </div>

                {/* Widgets Grid - 4 columnas */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Widget 1: ID + Estado - Color Primario/Violeta */}
                    <Card className="border-l-4 border-l-violet-500 bg-gradient-to-br from-violet-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                <Package className="h-4 w-4 text-violet-500" />
                                Identificador
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-foreground text-3xl font-bold">#{movimiento.id}</div>
                            <div className="text-muted-foreground mt-1 text-sm">{estados[movimiento.estado]}</div>
                        </CardContent>
                    </Card>

                    {/* Widget 2: Origen → Destino - Color Info/Cyan */}
                    <Card className="border-l-4 border-l-cyan-500 bg-gradient-to-br from-cyan-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                <MapPin className="h-4 w-4 text-cyan-500" />
                                Ruta
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-foreground cursor-help truncate">{movimiento.almacen_origen?.nombre_almacen}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-medium">{movimiento.almacen_origen?.nombre_almacen}</p>
                                    <p className="text-xs opacity-75">{movimiento.almacen_origen?.tipo_almacen}</p>
                                    {movimiento.almacen_origen?.ciudad_almacen && (
                                        <p className="text-xs opacity-75">{movimiento.almacen_origen.ciudad_almacen}</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <ArrowLeft className="text-muted-foreground mx-2 inline h-3 w-3 rotate-180" />
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-foreground cursor-help truncate">{movimiento.almacen_destino?.nombre_almacen}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-medium">{movimiento.almacen_destino?.nombre_almacen}</p>
                                    <p className="text-xs opacity-75">{movimiento.almacen_destino?.tipo_almacen}</p>
                                    {movimiento.almacen_destino?.ciudad_almacen && (
                                        <p className="text-xs opacity-75">{movimiento.almacen_destino.ciudad_almacen}</p>
                                    )}
                                </TooltipContent>
                            </Tooltip>
                            <div className="text-muted-foreground mt-1 text-xs">
                                {movimiento.almacen_origen?.tipo_almacen} → {movimiento.almacen_destino?.tipo_almacen}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Widget 3: Fechas - Color Warning/Amarillo */}
                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                <Calendar className="h-4 w-4 text-amber-500" />
                                Fechas
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Creación:</span>
                                    <span className="text-foreground font-medium">{new Date(movimiento.created_at).toLocaleDateString('es-ES')}</span>
                                </div>
                                {movimiento.fecha_envio && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Envío:</span>
                                        <span className="text-foreground font-medium">
                                            {new Date(movimiento.fecha_envio).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                )}
                                {movimiento.fecha_recepcion && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Recepción:</span>
                                        <span className="text-foreground font-medium">
                                            {new Date(movimiento.fecha_recepcion).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Widget 4: Solicitante + Guía - Color Secondary/Gris */}
                    <Card className="border-l-4 border-l-slate-500 bg-gradient-to-br from-slate-500/5 to-transparent">
                        <CardHeader className="pb-2">
                            <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                                <User className="h-4 w-4 text-slate-500" />
                                Información
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Solicitante:</span>
                                    <span className="text-foreground font-medium">{movimiento.usuario?.name}</span>
                                </div>
                                {movimiento.guia_transporte && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Guía:</span>
                                        <span className="text-foreground font-medium">{movimiento.guia_transporte}</span>
                                    </div>
                                )}
                                {movimiento.transportista && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Transportista:</span>
                                        <span className="text-foreground font-medium">{movimiento.transportista}</span>
                                    </div>
                                )}
                                {!movimiento.guia_transporte && !movimiento.transportista && (
                                    <span className="text-muted-foreground/60 text-xs">Sin información de transporte</span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Observaciones */}
                {movimiento.observaciones && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Observaciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{movimiento.observaciones}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Tabla de Productos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Productos del Movimiento</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="font-semibold">Producto</TableHead>
                                    <TableHead className="font-semibold">Marca</TableHead>
                                    <TableHead className="font-semibold">Modelo</TableHead>
                                    <TableHead className="font-semibold">Capacidad</TableHead>
                                    <TableHead className="font-semibold">Color</TableHead>
                                    <TableHead className="text-center font-semibold">Solicitada</TableHead>
                                    <TableHead className="text-center font-semibold">Enviada</TableHead>
                                    <TableHead className="text-center font-semibold">Recibida</TableHead>
                                    <TableHead className="text-center font-semibold">Diferencia</TableHead>
                                    <TableHead className="font-semibold">Observaciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {movimiento.detalles?.map((detalle) => {
                                    const diferencia = (detalle.cantidad_recibida ?? 0) - detalle.cantidad_despachada;
                                    return (
                                        <TableRow key={detalle.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="text-foreground font-medium">{detalle.producto?.nombre_producto}</div>
                                                <div className="text-muted-foreground text-xs">{detalle.producto?.categoria?.nombre_categoria}</div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{detalle.producto?.marca_producto}</TableCell>
                                            <TableCell className="text-muted-foreground">{detalle.producto?.modelo_producto}</TableCell>
                                            <TableCell className="text-muted-foreground">{detalle.producto?.capacidad_producto || 'N/A'}</TableCell>
                                            <TableCell className="text-muted-foreground">{detalle.producto?.color_producto || 'N/A'}</TableCell>
                                            <TableCell className="text-center font-medium">{detalle.cantidad_solicitada}</TableCell>
                                            <TableCell className="text-center font-medium">{detalle.cantidad_despachada}</TableCell>
                                            <TableCell className="text-center font-medium">{detalle.cantidad_recibida ?? '-'}</TableCell>
                                            <TableCell className="text-center">
                                                {diferencia !== 0 ? (
                                                    <span
                                                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${diferencia > 0
                                                            ? 'border border-green-500/20 bg-green-500/10 text-green-500'
                                                            : 'border border-red-500/20 bg-red-500/10 text-red-500'
                                                            }`}
                                                    >
                                                        {diferencia > 0 ? '+' : ''}
                                                        {diferencia}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{detalle.observaciones || '-'}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Timeline de Seguimiento */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Historial de Seguimiento</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {/* Línea vertical */}
                            <div className="bg-border absolute top-0 left-4 h-full w-0.5" />

                            {/* Eventos */}
                            <div className="space-y-6">
                                {sortedSeguimientos.map((seguimiento) => {
                                    return (
                                        <div key={seguimiento.id} className="relative flex gap-4">
                                            {/* Icono */}
                                            <div
                                                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getTimelineColor(seguimiento.estado)}`}
                                            >
                                                {getTimelineIcon(seguimiento.estado)}
                                            </div>

                                            {/* Contenido */}
                                            <div className="flex-1 pb-6">
                                                <div className="flex items-center justify-between">
                                                    <span
                                                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${seguimiento.estado === 'pendiente_confirmacion'
                                                            ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                                                            : seguimiento.estado === 'en_transito'
                                                                ? 'border-orange-500/20 bg-orange-500/10 text-orange-500'
                                                                : seguimiento.estado === 'recibido_completo'
                                                                    ? 'border-green-500/20 bg-green-500/10 text-green-500'
                                                                    : seguimiento.estado === 'recibido_parcial'
                                                                        ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-500'
                                                                        : 'border-red-500/20 bg-red-500/10 text-red-500'
                                                            }`}
                                                    >
                                                        {estados[seguimiento.estado]}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        {new Date(seguimiento.created_at).toLocaleString('es-ES')}
                                                    </span>
                                                </div>
                                                <p className="text-foreground mt-1 text-sm">{seguimiento.observaciones}</p>
                                                <p className="text-muted-foreground mt-1 text-xs">Por: {seguimiento.usuario?.name}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
