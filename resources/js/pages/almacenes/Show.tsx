import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Edit2, Mail, MapPin, Phone, Warehouse } from 'lucide-react';

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

export default function ShowAlmacenesPage({ almacen }: { almacen: AlmacenProps }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalles Almacen" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento. Detalles del Alamcén"
                    />
                    {/* Ícono semitransparente */}
                    <Warehouse
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Editar */}
                    <Link href={route('almacenes.edit', { almacen: almacen.id })}>
                        <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                            <Edit2 size={16} />
                            Editar
                        </Button>
                    </Link>

                    {/* Botón Regresar */}
                    <Link href={route('almacenes.index')}>
                        <Button variant="secondary" className="flex cursor-pointer items-center gap-2">
                            Regresar
                        </Button>
                    </Link>
                </div>

                {/* Detalles del Almacén */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent">{almacen.nombre_almacen}</CardTitle>
                        <CardDescription>Detalles generales y ubicación del almacén</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {/* Columna 1 */}
                        <div className="space-y-2">
                            {/* Nombre del Almacén */}
                            <div className="flex items-center gap-2">
                                <MapPin size={20} className="text-gray-600 dark:text-gray-400" />
                                <span className="font-medium">Nombre:</span>
                                <span>{almacen.nombre_almacen}</span>
                            </div>

                            {/* Teléfono del Almacén */}
                            <div className="flex items-center gap-2">
                                <Phone size={20} className="text-gray-600 dark:text-gray-400" />
                                <span className="font-medium">Teléfono:</span>
                                <span>{almacen.telefono_almacen}</span>
                            </div>

                            {/* Correo del Almacén */}
                            {almacen.correo_almacen && (
                                <div className="flex items-center gap-2">
                                    <Mail size={20} className="text-gray-600 dark:text-gray-400" />
                                    <span className="font-medium">Correo:</span>
                                    <span>{almacen.correo_almacen}</span>
                                </div>
                            )}
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-2">
                            {/* Provincia del Almacén */}
                            {almacen.provincia_almacen && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={20} className="text-gray-600 dark:text-gray-400" />
                                    <span className="font-medium">Provincia:</span>
                                    <span>{almacen.provincia_almacen}</span>
                                </div>
                            )}

                            {/* Ciudad del Almacén */}
                            {almacen.ciudad_almacen && (
                                <div className="flex items-center gap-2">
                                    <MapPin size={20} className="text-gray-600 dark:text-gray-400" />
                                    <span className="font-medium">Ciudad:</span>
                                    <span>{almacen.ciudad_almacen}</span>
                                </div>
                            )}
                        </div>

                        {/* Columna 3 (Notas) */}
                        <div className="col-span-2 space-y-2 md:col-span-1">
                            {/* Notas del Almacén */}
                            {almacen.notas_almacen && (
                                <div className="flex flex-col gap-2">
                                    <span className="font-medium">Notas:</span>
                                    <p className="text-sm break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                                        {almacen.notas_almacen}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    {/* <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" /> */}
                </div>

                {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div> */}
            </div>
        </AppLayout>
    );
}
