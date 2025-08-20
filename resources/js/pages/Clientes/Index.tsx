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
import {
    AlertCircle,
    ArrowDownCircle,
    CheckCircle,
    Edit3,
    FileText,
    HandHeart,
    Home,
    MapPin,
    Phone,
    Sheet,
    Trash2,
    User,
    UserRoundPlus,
} from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

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

    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // Filtros y Paginación
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 8; // Cambia esto al número que desees
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    // Filtrar clientes
    const clientesFiltrados = clientes.filter((cliente) => {
        return !filtroTipo || cliente.tipo_cliente === filtroTipo;
    });

    // Obtener los clientes a mostrar en la página actual
    const clientesAmostrar = clientesFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);

    // Calcular el número total de páginas
    const totalPaginas = Math.ceil(clientesFiltrados.length / elementosPorPagina);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header Section */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Logística General del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    <HandHeart
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                    <select
                        id="filtro-tipo"
                        value={filtroTipo}
                        onChange={(e) => {
                            setFiltroTipo(e.target.value);
                            setPaginaActual(1); // Resetear a la primera página al cambiar el filtro
                        }}
                        className="focus:ring-sidebar-accent rounded-md border border-gray-300 px-3 py-1 focus:ring-2 focus:outline-none"
                    >
                        <option className="bg-background text-sidebar-accent" value="">
                            Todos los Tipos
                        </option>
                        <option className="bg-background text-emerald-500" value="asociado">
                            Asociados
                        </option>
                        <option className="bg-background text-indigo-500" value="fisico">
                            Físicos
                        </option>
                    </select>

                    <Link href={route('clientes.create')}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            <UserRoundPlus size={16} />
                            Crear Nuevo
                        </Button>
                    </Link>

                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </Link>
                </div>

                {/* Clients Table */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Deuda</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Ciudad</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientesAmostrar.map((cliente) => (
                                <TableRow key={cliente.id}>
                                    {/* Nombre */}
                                    <TableCell className="min-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-primary shrink-0" />
                                            <span className="truncate font-medium">{cliente.nombre_cliente}</span>
                                        </div>
                                    </TableCell>

                                    {/* Tipo de Cliente */}
                                    <TableCell>
                                        <div
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                                cliente.tipo_cliente === 'asociado'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500'
                                            }`}
                                        >
                                            {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                        </div>
                                    </TableCell>

                                    {/* Deuda */}
                                    <TableCell
                                        aria-label={`Deuda del cliente: ${
                                            cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined
                                                ? cliente.deuda_pago_cliente < 0
                                                    ? `-${formatearMoneda(Math.abs(cliente.deuda_pago_cliente))} (crédito)`
                                                    : cliente.deuda_pago_cliente === 0
                                                      ? 'Sin deuda'
                                                      : `${formatearMoneda(cliente.deuda_pago_cliente)} (pendiente)`
                                                : 'Sin información'
                                        }`}
                                    >
                                        <div className={`flex items-center gap-1 font-medium`}>
                                            {/* Icono opcional para hacerlo más visual */}
                                            {cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined ? (
                                                cliente.deuda_pago_cliente < 0 ? (
                                                    <ArrowDownCircle size={14} className="shrink-0 text-red-600 dark:text-red-400" />
                                                ) : cliente.deuda_pago_cliente === 0 ? (
                                                    <CheckCircle size={14} className="shrink-0 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertCircle size={14} className="shrink-0 text-orange-600 dark:text-orange-400" />
                                                )
                                            ) : null}

                                            <span
                                                className={
                                                    cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined
                                                        ? cliente.deuda_pago_cliente < 0
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : cliente.deuda_pago_cliente === 0
                                                              ? 'text-green-600 dark:text-green-400'
                                                              : 'text-orange-600 dark:text-orange-400'
                                                        : 'text-gray-400 italic'
                                                }
                                            >
                                                {cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined
                                                    ? cliente.deuda_pago_cliente < 0
                                                        ? `- ${formatearMoneda(Math.abs(cliente.deuda_pago_cliente))}`
                                                        : cliente.deuda_pago_cliente === 0
                                                          ? 'Sin deuda'
                                                          : formatearMoneda(cliente.deuda_pago_cliente)
                                                    : 'Sin dato'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Teléfono */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="shrink-0 text-gray-500" />
                                            {cliente.telefono_cliente || <span className="text-gray-400 italic">Sin teléfono</span>}
                                        </div>
                                    </TableCell>

                                    {/* Dirección */}
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

                                    {/* Ciudad */}
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

                                    {/* Acciones */}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={route('clientes.edit', { cliente: cliente.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit3 />
                                                </Button>
                                            </Link>
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
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
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
