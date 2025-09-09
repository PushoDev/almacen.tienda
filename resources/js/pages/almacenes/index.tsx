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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, Eye, FileText, HousePlus, Mail, MapPin, Phone, Sheet, Trash2, Warehouse } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Almacenes',
        href: '/almacenes',
    },
];

export default function AlmacenesPage({ almacenes }: { almacenes: AlmacenProps[] }) {
    // Eliminar Almacén
    const deleteAlmacen = (id: number) => {
        router.delete(route('almacenes.destroy', { almacen: id }), {
            onSuccess: () => {
                toast.success('Almacén eliminado satisfactoriamente');
            },
            onError: () => {
                toast.error('Error en el proceso, inténtelo nuevamente');
            },
        });
    };

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10; // Cambiado a 5 elementos por página
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    // Obtener los almacenes a mostrar en la página actual
    const almacenesAmostrar = almacenes.slice(indicePrimerElemento, indiceUltimoElemento);

    // Calcular el número total de páginas
    const totalPaginas = Math.ceil(almacenes.length / elementosPorPagina);

    // Función para obtener el texto y estilos del badge según el tipo de almacén
    const getBadge = (tipo: string) => {
        switch (tipo) {
            case 'almacen':
                return {
                    text: 'Almacén',
                    styles: 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500',
                };
            case 'punto_venta':
                return {
                    text: 'Punto de Venta',
                    styles: 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500',
                };
            case 'transportacion':
                return {
                    text: 'Transportación',
                    styles: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/30 dark:text-yellow-500',
                };
            default:
                return {
                    text: 'Desconocido',
                    styles: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-500',
                };
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Almacenes" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    <Warehouse
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Crear nuevo */}
                    <Link href={route('almacenes.create')}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            <HousePlus size={16} />
                            Crear Nuevo
                        </Button>
                    </Link>

                    {/* Botón Editar */}
                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    {/* Botón Regresar */}
                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </Link>
                </div>

                {/* Tabla de Almacenes */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Lista de Almacenes</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[100px]">Nombre</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Tipo de Almacén</TableHead> {/* Nueva columna */}
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {almacenesAmostrar.map((almacen) => {
                                const badge = getBadge(almacen.tipo_almacen);
                                return (
                                    <TableRow key={almacen.id}>
                                        <TableCell className="min-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <Warehouse size={14} className="text-primary shrink-0" />
                                                <span className="truncate font-medium">{almacen.nombre_almacen}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="shrink-0 text-gray-500" />
                                                {almacen.telefono_almacen || <span className="text-gray-400 italic">Sin teléfono</span>}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex min-w-[200px] items-center gap-2">
                                                <Mail size={14} className="shrink-0 text-gray-500" />
                                                {almacen.correo_almacen ? (
                                                    <a
                                                        href={`mailto:${almacen.correo_almacen}`}
                                                        className="max-w-[160px] truncate text-blue-600 hover:underline"
                                                    >
                                                        {almacen.correo_almacen}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin correo</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="shrink-0 text-gray-500" />
                                                {almacen.provincia_almacen && almacen.ciudad_almacen ? (
                                                    <span className="truncate">{`${almacen.ciudad_almacen}, ${almacen.provincia_almacen}`}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin ubicación</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge.styles}`}>
                                                {badge.text}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {/* Boton Detalles */}
                                            <Link href={route('almacenes.show', { almacen: almacen.id })}>
                                                <Button variant="outline" className="hover:bg-chart-3 cursor-pointer hover:text-white">
                                                    <Eye />
                                                </Button>
                                            </Link>
                                            {/* Botón Editar */}
                                            <Link href={route('almacenes.edit', { almacen: almacen.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit3 />
                                                </Button>
                                            </Link>

                                            {/* Diálogo de Confirmación para Eliminar */}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="hover:bg-destructive dark:hover:bg-destructive cursor-pointer hover:text-white"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-center">Atención</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            ¿Estás seguro de eliminar el almacén? Esta acción es irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogAction
                                                            onClick={() => deleteAlmacen(almacen.id)}
                                                            className="bg-destructive cursor-pointer hover:bg-red-300"
                                                        >
                                                            Aceptar
                                                        </AlertDialogAction>
                                                        <AlertDialogCancel className="cursor-pointer text-white hover:bg-emerald-300 hover:text-emerald-950 dark:hover:bg-emerald-300 dark:hover:text-emerald-950">
                                                            Cancelar
                                                        </AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="bg-gray-700">
                                    Total de Almacenes
                                </TableCell>
                                <TableCell className="bg-gray-500 text-center">{almacenes.length}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {/* Controles de Paginación */}
                <div className="mt-4 flex justify-between">
                    <Button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>
                        Anterior
                    </Button>
                    <span>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <Button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Button>
                </div>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
