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
import { BookUser, Edit2, FileText, Key, Mail, Sheet, Trash2, UserCircle, Warehouse, DollarSign } from 'lucide-react';
import { toast, Toaster } from 'sonner';

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
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
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
                                <TableHead>Cuentas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empleados.length > 0 ? (
                                empleados.map((empleado) => (
                                    <TableRow key={empleado.id}>
                                        <TableCell className="min-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <UserCircle size={14} className="text-primary shrink-0" />
                                                <span className="truncate font-medium">{empleado.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="shrink-0 text-gray-500" />
                                                {empleado.email ? (
                                                    <a
                                                        href={`mailto:${empleado.email}`}
                                                        className="max-w-[160px] truncate text-blue-600 hover:underline"
                                                    >
                                                        {empleado.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin email</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Key size={14} className="shrink-0 text-gray-500" />
                                                {empleado.role ? (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{empleado.role}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin rol</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-start gap-2">
                                                <Warehouse size={14} className="mt-1 shrink-0 text-gray-500" />
                                                <div className="flex flex-wrap gap-1">
                                                    {empleado.almacenes?.length > 0 ? (
                                                        empleado.almacenes.map((almacen) => (
                                                            <span
                                                                key={almacen.id}
                                                                className="max-w-[120px] truncate rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
                                                            >
                                                                {almacen.nombre_almacen}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 italic">General</span>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-start gap-2">
                                                <DollarSign size={14} className="mt-1 shrink-0 text-gray-500" />
                                                <div className="flex flex-wrap gap-1">
                                                    {empleado.cuentas?.length > 0 ? (
                                                        empleado.cuentas.map((cuenta) => (
                                                            <span
                                                                key={cuenta.id}
                                                                className="max-w-[130px] truncate rounded-md bg-green-50 px-2 py-1 text-xs text-green-700"
                                                                title={`${cuenta.nombre_cuenta} (${cuenta.tipo_moneda})`}
                                                            >
                                                                {cuenta.nombre_cuenta}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 italic">Sin cuentas</span>
                                                    )}
                                                </div>
                                            </div>
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
                                    <TableCell colSpan={6} className="text-center">
                                        No hay empleados registrados
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
