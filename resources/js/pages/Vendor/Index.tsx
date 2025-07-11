import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';
import { useState } from 'react';

// Interfax Producto
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
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Nueva Compra',
        href: 'comprar',
    },
    {
        title: 'Realizar Venta',
        href: '#',
    },
];

export default function PuntoVentaPage({
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
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto Venta" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />
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
                <Separator className="col-span-4" />

                {/* POS - Punto de Venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Productos Disponibles */}
                    {/* Tabla de productos */}
                    <Card>
                        <Table>
                            <TableCaption>Productos Disponibles</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Stock Actual</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead className="text-center">Acciones </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productos.length > 0 ? (
                                    productos.map((producto) => (
                                        <TableRow key={producto.id}>
                                            <TableCell>{producto.nombre_producto} </TableCell>
                                            <TableCell>{producto.marca_producto}</TableCell>
                                            <Badge variant="outline">{producto.stock_total}</Badge>
                                            <TableCell>{producto.precio_venta}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost">
                                                    <ShoppingBag />
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
                    </Card>

                    {/* Columna 2: Productos Seleccionados y Resumen de Venta */}
                    <div className="flex flex-col space-y-4">
                        {/* carrito para Productos seleccionados */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Productos Seleccionados</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between rounded bg-gray-100 p-2 dark:bg-gray-700">
                                        {/* Productos seleccionados... */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resumen de venta */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-green-50 dark:bg-green-900/20">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Resumen de Venta</h3>
                                <div className="space-y-1">
                                    <p>Total de productos: 2</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">Total: $20.00</p>
                                </div>
                                <button className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">Proceder a Pagar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
