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
import { Edit3, Eye, FileText, HousePlus, Sheet, Trash2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

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
                toast.success('Almacén eliminado correctamente');
            },
            onError: () => {
                toast.error('Error en el proceso, inténtelo nuevamente');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Almacenes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
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
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {almacenes.map((almacen) => (
                                <TableRow key={almacen.id}>
                                    <TableCell>{almacen.nombre_almacen}</TableCell>
                                    <TableCell>{almacen.telefono_almacen}</TableCell>
                                    <TableCell>{almacen.correo_almacen || 'Sin correo'}</TableCell>
                                    <TableCell>
                                        {almacen.provincia_almacen && almacen.ciudad_almacen
                                            ? `${almacen.provincia_almacen}, ${almacen.ciudad_almacen}`
                                            : 'Sin ubicación'}
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
                            ))}
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
            </div>
        </AppLayout>
    );
}
