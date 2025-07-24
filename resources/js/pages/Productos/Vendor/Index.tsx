import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { BadgeDollarSign, FileText, Save, Sheet, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    categoria: string;
    precio_compra: number;
    stock_total: number;
    precio_venta: number | null;
    ganancia: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Todos los Productos', href: '/productos' },
    { title: 'Productos Disponibles', href: '#' },
];

export default function VendedorPage({
    productos: initialProductos,
    meta,
}: {
    productos: Producto[];
    meta: { total_productos: number; role_usuario: string };
}) {
    const [productos, setProductos] = useState<Producto[]>(initialProductos);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const itemsPerPage = 10;

    const formatCurrency = (value: number | null) => {
        if (value === null) return 'No definido';
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

    const openAddModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice('');
        setError(null);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !newPrice) return;
        const parsedPrice = parseFloat(newPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setError('El precio debe ser un número positivo mayor a 0.00');
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
                body: JSON.stringify({ precio_venta: parsedPrice }),
            });
            console.log(await response.json());
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar el precio');
            }
            setProductos((prev) =>
                prev.map((p) =>
                    p.id === selectedProduct!.id
                        ? {
                              ...p,
                              precio_venta: parsedPrice,
                              ganancia: parsedPrice - p.precio_compra,
                          }
                        : p,
                ),
            );
            setIsModalOpen(false);
        } catch (err) {
            console.error('Error en la solicitud:', err);
            setError(err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    // Filtrar productos por nombre
    const filteredProductos = productos.filter((producto) => producto.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()));

    // Paginación
    const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);
    const currentProducts = filteredProductos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos Disponibles" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Precios de Venta"
                        description="Asigne precios a los productos disponibles para su comercialización. Listado de Productos Disponibles"
                    />
                    <ShoppingBag size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>
                <Separator />
                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Campo de búsqueda */}
                    <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Button variant="outline" className="hover:bg-chart-5 gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>
                    <Button variant="secondary" className="hover:bg-chart-2 gap-2">
                        <Sheet size={16} />
                        Exportar Excel
                    </Button>
                </div>
                {/* Resumen */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Total de productos:{' '}
                        <span className="font-medium">
                            <Badge variant="secondary">{meta.total_productos}</Badge>
                        </span>
                    </p>
                    <p>
                        Rol actual:{' '}
                        <span className="text-primary font-sans font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Productos Disponibles para Venta</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[100px]">Producto</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Precio Compra</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead>Precio Venta</TableHead>
                                <TableHead>Ganancia</TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentProducts.length > 0 ? (
                                currentProducts.map((producto) => (
                                    <TableRow key={producto.id}>
                                        <TableCell className="flex items-center">
                                            <BadgeDollarSign size={20} className="mr-2" />
                                            {producto.nombre_producto}
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center">
                                                <ShoppingBag size={16} className="mr-1" />
                                                {producto.marca_producto}
                                            </span>
                                        </TableCell>
                                        <TableCell>{producto.categoria || 'Sin categoría'}</TableCell>
                                        <TableCell>{formatCurrency(producto.precio_compra)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{producto.stock_total}</Badge>
                                        </TableCell>
                                        <TableCell className={cn(producto.precio_venta === null ? 'text-amber-400 italic' : 'text-amber-800')}>
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
                                                onClick={() => (producto.precio_venta !== null ? openEditModal(producto) : openAddModal(producto))}
                                            >
                                                {producto.precio_venta !== null ? <BadgeDollarSign size={16} /> : <BadgeDollarSign size={16} />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center">
                                        No hay productos disponibles
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
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
                {/* AlertDialog de Precio */}
                {selectedProduct && (
                    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <AlertDialogTrigger asChild>
                            {/* Este botón es solo un placeholder, ya que el modal se activa programáticamente */}
                            <Button variant="outline" className="hidden">
                                Precio Producto
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{isEditMode ? 'Editar Precio de Venta' : 'Agregar Precio de Venta'}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    <div className="mb-4 space-y-2">
                                        <p className="text-sm">
                                            <span className="font-medium">Producto:</span> {selectedProduct.nombre_producto}
                                        </p>
                                        <p className="text-sm">
                                            <span className="font-medium">Precio de Compra:</span> {formatCurrency(selectedProduct.precio_compra)}
                                        </p>
                                        {isEditMode && selectedProduct.precio_venta !== null && (
                                            <p className="text-sm">
                                                <span className="font-medium">Ganancia Actual:</span>{' '}
                                                {selectedProduct.ganancia !== null ? formatCurrency(selectedProduct.ganancia) : 'No definida'}
                                            </p>
                                        )}
                                    </div>
                                    <div className="mb-4">
                                        <label className="mb-1 block text-sm font-medium text-gray-700">
                                            {isEditMode ? 'Nuevo Precio de Venta' : 'Precio de Venta'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            placeholder="Ej: 24.99"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Mínimo: $0.01</p>
                                        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                                    </div>
                                </AlertDialogDescription>
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
