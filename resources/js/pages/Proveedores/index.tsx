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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ProveedorProps, ResumenProveedorData, type BreadcrumbItem, type PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    BadgePlus,
    Building,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    Handshake,
    Lock,
    Mail,
    MapPin,
    Phone,
    Search,
    Sheet,
    ShoppingBag,
    Trash2,
    TrendingDown,
    TrendingUp,
    Users,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
];

const ESTADOS = ['fondo', 'deuda', 'neutro'] as const;
// Mismo criterio rojo/ámbar/esmeralda que Proveedores/Show.tsx (Estado Financiero) —
// antes "neutro" era gris acá, una paleta distinta para el mismo concepto de negocio
// según en qué pantalla estuviera el usuario.
const estadoStyles: Record<string, { label: string; bg: string; text: string; border: string; bar: string; icon: React.ElementType }> = {
    fondo: { label: 'Con Fondo', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', icon: TrendingUp },
    deuda: { label: 'En Deuda', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bar: 'bg-red-500', icon: TrendingDown },
    neutro: { label: 'Neutro', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500', icon: DollarSign },
};

export default function ProveedoresPage({ proveedores, resumen }: { proveedores: ProveedorProps[]; resumen: ResumenProveedorData }) {
    const { props } = usePage<PageProps>();
    const isAdmin = props.auth?.user?.role === 'admin';

    // ── Estado para dialogs controlados (mismo patrón que Clientes/Cuentas) ──
    const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
    const [cantDeleteBalanceOpen, setCantDeleteBalanceOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState<ProveedorProps | null>(null);

    const deleteProveedor = (id: number) => {
        router.delete(route('proveedores.destroy', { proveedor: id }), {
            onSuccess: () => {
                sileo.success({ title: 'Proveedor eliminado', description: 'El proveedor se eliminó correctamente' });
                setDeleteConfirmOpen(false);
                setProveedorSeleccionado(null);
            },
            onError: (errors) => {
                sileo.error({ title: 'Error al eliminar', description: errors.proveedor ?? 'Inténtalo nuevamente' });
            },
        });
    };

    const handleEditClick = (e: React.MouseEvent) => {
        if (!isAdmin) {
            e.preventDefault();
            setAccessDeniedOpen(true);
        }
    };

    const handleDeleteClick = (proveedor: ProveedorProps) => {
        if (!isAdmin) {
            setAccessDeniedOpen(true);
            return;
        }
        setProveedorSeleccionado(proveedor);
        if (Number(proveedor.saldo_proveedor ?? 0) !== 0) {
            setCantDeleteBalanceOpen(true);
            return;
        }
        setDeleteConfirmOpen(true);
    };

    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined || isNaN(valor)) return '$: 0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // Mismo criterio rojo/ámbar/esmeralda que Proveedores/Show.tsx (Estado Financiero) —
    // el Badge genérico de shadcn (variant="default"/"secondary") no da estos colores,
    // "default" es el color primario del tema y "secondary" es gris, ninguno lee como
    // amarillo/verde reales. Única fuente de verdad para el badge "Estado" y la celda
    // "Saldo" de la tabla — antes tenían cada uno su propia lógica y quedaban
    // contradictorios entre sí (saldo=0 se pintaba verde en la celda, "Neutro" gris en el badge).
    //
    // Coerce a Number: Proveedor::saldo_proveedor usa cast 'decimal:2', que Laravel serializa
    // como string en el JSON ("0.00", no 0) — comparar con === 0 nunca coincide para un saldo
    // real de $0.00, aunque el tipo TS declare `number`. < y > "funcionan por suerte" porque
    // JS coerciona el string al comparar con operadores relacionales; === no coerciona nada.
    const getEstadoSaldo = (saldo: number | undefined | null) => {
        const saldoNum = Number(saldo ?? 0);
        if (saldoNum < 0)
            return {
                texto: 'Deuda',
                icon: TrendingDown,
                badgeClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300',
                textClass: 'text-red-600 dark:text-red-400',
            };
        if (saldoNum > 0)
            return {
                texto: 'Fondo',
                icon: TrendingUp,
                badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300',
                textClass: 'text-emerald-600 dark:text-emerald-400',
            };
        return {
            texto: 'Neutro',
            icon: DollarSign,
            badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300',
            textClass: 'text-amber-600 dark:text-amber-400',
        };
    };

    const [filtroEstado, setFiltroEstado] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;

    const hasFilters = !!filtroEstado || !!busqueda;

    const limpiarFiltros = () => {
        setFiltroEstado('');
        setBusqueda('');
        setPaginaActual(1);
    };

    const toggleEstado = (v: string) => {
        setFiltroEstado((p) => (p === v ? '' : v));
        setPaginaActual(1);
    };

    const proveedoresFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        return proveedores.filter((p) => {
            if (filtroEstado) {
                // Coerce a Number: Proveedor::saldo_proveedor usa cast 'decimal:2', que Laravel
                // serializa como string en el JSON ("0.00", no 0) — un saldo === 0 nunca
                // coincide con la comparación estricta, aunque el tipo TS diga `number`.
                const saldo = Number(p.saldo_proveedor ?? 0);
                if (filtroEstado === 'fondo' && !(saldo > 0)) return false;
                if (filtroEstado === 'deuda' && !(saldo < 0)) return false;
                if (filtroEstado === 'neutro' && saldo !== 0) return false;
            }

            if (termino) {
                const coincide = [p.nombre_proveedor, p.telefono_proveedor, p.correo_proveedor, p.localidad_proveedor]
                    .filter(Boolean)
                    .some((campo) => campo!.toLowerCase().includes(termino));
                if (!coincide) return false;
            }

            return true;
        });
    }, [proveedores, filtroEstado, busqueda]);

    const totalPaginas = Math.ceil(proveedoresFiltrados.length / elementosPorPagina);
    const desde = (paginaActual - 1) * elementosPorPagina;
    const proveedoresAmostrar = proveedoresFiltrados.slice(desde, desde + elementosPorPagina);

    const paginas = useMemo((): (number | 'ellipsis')[] => {
        if (totalPaginas <= 7) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
        const r: (number | 'ellipsis')[] = [1];
        if (paginaActual > 3) r.push('ellipsis');
        const start = Math.max(2, paginaActual - 1);
        const end = Math.min(totalPaginas - 1, paginaActual + 1);
        for (let i = start; i <= end; i++) r.push(i);
        if (paginaActual < totalPaginas - 2) r.push('ellipsis');
        r.push(totalPaginas);
        return r;
    }, [totalPaginas, paginaActual]);

    const totalProv = resumen?.total_proveedores ?? proveedores.length;
    const maxCantidad = Math.max(
        ...ESTADOS.map((e) => resumen?.por_estado?.[e]?.cantidad ?? 0),
        1
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header Section */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Proveedores" description="Administra los proveedores y sus saldos" />
                    <Handshake
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Row 1: KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div onClick={limpiarFiltros} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${hasFilters ? 'border-blue-500/40 bg-blue-100/60 dark:bg-blue-900/30' : 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Proveedores</p>
                            <Users className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">{totalProv}</p>
                        <p className="text-xs text-blue-500 dark:text-blue-400">Proveedores registrados</p>
                    </div>

                    <div onClick={() => toggleEstado('fondo')} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroEstado === 'fondo' ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40' : 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Fondo Total</p>
                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                            $: {(resumen?.total_fondo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-emerald-500 dark:text-emerald-400">Saldo a favor de proveedores</p>
                    </div>

                    <div onClick={() => toggleEstado('deuda')} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroEstado === 'deuda' ? 'border-red-500 bg-red-100 dark:bg-red-900/40' : 'border-red-500/20 bg-red-50/50 dark:bg-red-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Deuda Total</p>
                            <TrendingDown className="h-5 w-5 text-red-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">
                            $: {(resumen?.total_deuda ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400">Deuda pendiente con proveedores</p>
                    </div>

                    <div className="rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 shadow-sm dark:bg-slate-900/20">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Balance Neto</p>
                            <DollarSign className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className={`mt-1 text-2xl font-bold ${(resumen?.balance_neto ?? 0) > 0 ? 'text-emerald-600' : (resumen?.balance_neto ?? 0) < 0 ? 'text-red-600' : 'text-slate-900 dark:text-slate-200'}`}>
                            $: {(resumen?.balance_neto ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {(resumen?.balance_neto ?? 0) > 0
                                ? 'A favor empresa'
                                : (resumen?.balance_neto ?? 0) < 0
                                  ? 'A favor proveedores'
                                  : 'Equilibrado'}
                        </p>
                    </div>
                </div>

                {/* Row 2: 3 barras por estado de saldo */}
                <div className="grid gap-4 md:grid-cols-3">
                    {ESTADOS.map((estado) => {
                        const s = estadoStyles[estado];
                        const info = resumen?.por_estado?.[estado] ?? { cantidad: 0, saldo: 0 };
                        const pct = totalProv > 0 ? (info.cantidad / totalProv) * 100 : 0;
                        const active = filtroEstado === estado;
                        const Icon = s.icon;
                        return (
                            <div
                                key={estado}
                                onClick={() => toggleEstado(estado)}
                                className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${s.border} ${s.bg} ${active ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${s.text}`}>{s.label}</span>
                                    <Badge variant="outline" className={`${s.text} ${s.border} text-xs`}>
                                        {info.cantidad} {info.cantidad === 1 ? 'proveedor' : 'proveedores'}
                                    </Badge>
                                </div>
                                <p className={`text-2xl font-bold ${s.text}`}>
                                    {info.saldo > 0 ? '$: ' : ''}
                                    {info.saldo.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <div className="mt-3 flex items-center gap-3">
                                    <Icon size={16} className={s.text} />
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium tabular-nums text-muted-foreground">
                                        {pct.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Info bar */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                        {filtroEstado
                            ? `${proveedoresFiltrados.length} de ${totalProv} proveedores`
                            : `${totalProv} proveedores en total`
                        }
                        {filtroEstado && (
                            <Button variant="ghost" size="sm" onClick={() => setFiltroEstado('')} className="ml-2 h-6 text-xs">
                                Limpiar filtro
                            </Button>
                        )}
                    </span>
                    <span className="font-medium text-foreground">
                        Balance: $: {(resumen?.balance_neto ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative sm:max-w-sm sm:flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
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
                    <div className="flex justify-end gap-2">
                        <Link href={route('proveedores.create')}>
                            <Button variant="default" className="flex cursor-pointer items-center gap-2">
                                <BadgePlus size={16} />
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

                {/* Proveedores Table */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Localidad</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proveedoresAmostrar.map((proveedor) => {
                                const estado = getEstadoSaldo(proveedor.saldo_proveedor);

                                return (
                                    <TableRow key={proveedor.id}>
                                        <TableCell className="min-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <Building size={14} className="text-primary shrink-0" />
                                                <div className="flex flex-col gap-1">
                                                    <Link
                                                        href={route('proveedores.show', { proveedor: proveedor.id })}
                                                        className="truncate font-medium hover:text-blue-600 hover:underline"
                                                    >
                                                        {proveedor.nombre_proveedor}
                                                    </Link>
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit gap-1 border-sky-200 bg-sky-50 text-xs text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-300"
                                                    >
                                                        <ShoppingBag size={11} />
                                                        {proveedor.compras_count ?? 0} {proveedor.compras_count === 1 ? 'compra' : 'compras'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="shrink-0 text-gray-500" />
                                                {proveedor.telefono_proveedor || <span className="text-gray-400 italic">Sin teléfono</span>}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="shrink-0 text-gray-500" />
                                                {proveedor.correo_proveedor ? (
                                                    <a
                                                        href={`mailto:${proveedor.correo_proveedor}`}
                                                        className="max-w-[160px] truncate text-blue-600 hover:underline"
                                                    >
                                                        {proveedor.correo_proveedor}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin correo</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="shrink-0 text-gray-500" />
                                                {proveedor.localidad_proveedor ? (
                                                    <span className="truncate">{proveedor.localidad_proveedor}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin ubicación</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1 font-medium">
                                                {proveedor.saldo_proveedor !== null && proveedor.saldo_proveedor !== undefined ? (
                                                    <>
                                                        <estado.icon size={14} className={`shrink-0 ${estado.textClass}`} />
                                                        <span className={estado.textClass}>
                                                            {/* Coerce a Number antes de comparar — saldo_proveedor llega como string
                                                                ("0.00") por el cast decimal:2 de Laravel, === 0 nunca coincide. */}
                                                            {Number(proveedor.saldo_proveedor) < 0
                                                                ? `- ${formatearMoneda(Math.abs(proveedor.saldo_proveedor))}`
                                                                : Number(proveedor.saldo_proveedor) === 0
                                                                  ? 'Sin saldo'
                                                                  : formatearMoneda(proveedor.saldo_proveedor)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin dato</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className={estado.badgeClass}>
                                                {estado.texto}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={route('proveedores.show', { proveedor: proveedor.id })}>
                                                    <Button
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                        title="Ver detalles"
                                                    >
                                                        <Eye size={16} />
                                                    </Button>
                                                </Link>

                                                <Link href={route('proveedores.edit', { proveedor: proveedor.id })} onClick={handleEditClick}>
                                                    <Button
                                                        variant="outline"
                                                        className="cursor-pointer hover:bg-green-900 hover:text-white dark:hover:bg-green-700"
                                                        title={isAdmin ? 'Editar proveedor' : 'Sin acceso — solo administradores'}
                                                    >
                                                        <Edit3 size={16} />
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="ghost"
                                                    className={
                                                        isAdmin && Number(proveedor.saldo_proveedor ?? 0) === 0
                                                            ? 'hover:bg-destructive dark:hover:bg-destructive cursor-pointer hover:text-white'
                                                            : 'cursor-pointer text-muted-foreground'
                                                    }
                                                    title={
                                                        !isAdmin
                                                            ? 'Sin acceso — solo administradores'
                                                            : Number(proveedor.saldo_proveedor ?? 0) !== 0
                                                              ? 'No eliminable — proveedor tiene saldo pendiente'
                                                              : 'Eliminar proveedor'
                                                    }
                                                    onClick={() => handleDeleteClick(proveedor)}
                                                >
                                                    {isAdmin && Number(proveedor.saldo_proveedor ?? 0) !== 0 ? <Lock size={16} /> : <Trash2 size={16} />}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPaginas > 1 && (
                    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                        <div className="text-muted-foreground text-sm">
                            {desde + 1} - {Math.min(desde + elementosPorPagina, proveedoresFiltrados.length)} de {proveedoresFiltrados.length} proveedores
                        </div>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                        className={paginaActual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                {paginas.map((item, i) =>
                                    item === 'ellipsis' ? (
                                        <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                                    ) : (
                                        <PaginationItem key={item}>
                                            <PaginationLink
                                                isActive={paginaActual === item}
                                                onClick={() => setPaginaActual(item)}
                                                className="cursor-pointer"
                                            >
                                                {item}
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
                            No tienes permisos para realizar esta operación. Solo los administradores pueden editar o eliminar proveedores.
                            Si necesitas realizar un cambio, comunícate con el administrador del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setAccessDeniedOpen(false)}>Entendido</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Dialog: No se puede eliminar — tiene saldo ────────────── */}
            <AlertDialog open={cantDeleteBalanceOpen} onOpenChange={setCantDeleteBalanceOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Wallet size={18} className="text-amber-500" />
                            No se puede eliminar este proveedor
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    El proveedor <strong>{proveedorSeleccionado?.nombre_proveedor}</strong> no puede ser eliminado porque tiene un
                                    saldo pendiente.
                                </p>
                                {proveedorSeleccionado && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Saldo actual:</span>
                                            <span className="font-bold text-amber-700 dark:text-amber-300">
                                                {Math.abs(Number(proveedorSeleccionado.saldo_proveedor ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs">Para eliminar este proveedor, primero debe llevar su saldo a $0.00.</p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setCantDeleteBalanceOpen(false)}>Entendido</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Dialog: Confirmar eliminación ─────────────────────────── */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de eliminar el proveedor <strong>"{proveedorSeleccionado?.nombre_proveedor}"</strong>? Esta acción no se
                            puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProveedorSeleccionado(null)} className="cursor-pointer">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => proveedorSeleccionado && deleteProveedor(proveedorSeleccionado.id)}
                            className="cursor-pointer bg-red-600 hover:bg-red-700"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Toaster position="top-center" />
            <ScrollProgress />
        </AppLayout>
    );
}
