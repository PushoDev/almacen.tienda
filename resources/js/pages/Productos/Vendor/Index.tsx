import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
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
import { BadgeDollarSign, Eye, FileText, Sheet, Warehouse } from 'lucide-react';
import { useState } from 'react';

// Interfaces
interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    categoria: string;
    precio_compra: number;
    stock_almacen: number;
    precio_venta: number | null;
    ganancia: number | null;
    tiene_precio: boolean;
    almacen_id: number;
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    // 🆕 Estados para el modal de precios de vendedores
    const [isPreciosDialogOpen, setIsPreciosDialogOpen] = useState(false);
    const [preciosVendedores, setPreciosVendedores] = useState<any>(null);
    const [loadingPrecios, setLoadingPrecios] = useState(false);

    // Obtener el almacén seleccionado
    const selectedAlmacen = almacenes.find((a) => a.almacen_id === selectedAlmacenId);

    // Obtener productos del almacén seleccionado para búsqueda/paginación
    const productsInAlmacen = selectedAlmacen?.productos || [];

    // Obtener la lista de almacenes con información completa para el selector
    const availableAlmacenes = initialAlmacenes.map((a) => {
        const totalProductos = a.productos.length;
        const totalStock = a.productos.reduce((sum, p) => sum + p.stock_almacen, 0);
        const valorTotal = a.productos.reduce((sum, p) => sum + (p.precio_venta || p.precio_compra) * p.stock_almacen, 0);
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
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || responseData.error || 'Error al actualizar el precio');
            }

            // Actualizar el estado local
            setAlmacenes((prevAlmacenes) =>
                prevAlmacenes.map((almacen) => {
                    if (almacen.almacen_id !== selectedProduct.almacen_id) {
                        return almacen;
                    }

                    return {
                        ...almacen,
                        productos: almacen.productos.map((p) =>
                            p.id === selectedProduct.id && p.almacen_id === selectedProduct.almacen_id
                                ? {
                                      ...p,
                                      precio_venta: parsedPrice,
                                      ganancia: parsedPrice - p.precio_compra,
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

    // 🆕 NUEVA FUNCIÓN: Obtener precios de todos los vendedores
    const verPreciosVendedores = async (producto: Producto) => {
        if (meta.role_usuario !== 'admin' && meta.role_usuario !== 'moderador') {
            return;
        }

        setLoadingPrecios(true);
        setIsPreciosDialogOpen(true);
        setPreciosVendedores(null);

        try {
            const response = await fetch(`/disponibles/${producto.id}/precios-vendedores/${producto.almacen_id}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setPreciosVendedores(data);
            } else {
                setError(data.error || 'Error al cargar los precios');
                setTimeout(() => setError(null), 3000);
            }
        } catch (err) {
            console.error('Error al obtener precios:', err);
            setError('Error al cargar los precios de vendedores');
            setTimeout(() => setError(null), 3000);
        } finally {
            setLoadingPrecios(false);
        }
    };

    // Filtrar y paginar productos del almacén seleccionado
    const filteredProducts = productsInAlmacen.filter(
        (producto) =>
            (producto.nombre_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.marca_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.modelo_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (producto.capacidad_producto || '').toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleAlmacenChange = (almacenId: string) => {
        if (selectedProduct) {
            setSelectedProduct({
                ...selectedProduct,
                almacen_id: parseInt(almacenId),
            });
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
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="max-w-md"
                    />
                    <div className="flex gap-2">
                        <Button variant="outline" className="hover:bg-chart-5 gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                        <Button variant="secondary" className="hover:bg-chart-2 gap-2">
                            <Sheet size={16} />
                            Exportar Excel
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
                                onValueChange={(value) => {
                                    setSelectedAlmacenId(parseInt(value));
                                    setCurrentPage(1);
                                    setSearchTerm('');
                                }}
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
                                    <Badge variant="secondary" className="ml-2">
                                        {filteredProducts.length} productos
                                    </Badge>
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                        <TableHead className="w-[200px]">Producto</TableHead>
                                        <TableHead>Marca</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Capacidad</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        {canViewSensitiveData && <TableHead>Precio Compra</TableHead>}
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Precio Venta</TableHead>
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

                                                                    <span className="text-muted-foreground">Categoría:</span>
                                                                    <span className="font-medium">{producto.categoria}</span>

                                                                    {canViewSensitiveData && (
                                                                        <>
                                                                            <span className="text-muted-foreground">P. Compra:</span>
                                                                            <span className="text-sidebar font-medium">
                                                                                {formatCurrency(producto.precio_compra)}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>{producto.marca_producto}</TableCell>
                                            <TableCell>{producto.modelo_producto || '-'}</TableCell>
                                            <TableCell>{producto.capacidad_producto || '-'}</TableCell>
                                            <TableCell>{producto.categoria || 'Sin categoría'}</TableCell>
                                            {canViewSensitiveData && <TableCell>{formatCurrency(producto.precio_compra)}</TableCell>}
                                            <TableCell>
                                                <Badge variant="outline">{producto.stock_almacen}</Badge>
                                            </TableCell>
                                            <TableCell className={cn(producto.precio_venta === null ? 'text-amber-400 italic' : 'text-amber-800')}>
                                                {formatCurrency(producto.precio_venta)}
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
                                            {/* 🆕 COLUMNA DE ACCIONES ACTUALIZADA */}
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Botón para editar precio */}
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

                                                    {/* 🆕 Botón para ver precios de otros vendedores (solo admin/moderador) */}
                                                    {(meta.role_usuario === 'admin' || meta.role_usuario === 'moderador') && (
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                                                        onClick={() => verPreciosVendedores(producto)}
                                                                    >
                                                                        <Eye size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver precios de vendedores</p>
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
                <div className="mt-4 flex justify-between">
                    <Button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                        Anterior
                    </Button>
                    <span>
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                        Siguiente
                    </Button>
                </div>

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
                                        <Badge variant="outline" className="bg-background">
                                            {selectedProduct.marca_producto}
                                        </Badge>
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
                                                    <p
                                                        className={cn(
                                                            'font-medium',
                                                            (selectedProduct.ganancia || 0) >= 0 ? 'text-success' : 'text-destructive',
                                                        )}
                                                    >
                                                        {formatCurrency(selectedProduct.ganancia)}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="almacen-select" className="text-sm font-medium">
                                            Almacén Destino
                                        </Label>
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
                                        <Label htmlFor="new-price" className="text-sm font-medium">
                                            Precio de Venta (USD)
                                        </Label>
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
                                                <p
                                                    className={cn(
                                                        'text-xs font-medium',
                                                        parseFloat(newPrice) - selectedProduct.precio_compra >= 0
                                                            ? 'text-success'
                                                            : 'text-destructive',
                                                    )}
                                                >
                                                    Ganancia: {formatCurrency(parseFloat(newPrice) - selectedProduct.precio_compra)}
                                                </p>
                                            )}
                                        </div>
                                        {error && <p className="text-destructive animate-in slide-in-from-top-1 px-1 text-xs font-medium">{error}</p>}
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

                {/* 🆕 NUEVO: Modal de Precios de Vendedores */}
                <AlertDialog open={isPreciosDialogOpen} onOpenChange={setIsPreciosDialogOpen}>
                    <AlertDialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
                        <div className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950 dark:to-indigo-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-300">
                                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                        <Eye className="h-5 w-5" />
                                    </div>
                                    Precios Asignados por Vendedores
                                </AlertDialogTitle>
                                {preciosVendedores && (
                                    <div className="mt-3 space-y-1">
                                        <p className="text-foreground text-base font-semibold">{preciosVendedores.producto.nombre}</p>
                                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1">
                                                <Badge variant="outline">{preciosVendedores.producto.marca}</Badge>
                                            </span>
                                            {preciosVendedores.producto.modelo && <span>Modelo: {preciosVendedores.producto.modelo}</span>}
                                            {preciosVendedores.producto.capacidad && <span>• {preciosVendedores.producto.capacidad}</span>}
                                        </div>
                                        <div className="flex items-center gap-4 pt-2">
                                            <span className="flex items-center gap-2 text-sm">
                                                <Warehouse className="h-4 w-4 text-blue-600" />
                                                <span className="font-medium">{preciosVendedores.almacen.nombre}</span>
                                            </span>
                                            <Separator orientation="vertical" className="h-4" />
                                            <span className="text-sm">
                                                <span className="text-muted-foreground">Precio Compra:</span>{' '}
                                                <span className="font-semibold text-amber-700">
                                                    {formatCurrency(preciosVendedores.producto.precio_compra)}
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>
                        </div>

                        <div className="max-h-[550px] overflow-y-auto p-6">
                            {loadingPrecios ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <span className="absolute h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative flex h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">Cargando precios de vendedores...</p>
                                    </div>
                                </div>
                            ) : preciosVendedores && preciosVendedores.precios.length > 0 ? (
                                <div className="space-y-5">
                                    {/* Estadísticas */}
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-950">
                                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Vendedores</p>
                                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                                {preciosVendedores.total_vendedores}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:bg-green-950">
                                            <p className="text-xs font-medium text-green-600 dark:text-green-400">Precio Máximo</p>
                                            <p className="text-lg font-bold text-green-900 dark:text-green-100">
                                                {formatCurrency(Math.max(...preciosVendedores.precios.map((p: any) => p.precio_venta)))}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:bg-purple-950">
                                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Precio Promedio</p>
                                            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                                                {formatCurrency(
                                                    preciosVendedores.precios.reduce((sum: number, p: any) => sum + p.precio_venta, 0) /
                                                        preciosVendedores.precios.length,
                                                )}
                                            </p>
                                        </div>
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-950">
                                            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Precio Mínimo</p>
                                            <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                                                {formatCurrency(Math.min(...preciosVendedores.precios.map((p: any) => p.precio_venta)))}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tabla de Precios */}
                                    <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                                    <TableHead className="font-semibold">Vendedor</TableHead>
                                                    <TableHead className="font-semibold">Email</TableHead>
                                                    <TableHead className="text-right font-semibold">Precio Venta</TableHead>
                                                    <TableHead className="text-right font-semibold">Ganancia</TableHead>
                                                    <TableHead className="text-right font-semibold">% Margen</TableHead>
                                                    <TableHead className="text-right font-semibold">Última Actualización</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {preciosVendedores.precios.map((precio: any, index: number) => {
                                                    const margen = ((precio.ganancia / preciosVendedores.producto.precio_compra) * 100).toFixed(1);
                                                    return (
                                                        <TableRow
                                                            key={precio.user_id}
                                                            className={cn(
                                                                index % 2 === 0 ? 'bg-background' : 'bg-muted/30',
                                                                'hover:bg-accent/50 transition-colors',
                                                            )}
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                                        {precio.vendedor.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    {precio.vendedor}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">{precio.email}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                                    {formatCurrency(precio.precio_venta)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span
                                                                    className={cn(
                                                                        'font-semibold',
                                                                        precio.ganancia >= 0
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : 'text-red-600 dark:text-red-400',
                                                                    )}
                                                                >
                                                                    {formatCurrency(precio.ganancia)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge
                                                                    variant={parseFloat(margen) >= 0 ? 'default' : 'destructive'}
                                                                    className="font-mono"
                                                                >
                                                                    {margen}%
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-right text-xs">
                                                                {precio.ultima_actualizacion}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                                        <BadgeDollarSign className="h-10 w-10 text-gray-400" />
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold">No hay precios registrados</h3>
                                    <p className="text-muted-foreground text-sm">
                                        Ningún vendedor ha asignado precio a este producto en este almacén.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end border-t bg-gray-50 p-4 dark:bg-gray-900">
                            <AlertDialogCancel
                                onClick={() => {
                                    setIsPreciosDialogOpen(false);
                                    setPreciosVendedores(null);
                                }}
                                className="h-10"
                            >
                                Cerrar
                            </AlertDialogCancel>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
