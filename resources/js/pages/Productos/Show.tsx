import HeadingSmall from '@/components/heading-small';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, BarChart3, CopyX, DollarSign, Edit2, Hash, Package, Package2, QrCode, Wallet, Warehouse } from 'lucide-react';

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
    // Calcular estadísticas
    const stockTotal = producto.cantidad_total;
    const almacenesConStockBajo = producto.almacenes?.filter((a) => a.pivot.cantidad < 3) || [];
    const valorTotalInventario = producto.precio_compra_producto * stockTotal;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Producto: ${producto.nombre_producto}`} />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Detalles del Producto" description={`Información completa sobre ${producto.nombre_producto}`} />
                    <Package2
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Panel de Información de Stock */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="flex items-center justify-between rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
                        <div>
                            <h3 className="font-semibold">Stock Total</h3>
                            <p className="text-2xl">{stockTotal} unidades</p>
                        </div>
                        <Package className="text-blue-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-amber-100 p-4 dark:bg-amber-900">
                        <div>
                            <h3 className="font-semibold">Almacenes con Stock Bajo</h3>
                            <p className="text-2xl">{almacenesConStockBajo.length}</p>
                        </div>
                        <AlertTriangle className="text-amber-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-green-100 p-4 dark:bg-green-900">
                        <div>
                            <h3 className="font-semibold">Precio Compra</h3>
                            <p className="text-2xl">${producto.precio_compra_producto.toFixed(2)}</p>
                        </div>
                        <DollarSign className="text-green-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-purple-100 p-4 dark:bg-purple-900">
                        <div>
                            <h3 className="font-semibold">Valor Total</h3>
                            <p className="text-2xl">${valorTotalInventario.toFixed(2)}</p>
                        </div>
                        <BarChart3 className="text-purple-500" size={32} />
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Editar */}
                    <Link href={route('productos.edit', { producto: producto.id })}>
                        <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                            <Edit2 size={16} />
                            Editar
                        </Button>
                    </Link>

                    {/* Botón Regresar */}
                    <Link href={route('productos.index')}>
                        <Button variant="secondary" className="flex cursor-pointer items-center gap-2">
                            Regresar
                        </Button>
                    </Link>
                </div>

                {/* Detalles del Producto */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sidebar-accent">{producto.nombre_producto}</CardTitle>
                                <CardDescription>Detalles Generales del Producto Seleccionado</CardDescription>
                            </div>
                            {producto.stock_bajo && (
                                <Badge variant="destructive" className="px-3 py-1 text-sm">
                                    <AlertTriangle size={14} className="mr-1" />
                                    Stock Bajo
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Columna 1: Imagen */}
                        <div className="bg-muted/30 flex flex-col items-center justify-center rounded-lg p-4">
                            {producto.imagen_url ? (
                                <img
                                    src={producto.imagen_url}
                                    alt={producto.nombre_producto}
                                    className="mb-4 h-40 w-auto rounded-lg object-contain"
                                />
                            ) : (
                                <div className="mb-4 flex h-40 w-full items-center justify-center rounded-lg bg-gray-100">
                                    <span className="text-muted-foreground text-sm">Sin imagen</span>
                                </div>
                            )}

                            {/* Información rápida de stock */}
                            <div className="w-full space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Stock Total:</span>
                                    <Badge variant={producto.stock_bajo ? 'destructive' : 'outline'} className="ml-2">
                                        {stockTotal} unidades
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Estado:</span>
                                    {producto.stock_bajo ? (
                                        <Badge variant="destructive">Stock Bajo</Badge>
                                    ) : (
                                        <Badge variant="outline">Stock Suficiente</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Columnas 2 y 3: Detalles */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div className="flex items-start gap-2">
                                    <Package className="text-primary mt-1" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Nombre</p>
                                        <p className="font-medium">{producto.nombre_producto}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <CopyX className="mt-1 text-indigo-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Marca</p>
                                        <p className="font-medium">{producto.marca_producto || 'No especificada'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <QrCode className="mt-1 text-gray-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Código</p>
                                        <p className="font-medium">{producto.codigo_producto || 'Sin código'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <CopyX className="mt-1 text-indigo-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Categoría</p>
                                        <p className="font-medium">{producto.categoria || 'Sin categoría'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Wallet className="mt-1 text-emerald-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Precio de Compra</p>
                                        <p className="font-medium">${producto.precio_compra_producto.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <DollarSign className="mt-1 text-green-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Precio de Venta</p>
                                        <p className="font-medium">{precio_venta !== null ? `$ ${precio_venta.toFixed(2)}` : 'No asignado'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <Hash className="mt-1 text-blue-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Stock Total</p>
                                        <p className="font-medium">{stockTotal} unidades</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2">
                                    <BarChart3 className="mt-1 text-purple-500" size={16} />
                                    <div>
                                        <p className="text-muted-foreground text-sm">Valor Total</p>
                                        <p className="font-medium">${valorTotalInventario.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Listado de almacenes disponibles */}
                <Card className="mt-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-sidebar-accent">Distribución en Almacenes</CardTitle>
                                <CardDescription>Stock disponible por ubicación</CardDescription>
                            </div>
                            {almacenesConStockBajo.length > 0 && (
                                <Badge variant="destructive" className="px-3 py-1 text-sm">
                                    <AlertTriangle size={14} className="mr-1" />
                                    {almacenesConStockBajo.length} almacén(es) con stock bajo
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {producto.almacenes && producto.almacenes.length > 0 ? (
                            <div className="space-y-4">
                                {producto.almacenes.map((almacen) => {
                                    const isStockBajo = almacen.pivot.cantidad < 3;

                                    return (
                                        <div
                                            key={almacen.id}
                                            className={`rounded-lg border p-4 ${isStockBajo ? 'animate-pulse bg-red-50 dark:bg-red-900/20' : ''}`}
                                        >
                                            <div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-2">
                                                            <Warehouse className="text-sidebar-accent text-2xl" />
                                                            <h4 className="text-sidebar-accent text-2xl leading-none font-medium">
                                                                {almacen.nombre_almacen}
                                                            </h4>
                                                        </div>
                                                        {isStockBajo && (
                                                            <Badge variant="destructive" className="animate-pulse">
                                                                <AlertTriangle size={12} className="mr-1" />
                                                                Stock Bajo
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-sm">
                                                        Localidad: {almacen.ciudad_almacen}, {almacen.provincia_almacen}.
                                                    </p>
                                                </div>
                                                <Separator className="my-4" />
                                                <div className="flex flex-wrap items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span>Disponibilidad:</span>
                                                        <Badge variant={isStockBajo ? 'destructive' : 'outline'} className="font-mono">
                                                            {almacen.pivot.cantidad} unidades
                                                        </Badge>
                                                    </div>
                                                    <Separator orientation="vertical" className="h-6" />
                                                    <div className="flex items-center gap-2">
                                                        <span>Precio Venta:</span>
                                                        <span className="font-bold">
                                                            {precio_venta !== null ? `$ ${precio_venta.toFixed(2)}` : 'No asignado'}
                                                        </span>
                                                    </div>
                                                    <Separator orientation="vertical" className="h-6" />
                                                    <div className="flex items-center gap-2">
                                                        <span>Valor Total:</span>
                                                        <span className="font-bold">
                                                            ${(almacen.pivot.cantidad * producto.precio_compra_producto).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Accordion type="single" collapsible className="mt-4 w-full" defaultValue="item-1">
                                                <AccordionItem value="item-1">
                                                    <AccordionTrigger className="text-chart-2">Información del Almacén</AccordionTrigger>
                                                    <AccordionContent className="flex flex-col gap-4 text-balance">
                                                        <p className="text-muted-foreground text-sm">
                                                            <span className="font-medium">Teléfono:</span>{' '}
                                                            {almacen.telefono_almacen || 'No disponible'}
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            <span className="font-medium">Correo:</span> {almacen.correo_almacen || 'No disponible'}
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            <span className="font-medium">Ubicación:</span> {almacen.ciudad_almacen},{' '}
                                                            {almacen.provincia_almacen}
                                                        </p>
                                                        <p className="text-muted-foreground text-sm">
                                                            <span className="font-medium">Cantidad Disponible:</span>{' '}
                                                            <span className={`font-bold ${isStockBajo ? 'text-red-600' : ''}`}>
                                                                {almacen.pivot.cantidad} unidades
                                                            </span>
                                                        </p>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">No hay almacenes asociados a este producto.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
