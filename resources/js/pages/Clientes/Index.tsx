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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { ScrollProgress } from '@/components/ui/scroll';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, ResumenClienteData, type BreadcrumbItem, type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownCircle,
    CheckCircle,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    Filter,
    HandHeart,
    Home,
    Lock,
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
    X,
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

const ESTADOS = ['fondo', 'deuda', 'neutro'] as const;
// Mismo criterio rojo/ámbar/esmeralda que Proveedores/Show.tsx y Proveedores/index.tsx —
// "neutro" era gris acá, una paleta distinta para el mismo concepto de negocio según en
// qué pantalla estuviera el usuario.
const estadoStyles: Record<string, { label: string; bg: string; text: string; border: string; bar: string; icon: React.ElementType }> = {
    fondo: { label: 'Con Fondo', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', icon: TrendingUp },
    deuda: { label: 'En Deuda', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bar: 'bg-red-500', icon: TrendingDown },
    neutro: { label: 'Neutro', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500', icon: DollarSign },
};

export default function ClientesPage({ clientes, resumen }: { clientes: ClienteProps[]; resumen: ResumenClienteData }) {
    const { props } = usePage<PageProps>();
    const isAdmin = props.auth?.user?.role === 'admin';

    // ── Estado para dialogs controlados ─────────────────────────────────────
    const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
    const [cantDeleteBalanceOpen, setCantDeleteBalanceOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteProps | null>(null);

    const deleteCliente = (id: number) => {
        router.delete(route('clientes.destroy', { cliente: id }), {
            onSuccess: () => {
                toast.success('Cliente eliminado correctamente');
                setDeleteConfirmOpen(false);
                setClienteSeleccionado(null);
            },
            onError: () => {
                toast.error('Error al eliminar el cliente');
            },
        });
    };

    const handleDeleteClick = (cliente: ClienteProps) => {
        if (!isAdmin) {
            setAccessDeniedOpen(true);
            return;
        }
        setClienteSeleccionado(cliente);
        const saldo = Number(cliente.deuda_pago_cliente);
        if (cliente.deuda_pago_cliente !== null && cliente.deuda_pago_cliente !== undefined && saldo !== 0) {
            setCantDeleteBalanceOpen(true);
            return;
        }
        setDeleteConfirmOpen(true);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        if (!isAdmin) {
            e.preventDefault();
            setAccessDeniedOpen(true);
        }
    };

    const handleViewClick = (e: React.MouseEvent) => {
        if (!isAdmin) {
            e.preventDefault();
            setAccessDeniedOpen(true);
        }
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
    const [filtroEstado, setFiltroEstado] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const hasFilters = filtroTipo !== '' || busqueda !== '' || filtroEstado !== null;

    const limpiarFiltros = () => {
        setFiltroTipo('');
        setBusqueda('');
        setFiltroEstado(null);
        setPaginaActual(1);
    };

    const toggleEstado = (estado: string | null) => {
        setFiltroEstado((prev) => (prev === estado ? null : estado));
        setPaginaActual(1);
    };

    const clientesFiltrados = useMemo(() => {
        return clientes.filter((cliente) => {
            const coincideTipo = !filtroTipo || cliente.tipo_cliente === filtroTipo;
            const coincideBusqueda =
                !busqueda ||
                cliente.nombre_cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.telefono_cliente?.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.ciudad_cliente?.toLowerCase().includes(busqueda.toLowerCase());

            let coincideEstado = true;
            // Coerce a Number: Cliente::deuda_pago_cliente usa cast 'decimal:2', que Laravel
            // serializa como string en el JSON ("0.00", no 0) — comparar con === 0 nunca
            // coincide para un saldo real de $0.00, aunque el tipo TS declare `number`.
            const saldoCliente = Number(cliente.deuda_pago_cliente ?? 0);
            if (filtroEstado === 'fondo') coincideEstado = saldoCliente > 0;
            else if (filtroEstado === 'deuda') coincideEstado = saldoCliente < 0;
            else if (filtroEstado === 'neutro') coincideEstado = saldoCliente === 0;

            return coincideTipo && coincideBusqueda && coincideEstado;
        });
    }, [clientes, filtroTipo, busqueda, filtroEstado]);

    // Paginación con ventana
    const totalPaginas = Math.ceil(clientesFiltrados.length / elementosPorPagina);
    const paginas = useMemo(() => {
        const arr: (number | string)[] = [];
        const delta = 2;
        const izquierda = Math.max(1, paginaActual - delta);
        const derecha = Math.min(totalPaginas, paginaActual + delta);
        if (izquierda > 1) arr.push(1);
        if (izquierda > 2) arr.push('...');
        for (let i = izquierda; i <= derecha; i++) arr.push(i);
        if (derecha < totalPaginas - 1) arr.push('...');
        if (derecha < totalPaginas) arr.push(totalPaginas);
        return arr;
    }, [paginaActual, totalPaginas]);
    const clientesAmostrar = useMemo(
        () => clientesFiltrados.slice(0, paginaActual * elementosPorPagina),
        [clientesFiltrados, paginaActual]
    ).slice(-elementosPorPagina);

    const getEstadoFinanciero = (saldo: number | null) => {
        if (saldo === null || saldo === undefined) {
            return { tipo: 'sin-info', color: 'gray', icon: Minus, texto: 'Sin información' };
        }
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

    // Determinar el estado del cliente seleccionado para mostrar en dialogs
    const saldoSeleccionado = clienteSeleccionado ? Number(clienteSeleccionado.deuda_pago_cliente) : 0;
    const estadoSeleccionado = clienteSeleccionado ? getEstadoFinanciero(clienteSeleccionado.deuda_pago_cliente ?? null) : null;

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

                    {/* Row 1 — KPIs clickeables */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card
                            className="relative cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                            onClick={limpiarFiltros}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                                <Users className="text-muted-foreground h-4 w-4" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{resumen.total_clientes}</div>
                                <p className="text-muted-foreground text-xs">Clientes registrados</p>
                            </CardContent>
                        </Card>

                        <Card
                            className="relative cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                            onClick={() => toggleEstado('fondo')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Fondo Total</CardTitle>
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{formatearMoneda(resumen.total_fondo)}</div>
                                <p className="text-muted-foreground text-xs">Saldo a favor empresa</p>
                            </CardContent>
                        </Card>

                        <Card
                            className="relative cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
                            onClick={() => toggleEstado('deuda')}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Deuda Total</CardTitle>
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{formatearMoneda(resumen.total_deuda)}</div>
                                <p className="text-muted-foreground text-xs">Deuda pendiente</p>
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
                                        resumen.balance_neto >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}
                                >
                                    {formatearMoneda(resumen.balance_neto)}
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {resumen.balance_neto >= 0 ? 'A favor empresa' : 'A favor clientes'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Row 2 — Barras de estado */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {ESTADOS.map((estado) => {
                            const data = resumen.por_estado[estado];
                            const total = resumen.total_clientes;
                            const pct = total > 0 ? ((data.cantidad / total) * 100).toFixed(0) : '0';
                            const st = estadoStyles[estado];
                            const Icon = st.icon;
                            const activo = filtroEstado === estado;
                            return (
                                <Card
                                    key={estado}
                                    className={`relative cursor-pointer overflow-hidden transition-all hover:shadow-lg ${st.border} ${st.bg} ${activo ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                                    onClick={() => toggleEstado(estado)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">{st.label}</CardTitle>
                                        <Badge variant="outline" className={`${st.text} ${st.border} text-xs`}>
                                            {data.cantidad} {data.cantidad === 1 ? 'cliente' : 'clientes'}
                                        </Badge>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className={`text-2xl font-bold ${st.text}`}>
                                            {formatearMoneda(data.saldo)}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <Icon size={16} className={st.text} />
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${st.bar}`}
                                                    style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                                {pct}%
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Separator />

                    {/* Barra de Herramientas */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

                                    {hasFilters && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="h-9 gap-1 px-3 text-sm">
                                                <Filter size={14} />
                                                {filtroEstado
                                                    ? `${filtroEstado === 'fondo' ? 'Con Fondo' : filtroEstado === 'deuda' ? 'En Deuda' : 'Neutro'}`
                                                    : filtroTipo
                                                      ? `Tipo: ${filtroTipo}`
                                                      : 'Buscando...'}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={limpiarFiltros}
                                                className="h-9 cursor-pointer"
                                            >
                                                <X size={14} className="mr-1" />
                                                Limpiar filtro
                                            </Button>
                                        </div>
                                    )}

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
                                                <option value="asociado">Asociados</option>
                                                <option value="fisico">Físicos</option>
                                            </select>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Filtrar por tipo de cliente</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>

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
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Lista de Clientes</CardTitle>
                                    <CardDescription className="text-teal-100">
                                        {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''} encontrado
                                        {clientesFiltrados.length !== 1 ? 's' : ''}
                                        {hasFilters && (
                                            <>
                                                {filtroEstado &&
                                                    ` (${filtroEstado === 'fondo' ? 'Con Fondo' : filtroEstado === 'deuda' ? 'En Deuda' : 'Neutro'})`}
                                                {busqueda && ` para "${busqueda}"`}
                                                {filtroTipo && ` — tipo: ${filtroTipo}`}
                                            </>
                                        )}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-5">
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
                                            const estado = getEstadoFinanciero(cliente.deuda_pago_cliente ?? null);
                                            const IconComponent = estado.icon;
                                            const tieneBalance =
                                                cliente.deuda_pago_cliente !== null &&
                                                cliente.deuda_pago_cliente !== undefined &&
                                                Number(cliente.deuda_pago_cliente) !== 0;

                                            return (
                                                <TableRow key={cliente.id} className="hover:bg-muted/50">
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
                                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-800/30 dark:text-emerald-500'
                                                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-500'
                                                            }
                                                        >
                                                            {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                                        </Badge>
                                                    </TableCell>

                                                    {/* Estado Financiero */}
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
                                                                                      ? 'text-emerald-600'
                                                                                      : 'text-amber-600'
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
                                                                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                                          : 'border-amber-200 bg-amber-50 text-amber-700'
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

                                                    {/* Acciones — siempre visibles */}
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            {/* Ver detalles */}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link
                                                                        href={route('clientes.show', { cliente: cliente.id })}
                                                                        onClick={handleViewClick}
                                                                    >
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
                                                                            <Eye size={14} />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Ver detalles y operaciones</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            {/* Editar */}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link
                                                                        href={route('clientes.edit', { cliente: cliente.id })}
                                                                        onClick={handleEditClick}
                                                                    >
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 cursor-pointer p-0">
                                                                            <Edit3 size={14} />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Editar cliente</p>
                                                                </TooltipContent>
                                                            </Tooltip>

                                                            {/* Eliminar */}
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className={`h-8 w-8 cursor-pointer p-0 ${
                                                                            isAdmin && !tieneBalance
                                                                                ? 'text-red-600 hover:text-red-700'
                                                                                : 'text-muted-foreground'
                                                                        }`}
                                                                        onClick={() => handleDeleteClick(cliente)}
                                                                    >
                                                                        {isAdmin && tieneBalance ? (
                                                                            <Lock size={14} />
                                                                        ) : (
                                                                            <Trash2 size={14} />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {!isAdmin ? (
                                                                        <p>Sin acceso — solo administradores</p>
                                                                    ) : tieneBalance ? (
                                                                        <p>No eliminable — cliente tiene saldo pendiente</p>
                                                                    ) : (
                                                                        <p>Eliminar cliente</p>
                                                                    )}
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

                            {/* Paginación con ventana */}
                            {totalPaginas > 1 && (
                                <div className="flex items-center justify-between">
                                    <div className="text-muted-foreground text-sm">
                                        {clientesFiltrados.length > 0
                                            ? `${(paginaActual - 1) * elementosPorPagina + 1} - ${Math.min(paginaActual * elementosPorPagina, clientesFiltrados.length)} de ${clientesFiltrados.length}`
                                            : '0 resultados'}
                                    </div>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                                    className={paginaActual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                            {paginas.map((pagina, idx) =>
                                                typeof pagina === 'string' ? (
                                                    <PaginationItem key={`ellipsis-${idx}`}>
                                                        <PaginationEllipsis />
                                                    </PaginationItem>
                                                ) : (
                                                    <PaginationItem key={pagina}>
                                                        <PaginationLink
                                                            isActive={paginaActual === pagina}
                                                            onClick={() => setPaginaActual(pagina)}
                                                            className="cursor-pointer"
                                                        >
                                                            {pagina}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                )
                                            )}
                                            <PaginationItem>
                                                <PaginationNext
                                                    onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                                                    className={paginaActual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* ── Dialog: Sin acceso ─────────────────────────────────────── */}
                <AlertDialog open={accessDeniedOpen} onOpenChange={setAccessDeniedOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <Lock size={18} className="text-orange-500" />
                                Acceso restringido
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                No tienes permisos para realizar esta operación. Solo los administradores pueden editar o eliminar clientes.
                                Si necesitas realizar un cambio, comunícate con el administrador del sistema.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setAccessDeniedOpen(false)}>
                                Entendido
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* ── Dialog: No se puede eliminar — tiene saldo ────────────── */}
                <AlertDialog open={cantDeleteBalanceOpen} onOpenChange={setCantDeleteBalanceOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                                <AlertCircle size={18} className={estadoSeleccionado?.color === 'red' ? 'text-red-500' : 'text-green-500'} />
                                No se puede eliminar este cliente
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    <p>
                                        El cliente <strong>{clienteSeleccionado?.nombre_cliente}</strong> no puede ser eliminado porque tiene un saldo
                                        pendiente en el sistema.
                                    </p>
                                    {clienteSeleccionado && (
                                        <div
                                            className={`rounded-lg border p-3 ${
                                                estadoSeleccionado?.color === 'red'
                                                    ? 'border-red-200 bg-red-50'
                                                    : 'border-green-200 bg-green-50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium">Estado actual:</span>
                                                <span
                                                    className={`font-bold ${
                                                        estadoSeleccionado?.color === 'red' ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {estadoSeleccionado?.texto}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-sm">
                                                <span className="font-medium">Monto:</span>
                                                <span
                                                    className={`font-bold ${
                                                        estadoSeleccionado?.color === 'red' ? 'text-red-700' : 'text-green-700'
                                                    }`}
                                                >
                                                    {formatearMoneda(Math.abs(saldoSeleccionado))}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-xs">
                                        Para eliminar este cliente, primero debe liquidar el saldo pendiente llevándolo a $0.00.
                                    </p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setCantDeleteBalanceOpen(false)}>
                                Entendido
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* ── Dialog: Confirmar eliminación ─────────────────────────── */}
                <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de eliminar al cliente{' '}
                                <strong>"{clienteSeleccionado?.nombre_cliente}"</strong>? Esta acción no se puede deshacer y se perderán todos los
                                datos asociados.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setClienteSeleccionado(null)}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => clienteSeleccionado && deleteCliente(clienteSeleccionado.id)}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Eliminar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </TooltipProvider>
            <Toaster position="top-center" />
            <ScrollProgress />
        </AppLayout>
    );
}
