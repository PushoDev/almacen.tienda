import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { BadgeDollarSign, CheckCircle2, FileText, History, Sheet, Upload, Warehouse, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    color_producto?: string;
    categoria: string;
    precio_compra: number;
    stock_almacen: number;
    precio_venta: number | null;
    ganancia: number | null;
    comision: number | null;
    imagen_producto?: string;
    tiene_precio: boolean;
    almacen_id: number;
    puesto_por_nombre?: string | null;
}

interface AlmacenData {
    almacen_id: number;
    nombre_almacen: string;
    productos: Producto[];
}

interface PageProps {
    almacenes: AlmacenData[];
    meta: { total_almacenes: number; role_usuario: string };
    canViewSensitiveData?: boolean;
}

interface HistorialItem {
    id: number;
    usuario: string;
    precio_anterior: number | null;
    precio_nuevo: number;
    comision: number | null;
    accion: string;
    fecha: string;
}

interface PrecioActual {
    precio_venta: number;
    ganancia: number;
    comision: number;
    puesto_por_nombre: string;
    ultima_actualizacion: string;
}

interface HistorialData {
    success: boolean;
    producto: { id: number; nombre: string; marca: string; modelo?: string; capacidad?: string; color?: string; precio_compra: number };
    almacen: { id: number; nombre: string };
    precio_actual: PrecioActual | null;
    historial: HistorialItem[];
    total_cambios: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Precios por Almacén', href: '#' },
];

export default function VendedorPage({ almacenes: initialAlmacenes, meta, canViewSensitiveData = false }: PageProps) {
    const [almacenes, setAlmacenes] = useState<AlmacenData[]>(initialAlmacenes);
    const [selectedAlmacenId, setSelectedAlmacenId] = useState<number | null>(initialAlmacenes.length > 0 ? initialAlmacenes[0].almacen_id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [newComision, setNewComision] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    // Estados para el modal de historial
    const [isHistorialDialogOpen, setIsHistorialDialogOpen] = useState(false);
    const [historialData, setHistorialData] = useState<HistorialData | null>(null);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Estados para importar
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ actualizados: number; omitidos: number; errores: string[] } | null>(null);

    const selectedAlmacen = almacenes.find((a) => a.almacen_id === selectedAlmacenId);
    const productsInAlmacen = selectedAlmacen?.productos || [];

    const availableAlmacenes = initialAlmacenes.map((a) => {
        const totalProductos     = a.productos.length;
        const totalStock         = a.productos.reduce((sum, p) => sum + p.stock_almacen, 0);
        const valorTotal         = a.productos.reduce((sum, p) => sum + (p.precio_venta || p.precio_compra) * p.stock_almacen, 0);
        const productosConPrecio = a.productos.filter((p) => p.precio_venta !== null).length;

        return {
            id: a.almacen_id,
            nombre: a.nombre_almacen,
            totalProductos,
            totalStock,
            valorTotal,
            productosConPrecio,
            productosSinPrecio: totalProductos - productosConPrecio,
        };
    });

    const formatCurrency = (value: number | null) => {
        if (value === null || value === undefined) return 'No definido';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const openEditModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice(producto.precio_venta?.toString() || '');
        setNewComision(producto.comision?.toString() || '');
        setError(null);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !newPrice) return;
        const parsedPrice = parseFloat(newPrice);

        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setError('El precio debe ser un número positivo mayor a 0.00');
            return;
        }

        if (!selectedProduct.almacen_id) {
            setError('Error: ID de almacén no definido.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/disponibles/${selectedProduct.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    precio_venta: parsedPrice,
                    almacen_id: selectedProduct.almacen_id,
                    comision: newComision !== '' ? parseFloat(newComision) : null,
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Error al actualizar el precio');
            }

            setAlmacenes((prevAlmacenes) =>
                prevAlmacenes.map((almacen) => {
                    if (almacen.almacen_id !== selectedProduct.almacen_id) return almacen;
                    return {
                        ...almacen,
                        productos: almacen.productos.map((p) =>
                            p.id === selectedProduct.id && p.almacen_id === selectedProduct.almacen_id
                                ? {
                                      ...p,
                                      precio_venta: parsedPrice,
                                      ganancia: parsedPrice - p.precio_compra,
                                      comision:
                                          responseData.new_comision !== undefined && responseData.new_comision !== null
                                              ? responseData.new_comision
                                              : p.comision,
                                      puesto_por_nombre: responseData.puesto_por_nombre ?? p.puesto_por_nombre,
                                  }
                                : p,
                        ),
                    };
                }),
            );

            setIsModalOpen(false);
        } catch (err) {
            console.error('Error en la solicitud:', err);
            setError(err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const verHistorial = async (producto: Producto) => {
        if (meta.role_usuario !== 'admin' && meta.role_usuario !== 'moderador') return;

        setLoadingHistorial(true);
        setIsHistorialDialogOpen(true);
        setHistorialData(null);

        try {
            const response = await fetch(`/disponibles/${producto.id}/precios-vendedores/${producto.almacen_id}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setHistorialData(data);
            } else {
                setError(data.error || 'Error al cargar el historial');
                setTimeout(() => setError(null), 3000);
                setIsHistorialDialogOpen(false);
            }
        } catch (err) {
            console.error('Error al obtener historial:', err);
            setError('Error al cargar el historial de precios');
            setTimeout(() => setError(null), 3000);
            setIsHistorialDialogOpen(false);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const filteredProducts = productsInAlmacen.filter(
        (producto) =>
            (producto.nombre_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.marca_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.modelo_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.capacidad_producto || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const totalPages      = Math.ceil(filteredProducts.length / itemsPerPage);
    const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleExport = () => {
        if (!selectedAlmacenId) return;
        window.location.href = `/disponibles/almacen/${selectedAlmacenId}/exportar`;
    };

    const handleImport = async () => {
        if (!importFile || !selectedAlmacenId) return;
        setIsImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('archivo', importFile);
        formData.append('_method', 'POST');

        try {
            const response = await fetch(`/disponibles/almacen/${selectedAlmacenId}/importar`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setImportResult({ actualizados: data.actualizados, omitidos: data.omitidos, errores: data.errores ?? [] });
                setImportFile(null);
                if (data.actualizados > 0) {
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                let errorMsg = data.error ?? data.message ?? 'Error desconocido';
                if (data.errors) {
                    const firstField = Object.values(data.errors as Record<string, string[]>)[0];
                    if (firstField?.length) errorMsg = firstField[0];
                }
                setImportResult({ actualizados: 0, omitidos: 0, errores: [errorMsg] });
            }
        } catch {
            setImportResult({ actualizados: 0, omitidos: 0, errores: ['Error de conexión al importar.'] });
        } finally {
            setIsImporting(false);
        }
    };

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
        if (currentPage >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
    };

    const handleAlmacenChange = (almacenId: string) => {
        if (selectedProduct) {
            setSelectedProduct({ ...selectedProduct, almacen_id: parseInt(almacenId) });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Precios por Almacén" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Precios de Venta por Almacén"
                        description="Asigne precios de venta específicos a los productos en cada uno de sus almacenes."
                    />
                    <Warehouse size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>
                <Separator />

                {/* Barra de búsqueda y exportación */}
                <div className="flex items-center justify-between gap-4">
                    <Input
                        type="text"
                        placeholder="Buscar producto o almacén..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="max-w-md"
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={handleExport} disabled={!selectedAlmacenId}>
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                        <Button
                            variant="secondary"
                            className="gap-2"
                            onClick={() => { setImportFile(null); setImportResult(null); setIsImportDialogOpen(true); }}
                            disabled={!selectedAlmacenId}
                        >
                            <FileText size={16} />
                            Importar Excel
                        </Button>
                    </div>
                </div>

                {/* Estadísticas */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Total de Productos Asignados:{' '}
                        <span className="font-medium">
                            <Badge variant="secondary">{filteredProducts.length}</Badge>
                        </span>
                    </p>
                    <p>
                        Rol actual:{' '}
                        <span className="text-primary font-sans font-medium">
                            {meta.role_usuario === 'admin' ? 'Administrador' : meta.role_usuario === 'moderador' ? 'Moderador' : 'Vendedor'}
                        </span>
                    </p>
                </div>

                {/* Selector de Almacén */}
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="max-w-sm flex-1">
                            <Label htmlFor="almacen-selector" className="mb-2 block text-sm font-medium">
                                Seleccionar Almacén
                            </Label>
                            <Select
                                value={selectedAlmacenId?.toString()}
                                onValueChange={(value) => { setSelectedAlmacenId(parseInt(value)); setCurrentPage(1); setSearchTerm(''); }}
                            >
                                <SelectTrigger id="almacen-selector" className="bg-background hover:bg-accent/50 h-11 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="text-muted-foreground h-4 w-4" />
                                        <SelectValue placeholder="Seleccione un almacén" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableAlmacenes.map((almacen) => (
                                        <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">{almacen.nombre}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {almacen.totalProductos} productos • {almacen.totalStock} unidades
                                                    {canViewSensitiveData && ` • ${formatCurrency(almacen.valorTotal)}`}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedAlmacen &&
                            (() => {
                                const almacenStats = availableAlmacenes.find((a) => a.id === selectedAlmacen.almacen_id);
                                return almacenStats ? (
                                    <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                            <p className="text-xs font-medium text-blue-600">Total Productos</p>
                                            <p className="text-lg font-bold text-blue-900">{almacenStats.totalProductos}</p>
                                        </div>
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                            <p className="text-xs font-medium text-green-600">Con Precio</p>
                                            <p className="text-lg font-bold text-green-900">{almacenStats.productosConPrecio}</p>
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-xs font-medium text-amber-600">Sin Precio</p>
                                            <p className="text-lg font-bold text-amber-900">{almacenStats.productosSinPrecio}</p>
                                        </div>
                                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                                            <p className="text-xs font-medium text-purple-600">Stock Total</p>
                                            <p className="text-lg font-bold text-purple-900">{almacenStats.totalStock}</p>
                                        </div>
                                    </div>
                                ) : null;
                            })()}
                    </div>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-x-auto rounded-xl border">
                    {selectedAlmacen && currentProducts.length > 0 ? (
                        <div>
                            <div className="border-b bg-gray-50 p-3 dark:bg-gray-800">
                                <h3 className="flex items-center gap-2 text-lg font-semibold">
                                    <Warehouse size={20} className="text-primary" />
                                    {selectedAlmacen.nombre_almacen}
                                    <Badge variant="secondary" className="ml-2">{filteredProducts.length} productos</Badge>
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                        <TableHead className="w-[220px]">Producto</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        {canViewSensitiveData && <TableHead>Precio Compra</TableHead>}
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Precio Venta</TableHead>
                                        <TableHead>Comisión</TableHead>
                                        {canViewSensitiveData && <TableHead>Ganancia</TableHead>}
                                        <TableHead className="text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentProducts.map((producto) => (
                                        <TableRow key={`${producto.id}-${producto.almacen_id}`}>
                                            <TableCell className="font-medium">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help decoration-gray-400 decoration-dashed underline-offset-4 hover:underline">
                                                                {producto.nombre_producto}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="border-primary/20 max-w-xs p-4 shadow-xl">
                                                            <div className="space-y-2">
                                                                {producto.imagen_producto && (
                                                                    <div className="mb-2 flex justify-center">
                                                                        <img
                                                                            src={`/storage/${producto.imagen_producto}`}
                                                                            alt={producto.nombre_producto}
                                                                            className="h-20 w-20 rounded-lg object-cover"
                                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                        />
                                                                    </div>
                                                                )}
                                                                <p className="text-base font-bold text-white">{producto.nombre_producto}</p>
                                                                <Separator className="bg-border/50" />
                                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                                                    <span className="text-muted-foreground">Marca:</span>
                                                                    <span className="font-medium">{producto.marca_producto}</span>
                                                                    {producto.modelo_producto && (
                                                                        <>
                                                                            <span className="text-muted-foreground">Modelo:</span>
                                                                            <span className="font-medium">{producto.modelo_producto}</span>
                                                                        </>
                                                                    )}
                                                                    {producto.capacidad_producto && (
                                                                        <>
                                                                            <span className="text-muted-foreground">Capacidad:</span>
                                                                            <span className="font-medium">{producto.capacidad_producto}</span>
                                                                        </>
                                                                    )}
                                                                    {producto.color_producto && (
                                                                        <>
                                                                            <span className="text-muted-foreground">Color:</span>
                                                                            <span className="font-medium">{producto.color_producto}</span>
                                                                        </>
                                                                    )}
                                                                    <span className="text-muted-foreground">Categoría:</span>
                                                                    <span className="font-medium">{producto.categoria}</span>
                                                                    {canViewSensitiveData && (
                                                                        <>
                                                                            <span className="text-muted-foreground">P. Compra:</span>
                                                                            <span className="text-sidebar font-medium">{formatCurrency(producto.precio_compra)}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>{producto.categoria || 'Sin categoría'}</TableCell>
                                            {canViewSensitiveData && <TableCell>{formatCurrency(producto.precio_compra)}</TableCell>}
                                            <TableCell>
                                                <Badge variant="outline">{producto.stock_almacen}</Badge>
                                            </TableCell>
                                            <TableCell className={cn(producto.precio_venta === null ? 'text-amber-400 italic' : 'text-amber-800')}>
                                                {formatCurrency(producto.precio_venta)}
                                            </TableCell>
                                            <TableCell className="font-medium text-indigo-600">
                                                {producto.comision && producto.comision > 0
                                                    ? formatCurrency(producto.comision)
                                                    : <span className="text-xs italic text-gray-400">Sin comisión</span>}
                                            </TableCell>
                                            {canViewSensitiveData && (
                                                <TableCell
                                                    className={cn(
                                                        'font-medium',
                                                        producto.ganancia === null
                                                            ? 'text-gray-400 italic'
                                                            : producto.ganancia >= 0
                                                              ? 'text-green-600'
                                                              : 'text-red-600',
                                                    )}
                                                >
                                                    {formatCurrency(producto.ganancia)}
                                                </TableCell>
                                            )}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className={cn(
                                                                        producto.precio_venta !== null
                                                                            ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-800'
                                                                            : 'text-green-600 hover:bg-emerald-100 hover:text-green-800',
                                                                    )}
                                                                    onClick={() => openEditModal(producto)}
                                                                >
                                                                    <BadgeDollarSign size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{producto.precio_venta ? 'Editar precio' : 'Asignar precio'}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {(meta.role_usuario === 'admin' || meta.role_usuario === 'moderador') && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                                                        onClick={() => verHistorial(producto)}
                                                                    >
                                                                        <History size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver historial de precios</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <Warehouse size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="mb-2 text-lg font-medium">{selectedAlmacen ? 'No hay productos disponibles' : 'Seleccione un almacén'}</h3>
                            <p className="text-sm">
                                {selectedAlmacen
                                    ? 'No se encontraron productos en este almacén que coincidan con la búsqueda.'
                                    : 'Por favor seleccione un almacén para ver sus productos.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <Pagination className="mt-2">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {getPageNumbers().map((page, index) =>
                                page === 'ellipsis' ? (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(page as number)}
                                            isActive={currentPage === page}
                                            className="cursor-pointer"
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ),
                            )}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}

                {/* Modal de Editar Precio */}
                {selectedProduct && (
                    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <AlertDialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md">
                            <div className="from-primary/10 to-primary/5 border-primary/10 border-b bg-linear-to-r p-6">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-primary flex items-center gap-2 text-xl">
                                        <BadgeDollarSign className="h-6 w-6" />
                                        {isEditMode ? 'Actualizar Precio' : 'Asignar Nuevo Precio'}
                                    </AlertDialogTitle>
                                    <div className="text-muted-foreground mt-1 text-sm">Gestiona el valor comercial para este producto.</div>
                                </AlertDialogHeader>
                            </div>

                            <div className="space-y-6 p-6">
                                <div className="bg-secondary/30 border-border/50 space-y-3 rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Producto</p>
                                            <p className="text-foreground mt-0.5 text-base font-semibold">{selectedProduct.nombre_producto}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-background">{selectedProduct.marca_producto}</Badge>
                                    </div>
                                    <div className="border-border/50 flex gap-4 border-t pt-2">
                                        {canViewSensitiveData && (
                                            <>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Costo Base</p>
                                                    <p className="font-medium text-amber-700">{formatCurrency(selectedProduct.precio_compra)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Ganancia Actual</p>
                                                    <p className={cn('font-medium', (selectedProduct.ganancia || 0) >= 0 ? 'text-success' : 'text-destructive')}>
                                                        {formatCurrency(selectedProduct.ganancia)}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="almacen-select" className="text-sm font-medium">Almacén Destino</Label>
                                        <Select
                                            onValueChange={handleAlmacenChange}
                                            defaultValue={selectedProduct.almacen_id.toString()}
                                            disabled={isEditMode || availableAlmacenes.length <= 1}
                                        >
                                            <SelectTrigger id="almacen-select" className="bg-background hover:bg-accent/50 h-10 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Warehouse className="text-muted-foreground h-4 w-4" />
                                                    <SelectValue placeholder="Seleccione un almacén" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAlmacenes.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {isEditMode && (
                                            <p className="text-muted-foreground ml-1 flex items-center gap-1 text-[10px]">
                                                <span className="block h-1 w-1 rounded-full bg-amber-500"></span>
                                                Almacén bloqueado en modo edición
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="new-price" className="text-sm font-medium">Precio de Venta (USD)</Label>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-semibold">$</span>
                                            <Input
                                                id="new-price"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="bg-background border-input hover:border-primary/50 focus-visible:ring-primary/20 h-11 pl-7 text-lg font-semibold shadow-sm transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            {canViewSensitiveData && (
                                                <p className="text-muted-foreground text-[10px]">
                                                    Mínimo sugerido: {formatCurrency(selectedProduct.precio_compra * 1.01)}
                                                </p>
                                            )}
                                            {canViewSensitiveData && newPrice && !isNaN(parseFloat(newPrice)) && (
                                                <p className={cn('text-xs font-medium', parseFloat(newPrice) - selectedProduct.precio_compra >= 0 ? 'text-success' : 'text-destructive')}>
                                                    Ganancia: {formatCurrency(parseFloat(newPrice) - selectedProduct.precio_compra)}
                                                </p>
                                            )}
                                        </div>
                                        {error && <p className="text-destructive animate-in slide-in-from-top-1 px-1 text-xs font-medium">{error}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="new-comision" className="text-sm font-medium">
                                            {meta.role_usuario === 'vendedor' ? 'Mi Comisión (USD)' : 'Comisión del Vendedor (USD)'}
                                        </Label>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-semibold">$</span>
                                            <Input
                                                id="new-comision"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={newComision}
                                                onChange={(e) => setNewComision(e.target.value)}
                                                className="bg-background border-input hover:border-primary/50 focus-visible:ring-primary/20 h-11 pl-7 text-lg font-semibold shadow-sm transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-muted-foreground ml-1 text-[10px]">
                                            {meta.role_usuario === 'vendedor'
                                                ? 'Lo que ganarás por cada unidad vendida a este precio'
                                                : 'Monto fijo que ganará el vendedor por cada unidad vendida'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 border-border/50 flex justify-end gap-3 border-t p-4">
                                <AlertDialogCancel onClick={() => setIsModalOpen(false)} disabled={isLoading} className="h-9">
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleSubmit}
                                    className="bg-primary hover:bg-primary/90 h-9 min-w-[120px] px-6"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Guardando
                                        </span>
                                    ) : (
                                        <span>Confirmar</span>
                                    )}
                                </AlertDialogAction>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {/* Modal de Historial de Precios */}
                <AlertDialog open={isHistorialDialogOpen} onOpenChange={setIsHistorialDialogOpen}>
                    <AlertDialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
                        <div className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950 dark:to-indigo-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-300">
                                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                        <History className="h-5 w-5" />
                                    </div>
                                    Historial de Precios
                                </AlertDialogTitle>
                                {historialData && (
                                    <div className="mt-3 space-y-1">
                                        <p className="text-foreground text-base font-semibold">{historialData.producto.nombre}</p>
                                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                                            <Badge variant="outline">{historialData.producto.marca}</Badge>
                                            {historialData.producto.modelo && <span>Modelo: {historialData.producto.modelo}</span>}
                                            {historialData.producto.capacidad && <span>• {historialData.producto.capacidad}</span>}
                                            {historialData.producto.color && <span>• {historialData.producto.color}</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 pt-2">
                                            <span className="flex items-center gap-2 text-sm">
                                                <Warehouse className="h-4 w-4 text-blue-600" />
                                                <span className="font-medium">{historialData.almacen.nombre}</span>
                                            </span>
                                            {canViewSensitiveData && (
                                                <>
                                                    <Separator orientation="vertical" className="h-4" />
                                                    <span className="text-sm">
                                                        <span className="text-muted-foreground">Precio Compra:</span>{' '}
                                                        <span className="font-semibold text-amber-700">{formatCurrency(historialData.producto.precio_compra)}</span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>
                        </div>

                        <div className="max-h-[550px] overflow-y-auto p-6">
                            {loadingHistorial ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <span className="absolute h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative flex h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">Cargando historial...</p>
                                    </div>
                                </div>
                            ) : historialData ? (
                                <div className="space-y-5">
                                    {/* Precio actual */}
                                    {historialData.precio_actual ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950/30">
                                            <p className="mb-2 text-xs font-semibold tracking-wider text-green-700 uppercase dark:text-green-400">
                                                Precio Vigente
                                            </p>
                                            <div className="flex flex-wrap items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-green-600">Precio Venta</p>
                                                    <p className="text-xl font-bold text-green-800 dark:text-green-200">
                                                        {formatCurrency(historialData.precio_actual.precio_venta)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-600">Comisión</p>
                                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                                                        {formatCurrency(historialData.precio_actual.comision)}
                                                    </p>
                                                </div>
                                                {canViewSensitiveData && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Ganancia</p>
                                                        <p className={cn(
                                                            'text-xl font-bold',
                                                            historialData.precio_actual.ganancia >= 0 ? 'text-green-700' : 'text-red-600'
                                                        )}>
                                                            {formatCurrency(historialData.precio_actual.ganancia)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="ml-auto text-right">
                                                    <p className="text-xs text-gray-500">Puesto por</p>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {historialData.precio_actual.puesto_por_nombre}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{historialData.precio_actual.ultima_actualizacion}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                            Este producto no tiene precio asignado en este almacén.
                                        </div>
                                    )}

                                    {/* Tabla de historial */}
                                    {historialData.historial.length > 0 ? (
                                        <div>
                                            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Historial de cambios ({historialData.total_cambios})
                                            </p>
                                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                                            <TableHead className="font-semibold">Fecha</TableHead>
                                                            <TableHead className="font-semibold">Usuario</TableHead>
                                                            <TableHead className="text-right font-semibold">Precio Anterior</TableHead>
                                                            <TableHead className="text-right font-semibold">Precio Nuevo</TableHead>
                                                            <TableHead className="text-right font-semibold">Comisión</TableHead>
                                                            <TableHead className="font-semibold">Acción</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {historialData.historial.map((item, index) => (
                                                            <TableRow
                                                                key={item.id}
                                                                className={cn(
                                                                    index === 0 ? 'bg-blue-50/50 dark:bg-blue-950/20' : index % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                                                                    'hover:bg-accent/50 transition-colors',
                                                                )}
                                                            >
                                                                <TableCell className="text-xs text-gray-500">{item.fecha}</TableCell>
                                                                <TableCell className="font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                                            {item.usuario.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        {item.usuario}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right text-gray-400">
                                                                    {item.precio_anterior !== null ? formatCurrency(item.precio_anterior) : <span className="italic text-xs">—</span>}
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                                                                    {formatCurrency(item.precio_nuevo)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">
                                                                    {item.comision !== null ? formatCurrency(item.comision) : <span className="text-xs italic text-gray-400">—</span>}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-gray-500">{item.accion}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-sm text-gray-500">
                                            No hay cambios registrados en el historial.
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-end border-t bg-gray-50 p-4 dark:bg-gray-900">
                            <AlertDialogCancel
                                onClick={() => { setIsHistorialDialogOpen(false); setHistorialData(null); }}
                                className="h-10"
                            >
                                Cerrar
                            </AlertDialogCancel>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal de Importar Excel */}
                <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <AlertDialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md">
                        <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 dark:from-emerald-950 dark:to-teal-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-300">
                                    <Upload className="h-6 w-6" />
                                    Importar Precios desde Excel
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground mt-1 text-sm">
                                    Sube el Excel exportado con los precios completados.
                                    {selectedAlmacen && (
                                        <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-400">
                                            Almacén: {selectedAlmacen.nombre_almacen}
                                        </span>
                                    )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>

                        <div className="space-y-4 p-6">
                            {importResult && (
                                <div className={cn(
                                    'rounded-lg border p-4 text-sm',
                                    importResult.errores.length === 0
                                        ? 'border-green-200 bg-green-50 dark:bg-green-950/30'
                                        : 'border-amber-200 bg-amber-50 dark:bg-amber-950/30'
                                )}>
                                    <div className="mb-2 flex items-center gap-2 font-semibold">
                                        {importResult.errores.length === 0
                                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            : <XCircle className="h-4 w-4 text-amber-600" />
                                        }
                                        <span>Resultado de la importación</span>
                                    </div>
                                    <p className="text-green-700 dark:text-green-400">✓ {importResult.actualizados} producto(s) actualizados</p>
                                    {importResult.omitidos > 0 && (
                                        <p className="text-gray-500">— {importResult.omitidos} fila(s) sin cambios (celdas vacías)</p>
                                    )}
                                    {importResult.errores.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-400">
                                            {importResult.errores.map((e, i) => (
                                                <li key={i} className="text-xs">• {e}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {importResult.actualizados > 0 && (
                                        <p className="mt-2 text-xs italic text-gray-500">Recargando página en unos segundos...</p>
                                    )}
                                </div>
                            )}

                            {!importResult && (
                                <div>
                                    <label
                                        htmlFor="import-file"
                                        className={cn(
                                            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
                                            importFile
                                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10'
                                        )}
                                    >
                                        <Upload className={cn('mb-3 h-10 w-10', importFile ? 'text-emerald-500' : 'text-gray-400')} />
                                        {importFile ? (
                                            <>
                                                <p className="font-semibold text-emerald-700 dark:text-emerald-300">{importFile.name}</p>
                                                <p className="mt-1 text-xs text-gray-500">{(importFile.size / 1024).toFixed(1)} KB — Click para cambiar</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium text-gray-600 dark:text-gray-300">Arrastra el archivo aquí</p>
                                                <p className="mt-1 text-xs text-gray-400">o haz click para seleccionar</p>
                                                <p className="mt-2 text-xs text-gray-400">Solo archivos .xlsx o .xls</p>
                                            </>
                                        )}
                                        <input
                                            id="import-file"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="bg-muted/50 border-border/50 flex justify-end gap-3 border-t p-4">
                            <AlertDialogCancel
                                onClick={() => { setIsImportDialogOpen(false); setImportResult(null); setImportFile(null); }}
                                disabled={isImporting}
                                className="h-9"
                            >
                                {importResult ? 'Cerrar' : 'Cancelar'}
                            </AlertDialogCancel>
                            {!importResult && (
                                <AlertDialogAction
                                    onClick={handleImport}
                                    disabled={!importFile || isImporting}
                                    className="h-9 min-w-[130px] bg-emerald-600 px-6 hover:bg-emerald-700"
                                >
                                    {isImporting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Importando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Importar
                                        </span>
                                    )}
                                </AlertDialogAction>
                            )}
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
