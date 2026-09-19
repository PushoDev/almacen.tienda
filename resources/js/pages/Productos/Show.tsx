import HeadingSmall from '@/components/heading-small';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { FichaHermanaProps, ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRightLeft,
    Calendar,
    CheckCircle2,
    ClipboardList,
    DollarSign,
    Edit2,
    Image as ImageIcon,
    Layers,
    Package,
    Package2,
    QrCode,
    Tag,
    Warehouse,
} from 'lucide-react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/listado-productos',
    },
    {
        title: 'Detalles del Producto',
        href: '#',
    },
];

export default function ShowPageProductos({
    producto,
    fichas_hermanas,
}: {
    producto: ProductoProps;
    fichas_hermanas: FichaHermanaProps[];
}) {
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    const transferForm = useForm({
        codigo_origen_id: '',
        nuevo_codigo: '',
        cantidad: 1,
    });

    const submitTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post(route('productos.transferir-codigo', { producto: producto.id }), {
            onSuccess: () => {
                sileo.success({ title: 'Código transferido', description: 'El código de barras se transfirió correctamente' });
                setIsTransferModalOpen(false);
                transferForm.reset();
            },
            onError: (errors) => {
                if (errors.cantidad) sileo.error({ title: 'Cantidad inválida', description: errors.cantidad });
                else sileo.error({ title: 'Error al transferir', description: 'No se pudo transferir el código de barras' });
            }
        });
    };

    // Función segura para formatear precios
    const formatPrecio = (precio: number | null | undefined): string => {
        if (precio === null || precio === undefined) return '0.00';
        return typeof precio === 'number' ? precio.toFixed(2) : '0.00';
    };

    // Valor total real: suma el costo propio de cada almacén (puede variar por traslados
    // prorrateados de forma independiente, ver Producto::costoEnAlmacen()) — no el costo global
    // de la ficha multiplicado por el total. Si el producto no tiene almacenes (aún sin
    // aprobar), cae al costo global como mejor aproximación disponible.
    const calcularValorTotal = (): string => {
        if (producto.almacenes && producto.almacenes.length > 0) {
            return producto.almacenes.reduce((total, a) => total + a.costo * a.cantidad, 0).toFixed(2);
        }
        const precio = producto.precio_compra_producto ?? 0;
        const cantidad = producto.cantidad_total ?? 0;
        return (precio * cantidad).toFixed(2);
    };

    // Función segura para calcular valor por almacén — usa el costo real de ESE almacén.
    const calcularValorAlmacen = (costoAlmacen: number, cantidadAlmacen: number): string => {
        return ((costoAlmacen ?? 0) * (cantidadAlmacen ?? 0)).toFixed(2);
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
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Package2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="flex items-center gap-2 text-white">
                                            {producto.nombre_producto}
                                            {producto.stock_bajo && (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <AlertTriangle size={14} />
                                                    Stock Bajo
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="text-blue-100">Información general del producto</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
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
                                        <div>
                                            <p className="text-muted-foreground text-sm">Color</p>
                                            <p className="font-medium">{producto.color_producto || 'No especificado'}</p>
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-muted-foreground text-sm mb-1">Categoría</p>
                                            <Badge variant="outline" className="gap-1">
                                                <Tag size={12} />
                                                {producto.categoria}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm">Código de Producto</p>
                                            <div className="flex items-center gap-2">
                                                <QrCode size={16} className="text-gray-500" />
                                                <p className="font-mono font-medium">{producto.codigo_producto}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground text-sm mb-1">Precio de Compra (base de la ficha)</p>
                                            <Badge
                                                variant="outline"
                                                className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                            >
                                                <DollarSign size={12} />
                                                {formatPrecio(producto.precio_compra_producto)}
                                            </Badge>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                El costo y precio de venta reales por almacén están abajo, en "Distribución en Almacenes".
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
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                                >
                                                    <CheckCircle2 size={12} />
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

                        {/* Otras fichas del mismo producto, a costo distinto — cada compra crea siempre
                            una ficha nueva desde 2026-09-18, así que "el mismo artículo" puede existir
                            repartido en varias fichas. Sin esto, el catálogo daba la impresión de un
                            solo costo por producto cuando en realidad varía por compra/lote. */}
                        {fichas_hermanas.length > 0 && (
                            <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <Layers className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">
                                                Este producto tiene {fichas_hermanas.length} costo{fichas_hermanas.length === 1 ? '' : 's'} más
                                            </CardTitle>
                                            <CardDescription className="text-amber-100">
                                                Mismo nombre, marca, modelo y capacidad, comprado en lotes distintos — cada compra registra su
                                                propio costo, nunca se mezcla con el de otra.
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-6">
                                    {fichas_hermanas.map((hermana) => (
                                        <Link
                                            key={hermana.id}
                                            href={route('productos.show', { producto: hermana.id })}
                                            className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-mono text-xs text-muted-foreground">{hermana.codigo_producto}</p>
                                                    <p className="font-semibold text-green-600">${formatPrecio(hermana.precio_compra_producto)}</p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="font-medium">{hermana.cantidad_total} unidades</p>
                                                    <p className="text-muted-foreground">
                                                        {hermana.almacenes.length > 0
                                                            ? hermana.almacenes.map((a) => a.nombre_almacen).join(', ')
                                                            : 'Sin stock'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {/* Listado de almacenes disponibles */}
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Warehouse className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Distribución en Almacenes</CardTitle>
                                        <CardDescription className="text-emerald-100">Stock del producto en cada almacén</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
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

                                                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Disponibilidad</p>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    almacen.stock_bajo
                                                                        ? 'gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                                        : 'gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                }
                                                            >
                                                                <Package size={12} />
                                                                {almacen.cantidad ?? 0} uds.
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Costo aquí</p>
                                                            <div className="flex items-center gap-1">
                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                                >
                                                                    <DollarSign size={12} />${formatPrecio(almacen.costo)}
                                                                </Badge>
                                                                {almacen.costo !== producto.precio_compra_producto && (
                                                                    <span
                                                                        className="text-xs font-normal text-amber-600 dark:text-amber-400"
                                                                        title="Distinto del costo base de la ficha — este almacén tuvo un traslado prorrateado de forma independiente"
                                                                    >
                                                                        (≠ base)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Precio de Venta</p>
                                                            {almacen.precio_venta !== null && almacen.precio_venta !== undefined ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                                >
                                                                    <Tag size={12} />${formatPrecio(almacen.precio_venta)}
                                                                </Badge>
                                                            ) : (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                                >
                                                                    <AlertTriangle size={11} />
                                                                    Sin precio
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-muted-foreground mb-1">Valor en almacén</p>
                                                            <p className="font-bold text-purple-600">
                                                                ${calcularValorAlmacen(almacen.costo, almacen.cantidad)}
                                                            </p>
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
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-white">Imagen del Producto</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex justify-center pt-6">
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

                        {/* Códigos de Barras */}
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <QrCode className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-white">Códigos de Barras ({producto.codigos?.length || 0})</CardTitle>
                                </div>
                                <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="h-8 gap-1 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                                            <ArrowRightLeft size={14} />
                                            Asignar / Transferir
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[425px]">
                                        <form onSubmit={submitTransfer}>
                                            <DialogHeader>
                                                <DialogTitle>Transferir a Nuevo Código</DialogTitle>
                                                <DialogDescription>
                                                    Escanea el código de barras de la caja y asigna la cantidad desde el inventario existente.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="codigo_origen">Código de Origen</Label>
                                                    <Select
                                                        value={transferForm.data.codigo_origen_id}
                                                        onValueChange={(val) => transferForm.setData('codigo_origen_id', val)}
                                                    >
                                                        <SelectTrigger id="codigo_origen">
                                                            <SelectValue placeholder="Selecciona el código origen" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {producto.codigos?.filter(c => c.cantidad > 0).map((codigo) => (
                                                                <SelectItem key={codigo.id} value={codigo.id.toString()}>
                                                                    {codigo.codigo_barras} ({codigo.cantidad} disponibles)
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {transferForm.errors.codigo_origen_id && (
                                                        <p className="text-xs text-red-500">{transferForm.errors.codigo_origen_id}</p>
                                                    )}
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="nuevo_codigo">Código Escaneado</Label>
                                                    <Input
                                                        id="nuevo_codigo"
                                                        value={transferForm.data.nuevo_codigo}
                                                        onChange={(e) => transferForm.setData('nuevo_codigo', e.target.value)}
                                                        placeholder="Escanea el código aquí"
                                                        autoFocus
                                                    />
                                                    {transferForm.errors.nuevo_codigo && (
                                                        <p className="text-xs text-red-500">{transferForm.errors.nuevo_codigo}</p>
                                                    )}
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="cantidad">Cantidad a Asignar</Label>
                                                    <Input
                                                        id="cantidad"
                                                        type="number"
                                                        min="1"
                                                        value={transferForm.data.cantidad}
                                                        onChange={(e) => transferForm.setData('cantidad', parseInt(e.target.value))}
                                                    />
                                                    {transferForm.errors.cantidad && (
                                                        <p className="text-xs text-red-500">{transferForm.errors.cantidad}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button type="submit" disabled={transferForm.processing}>
                                                    Transferir Cantidad
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-4 pt-6">
                                {producto.codigos && producto.codigos.length > 0 ? (
                                    <div className="max-h-[400px] space-y-4 overflow-y-auto pr-2">
                                        {producto.codigos.map((codigo) => (
                                            <div key={codigo.id} className="flex flex-col items-center rounded-lg border p-3">
                                                {codigo.imagen_barcode ? (
                                                    <img
                                                        src={codigo.imagen_barcode}
                                                        alt={`Código de barras ${codigo.codigo_barras}`}
                                                        className="h-20 w-full rounded-md border bg-white object-contain"
                                                    />
                                                ) : (
                                                    <div className="flex h-20 w-full items-center justify-center rounded-md border border-dashed bg-gray-50">
                                                        <QrCode size={24} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="mt-3 flex w-full items-center justify-between px-1">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-mono text-sm font-semibold">{codigo.codigo_barras}</span>
                                                        {codigo.es_default && (
                                                            <Badge className="w-fit gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                                                                <CheckCircle2 size={11} />
                                                                Por defecto
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                    >
                                                        <Package size={12} />
                                                        {codigo.cantidad} uds
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex h-32 w-full flex-col items-center justify-center rounded-lg border border-dashed">
                                        <QrCode size={32} className="mb-2 text-gray-400" />
                                        <p className="text-muted-foreground text-sm">Sin códigos de barras</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Resumen Rápido */}
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <ClipboardList className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-white">Resumen Rápido</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Código:</span>
                                    <span className="font-mono font-medium">{producto.codigo_producto}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Categoría:</span>
                                    <Badge variant="outline" className="gap-1">
                                        <Tag size={12} />
                                        {producto.categoria}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Stock Total:</span>
                                    <Badge
                                        variant="outline"
                                        className={
                                            producto.stock_bajo
                                                ? 'gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
                                                : 'gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300'
                                        }
                                    >
                                        <Package size={12} />
                                        {producto.cantidad_total ?? 0}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Valor Total:</span>
                                    <span className="font-bold text-purple-600">${calcularValorTotal()}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Estado:</span>
                                    {producto.stock_bajo ? (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <AlertTriangle size={12} />
                                            Stock Bajo
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        >
                                            <CheckCircle2 size={12} />
                                            Stock Normal
                                        </Badge>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
