import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    Calendar,
    ChevronDown,
    Clock,
    DollarSign,
    Eye,
    FileText,
    Filter,
    Package,
    Search,
    ShoppingCart,
    Store,
    User,
    Users,
    XCircle,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Listado de Ventas',
        href: '#',
    },
];

interface Destinatario {
    id: number;
    nombre: string;
    apellidos: string;
    carnet_identidad: string;
    telefono_contacto: string | null;
}

interface Venta {
    id: number;
    cliente: { id: number; nombre: string } | null;
    almacen: { id: number; nombre: string };
    usuario: { id: number; nombre: string };
    total: number;
    total_ganancia: number;
    total_esperado_usd: number | null;
    ganancia_perdida_cambiaria: number | null;
    ganancia_real_total: number | null;
    estado: string;
    total_pagado: number;
    restante: number;
    cantidad_items: number;
    fecha: string;
    fecha_iso: string;
    moneda_principal?: { id: number; codigo: string; nombre: string };
    destinatario: Destinatario | null;
    es_venta_especial?: boolean;
}

interface Filters {
    estado?: string;
    almacen_id?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    search?: string;
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
    from?: number;
    to?: number;
}

interface PageProps {
    ventas: VentasPagination;
    filters: Filters;
    almacenes: Almacen[];
    estados_venta: EstadoVenta[];
    [key: string]: unknown;
}

export default function ListadoVentas() {
    const { props } = usePage<PageProps>();
    const { ventas, filters, almacenes, estados_venta } = props;

    const [localFilters, setLocalFilters] = useState<Filters>(filters || {});

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
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
            pendiente: {
                bg: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                icon: Clock,
                label: 'Pendiente',
            },
            completada: {
                bg: 'bg-green-100 text-green-800 border-green-200',
                icon: BadgeCheck,
                label: 'Completada',
            },
            cancelada: {
                bg: 'bg-red-100 text-red-800 border-red-200',
                icon: XCircle,
                label: 'Cancelada',
            },
            solicitud_especial: {
                bg: 'bg-amber-100 text-amber-800 border-amber-200',
                icon: Filter,
                label: 'Solicitud Especial',
            },
            rechazada: {
                bg: 'bg-red-200 text-red-900 border-red-300',
                icon: XCircle,
                label: 'Rechazada',
            },
        }[estado] || {
            bg: 'bg-gray-100 text-gray-800 border-gray-200',
            icon: Clock,
            label: estado,
        };

        const IconComponent = config.icon;

        return (
            <Badge variant="outline" className={`${config.bg} border`}>
                <IconComponent className="mr-1 h-3 w-3" />
                {config.label}
            </Badge>
        );
    };

    const formatMonto = (monto: number | null | undefined): string => {
        const numero = Number(monto || 0);
        return isNaN(numero) ? '0.00' : numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Listado de Ventas" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Listado de Ventas</CardTitle>
                        <CardDescription>Busca, filtra y gestiona todas las ventas registradas en el sistema.</CardDescription>
                    </CardHeader>
                    <ShoppingCart size={80} className="pointer-events-none absolute -bottom-4 -right-4 text-gray-200/40 dark:text-gray-500/10" />
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por ID, cliente, almacén, receptor..."
                                    value={localFilters.search || ''}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="pl-10"
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                                <div className="space-y-1">
                                    <Label htmlFor="estado" className="text-xs">Estado</Label>
                                    <Select value={localFilters.estado || ''} onValueChange={(v) => handleFilterChange('estado', v)}>
                                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                        <SelectContent>
                                            {estados_venta.map((e) => (<SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                     <Label htmlFor="almacen" className="text-xs">Almacén</Label>
                                    <Select value={localFilters.almacen_id || ''} onValueChange={(v) => handleFilterChange('almacen_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                        <SelectContent>
                                            {almacenes.map((a) => (<SelectItem key={a.id} value={a.id.toString()}>{a.nombre_almacen}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="fecha_desde" className="text-xs">Desde</Label>
                                    <Input id="fecha_desde" type="date" value={localFilters.fecha_desde || ''} onChange={e => handleFilterChange('fecha_desde', e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="fecha_hasta" className="text-xs">Hasta</Label>
                                    <Input id="fecha_hasta" type="date" value={localFilters.fecha_hasta || ''} onChange={e => handleFilterChange('fecha_hasta', e.target.value)} />
                                </div>
                                <div className="flex items-end gap-2">
                                    <Button onClick={applyFilters} className="w-full sm:w-auto"><Search className="mr-2 h-4 w-4" />Aplicar</Button>
                                    <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto"><XCircle className="mr-2 h-4 w-4" />Limpiar</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Ventas Registradas</CardTitle>
                        <CardDescription>
                            Mostrando {ventas.from}-{ventas.to} de {ventas.total} ventas.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Venta</TableHead>
                                    <TableHead>Cliente/Receptor</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead>Items</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Ganancias</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ventas.data.length > 0 ? (
                                    ventas.data.map((venta) => (
                                        <TableRow key={venta.id}>
                                            <TableCell>
                                                <div className="font-medium">#{venta.id}</div>
                                                <div className="text-sm text-muted-foreground">{formatDate(venta.fecha_iso)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{venta.cliente?.nombre || 'N/A'}</div>
                                                <div className="text-sm text-muted-foreground">{venta.destinatario ? `${venta.destinatario.nombre} ${venta.destinatario.apellidos}` : 'Sin receptor'}</div>
                                            </TableCell>
                                            <TableCell>{venta.almacen.nombre}</TableCell>
                                            <TableCell className="text-center">{venta.cantidad_items}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold">{formatMonto(venta.total)} {venta.moneda_principal?.codigo || ''}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-green-600" title="Ganancia Operacional">{formatMonto(venta.total_ganancia)}</div>
                                                <div className="text-sm text-blue-600" title="Ganancia Real">{formatMonto(venta.ganancia_real_total)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getEstadoBadge(venta.estado)}
                                                    {venta.es_venta_especial && (
                                                        <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-xs text-amber-700">
                                                            Especial
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={route('ventas.show', venta.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No se encontraron ventas con los filtros aplicados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {ventas.data.length > 0 && (
                    <Pagination>
                        <PaginationContent>
                            {ventas.links.map((link, index) => (
                                <PaginationItem key={index}>
                                    <PaginationLink
                                        href={link.url || '#'}
                                        isActive={link.active}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                     />
                                </PaginationItem>
                            ))}
                        </PaginationContent>
                    </Pagination>
                )}
            </div>
        </AppLayout>
    );
}