import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
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
    Undo2,
    User,
    Users,
    Wallet,
    Warehouse,
    XCircle,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

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
    total_ganancia: number | null;
    total_comision: number;
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
    auth?: { user?: { role?: string } };
    [key: string]: unknown;
}

export default function ListadoVentas() {
    const { props } = usePage<PageProps>();
    const { ventas, filters, almacenes, estados_venta, auth } = props;
    const puedeVerGananciaAgencia = auth?.user?.role === 'admin' || auth?.user?.role === 'moderador';

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

    // Mismo criterio que Productos/Index.tsx para navegar de página.
    const navigateToPage = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    // La paginación nativa de Laravel manda TODOS los números de página en `links`
    // (con 27 páginas eso es "1 2 3 4 5 6 7 8 9 10 ... 26 27", muy cargado). Acá se
    // recorta a una ventana chica alrededor de la página actual + primera/última,
    // con "..." donde se salta — mismo criterio visual que ya usa Cuentas/Index.tsx.
    const paginationLinksVisibles = useMemo(() => {
        const numeradas = ventas.links.slice(1, -1);
        if (numeradas.length <= 7) return ventas.links;

        const actual = numeradas.findIndex((link) => link.active);
        const mantener = new Set([0, numeradas.length - 1, actual - 1, actual, actual + 1].filter((i) => i >= 0 && i < numeradas.length));

        const resultado: PaginationLink[] = [ventas.links[0]];
        let ultimoIncluido = -1;
        numeradas.forEach((link, i) => {
            if (mantener.has(i)) {
                if (i - ultimoIncluido > 1) {
                    resultado.push({ url: null, label: '...', active: false });
                }
                resultado.push(link);
                ultimoIncluido = i;
            }
        });
        resultado.push(ventas.links[ventas.links.length - 1]);
        return resultado;
    }, [ventas.links]);

    const getEstadoBadge = (estado: string) => {
        const config = {
            pendiente: {
                bg: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800',
                icon: Clock,
                label: 'Pendiente',
            },
            completada: {
                bg: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/20 dark:text-green-300 dark:border-green-800',
                icon: BadgeCheck,
                label: 'Completada',
            },
            cancelada: {
                bg: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800',
                icon: XCircle,
                label: 'Cancelada',
            },
            devuelta: {
                bg: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800',
                icon: Undo2,
                label: 'Devuelta',
            },
            solicitud_especial: {
                bg: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800',
                icon: Filter,
                label: 'Solicitud Especial',
            },
            rechazada: {
                bg: 'bg-red-200 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-700',
                icon: XCircle,
                label: 'Rechazada',
            },
        }[estado] || {
            bg: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800',
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
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Listado de Ventas" description="Busca, filtra y gestiona todas las ventas registradas en el sistema." />
                    <ShoppingCart
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

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
                                    <Select value={localFilters.estado || 'all'} onValueChange={(v) => handleFilterChange('estado', v === 'all' ? '' : v)}>
                                        <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            {estados_venta.map((e) => (<SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                     <Label htmlFor="almacen" className="text-xs">Almacén</Label>
                                    <Combobox
                                        items={almacenes}
                                        itemToStringLabel={(item) => item.nombre_almacen}
                                        itemToStringValue={(item) => item.nombre_almacen}
                                        value={almacenes.find((a) => a.id.toString() === localFilters.almacen_id) || null}
                                        onValueChange={(almacen) => handleFilterChange('almacen_id', almacen ? almacen.id.toString() : '')}
                                    >
                                        <ComboboxInput
                                            id="almacen"
                                            placeholder="Todos los almacenes"
                                            showClear={!!localFilters.almacen_id}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(almacen) => (
                                                    <ComboboxItem key={almacen.id} value={almacen}>
                                                        {almacen.nombre_almacen}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
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

                <Card className="overflow-hidden border-l-4 border-blue-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Ventas Registradas</CardTitle>
                            </div>
                        </div>
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
                                                <Badge
                                                    variant="outline"
                                                    className="w-fit gap-1 border-indigo-200 bg-indigo-50 font-mono text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300"
                                                >
                                                    <FileText className="h-3 w-3" />#{venta.id}
                                                </Badge>
                                                <div className="mt-1 text-sm text-muted-foreground">{formatDate(venta.fecha_iso)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        venta.destinatario
                                                            ? 'w-fit gap-1 border-pink-200 bg-pink-50 uppercase text-pink-700 dark:border-pink-800 dark:bg-pink-950/20 dark:text-pink-300'
                                                            : 'w-fit gap-1 text-muted-foreground'
                                                    }
                                                >
                                                    <User className="h-3 w-3" />
                                                    {venta.destinatario ? `${venta.destinatario.nombre} ${venta.destinatario.apellidos}` : 'Sin receptor'}
                                                </Badge>
                                                {venta.cliente && (
                                                    <div className="mt-1 text-sm text-muted-foreground uppercase">{venta.cliente.nombre}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="w-fit gap-1 border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-300"
                                                >
                                                    <Warehouse className="h-3 w-3" />
                                                    {venta.almacen.nombre}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge
                                                    variant="outline"
                                                    className="w-fit gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
                                                >
                                                    <Package className="h-3 w-3" />
                                                    {venta.cantidad_items}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="w-fit gap-1 border-teal-200 bg-teal-50 font-semibold text-teal-700 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-300"
                                                >
                                                    <Wallet className="h-3 w-3" />
                                                    {formatMonto(venta.total)} {venta.moneda_principal?.codigo || ''}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit gap-1 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300"
                                                    >
                                                        <DollarSign className="h-3 w-3" />
                                                        Comisión: {formatMonto(venta.total_comision)}
                                                    </Badge>
                                                    {puedeVerGananciaAgencia && venta.ganancia_real_total !== null && (
                                                        <Badge
                                                            variant="outline"
                                                            className="w-fit gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300"
                                                        >
                                                            <Store className="h-3 w-3" />
                                                            Agencia: {formatMonto(venta.ganancia_real_total)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getEstadoBadge(venta.estado)}
                                                    {venta.es_venta_especial && (
                                                        <Badge variant="outline" className="w-fit border-amber-300 bg-amber-50 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
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
                    {ventas.data.length > 0 && (
                        <CardFooter className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                            <p className="text-sm text-muted-foreground">
                                Mostrando {ventas.from}-{ventas.to} de {ventas.total} ventas.
                            </p>
                            <div className="flex gap-1">
                                {paginationLinksVisibles.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => navigateToPage(link.url)}
                                        disabled={!link.url || link.active}
                                        className="cursor-pointer"
                                    >
                                        {renderPaginationLabel(link.label)}
                                    </Button>
                                ))}
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

// Defensa en el frontend, igual que ya usa Productos/Index.tsx — si por lo que sea el backend
// vuelve a mandar la clave cruda ('pagination.previous'/'pagination.next', ver
// [[project_lang_path_pagination_fix]]) en vez del texto traducido, esto lo normaliza a un
// símbolo limpio de todas formas, sin depender de que la traducción del servidor esté bien.
const renderPaginationLabel = (label: string) => {
    if (!label) return '';
    const normalized = label.toLowerCase();
    if (normalized.includes('pagination.previous') || normalized.includes('previous') || normalized.includes('anterior')) return '«';
    if (normalized.includes('pagination.next') || normalized.includes('next') || normalized.includes('siguiente')) return '»';
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
};
