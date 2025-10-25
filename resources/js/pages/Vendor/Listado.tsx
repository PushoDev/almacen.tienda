import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Clock,
    DollarSign,
    Eye,
    FileText,
    Filter,
    Monitor,
    Package,
    Search,
    Sheet as SheetIcon,
    ShoppingCart,
    Smartphone,
    Store,
    User,
    Users,
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

interface Destinatario {
    id: number;
    nombre: string;
    apellidos: string;
    carnet_identidad: string;
    telefono_contacto: string | null;
}

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
    total: number;
    estado: string;
    total_pagado: number;
    restante: number;
    cantidad_items: number;
    fecha: string;
    fecha_iso: string;
    moneda_principal?: {
        id: number;
        codigo: string;
        nombre: string;
    };
    destinatario: Destinatario | null; // Nueva propiedad
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
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState(filters.search || '');

    const handleFilter = (e: FormEvent) => {
        e.preventDefault();
        const filtersToApply = { ...localFilters };
        if (searchTerm.trim()) {
            filtersToApply.search = searchTerm.trim();
        }
        router.get(route('ventas.listado'), filtersToApply as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        setLocalFilters({});
        setSearchTerm('');
        router.get(
            route('ventas.listado'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        const filtersToApply = { ...localFilters };
        if (searchTerm.trim()) {
            filtersToApply.search = searchTerm.trim();
        }
        router.get(route('ventas.listado'), filtersToApply, {
            preserveState: true,
            preserveScroll: true,
        });
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

    const getPagoBadge = (venta: Venta) => {
        if (venta.estado === 'cancelada') {
            return (
                <Badge variant="destructive" className="text-xs">
                    Anulada
                </Badge>
            );
        }

        const restante = Number(venta.restante);
        const totalPagado = Number(venta.total_pagado);

        if (restante <= 0) {
            return (
                <Badge variant="default" className="bg-green-100 text-xs text-green-800 hover:bg-green-100">
                    Pagado
                </Badge>
            );
        }

        if (totalPagado > 0) {
            return (
                <Badge variant="secondary" className="text-xs">
                    Parcial
                </Badge>
            );
        }

        return (
            <Badge variant="outline" className="border-yellow-300 text-xs text-yellow-600">
                Pendiente
            </Badge>
        );
    };

    const getDestinatarioBadge = (venta: Venta) => {
        if (venta.estado === 'cancelada') {
            return null;
        }

        if (venta.destinatario) {
            return (
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-xs text-blue-700">
                    <Users className="mr-1 h-3 w-3" />
                    Receptor
                </Badge>
            );
        }

        if (venta.estado === 'pendiente') {
            return (
                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-xs text-orange-700">
                    <Users className="mr-1 h-3 w-3" />
                    Sin Receptor
                </Badge>
            );
        }

        return null;
    };

    const formatMonto = (monto: number | string): string => {
        const numero = typeof monto === 'string' ? parseFloat(monto) : monto;
        return isNaN(numero)
            ? '0.00'
            : numero.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Filtrar ventas localmente para búsqueda (opcional)
    const filteredVentas = ventas.data.filter((venta) => {
        if (!searchTerm) return true;

        const searchLower = searchTerm.toLowerCase();
        return (
            venta.id.toString().includes(searchLower) ||
            (venta.cliente?.nombre.toLowerCase().includes(searchLower) ?? false) ||
            venta.almacen.nombre.toLowerCase().includes(searchLower) ||
            venta.usuario.nombre.toLowerCase().includes(searchLower) ||
            (venta.destinatario?.nombre.toLowerCase().includes(searchLower) ?? false) ||
            (venta.destinatario?.apellidos.toLowerCase().includes(searchLower) ?? false) ||
            (venta.destinatario?.carnet_identidad.toLowerCase().includes(searchLower) ?? false)
        );
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Listado de Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Listado de Ventas" description="Resumen completo de ventas realizadas" />
                    <ShoppingCart
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-y-[-5px] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total Ventas</p>
                                    <p className="text-2xl font-bold">{ventas.total}</p>
                                </div>
                                <div className="rounded-full bg-blue-100 p-3">
                                    <ShoppingCart className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Completadas</p>
                                    <p className="text-2xl font-bold text-green-600">{ventas.data.filter((v) => v.estado === 'completada').length}</p>
                                </div>
                                <div className="rounded-full bg-green-100 p-3">
                                    <BadgeCheck className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                                    <p className="text-2xl font-bold text-yellow-600">{ventas.data.filter((v) => v.estado === 'pendiente').length}</p>
                                </div>
                                <div className="rounded-full bg-yellow-100 p-3">
                                    <Clock className="h-6 w-6 text-yellow-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Con Receptor</p>
                                    <p className="text-2xl font-bold text-blue-600">{ventas.data.filter((v) => v.destinatario !== null).length}</p>
                                </div>
                                <div className="rounded-full bg-blue-100 p-3">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Barra de acciones */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                                {/* Búsqueda */}
                                <form onSubmit={handleSearch} className="flex-1">
                                    <div className="relative">
                                        <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Buscar por ID, cliente, almacén, receptor..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </form>

                                {/* Filtros móvil */}
                                <div className="flex gap-2 sm:hidden">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Filter className="h-4 w-4" />
                                                Filtros
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="bottom" className="h-[80vh]">
                                            <SheetHeader>
                                                <SheetTitle>Filtros</SheetTitle>
                                                <SheetDescription>Aplica filtros para refinar tu búsqueda</SheetDescription>
                                            </SheetHeader>
                                            <div className="mt-4 space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Estado</Label>
                                                    <Select
                                                        value={localFilters.estado || ''}
                                                        onValueChange={(value) => setLocalFilters({ ...localFilters, estado: value })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Todos los estados" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="">Todos los estados</SelectItem>
                                                            {estados_venta.map((estado) => (
                                                                <SelectItem key={estado.value} value={estado.value}>
                                                                    {estado.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Almacén</Label>
                                                    <Select
                                                        value={localFilters.almacen_id || ''}
                                                        onValueChange={(value) => setLocalFilters({ ...localFilters, almacen_id: value })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Todos los almacenes" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="">Todos los almacenes</SelectItem>
                                                            {almacenes.map((almacen) => (
                                                                <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                                    {almacen.nombre_almacen}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Fecha Desde</Label>
                                                    <Input
                                                        type="date"
                                                        value={localFilters.fecha_desde || ''}
                                                        onChange={(e) => setLocalFilters({ ...localFilters, fecha_desde: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Fecha Hasta</Label>
                                                    <Input
                                                        type="date"
                                                        value={localFilters.fecha_hasta || ''}
                                                        onChange={(e) => setLocalFilters({ ...localFilters, fecha_hasta: e.target.value })}
                                                    />
                                                </div>

                                                <div className="flex gap-2 pt-4">
                                                    <Button type="button" onClick={handleFilter} className="flex-1">
                                                        Aplicar
                                                    </Button>
                                                    <Button type="button" variant="outline" onClick={clearFilters}>
                                                        Limpiar
                                                    </Button>
                                                </div>
                                            </div>
                                        </SheetContent>
                                    </Sheet>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Botones de exportación */}
                                <Button variant="outline" size="sm" className="hidden sm:flex">
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF
                                </Button>
                                <Button variant="outline" size="sm" className="hidden sm:flex">
                                    <SheetIcon className="mr-2 h-4 w-4" />
                                    Excel
                                </Button>

                                {/* Filtros desktop */}
                                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="hidden sm:flex">
                                    <Filter className="mr-2 h-4 w-4" />
                                    {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                                </Button>
                            </div>
                        </div>

                        {/* Filtros Desktop */}
                        {showFilters && (
                            <form onSubmit={handleFilter} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>Estado</Label>
                                    <Select
                                        value={localFilters.estado || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, estado: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos los estados" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Todos los estados</SelectItem>
                                            {estados_venta.map((estado) => (
                                                <SelectItem key={estado.value} value={estado.value}>
                                                    {estado.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Almacén</Label>
                                    <Select
                                        value={localFilters.almacen_id || ''}
                                        onValueChange={(value) => setLocalFilters({ ...localFilters, almacen_id: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Todos los almacenes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Todos los almacenes</SelectItem>
                                            {almacenes.map((almacen) => (
                                                <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                    {almacen.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Fecha Desde</Label>
                                    <Input
                                        type="date"
                                        value={localFilters.fecha_desde || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, fecha_desde: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Fecha Hasta</Label>
                                    <Input
                                        type="date"
                                        value={localFilters.fecha_hasta || ''}
                                        onChange={(e) => setLocalFilters({ ...localFilters, fecha_hasta: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
                                    <Button type="submit" className="flex items-center gap-2">
                                        <Search className="h-4 w-4" />
                                        Aplicar Filtros
                                    </Button>
                                    <Button type="button" variant="outline" onClick={clearFilters}>
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Limpiar
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Vista Móvil - Cards */}
                <div className="block lg:hidden">
                    {filteredVentas.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Package className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-4 text-lg font-semibold">No se encontraron ventas</h3>
                                <p className="mt-2 text-gray-500">No hay ventas que coincidan con los filtros aplicados.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredVentas.map((venta) => (
                                <Card key={venta.id} className="overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold">Venta #{venta.id}</h3>
                                                    {getEstadoBadge(venta.estado)}
                                                </div>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    <User className="mr-1 inline h-3 w-3" />
                                                    {venta.usuario.nombre}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {getPagoBadge(venta)}
                                                {getDestinatarioBadge(venta)}
                                            </div>
                                        </div>

                                        {/* Información del destinatario */}
                                        {venta.destinatario && (
                                            <div className="mt-3 rounded-md bg-blue-50 p-2">
                                                <div className="flex items-center gap-1 text-sm font-medium text-blue-700">
                                                    <Users className="h-3 w-3" />
                                                    Receptor:
                                                </div>
                                                <p className="text-sm text-blue-600">
                                                    {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                                </p>
                                                <p className="text-xs text-blue-500">CI: {venta.destinatario.carnet_identidad}</p>
                                                {venta.destinatario.telefono_contacto && (
                                                    <p className="text-xs text-blue-500">Tel: {venta.destinatario.telefono_contacto}</p>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="font-medium text-gray-600">Cliente</p>
                                                <p>{venta.cliente?.nombre || 'No especificado'}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-600">Almacén</p>
                                                <div className="flex items-center gap-1">
                                                    <Store className="h-3 w-3" />
                                                    {venta.almacen.nombre}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-600">Items</p>
                                                <div className="flex items-center gap-1">
                                                    <Package className="h-3 w-3" />
                                                    {venta.cantidad_items}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-600">Total</p>
                                                <div className="flex items-center gap-1 font-semibold">
                                                    <DollarSign className="h-3 w-3" />
                                                    {formatMonto(venta.total)} {venta.moneda_principal?.codigo || 'USD'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t pt-3">
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(venta.fecha_iso)}
                                            </div>
                                            <Link href={route('ventas.show', venta.id)}>
                                                <Button variant="outline" size="sm">
                                                    <Eye className="mr-1 h-4 w-4" />
                                                    Ver
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vista Desktop - Table */}
                <Card className="hidden lg:block">
                    <CardHeader>
                        <CardTitle>Ventas Registradas</CardTitle>
                        <CardDescription>
                            {ventas.from && ventas.to
                                ? `Mostrando ${ventas.from}-${ventas.to} de ${ventas.total} ventas`
                                : `${ventas.total} ventas encontradas`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {filteredVentas.length === 0 ? (
                            <div className="p-8 text-center">
                                <Package className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-4 text-lg font-semibold">No se encontraron ventas</h3>
                                <p className="mt-2 text-gray-500">No hay ventas que coincidan con los filtros aplicados.</p>
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Venta</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Almacén</TableHead>
                                            <TableHead>Receptor</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Estado / Pago</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredVentas.map((venta) => (
                                            <TableRow key={venta.id} className="hover:bg-gray-50/50">
                                                <TableCell>
                                                    <div>
                                                        <div className="font-medium">Venta #{venta.id}</div>
                                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                                            <User className="h-3 w-3" />
                                                            {venta.usuario.nombre}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{venta.cliente?.nombre || 'Cliente no especificado'}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Store className="h-3 w-3" />
                                                        {venta.almacen.nombre}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {venta.destinatario ? (
                                                        <div className="space-y-1">
                                                            <div className="text-sm font-medium">
                                                                {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                                            </div>
                                                            <div className="text-xs text-gray-500">CI: {venta.destinatario.carnet_identidad}</div>
                                                            {venta.destinatario.telefono_contacto && (
                                                                <div className="text-xs text-gray-500">
                                                                    Tel: {venta.destinatario.telefono_contacto}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400 italic">
                                                            {venta.estado === 'pendiente' ? 'Sin receptor' : 'No aplica'}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Package className="h-3 w-3" />
                                                        {venta.cantidad_items}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold">
                                                        {formatMonto(venta.total)} {venta.moneda_principal?.codigo || 'USD'}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Pagado: {formatMonto(venta.total_pagado)} {venta.moneda_principal?.codigo || 'USD'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {getEstadoBadge(venta.estado)}
                                                        {getPagoBadge(venta)}
                                                        {getDestinatarioBadge(venta)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(venta.fecha_iso)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={route('ventas.show', venta.id)}>
                                                        <Button variant="outline" size="sm" className="cursor-pointer">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Paginación */}
                {ventas.data.length > 0 && (
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="text-sm text-gray-600">
                            Mostrando {ventas.from || 1} a {ventas.to || ventas.data.length} de {ventas.total} resultados
                        </div>

                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        href={ventas.links[0]?.url || '#'}
                                        className={!ventas.links[0]?.url ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>

                                {ventas.links.slice(1, -1).map((link, index) => (
                                    <PaginationItem key={index}>
                                        <PaginationLink
                                            href={link.url || '#'}
                                            isActive={link.active}
                                            className={!link.url ? 'pointer-events-none opacity-50' : ''}
                                        >
                                            {link.label}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationNext
                                        href={ventas.links[ventas.links.length - 1]?.url || '#'}
                                        className={!ventas.links[ventas.links.length - 1]?.url ? 'pointer-events-none opacity-50' : ''}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}

                {/* Indicador de vista responsive */}
                <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-3 py-2 text-xs text-white">
                    <Monitor className="hidden h-3 w-3 lg:block" />
                    <Smartphone className="block h-3 w-3 lg:hidden" />
                    <span className="hidden sm:inline">
                        {typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'Vista Escritorio' : 'Vista Móvil'}
                    </span>
                </div>
            </div>
        </AppLayout>
    );
}
