import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, ProductoPorAlmacenDetalleRef, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Calendar, Edit2, IdCard, Mail, MapPin, Package, Phone, Search, User, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Almacenes',
        href: '/almacenes',
    },
    {
        title: 'Detalles del Almacén',
        href: '#',
    },
];

interface ProductDetails extends ProductoPorAlmacenDetalleRef {
    marca?: string;
    modelo?: string;
    capacidad?: string;
    codigo?: string;
    categoria?: string;
    imagen_url?: string;
}

export default function ShowAlmacenesPage({ almacen, productos }: { almacen: AlmacenProps; productos: ProductDetails[] }) {
    // Estado para la búsqueda
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<ProductDetails | null>(null);
    const [showDialog, setShowDialog] = useState(false);

    // Filtrar productos basado en la búsqueda
    const filteredProductos = useMemo(() => {
        if (!searchTerm) return productos;
        return productos.filter((producto) => producto.nombre_producto.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [productos, searchTerm]);

    const handleProductClick = (producto: ProductDetails) => {
        setSelectedProduct(producto);
        setShowDialog(true);
    };

    // Función para obtener el badge según el tipo de almacén
    const getBadge = (tipo: string) => {
        switch (tipo) {
            case 'almacen':
                return {
                    text: 'Almacén',
                    variant: 'default' as const,
                };
            case 'punto_venta':
                return {
                    text: 'Punto de Venta',
                    variant: 'secondary' as const,
                };
            case 'transportacion':
                return {
                    text: 'Transportación',
                    variant: 'outline' as const,
                };
            default:
                return {
                    text: 'Desconocido',
                    variant: 'destructive' as const,
                };
        }
    };

    // Función para determinar el estado del stock
    const getStockStatus = (cantidad: number) => {
        if (cantidad >= 5) return { status: 'Disponible', variant: 'default' as const, color: 'text-green-600' };
        if (cantidad > 0) return { status: 'Bajo Stock', variant: 'secondary' as const, color: 'text-orange-600' };
        return { status: 'Agotado', variant: 'destructive' as const, color: 'text-red-600' };
    };

    const badgeInfo = getBadge(almacen.tipo_almacen);

    // Calcular total de stock correctamente
    const totalStock = useMemo(() => {
        return productos.reduce((total, producto) => total + (producto.cantidad_total || 0), 0);
    }, [productos]);

    // Formatear fecha
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

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
                        {/* Botón Editar */}
                        <Link href={route('almacenes.edit', { almacen: almacen.id })}>
                            <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                <Edit2 size={16} />
                                Editar Almacén
                            </Button>
                        </Link>

                        {/* Botón Regresar */}
                        <Link href={route('almacenes.index')}>
                            <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                                Volver a la Lista
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Grid de Información */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Información del Local - Ocupa 2 columnas */}
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
                                {/* Columna 1 */}
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
                                                <a
                                                    href={`mailto:${almacen.correo_almacen}`}
                                                    className="text-lg font-semibold text-blue-600 hover:underline"
                                                >
                                                    {almacen.correo_almacen}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Columna 2 */}
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

                            {/* Notas - Ocupa todo el ancho */}
                            {almacen.notas_almacen && (
                                <div className="bg-card mt-6 rounded-lg border p-4">
                                    <p className="mb-2 text-sm font-medium">Notas Adicionales</p>
                                    <p className="text-muted-foreground text-sm whitespace-pre-wrap">{almacen.notas_almacen}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Información del Responsable - Ocupa 1 columna */}
                    {(almacen.nombre_responsable || almacen.apellido_responsable || almacen.carnet_responsable || almacen.telefono_responsable) && (
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

                    {/* Resumen de Inventario Compacto - Ocupa 1 columna */}
                    <Card>
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

                                {/* Resumen de estados de stock */}
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Estado del Stock:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                            <span>Disponible (≥5):</span>
                                            <span className="font-semibold">{productos.filter((p) => (p.cantidad_total || 0) >= 5).length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                                            <span>Bajo Stock (1-4):</span>
                                            <span className="font-semibold">
                                                {productos.filter((p) => (p.cantidad_total || 0) >= 1 && (p.cantidad_total || 0) < 5).length}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                            <span>Agotado (0):</span>
                                            <span className="font-semibold">{productos.filter((p) => (p.cantidad_total || 0) === 0).length}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
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
                            <div className="relative w-full sm:w-64">
                                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                                <Input
                                    placeholder="Buscar productos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredProductos.length === 0 ? (
                            <div className="py-8 text-center">
                                <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                <p className="text-muted-foreground text-lg font-medium">
                                    {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
                                </p>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    {searchTerm
                                        ? 'Intenta con otros términos de búsqueda'
                                        : 'Este almacén no tiene productos asignados en el inventario.'}
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableCaption>
                                        Mostrando {filteredProductos.length} de {productos.length} productos
                                        {searchTerm && ` - Filtrado por: "${searchTerm}"`}
                                    </TableCaption>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">ID</TableHead>
                                            <TableHead>Nombre del Producto</TableHead>
                                            <TableHead>Marca</TableHead>
                                            <TableHead>Modelo</TableHead>
                                            <TableHead>Capacidad</TableHead>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead className="w-[120px] text-right">Cantidad</TableHead>
                                            <TableHead className="w-[120px]">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProductos.map((producto) => {
                                            const stockStatus = getStockStatus(producto.cantidad_total || 0);
                                            return (
                                                <TableRow key={producto.producto_id}>
                                                    <TableCell className="font-medium">{producto.producto_id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Package className="text-muted-foreground h-4 w-4" />
                                                            <Button
                                                                variant="link"
                                                                className="h-auto transform cursor-pointer p-0 text-base font-medium text-blue-600 underline-offset-4 hover:underline"
                                                                onClick={() => handleProductClick(producto)}
                                                            >
                                                                {producto.nombre_producto}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{producto.marca || '-'}</TableCell>
                                                    <TableCell>{producto.modelo || '-'}</TableCell>
                                                    <TableCell>{producto.capacidad || '-'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{producto.codigo || '-'}</TableCell>
                                                    <TableCell>{producto.categoria || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={`text-lg font-semibold ${stockStatus.color}`}>
                                                            {producto.cantidad_total}
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
                                    <img
                                        src={selectedProduct.imagen_url || '/placeholder.png'}
                                        alt={selectedProduct.nombre_producto}
                                        className="h-full w-full object-contain"
                                    />
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
                                            <p className="font-medium text-gray-500">Stock en Almacén</p>
                                            <p className="font-semibold text-blue-600">{selectedProduct.cantidad_total}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
