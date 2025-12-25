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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react'; // Importamos usePage
import { BadgeDollarSign, FileText, Sheet, Warehouse } from 'lucide-react';
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
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/productos' },
    { title: 'Precios por Almacén', href: '#' },
];

// Corregimos la tipificación de PageProps y eliminamos 'props' no utilizada
export default function VendedorPage({ almacenes: initialAlmacenes, meta }: PageProps) {
    // const { props } = usePage<PageProps>(); // ELIMINADO para resolver la advertencia de ESLint

    const [almacenes, setAlmacenes] = useState<AlmacenData[]>(initialAlmacenes);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    // Obtener la lista aplanada y enriquecida para búsqueda/paginación
    const allProducts = almacenes.flatMap((almacen) =>
        almacen.productos.map((p) => ({
            ...p,
            almacen_nombre: almacen.nombre_almacen,
        })),
    );

    // Obtener la lista única de almacenes disponibles para el select
    const availableAlmacenes = initialAlmacenes.map((a) => ({
        id: a.almacen_id,
        nombre: a.nombre_almacen,
    }));

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
            // ✅ CORRECCIÓN DE RUTA: Apuntando a 'disponibles/{id}'
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
                // Muestra un error más claro si el servidor devuelve un error de validación, etc.
                throw new Error(responseData.message || responseData.error || 'Error al actualizar el precio');
            }

            // Actualizar el estado local (reactividad optimista)
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

    // Filtrar y paginar
    const filteredProducts = allProducts.filter(
        (producto) =>
            producto.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            producto.almacen_nombre.toLowerCase().includes(searchTerm.toLowerCase()),
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

    // Agrupar los productos filtrados y paginados por almacén para el renderizado
    const groupedProducts = currentProducts.reduce(
        (acc, product) => {
            const key = product.almacen_id;
            if (!acc[key]) {
                acc[key] = {
                    almacen_id: key,
                    nombre_almacen: product.almacen_nombre,
                    productos: [],
                };
            }
            acc[key].productos.push(product as Producto); // Aseguramos el tipo
            return acc;
        },
        {} as Record<number, { almacen_id: number; nombre_almacen: string; productos: Producto[] }>,
    );

    const displayedAlmacenes = Object.values(groupedProducts);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Precios por Almacén" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header y Acciones (sin cambios) */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Precios de Venta por Almacén"
                        description="Asigne precios de venta específicos a los productos en cada uno de sus almacenes."
                    />
                    <Warehouse size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>
                <Separator />
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
                {/* Tabla de Productos agrupados por Almacén (sin cambios) */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-x-auto rounded-xl border">
                    {displayedAlmacenes.length > 0 ? (
                        displayedAlmacenes.map((almacenGroup) => (
                            <div key={almacenGroup.almacen_id} className="mb-6 last:mb-0">
                                <h3 className="flex items-center gap-2 border-b bg-gray-50 p-3 text-lg font-semibold dark:bg-gray-800">
                                    <Warehouse size={20} className="text-primary" />
                                    {almacenGroup.nombre_almacen}
                                </h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                            <TableHead className="w-[200px]">Producto</TableHead>
                                            <TableHead>Marca</TableHead>
                                            <TableHead>Modelo</TableHead>
                                            <TableHead>Capacidad</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Precio Compra</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Precio Venta</TableHead>
                                            <TableHead>Ganancia</TableHead>
                                            <TableHead className="text-center">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {almacenGroup.productos.map((producto) => (
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
                                                                    <p className="text-primary text-base font-bold">{producto.nombre_producto}</p>
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

                                                                        <span className="text-muted-foreground">P. Compra:</span>
                                                                        <span className="font-medium text-amber-600">
                                                                            {formatCurrency(producto.precio_compra)}
                                                                        </span>
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
                                                <TableCell>{formatCurrency(producto.precio_compra)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{producto.stock_almacen}</Badge>
                                                </TableCell>
                                                <TableCell
                                                    className={cn(producto.precio_venta === null ? 'text-amber-400 italic' : 'text-amber-800')}
                                                >
                                                    {formatCurrency(producto.precio_venta)}
                                                </TableCell>
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
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn(
                                                            producto.precio_venta !== null
                                                                ? 'text-amber-600 hover:animate-pulse hover:bg-amber-200 hover:text-amber-800'
                                                                : 'text-green-600 hover:animate-pulse hover:bg-emerald-200 hover:text-green-800',
                                                        )}
                                                        onClick={() => openEditModal(producto)}
                                                    >
                                                        <BadgeDollarSign size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))
                    ) : (
                        <div className="p-4 text-center text-gray-500">
                            No hay productos disponibles en tus almacenes que coincidan con la búsqueda.
                        </div>
                    )}
                </div>

                {/* Paginación (sin cambios) */}
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

                {/* AlertDialog de Precio (Modal) */}
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
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Selector de Almacén */}
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
                                            <p className="text-muted-foreground text-[10px]">
                                                Mínimo sugerido: {formatCurrency(selectedProduct.precio_compra * 1.01)}
                                            </p>
                                            {newPrice && !isNaN(parseFloat(newPrice)) && (
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
            </div>
        </AppLayout>
    );
}
