import HeadingSmall from '@/components/heading-small';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Calendar, Edit2, Package2, QrCode, RefreshCw, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Detalles del Producto',
        href: '#',
    },
];

export default function ShowPageProductos({ producto, precio_venta }: { producto: ProductoProps; precio_venta: number | null }) {
    // Regenerar código de barras
    const regenerarBarcode = async () => {
        try {
            const response = await fetch(route('productos.regenerar-barcode', { producto: producto.id }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Código de barras regenerado correctamente');
                // Recargar la página para ver los cambios
                window.location.reload();
            } else {
                toast.error(result.message || 'Error al regenerar el código de barras');
            }
        } catch {
            toast.error('Error al regenerar el código de barras');
        }
    };

    // Función segura para formatear precios
    const formatPrecio = (precio: number | null | undefined): string => {
        if (precio === null || precio === undefined) return '0.00';
        return typeof precio === 'number' ? precio.toFixed(2) : '0.00';
    };

    // Función segura para cálculos
    const calcularValorTotal = (): string => {
        const precio = producto.precio_compra_producto ?? 0;
        const cantidad = producto.cantidad_total ?? 0;
        return (precio * cantidad).toFixed(2);
    };

    // Función segura para calcular valor por almacén
    const calcularValorAlmacen = (cantidadAlmacen: number): string => {
        const precio = producto.precio_compra_producto ?? 0;
        const cantidad = cantidadAlmacen ?? 0;
        return (precio * cantidad).toFixed(2);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Producto - ${producto.nombre_producto}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Detalles del Producto" description="Información completa y gestión del producto seleccionado" />
                    <Package2
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Acciones */}
                <div className="flex justify-between gap-2">
                    <div className="flex gap-2">
                        {/* Botón Regenerar Código de Barras */}
                        <Button
                            variant="outline"
                            onClick={regenerarBarcode}
                            className="flex cursor-pointer items-center gap-2"
                            title="Regenerar código de barras"
                        >
                            <RefreshCw size={16} />
                            Regenerar Código
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        {/* Botón Editar */}
                        <Link href={route('productos.edit', { producto: producto.id })}>
                            <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                                <Edit2 size={16} />
                                Editar Producto
                            </Button>
                        </Link>

                        {/* Botón Regresar */}
                        <Link href={route('productos.index')}>
                            <Button variant="secondary" className="flex cursor-pointer items-center gap-2">
                                Volver a Lista
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Grid Principal */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Columna Izquierda - Información General */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Detalles del Producto */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sidebar-accent flex items-center gap-2">
                                            {producto.nombre_producto}
                                            {producto.stock_bajo && (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    Stock Bajo
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription>Información general del producto</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Columna 1 */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-muted-foreground text-sm">Nombre del Producto</p>
                                            <p className="text-lg font-medium">{producto.nombre_producto}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Marca</p>
                                            <p className="font-medium">{producto.marca_producto || 'No especificada'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Modelo</p>
                                            <p className="font-medium">{producto.modelo_producto || 'No especificado'}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Capacidad</p>
                                            <p className="font-medium">{producto.capacidad_producto || 'No especificada'}</p>
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-muted-foreground text-sm">Categoría</p>
                                            <p className="font-medium">{producto.categoria}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Código de Producto</p>
                                            <div className="flex items-center gap-2">
                                                <QrCode size={16} className="text-gray-500" />
                                                <p className="font-mono font-medium">{producto.codigo_producto}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Precio de Compra</p>
                                            <p className="font-medium text-green-600">${formatPrecio(producto.precio_compra_producto)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Precio de Venta (Vendedor)</p>
                                            <p className="font-medium text-blue-600">
                                                {precio_venta !== null ? `$${formatPrecio(precio_venta)}` : 'No asignado'}
                                            </p>
                                        </div>
                                    </div>
                                </div>



                                {/* Información de Stock */}
                                <Separator className="my-6" />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-sm">Stock Total</p>
                                        <p className={`text-2xl font-bold ${producto.stock_bajo ? 'text-red-600' : 'text-green-600'}`}>
                                            {producto.cantidad_total ?? 0}
                                        </p>
                                        <p className="text-muted-foreground text-sm">unidades</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-sm">Estado</p>
                                        <div className="mt-1">
                                            {producto.stock_bajo ? (
                                                <Badge variant="destructive" className="flex items-center justify-center gap-1">
                                                    <AlertTriangle size={12} />
                                                    Stock Bajo
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                                    Stock Normal
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-muted-foreground text-sm">Valor Total</p>
                                        <p className="text-2xl font-bold text-purple-600">${calcularValorTotal()}</p>
                                        <p className="text-muted-foreground text-sm">en inventario</p>
                                    </div>
                                </div>

                                {/* Información de Fechas */}
                                <Separator className="my-6" />
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-500" />
                                        <div>
                                            <p className="text-muted-foreground text-sm">Creado</p>
                                            <p className="font-medium">
                                                {producto.created_at ? new Date(producto.created_at).toLocaleDateString('es-ES') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} className="text-gray-500" />
                                        <div>
                                            <p className="text-muted-foreground text-sm">Actualizado</p>
                                            <p className="font-medium">
                                                {producto.updated_at ? new Date(producto.updated_at).toLocaleDateString('es-ES') : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Listado de almacenes disponibles */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sidebar-accent flex items-center gap-2">
                                    <Warehouse size={20} />
                                    Distribución en Almacenes
                                </CardTitle>
                                <CardDescription>Stock del producto en cada almacén</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {producto.almacenes && producto.almacenes.length > 0 ? (
                                    <div className="space-y-4">
                                        {producto.almacenes.map((almacen) => (
                                            <div
                                                key={almacen.id}
                                                className={`rounded-lg border p-4 ${almacen.stock_bajo ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}
                                            >
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Warehouse className="text-sidebar-accent" size={20} />
                                                            <h4 className="text-sidebar-accent font-medium">{almacen.nombre_almacen}</h4>
                                                        </div>
                                                        {almacen.stock_bajo && (
                                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                                <AlertTriangle size={12} />
                                                                Stock Bajo
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <p className="text-muted-foreground text-sm">
                                                        📍 {almacen.ciudad_almacen}, {almacen.provincia_almacen}
                                                    </p>

                                                    <Separator />

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-muted-foreground">Disponibilidad:</p>
                                                            <p className={`font-bold ${almacen.stock_bajo ? 'text-red-600' : 'text-green-600'}`}>
                                                                {almacen.cantidad ?? 0} unidades
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground">Valor en almacén:</p>
                                                            <p className="font-bold text-purple-600">${calcularValorAlmacen(almacen.cantidad)}</p>
                                                        </div>
                                                    </div>

                                                    <Accordion type="single" collapsible className="w-full">
                                                        <AccordionItem value="contact-info">
                                                            <AccordionTrigger className="text-sm text-blue-600">
                                                                Información de Contacto
                                                            </AccordionTrigger>
                                                            <AccordionContent className="flex flex-col gap-2 text-sm">
                                                                <p>
                                                                    <span className="font-medium">Teléfono:</span>{' '}
                                                                    {almacen.telefono_almacen || 'No disponible'}
                                                                </p>
                                                                <p>
                                                                    <span className="font-medium">Correo:</span>{' '}
                                                                    {almacen.correo_almacen || 'No disponible'}
                                                                </p>
                                                                <p>
                                                                    <span className="font-medium">Ubicación:</span> {almacen.ciudad_almacen},{' '}
                                                                    {almacen.provincia_almacen}
                                                                </p>
                                                            </AccordionContent>
                                                        </AccordionItem>
                                                    </Accordion>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <Warehouse size={48} className="mx-auto mb-4 text-gray-400" />
                                        <p className="text-muted-foreground">No hay almacenes asociados a este producto.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna Derecha - Información Visual */}
                    <div className="space-y-6">
                        {/* Imagen del Producto */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sidebar-accent">Imagen del Producto</CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                {producto.imagen_url ? (
                                    <img
                                        src={producto.imagen_url}
                                        alt={producto.nombre_producto}
                                        className="h-64 w-64 rounded-lg border object-cover"
                                    />
                                ) : (
                                    <div className="flex h-64 w-64 flex-col items-center justify-center rounded-lg border border-dashed">
                                        <Package2 size={48} className="mb-2 text-gray-400" />
                                        <p className="text-muted-foreground text-sm">Sin imagen</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Código de Barras */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sidebar-accent flex items-center gap-2">
                                    <QrCode size={20} />
                                    Código de Barras
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center">
                                {producto.barcode_image_url ? (
                                    <>
                                        <img
                                            src={producto.barcode_image_url}
                                            alt={`Código de barras ${producto.codigo_producto}`}
                                            className="h-32 w-full rounded-lg border object-contain"
                                        />
                                        <p className="text-muted-foreground mt-2 font-mono text-sm">{producto.codigo_producto}</p>
                                    </>
                                ) : (
                                    <div className="flex h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed">
                                        <QrCode size={32} className="mb-2 text-gray-400" />
                                        <p className="text-muted-foreground text-sm">Sin código de barras</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Resumen Rápido */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sidebar-accent">Resumen Rápido</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Código:</span>
                                    <span className="font-mono font-medium">{producto.codigo_producto}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Categoría:</span>
                                    <span className="font-medium">{producto.categoria}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Stock Total:</span>
                                    <span className={`font-bold ${producto.stock_bajo ? 'text-red-600' : 'text-green-600'}`}>
                                        {producto.cantidad_total ?? 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valor Total:</span>
                                    <span className="font-bold text-purple-600">${calcularValorTotal()}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Estado:</span>
                                    {producto.stock_bajo ? (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            Stock Bajo
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="bg-green-100 text-green-800">
                                            Stock Normal
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
