import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
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
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react'; // Importamos usePage
import { BadgeDollarSign, FileText, Save, Sheet, Warehouse } from 'lucide-react';
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
                                                <TableCell className="font-medium">{producto.nombre_producto}</TableCell>
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
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{isEditMode ? 'Editar Precio de Venta' : 'Agregar Precio de Venta'}</AlertDialogTitle>

                                {/* ✅ CORRECCIÓN DE ANIDAMIENTO:
                                  Reemplazamos AlertDialogDescription (que es un <p>) por un simple <div>
                                  para evitar anidar <div> y <p> dentro de otro <p>.
                                */}
                                <div className="text-muted-foreground text-sm">
                                    <div className="mb-4 space-y-2">
                                        {/* Reemplazamos <p> por <div> */}
                                        <div>
                                            <span className="font-medium">Producto:</span> {selectedProduct.nombre_producto}
                                        </div>
                                        <div>
                                            <span className="font-medium">Precio de Compra:</span> {formatCurrency(selectedProduct.precio_compra)}
                                        </div>
                                        {/* Selector de Almacén */}
                                        <div className="space-y-1">
                                            <Label htmlFor="almacen-select">Almacén</Label>
                                            <Select
                                                onValueChange={handleAlmacenChange}
                                                defaultValue={selectedProduct.almacen_id.toString()}
                                                disabled={isEditMode || availableAlmacenes.length <= 1}
                                            >
                                                <SelectTrigger id="almacen-select">
                                                    <SelectValue placeholder="Seleccione un almacén" />
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
                                                <div className="text-xs text-gray-500">
                                                    El almacén no se puede cambiar al editar un precio existente.
                                                </div>
                                            )}
                                        </div>
                                        {/* Campo de Precio */}
                                        <div className="space-y-1 pt-2">
                                            <Label htmlFor="new-price">{isEditMode ? 'Nuevo Precio de Venta' : 'Precio de Venta'}</Label>
                                            <Input
                                                id="new-price"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                placeholder="Ej: 24.99"
                                            />
                                            <div className="mt-1 text-xs text-gray-500">Mínimo: $0.01</div>
                                            {error && <div className="mt-1 text-sm text-red-500">{error}</div>}
                                        </div>
                                    </div>
                                </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                                    {isLoading ? (
                                        <span className="flex items-center">
                                            <span className="mr-2 animate-spin">🔄</span>
                                            Procesando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center">
                                            <Save size={16} className="mr-2" />
                                            {isEditMode ? 'Actualizar' : 'Agregar'}
                                        </span>
                                    )}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </AppLayout>
    );
}
