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
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, type BreadcrumbItem, type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownCircle,
    CheckCircle,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    HandHeart,
    Home,
    MapPin,
    Minus,
    Phone,
    Search,
    Sheet,
    Trash2,
    TrendingDown,
    TrendingUp,
    User,
    UserRoundPlus,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
    const { props } = usePage<PageProps>();
    const isAdmin = props.auth?.user?.role === 'admin';

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

    // Estados para filtros y búsqueda
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    // Calcular métricas para los widgets (ACTUALIZADO con nueva lógica)
    const metricas = useMemo(() => {
        const totalClientes = clientes.length;
        const clientesFisicos = clientes.filter((c) => c.tipo_cliente === 'fisico').length;
        const clientesAsociados = clientes.filter((c) => c.tipo_cliente === 'asociado').length;

        // NUEVA LÓGICA (igual que Proveedores):
        // > 0 = Fondo disponible (tienes fondo con cliente)
        // < 0 = Deuda pendiente (le debes al cliente)
        const fondoTotal = clientes.reduce(
            (sum, cliente) => sum + (cliente.deuda_pago_cliente && cliente.deuda_pago_cliente > 0 ? cliente.deuda_pago_cliente : 0),
            0,
        );

        const deudaTotal = clientes.reduce(
            (sum, cliente) => sum + (cliente.deuda_pago_cliente && cliente.deuda_pago_cliente < 0 ? Math.abs(cliente.deuda_pago_cliente) : 0),
            0,
        );

        return {
            totalClientes,
            clientesFisicos,
            clientesAsociados,
            fondoTotal, // Fondos disponibles con clientes
            deudaTotal, // Deudas que tenemos con clientes
        };
    }, [clientes]);

    // Filtrar clientes
    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const coincideTipo = !filtroTipo || cliente.tipo_cliente === filtroTipo;
            const coincideBusqueda =
                !busqueda ||
                cliente.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.telefono_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.ciudad_cliente?.toLowerCase().includes(busqueda.toLowerCase());

            return coincideTipo && coincideBusqueda;
        });
    }, [clientes, filtroTipo, busqueda]);

    // Paginación
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
    const clientesAmostrar = clientesFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);
    const totalPaginas = Math.ceil(clientesFiltrados.length / elementosPorPagina);

    // Función para determinar el estado financiero (ACTUALIZADA con nueva lógica)
    const getEstadoFinanciero = (saldo: number | null) => {
        if (saldo === null || saldo === undefined) {
            return { tipo: 'sin-info', color: 'gray', icon: Minus, texto: 'Sin información' };
        }

        // NUEVA LÓGICA (igual que Proveedores):
        if (saldo > 0) {
            return {
                tipo: 'fondo',
                color: 'green',
                icon: ArrowDownCircle,
                texto: 'Fondo disponible',
                descripcion: 'Tienes fondo disponible con el cliente',
            };
        } else if (saldo < 0) {
            return {
                tipo: 'deuda',
                color: 'red',
                icon: AlertCircle,
                texto: 'Deuda pendiente',
                descripcion: 'Tienes deuda pendiente con el cliente',
            };
        } else {
            return {
                tipo: 'neutral',
                color: 'gray',
                icon: CheckCircle,
                texto: 'Al día',
                descripcion: 'Sin fondos ni deudas pendientes',
            };
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header Section */}
                    <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title="Gestión de Clientes"
                            description="Administra y monitorea toda la información de tus clientes en un solo lugar"
                        />
                        <HandHeart
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                        />
                    </div>

                    {/* Widgets de Métricas (ACTUALIZADOS con nueva lógica) */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                                <Users className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metricas.totalClientes}</div>
                                <p className="text-muted-foreground text-xs">
                                    {metricas.clientesFisicos} físicos • {metricas.clientesAsociados} asociados
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Fondo Total</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatearMoneda(metricas.fondoTotal)}</div>
                                <p className="text-muted-foreground text-xs">Fondos disponibles con clientes</p>
                            </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatearMoneda(metricas.deudaTotal)}</div>
                                <p className="text-muted-foreground text-xs">Deudas pendientes con clientes</p>
                            </CardContent>
                        </Card>

                        <Card className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Balance Neto</CardTitle>
                                <DollarSign className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`text-2xl font-bold ${
                                        metricas.fondoTotal > metricas.deudaTotal
                                            ? 'text-green-600'
                                            : metricas.deudaTotal > metricas.fondoTotal
                                              ? 'text-red-600'
                                              : 'text-gray-600'
                                    }`}
                                >
                                    {formatearMoneda(metricas.fondoTotal - metricas.deudaTotal)}
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {metricas.fondoTotal > metricas.deudaTotal
                                        ? 'A favor empresa'
                                        : metricas.deudaTotal > metricas.fondoTotal
                                          ? 'A favor clientes'
                                          : 'Equilibrado'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    {/* Barra de Herramientas */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                {/* Búsqueda y Filtros */}
                                <div className="flex flex-1 flex-col gap-4 sm:flex-row">
                                    <div className="relative flex-1">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                        <Input
                                            placeholder="Buscar por nombre, teléfono o ciudad..."
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
                                                className="border-input bg-background ring-offset-background focus:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                                            >
                                                <option value="">Todos los tipos</option>
                                                <option value="asociado">Asociados</option>
                                                <option value="fisico">Físicos</option>
                                            </select>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Filtrar por tipo de cliente</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex gap-2">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link href={route('clientes.create')}>
                                                <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                                    <UserRoundPlus size={16} />
                                                    Nuevo Cliente
                                                </Button>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Crear nuevo cliente</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                                                <FileText size={16} />
                                                PDF
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Exportar a PDF</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                                                <Sheet size={16} />
                                                Excel
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Exportar a Excel</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabla de Clientes */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Lista de Clientes</CardTitle>
                            <CardDescription>
                                {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado
                                {clientesFiltrados.length !== 1 ? 's' : ''}
                                {busqueda && ` para "${busqueda}"`}
                                {filtroTipo && ` (tipo: ${filtroTipo === 'asociado' ? 'asociado' : 'físico'})`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Estado Financiero</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientesAmostrar.map((cliente) => {
                                            const estado = getEstadoFinanciero(cliente.deuda_pago_cliente);
                                            const IconComponent = estado.icon;

                                            return (
                                                <TableRow key={cliente.id} className="group hover:bg-muted/50">
                                                    {/* Información del Cliente */}
                                                    <TableCell className="min-w-[200px]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                                                                <User size={14} className="text-primary" />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium">{cliente.nombre_cliente}</div>
                                                                <div className="text-muted-foreground text-xs">ID: {cliente.id}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Tipo de Cliente */}
                                                    <TableCell>
                                                        <Badge
                                                            variant={cliente.tipo_cliente === 'asociado' ? 'default' : 'secondary'}
                                                            className={
                                                                cliente.tipo_cliente === 'asociado'
                                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-500'
                                                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-500'
                                                            }
                                                        >
                                                            {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Estado Financiero (ACTUALIZADO con nueva lógica) */}
                                                    <TableCell>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="flex items-center gap-2">
                                                                    {estado.tipo === 'sin-info' ? (
                                                                        <span className="text-muted-foreground">{estado.texto}</span>
                                                                    ) : (
                                                                        <div
                                                                            className={`flex items-center gap-1 ${
                                                                                estado.color === 'red'
                                                                                    ? 'text-red-600'
                                                                                    : estado.color === 'green'
                                                                                      ? 'text-green-600'
                                                                                      : 'text-gray-500'
                                                                            }`}
                                                                        >
                                                                            <IconComponent size={14} />
                                                                            <span className="font-medium">
                                                                                {cliente.deuda_pago_cliente !== null &&
                                                                                cliente.deuda_pago_cliente !== undefined
                                                                                    ? estado.tipo === 'deuda'
                                                                                        ? formatearMoneda(Math.abs(cliente.deuda_pago_cliente))
                                                                                        : formatearMoneda(cliente.deuda_pago_cliente)
                                                                                    : ''}
                                                                            </span>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`ml-2 ${
                                                                                    estado.color === 'red'
                                                                                        ? 'border-red-200 bg-red-50 text-red-700'
                                                                                        : estado.color === 'green'
                                                                                          ? 'border-green-200 bg-green-50 text-green-700'
                                                                                          : 'border-gray-200 bg-gray-50 text-gray-700'
                                                                                }`}
                                                                            >
                                                                                {estado.texto}
                                                                            </Badge>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{estado.descripcion}</p>
                                                                {cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined && (
                                                                    <p className="mt-1 text-xs">
                                                                        Valor:{' '}
                                                                        {formatearMoneda(
                                                                            estado.tipo === 'deuda'
                                                                                ? Math.abs(cliente.deuda_pago_cliente)
                                                                                : cliente.deuda_pago_cliente,
                                                                        )}
                                                                    </p>
                                                                )}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>

                                                    {/* Contacto */}
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Phone size={12} className="text-muted-foreground" />
                                                                <span className="text-sm">{cliente.telefono_cliente || 'No especificado'}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Ubicación */}
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin size={12} className="text-muted-foreground" />
                                                                <span className="text-sm">{cliente.ciudad_cliente || 'No especificada'}</span>
                                                            </div>
                                                            {cliente.direccion_cliente && (
                                                                <div className="flex items-center gap-2">
                                                                    <Home size={12} className="text-muted-foreground" />
                                                                    <span className="text-muted-foreground max-w-[120px] truncate text-xs">
                                                                        {cliente.direccion_cliente}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>

                                                    {/* Acciones */}
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link href={route('clientes.show', { cliente: cliente.id })}>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
                                                                            <Eye size={14} />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver detalles y operaciones</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link href={route('clientes.edit', { cliente: cliente.id })}>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
                                                                            <Edit3 size={14} />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Editar cliente</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:text-red-700"
                                                                                onClick={(e) => {
                                                                                    if (!isAdmin) {
                                                                                        e.preventDefault();
                                                                                        toast.error('ud no tiene acceso para esta acción');
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    ¿Estás seguro de eliminar al cliente "{cliente.nombre_cliente}"?
                                                                                    Esta acción no se puede deshacer y se perderán todos los datos
                                                                                    asociados.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                                <AlertDialogAction
                                                                                    onClick={() => deleteCliente(cliente.id)}
                                                                                    className="bg-red-600 hover:bg-red-700"
                                                                                >
                                                                                    Eliminar
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Eliminar cliente</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            {/* Paginación */}
                            {totalPaginas > 1 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <div className="text-muted-foreground text-sm">
                                        Mostrando {indicePrimerElemento + 1}-{Math.min(indiceUltimoElemento, clientesFiltrados.length)} de{' '}
                                        {clientesFiltrados.length} clientes
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                                            disabled={paginaActual === 1}
                                        >
                                            Anterior
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                                let pageNum;
                                                if (totalPaginas <= 5) {
                                                    pageNum = i + 1;
                                                } else if (paginaActual <= 3) {
                                                    pageNum = i + 1;
                                                } else if (paginaActual >= totalPaginas - 2) {
                                                    pageNum = totalPaginas - 4 + i;
                                                } else {
                                                    pageNum = paginaActual - 2 + i;
                                                }

                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={paginaActual === pageNum ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-8 w-8"
                                                        onClick={() => setPaginaActual(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                                            disabled={paginaActual === totalPaginas}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
