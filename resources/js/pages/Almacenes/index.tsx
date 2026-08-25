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
import { Input } from '@/components/ui/input';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, Eye, FileText, HousePlus, IdCard, Mail, MapPin, Phone, Search, Sheet, Trash2, User, Warehouse } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

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
                sileo.success({ title: 'Almacén eliminado', description: 'El almacén se eliminó correctamente' });
            },
            onError: () => {
                sileo.error({ title: 'Error al eliminar', description: 'Inténtalo nuevamente' });
            },
        });
    };

    // Filtros y búsqueda
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    // Filtrar almacenes
    const almacenesFiltrados = useMemo(() => {
        return almacenes.filter((almacen) => {
            const coincideTipo = !filtroTipo || almacen.tipo_almacen === filtroTipo;
            const texto = busqueda.trim().toLowerCase();
            const coincideBusqueda =
                !texto ||
                almacen.nombre_almacen?.toLowerCase().includes(texto) ||
                almacen.telefono_almacen?.toLowerCase().includes(texto) ||
                almacen.correo_almacen?.toLowerCase().includes(texto) ||
                almacen.ciudad_almacen?.toLowerCase().includes(texto) ||
                almacen.provincia_almacen?.toLowerCase().includes(texto) ||
                almacen.notas_almacen?.toLowerCase().includes(texto) ||
                almacen.nombre_responsable?.toLowerCase().includes(texto) ||
                almacen.apellido_responsable?.toLowerCase().includes(texto) ||
                almacen.carnet_responsable?.toLowerCase().includes(texto) ||
                almacen.telefono_responsable?.toLowerCase().includes(texto);

            return coincideTipo && coincideBusqueda;
        });
    }, [almacenes, filtroTipo, busqueda]);

    // Obtener los almacenes a mostrar en la página actual
    const almacenesAmostrar = almacenesFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);

    // Calcular el número total de páginas
    const totalPaginas = Math.ceil(almacenesFiltrados.length / elementosPorPagina);

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

    // Función para formatear el tooltip con los detalles del almacén
    const renderTooltipContent = (almacen: AlmacenProps) => {
        const badge = getBadge(almacen.tipo_almacen);

        return (
            <div className="space-y-2 p-1">
                {/* Información básica */}
                <div className="space-y-1">
                    <h4 className="border-b pb-1 text-sm font-semibold">Información del Local</h4>
                    <div className="flex items-center gap-2 text-xs">
                        <Warehouse size={12} className="text-blue-500" />
                        <span className="font-medium">Nombre:</span>
                        <span>{almacen.nombre_almacen}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <div className={`h-2 w-2 rounded-full ${badge.styles.split(' ')[0]}`} />
                        <span className="font-medium">Tipo:</span>
                        <span>{badge.text}</span>
                    </div>
                    {almacen.notas_almacen && (
                        <div className="mt-1 text-xs">
                            <span className="font-medium">Notas: </span>
                            <span className="text-muted-foreground">{almacen.notas_almacen}</span>
                        </div>
                    )}
                </div>

                {/* Información de contacto */}
                <div className="space-y-1">
                    <h4 className="border-b pb-1 text-sm font-semibold">Contacto</h4>
                    <div className="flex items-center gap-2 text-xs">
                        <Phone size={12} className="text-green-500" />
                        <span className="font-medium">Teléfono:</span>
                        <span>{almacen.telefono_almacen}</span>
                    </div>
                    {almacen.correo_almacen && (
                        <div className="flex items-center gap-2 text-xs">
                            <Mail size={12} className="text-orange-500" />
                            <span className="font-medium">Correo:</span>
                            <span>{almacen.correo_almacen}</span>
                        </div>
                    )}
                </div>

                {/* Ubicación */}
                {(almacen.provincia_almacen || almacen.ciudad_almacen) && (
                    <div className="space-y-1">
                        <h4 className="border-b pb-1 text-sm font-semibold">Ubicación</h4>
                        <div className="flex items-center gap-2 text-xs">
                            <MapPin size={12} className="text-red-500" />
                            <span className="font-medium">Ubicación:</span>
                            <span>
                                {almacen.ciudad_almacen && almacen.provincia_almacen
                                    ? `${almacen.ciudad_almacen}, ${almacen.provincia_almacen}`
                                    : almacen.ciudad_almacen || almacen.provincia_almacen}
                            </span>
                        </div>
                    </div>
                )}

                {/* Responsable */}
                {(almacen.nombre_responsable || almacen.apellido_responsable) && (
                    <div className="space-y-1">
                        <h4 className="border-b pb-1 text-sm font-semibold">Responsable</h4>
                        {(almacen.nombre_responsable || almacen.apellido_responsable) && (
                            <div className="flex items-center gap-2 text-xs">
                                <User size={12} className="text-purple-500" />
                                <span className="font-medium">Nombre:</span>
                                <span>
                                    {almacen.nombre_responsable} {almacen.apellido_responsable}
                                </span>
                            </div>
                        )}
                        {almacen.carnet_responsable && (
                            <div className="flex items-center gap-2 text-xs">
                                <IdCard size={12} className="text-indigo-500" />
                                <span className="font-medium">Carnet:</span>
                                <span>{almacen.carnet_responsable}</span>
                            </div>
                        )}
                        {almacen.telefono_responsable && (
                            <div className="flex items-center gap-2 text-xs">
                                <Phone size={12} className="text-green-500" />
                                <span className="font-medium">Teléfono:</span>
                                <span>{almacen.telefono_responsable}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Productos */}
                {almacen.productos_count !== undefined && (
                    <div className="space-y-1">
                        <h4 className="border-b pb-1 text-sm font-semibold">Inventario</h4>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium">Productos registrados:</span>
                            <span className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs">{almacen.productos_count}</span>
                        </div>
                    </div>
                )}
            </div>
        );
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

                {/* Filtros y Acciones */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Búsqueda y Filtros */}
                    <div className="flex flex-1 flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                            <Input
                                placeholder="Buscar por nombre, teléfono, correo o ubicación..."
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value);
                                    setPaginaActual(1);
                                }}
                                className="pl-10"
                            />
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <select
                                    value={filtroTipo}
                                    onChange={(e) => {
                                        setFiltroTipo(e.target.value);
                                        setPaginaActual(1);
                                    }}
                                    className="border-input bg-background ring-offset-background focus:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none sm:w-52"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="almacen">Almacén</option>
                                    <option value="punto_venta">Punto de Venta</option>
                                    <option value="transportacion">Transportación</option>
                                </select>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Filtrar por tipo de almacén</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex gap-2">
                        <Link href={route('almacenes.create')}>
                            <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                <HousePlus size={16} />
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
                </div>

                {/* Tabla de Almacenes */}
                <TooltipProvider>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                        <Table>
                            <TableCaption>
                                {almacenesFiltrados.length} almacén{almacenesFiltrados.length !== 1 ? 'es' : ''} encontrado
                                {almacenesFiltrados.length !== 1 ? 's' : ''}
                                {busqueda && ` para "${busqueda}"`}
                                {filtroTipo && ` (tipo: ${getBadge(filtroTipo).text.toLowerCase()})`}
                            </TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-[100px]">Nombre</TableHead>
                                    <TableHead>Teléfono</TableHead>
                                    <TableHead>Correo</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Tipo de Almacén</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {almacenesAmostrar.map((almacen) => {
                                    const badge = getBadge(almacen.tipo_almacen);
                                    return (
                                        <TableRow key={almacen.id}>
                                            <TableCell className="min-w-[180px]">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex cursor-help items-center gap-2">
                                                            <Warehouse size={14} className="text-primary shrink-0" />
                                                            <span className="truncate font-medium underline decoration-dotted underline-offset-4">
                                                                {almacen.nombre_almacen}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="top"
                                                        align="start"
                                                        className="bg-popover text-popover-foreground w-80 border p-3 shadow-lg"
                                                    >
                                                        {renderTooltipContent(almacen)}
                                                    </TooltipContent>
                                                </Tooltip>
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
                                                <div
                                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badge.styles}`}
                                                >
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
                                    <TableCell className="bg-gray-500 text-center">{almacenesFiltrados.length}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </TooltipProvider>

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
            <ScrollProgress />
        </AppLayout>
    );
}
