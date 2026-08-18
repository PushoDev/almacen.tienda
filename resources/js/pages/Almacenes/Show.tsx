import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, ProductoPorAlmacenDetalleRef, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowUpDown, Calendar, ChevronDown, ChevronUp, Edit2, ExternalLink, IdCard, Mail, MapPin, Package, Phone, Search, User, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 10;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Almacenes', href: '/almacenes' },
    { title: 'Detalles del Almacén', href: '#' },
];

interface ProductDetails extends ProductoPorAlmacenDetalleRef {
    marca?: string;
    modelo?: string;
    capacidad?: string;
    color?: string;
    codigo?: string;
    categoria?: string;
    imagen_url?: string;
}

type SortField = 'nombre_producto' | 'marca' | 'modelo' | 'capacidad' | 'codigo' | 'categoria' | 'cantidad_total';
type SortDirection = 'asc' | 'desc';
type StockFilter = 'all' | 'disponible' | 'bajo' | 'agotado';

export default function ShowAlmacenesPage({ almacen, productos }: { almacen: AlmacenProps; productos: ProductDetails[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState<StockFilter>('all');
    const [sortField, setSortField] = useState<SortField>('nombre_producto');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [imgError, setImgError] = useState(false);

    const hasResponsable =
        !!(almacen.nombre_responsable || almacen.apellido_responsable || almacen.carnet_responsable || almacen.telefono_responsable);

    const filteredProductos = useMemo(() => {
        let result = productos;

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(
                (p) =>
                    p.nombre_producto.toLowerCase().includes(term) ||
                    (p.marca || '').toLowerCase().includes(term) ||
                    (p.modelo || '').toLowerCase().includes(term) ||
                    (p.codigo || '').toLowerCase().includes(term) ||
                    (p.categoria || '').toLowerCase().includes(term),
            );
        }

        if (stockFilter === 'disponible') result = result.filter((p) => Number(p.cantidad_total || 0) >= 5);
        else if (stockFilter === 'bajo') result = result.filter((p) => Number(p.cantidad_total || 0) >= 1 && Number(p.cantidad_total || 0) < 5);
        else if (stockFilter === 'agotado') result = result.filter((p) => Number(p.cantidad_total || 0) === 0);

        return [...result].sort((a, b) => {
            let aVal: string | number = '';
            let bVal: string | number = '';

            if (sortField === 'cantidad_total') {
                aVal = Number(a.cantidad_total || 0);
                bVal = Number(b.cantidad_total || 0);
            } else {
                aVal = (a[sortField] || '').toString().toLowerCase();
                bVal = (b[sortField] || '').toString().toLowerCase();
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [productos, searchTerm, stockFilter, sortField, sortDirection]);

    const totalPages = Math.ceil(filteredProductos.length / ITEMS_PER_PAGE);

    const paginatedProductos = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredProductos.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredProductos, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, stockFilter, sortField, sortDirection]);

    const handleProductClick = (producto: ProductDetails) => {
        setSelectedProduct(producto);
        setImgError(false);
        setShowDialog(true);
    };

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
        return sortDirection === 'asc' ? (
            <ChevronUp className="ml-1 inline h-3 w-3 text-blue-600" />
        ) : (
            <ChevronDown className="ml-1 inline h-3 w-3 text-blue-600" />
        );
    };

    const getBadge = (tipo: string) => {
        switch (tipo) {
            case 'almacen':
                return { text: 'Almacén', variant: 'default' as const };
            case 'punto_venta':
                return { text: 'Punto de Venta', variant: 'secondary' as const };
            case 'transportacion':
                return { text: 'Transportación', variant: 'outline' as const };
            default:
                return { text: 'Desconocido', variant: 'destructive' as const };
        }
    };

    const getStockStatus = (cantidad: number) => {
        if (cantidad >= 5) return { status: 'Disponible', variant: 'default' as const, color: 'text-green-600' };
        if (cantidad > 0) return { status: 'Bajo Stock', variant: 'secondary' as const, color: 'text-orange-600' };
        return { status: 'Agotado', variant: 'destructive' as const, color: 'text-red-600' };
    };

    const badgeInfo = getBadge(almacen.tipo_almacen);

    const totalStock = useMemo(() => {
        return productos.reduce((total, producto) => total + Number(producto.cantidad_total || 0), 0);
    }, [productos]);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalles - ${almacen.nombre_almacen}`} />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title={`Detalles del Almacén: ${almacen.nombre_almacen}`}
                        description="Información completa del local, responsable y productos disponibles"
                    />
                    <Warehouse
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {/* Acciones */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge variant={badgeInfo.variant} className="text-sm">
                            {badgeInfo.text}
                        </Badge>
                        {almacen.productos_count !== undefined && (
                            <Badge variant="outline" className="text-sm">
                                <Package className="mr-1 h-3 w-3" />
                                {almacen.productos_count} productos
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Link href={route('almacenes.edit', { almacen: almacen.id })}>
                            <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                <Edit2 size={16} />
                                Editar Almacén
                            </Button>
                        </Link>
                        <Link href={route('almacenes.index')}>
                            <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                                Volver a la Lista
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Grid de Información */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Información del Local — siempre ocupa 2 columnas */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Warehouse className="h-5 w-5" />
                                Información del Local
                            </CardTitle>
                            <CardDescription>Datos generales y ubicación del almacén</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                        <Warehouse className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="text-sm font-medium">Nombre del Local</p>
                                            <p className="text-lg font-semibold">{almacen.nombre_almacen}</p>
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                        <Phone className="h-5 w-5 text-green-500" />
                                        <div>
                                            <p className="text-sm font-medium">Teléfono del Local</p>
                                            <p className="text-lg font-semibold">{almacen.telefono_almacen}</p>
                                        </div>
                                    </div>
                                    {almacen.correo_almacen && (
                                        <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                            <Mail className="h-5 w-5 text-orange-500" />
                                            <div>
                                                <p className="text-sm font-medium">Correo Electrónico</p>
                                                <a href={`mailto:${almacen.correo_almacen}`} className="text-lg font-semibold text-blue-600 hover:underline">
                                                    {almacen.correo_almacen}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    {(almacen.provincia_almacen || almacen.ciudad_almacen) && (
                                        <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                            <MapPin className="h-5 w-5 text-red-500" />
                                            <div>
                                                <p className="text-sm font-medium">Ubicación</p>
                                                <p className="text-lg font-semibold">
                                                    {almacen.ciudad_almacen && almacen.provincia_almacen
                                                        ? `${almacen.ciudad_almacen}, ${almacen.provincia_almacen}`
                                                        : almacen.ciudad_almacen || almacen.provincia_almacen}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                        <Calendar className="h-5 w-5 text-purple-500" />
                                        <div>
                                            <p className="text-sm font-medium">Creado</p>
                                            <p className="text-sm">{formatDate(almacen.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                        <Calendar className="h-5 w-5 text-indigo-500" />
                                        <div>
                                            <p className="text-sm font-medium">Actualizado</p>
                                            <p className="text-sm">{formatDate(almacen.updated_at)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {almacen.notas_almacen && (
                                <div className="bg-card mt-6 rounded-lg border p-4">
                                    <p className="mb-2 text-sm font-medium">Notas Adicionales</p>
                                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{almacen.notas_almacen}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Columna derecha: responsable (si existe) + resumen de inventario apilados */}
                    <div className="flex flex-col gap-6">
                        {hasResponsable && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <User className="h-5 w-5" />
                                        Información del Responsable
                                    </CardTitle>
                                    <CardDescription>Persona a cargo del local</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {(almacen.nombre_responsable || almacen.apellido_responsable) && (
                                            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                                <User className="h-5 w-5 text-purple-500" />
                                                <div>
                                                    <p className="text-sm font-medium">Nombre Completo</p>
                                                    <p className="text-lg font-semibold">
                                                        {almacen.nombre_responsable} {almacen.apellido_responsable}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {almacen.carnet_responsable && (
                                            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                                <IdCard className="h-5 w-5 text-indigo-500" />
                                                <div>
                                                    <p className="text-sm font-medium">Número de Carnet</p>
                                                    <p className="text-lg font-semibold">{almacen.carnet_responsable}</p>
                                                </div>
                                            </div>
                                        )}
                                        {almacen.telefono_responsable && (
                                            <div className="bg-muted/50 flex items-center gap-3 rounded-lg p-3">
                                                <Phone className="h-5 w-5 text-green-500" />
                                                <div>
                                                    <p className="text-sm font-medium">Teléfono del Responsable</p>
                                                    <p className="text-lg font-semibold">{almacen.telefono_responsable}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Resumen de Inventario — siempre en la columna derecha */}
                        <Card className="flex-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Resumen de Inventario
                                </CardTitle>
                                <CardDescription>Resumen general de productos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="bg-primary/10 flex items-center justify-between rounded-lg p-3">
                                        <span className="text-sm font-medium">Total de Productos</span>
                                        <span className="text-primary text-2xl font-bold">{productos.length}</span>
                                    </div>
                                    <div className="bg-secondary/10 flex items-center justify-between rounded-lg p-3">
                                        <span className="text-sm font-medium">Cantidad Total en Stock</span>
                                        <span className="text-secondary text-2xl font-bold">{totalStock}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Estado del Stock:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex items-center gap-1">
                                                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                                <span>Disponible (≥5):</span>
                                                <span className="font-semibold">{productos.filter((p) => Number(p.cantidad_total || 0) >= 5).length}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                                                <span>Bajo Stock (1-4):</span>
                                                <span className="font-semibold">
                                                    {productos.filter((p) => Number(p.cantidad_total || 0) >= 1 && Number(p.cantidad_total || 0) < 5).length}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                                <span>Agotado (0):</span>
                                                <span className="font-semibold">{productos.filter((p) => Number(p.cantidad_total || 0) === 0).length}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Listado Detallado de Productos */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    Listado de Productos
                                </CardTitle>
                                <CardDescription>Productos disponibles en este almacén</CardDescription>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                                {/* Filtro por estado de stock */}
                                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
                                    <SelectTrigger className="w-full sm:w-40">
                                        <SelectValue placeholder="Estado stock" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="disponible">Disponible</SelectItem>
                                        <SelectItem value="bajo">Bajo Stock</SelectItem>
                                        <SelectItem value="agotado">Agotado</SelectItem>
                                    </SelectContent>
                                </Select>
                                {/* Búsqueda */}
                                <div className="relative w-full sm:w-64">
                                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                                    <Input
                                        placeholder="Buscar por nombre, marca, código..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredProductos.length === 0 ? (
                            <div className="py-8 text-center">
                                <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                <p className="text-muted-foreground text-lg font-medium">
                                    {searchTerm || stockFilter !== 'all' ? 'No se encontraron productos' : 'No hay productos registrados'}
                                </p>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    {searchTerm || stockFilter !== 'all'
                                        ? 'Intenta con otros términos o cambia el filtro de stock'
                                        : 'Este almacén no tiene productos asignados en el inventario.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="text-muted-foreground flex items-center justify-between px-1 text-sm">
                                    <span>
                                        Mostrando {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredProductos.length)}–
                                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredProductos.length)} de {filteredProductos.length} productos
                                        {searchTerm && ` — "${searchTerm}"`}
                                        {stockFilter !== 'all' && ` — ${stockFilter}`}
                                    </span>
                                    <span>{totalPages > 1 && `Página ${currentPage} de ${totalPages}`}</span>
                                </div>

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nombre_producto')}>
                                                    Nombre del Producto <SortIcon field="nombre_producto" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('marca')}>
                                                    Marca <SortIcon field="marca" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('modelo')}>
                                                    Modelo <SortIcon field="modelo" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('capacidad')}>
                                                    Capacidad <SortIcon field="capacidad" />
                                                </TableHead>
                                                <TableHead>Color</TableHead>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('codigo')}>
                                                    Código <SortIcon field="codigo" />
                                                </TableHead>
                                                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('categoria')}>
                                                    Categoría <SortIcon field="categoria" />
                                                </TableHead>
                                                <TableHead
                                                    className="w-[120px] cursor-pointer select-none text-right"
                                                    onClick={() => handleSort('cantidad_total')}
                                                >
                                                    Cantidad <SortIcon field="cantidad_total" />
                                                </TableHead>
                                                <TableHead className="w-[120px]">Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedProductos.map((producto) => {
                                                const stockStatus = getStockStatus(Number(producto.cantidad_total || 0));
                                                return (
                                                    <TableRow key={producto.producto_id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <TooltipProvider delayDuration={200}>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <div className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-gray-50">
                                                                                {producto.imagen_url ? (
                                                                                    <img
                                                                                        src={producto.imagen_url}
                                                                                        alt={producto.nombre_producto}
                                                                                        className="h-full w-full object-contain"
                                                                                        onError={(e) => {
                                                                                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                                                                                            (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                                                                                        }}
                                                                                    />
                                                                                ) : null}
                                                                                <Package className={`text-muted-foreground h-4 w-4 ${producto.imagen_url ? 'hidden' : ''}`} />
                                                                            </div>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="right" className="p-1">
                                                                            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-md bg-white">
                                                                                {producto.imagen_url ? (
                                                                                    <img
                                                                                        src={producto.imagen_url}
                                                                                        alt={producto.nombre_producto}
                                                                                        className="h-full w-full object-contain"
                                                                                    />
                                                                                ) : (
                                                                                    <Package className="text-muted-foreground h-12 w-12" />
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <Button
                                                                    variant="link"
                                                                    className="h-auto cursor-pointer p-0 text-base font-medium text-blue-600 underline-offset-4 hover:underline"
                                                                    onClick={() => handleProductClick(producto)}
                                                                >
                                                                    {producto.nombre_producto}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{producto.marca || '-'}</TableCell>
                                                        <TableCell>{producto.modelo || '-'}</TableCell>
                                                        <TableCell>{producto.capacidad || '-'}</TableCell>
                                                        <TableCell>{producto.color || '-'}</TableCell>
                                                        <TableCell className="font-mono text-xs">{producto.codigo || '-'}</TableCell>
                                                        <TableCell>{producto.categoria || '-'}</TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`text-lg font-semibold ${stockStatus.color}`}>
                                                                {Number(producto.cantidad_total || 0)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={stockStatus.variant}>{stockStatus.status}</Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                {totalPages > 1 && (
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>

                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                                const showPage =
                                                    page === 1 ||
                                                    page === totalPages ||
                                                    (page >= currentPage - 1 && page <= currentPage + 1);
                                                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                                                const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                                                if (showEllipsisBefore || showEllipsisAfter) {
                                                    return (
                                                        <PaginationItem key={`ellipsis-${page}`}>
                                                            <PaginationEllipsis />
                                                        </PaginationItem>
                                                    );
                                                }
                                                if (!showPage) return null;

                                                return (
                                                    <PaginationItem key={page}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={page === currentPage}
                                                            onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                                                            className="cursor-pointer"
                                                        >
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                );
                                            })}

                                            <PaginationItem>
                                                <PaginationNext
                                                    href="#"
                                                    onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Dialog de Detalles del Producto */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Detalles del Producto</DialogTitle>
                        </DialogHeader>
                        {selectedProduct && (
                            <div className="flex flex-col gap-4">
                                <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 p-2">
                                    {imgError ? (
                                        <Package className="h-16 w-16 text-gray-300" />
                                    ) : (
                                        <img
                                            src={selectedProduct.imagen_url || ''}
                                            alt={selectedProduct.nombre_producto}
                                            className="h-full w-full object-contain"
                                            onError={() => setImgError(true)}
                                        />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-gray-900">{selectedProduct.nombre_producto}</h3>
                                        <p className="text-sm text-gray-500">{selectedProduct.codigo || 'Sin código'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-500">Marca</p>
                                            <p className="font-semibold text-gray-900">{selectedProduct.marca || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Modelo</p>
                                            <p className="font-semibold text-gray-900">{selectedProduct.modelo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Capacidad</p>
                                            <p className="font-semibold text-gray-900">{selectedProduct.capacidad || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Color</p>
                                            <p className="font-semibold text-gray-900">{selectedProduct.color || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Categoría</p>
                                            <p className="font-semibold text-gray-900">{selectedProduct.categoria || 'N/A'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="font-medium text-gray-500">Stock en Almacén</p>
                                            <p className={`text-lg font-bold ${getStockStatus(Number(selectedProduct.cantidad_total || 0)).color}`}>
                                                {Number(selectedProduct.cantidad_total || 0)} unidades —{' '}
                                                <span className="text-sm">{getStockStatus(Number(selectedProduct.cantidad_total || 0)).status}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            {selectedProduct && (
                                <Link href={route('productos.show', selectedProduct.producto_id)}>
                                    <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        Ver Producto Completo
                                    </Button>
                                </Link>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
