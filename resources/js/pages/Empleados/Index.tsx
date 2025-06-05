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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, User, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookUser, Edit2, FileText, Sheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Empleados',
        href: '#',
    },
];

export default function PageEmpleado({ empleados }: { empleados: User[]; almacenes: AlmacenProps[] }) {
    // Función para eliminar un empleado
    const deleteEmpleado = (id: number) => {
        router.delete(route('empleados.destroy', { id }), {
            onSuccess: () => {
                toast.success('Empleado eliminado correctamente');
            },
            onError: () => {
                toast.error('Error al eliminar el empleado');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Empleados" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall title="Gestión de Empleados" description="Lista de empleados registrados en el sistema" />
                    {/* Ícono semitransparente */}
                    <BookUser
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Crear Nuevo Empleado */}
                    <Link href={route('empleados.create')}>
                        <Button variant="default" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <Edit2 size={16} />
                            Crear Empleado
                        </Button>
                    </Link>

                    {/* Botón Exportar PDF */}
                    <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>

                    {/* Botón Exportar Excel */}
                    <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                        <Sheet size={16} />
                        Exportar Excel
                    </Button>
                </div>

                {/* Tabla de Empleados */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empleados.length > 0 ? (
                                empleados.map((empleado) => (
                                    <TableRow key={empleado.id}>
                                        <TableCell>{empleado.name}</TableCell>
                                        <TableCell>{empleado.email}</TableCell>
                                        <TableCell>{empleado.role}</TableCell>
                                        <TableCell>
                                            {empleado.almacenes?.length > 0 ? (
                                                empleado.almacenes.map((almacen) => (
                                                    <span key={almacen.id} className="mr-1">
                                                        {almacen.nombre_almacen}
                                                    </span>
                                                ))
                                            ) : (
                                                <span>Sin asignar</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {/* Botón Editar */}
                                            <Link href={route('empleados.edit', { id: empleado.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit2 />
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
                                                            ¿Estás seguro de eliminar este empleado? Esta acción es irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogAction
                                                            onClick={() => deleteEmpleado(empleado.id)}
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
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        No hay empleados registrados
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
