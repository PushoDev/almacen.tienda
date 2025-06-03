import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Edit2, Package2 } from 'lucide-react';

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

export default function ShowPageProductos({ producto }: { producto: ProductoProps }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento. Listado de los Productos"
                    />
                    {/* Ícono semitransparente */}
                    <Package2
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

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
                        <CardTitle className="text-sidebar-accent">{producto.nombre_producto}</CardTitle>
                        <CardDescription>Detalles Generales del Producto Seleccionado</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {/* Columna 1: Imagen */}
                        <div className="bg-muted/30 flex items-center justify-center rounded-lg p-4">
                            {producto.imagen_url ? (
                                <img src={producto.imagen_url} alt={producto.nombre_producto} className="h-40 w-auto object-contain" />
                            ) : (
                                <span className="text-muted-foreground text-sm">Sin imagen</span>
                            )}
                        </div>

                        {/* Columnas 2 y 3: Detalles */}
                        <div className="space-y-4 md:col-span-2">
                            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                                <div>
                                    <p className="text-muted-foreground text-sm">Nombre</p>
                                    <p className="font-medium">{producto.nombre_producto}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Marca</p>
                                    <p className="font-medium">{producto.marca_producto}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Código</p>
                                    <p className="font-medium">{producto.codigo_producto}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Categoría</p>
                                    <p className="font-medium">{producto.categoria?.nombre_categoria}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Precio</p>
                                    <p className="font-medium">${producto.precio_compra_producto}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Stock</p>
                                    <p className="font-medium">{producto.cantidad_producto} unidades</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Fecha de Compra</p>
                                    <p className="font-medium">{new Date(producto.created_at).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-sm">Última Actualización</p>
                                    <p className="font-medium">{new Date(producto.updated_at).toLocaleDateString('es-ES')}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Listado de almacenes disponibles */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent">Almacenes Disponibles</CardTitle>
                        <CardDescription>Listado de Alamcény su disponibilidad Total</CardDescription>
                    </CardHeader>
                    <CardContent>{/* Pivot de los Productos en sus almacenes */}</CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
