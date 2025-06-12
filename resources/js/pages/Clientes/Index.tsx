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
import { ClienteProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, FileText, HandHeart, Home, MapPin, Phone, Sheet, Trash2, User, UserRoundPlus } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Clientes',
        href: '/clientes',
    },
];

export default function ClientesPage({ clientes }: { clientes: ClienteProps[] }) {
    // Eliminar Cliente
    const deleteCliente = (id: number) => {
        router.delete(route('clientes.destroy', { cliente: id }), {
            onSuccess: () => {
                toast.success('Cliente eliminado correctamente');
            },
            onError: () => {
                toast.error('Error al eliminar el cliente');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Logistica General del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <HandHeart
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Crear nuevo */}
                    <Link href={route('clientes.create')}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            <UserRoundPlus size={16} />
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

                {/* Tabla de Clientes */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Ciudad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientes.map((cliente) => (
                                <TableRow key={cliente.id}>
                                    <TableCell className="min-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-primary shrink-0" />
                                            <span className="truncate font-medium">{cliente.nombre_cliente}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="shrink-0 text-gray-500" />
                                            {cliente.telefono_cliente || <span className="text-gray-400 italic">Sin teléfono</span>}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Home size={14} className="shrink-0 text-gray-500" />
                                            {cliente.direccion_cliente ? (
                                                <span className="max-w-[160px] truncate">{cliente.direccion_cliente}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin dirección</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="shrink-0 text-gray-500" />
                                            {cliente.ciudad_cliente ? (
                                                <span className="truncate">{cliente.ciudad_cliente}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin ciudad</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {/* Botón Editar */}
                                        <Link href={route('clientes.edit', { cliente: cliente.id })}>
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
                                                        ¿Estás seguro de eliminar este cliente? Esta acción es irreversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogAction
                                                        onClick={() => deleteCliente(cliente.id)}
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
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
