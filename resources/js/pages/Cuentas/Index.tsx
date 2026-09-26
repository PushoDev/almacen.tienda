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
import { CuentaCard, type CuentaCardData } from '@/components/CuentaCard';
import { type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { type CatalogoTarjetas } from '@/components/SelectorBancoTarjeta';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { CuentaProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CreditCard, Globe, Landmark, Lock, Minus, Plus, Search, User, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
    },
];

interface MonedaInfo {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    principal: boolean;
}

interface CuentaConMoneda extends CuentaProps {
    tipo: string;
    estado: string;
    moneda_id: number;
    moneda: MonedaInfo | null;
    tipo_titular?: string | null;
    imagen: string | null;
    banco: { slug: string; nombre: string; imagen_url: string } | null;
}

interface ResumenPorMonedaItem {
    original: number;
    equivalente: number;
    cantidad: number;
    simbolo: string;
}

interface ResumenPorEstadoItem {
    saldo: number;
    cantidad: number;
}

interface ResumenData {
    total_saldo: number;
    por_tipo: Record<string, number>;
    por_moneda: Record<string, ResumenPorMonedaItem>;
    por_moneda_perm: Record<string, ResumenPorMonedaItem>;
    por_estado: Record<string, ResumenPorEstadoItem>;
    cuentas_activas: number;
    cuentas_inactivas: number;
}

export default function CuentasPage({
    cuentas,
    monedaPrincipal,
    resumen,
    catalogoTarjetas,
    tiposCuenta,
}: {
    cuentas: CuentaConMoneda[];
    monedaPrincipal: MonedaInfo | null;
    resumen: ResumenData;
    catalogoTarjetas: CatalogoTarjetas;
    tiposCuenta: TipoCuenta[];
}) {
    const { props } = usePage();
    const isAdmin = props.auth?.user?.role === 'admin';

    const simbolo = monedaPrincipal?.simbolo_moneda || '$';

    // ── Estado para dialogs controlados (mismo patrón que Clientes/Index.tsx) ──
    const [accessDeniedOpen, setAccessDeniedOpen] = useState(false);
    const [cantDeleteBalanceOpen, setCantDeleteBalanceOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaConMoneda | null>(null);

    const deleteCuenta = (id: number) => {
        router.delete(route('cuentas.destroy', { cuenta: id }), {
            onSuccess: () => {
                sileo.success({ title: 'Cuenta eliminada', description: 'La cuenta se eliminó correctamente' });
                setDeleteConfirmOpen(false);
                setCuentaSeleccionada(null);
            },
            onError: (errors) => sileo.error({ title: 'Error al eliminar', description: errors.cuenta ?? 'Inténtalo nuevamente' }),
        });
    };

    const handleEditClick = (e: React.MouseEvent) => {
        if (!isAdmin) {
            e.preventDefault();
            setAccessDeniedOpen(true);
        }
    };

    const handleDeleteClick = (cuenta: CuentaConMoneda) => {
        if (!isAdmin) {
            setAccessDeniedOpen(true);
            return;
        }
        setCuentaSeleccionada(cuenta);
        if (Number(cuenta.saldo_cuenta ?? 0) !== 0) {
            setCantDeleteBalanceOpen(true);
            return;
        }
        setDeleteConfirmOpen(true);
    };

    const [filtroMoneda, setFiltroMoneda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroTipoTitular, setFiltroTipoTitular] = useState('');
    // '' = todos, '__sin_banco__' = tarjeta sin banco asignado, o el slug de un banco.
    const [filtroBanco, setFiltroBanco] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    const limpiarFiltros = () => {
        setFiltroMoneda('');
        setFiltroEstado('');
        setFiltroTipoTitular('');
        setFiltroBanco('');
        setBusqueda('');
        setPaginaActual(1);
    };

    const toggleEstado = (v: string) => {
        setFiltroEstado((p) => (p === v ? '' : v));
        setPaginaActual(1);
    };
    const toggleMoneda = (v: string) => {
        setFiltroMoneda((p) => (p === v ? '' : v));
        setPaginaActual(1);
    };
    const toggleTipoTitular = (v: string) => {
        setFiltroTipoTitular((p) => (p === v ? '' : v));
        setPaginaActual(1);
    };

    const cuentasFiltradas = useMemo(() => {
        return cuentas.filter((c) => {
            const monOk = !filtroMoneda || c.moneda?.codigo_moneda === filtroMoneda;
            const estOk = !filtroEstado || c.estado === filtroEstado;
            const tipoTitularOk = !filtroTipoTitular || (c.tipo_titular ?? '__sin_asignar__') === filtroTipoTitular;
            const bancoOk =
                !filtroBanco || (filtroBanco === '__sin_banco__' ? !c.banco : c.banco?.slug === filtroBanco);
            const busqOk = !busqueda
                || c.nombre_cuenta.toLowerCase().includes(busqueda.toLowerCase())
                || c.moneda?.codigo_moneda.toLowerCase().includes(busqueda.toLowerCase());
            return monOk && estOk && tipoTitularOk && bancoOk && busqOk;
        });
    }, [cuentas, filtroMoneda, filtroEstado, filtroTipoTitular, filtroBanco, busqueda]);

    const elementosPorPagina = 10;
    const totalPaginas = Math.ceil(cuentasFiltradas.length / elementosPorPagina);
    const desde = (paginaActual - 1) * elementosPorPagina;
    const cuentasPagina = cuentasFiltradas.slice(desde, desde + elementosPorPagina);

    const monedasUnicas = useMemo(() => {
        return cuentas.reduce((acc: MonedaInfo[], c) => {
            if (c.moneda && !acc.find((m) => m.codigo_moneda === c.moneda!.codigo_moneda)) acc.push(c.moneda);
            return acc;
        }, []);
    }, [cuentas]);

    const totalFiltrado = useMemo(() => {
        return cuentasFiltradas.reduce((sum, c) => {
            const tasa = c.moneda?.tasa_cambio || 1;
            return sum + (tasa > 0 ? (c.saldo_cuenta || 0) / tasa : 0);
        }, 0);
    }, [cuentasFiltradas]);

    const filtradoPorMoneda = useMemo(() => {
        const map: Record<string, { original: number; simbolo: string; cantidad: number }> = {};
        cuentasFiltradas.forEach((c) => {
            const codigo = c.moneda?.codigo_moneda || 'N/A';
            if (!map[codigo]) {
                map[codigo] = { original: 0, simbolo: c.moneda?.simbolo_moneda || '$', cantidad: 0 };
            }
            map[codigo].original += c.saldo_cuenta ?? 0;
            map[codigo].cantidad++;
        });
        return map;
    }, [cuentasFiltradas]);

    const infoDeudas = useMemo(() => {
        let total = 0;
        let cantidad = 0;
        cuentas.forEach((c) => {
            if ((c.saldo_cuenta ?? 0) < 0) {
                const tasa = c.moneda?.tasa_cambio || 1;
                total += tasa > 0 ? (c.saldo_cuenta ?? 0) / tasa : 0;
                cantidad++;
            }
        });
        return { totalEnPrincipal: Math.abs(total), cantidad };
    }, [cuentas]);

    const infoTipoTitular = useMemo(() => {
        let extCant = 0, extTotal = 0;
        let perCant = 0, perTotal = 0;
        let sinCant = 0, sinTotal = 0;

        cuentas.forEach((c) => {
            const tasa = c.moneda?.tasa_cambio || 1;
            const equiv = tasa > 0 ? (c.saldo_cuenta ?? 0) / tasa : 0;

            if (c.tipo_titular === 'externa') { extCant++; extTotal += equiv; }
            else if (c.tipo_titular === 'personal') { perCant++; perTotal += equiv; }
            else { sinCant++; sinTotal += equiv; }
        });

        return {
            externa: { cantidad: extCant, total: extTotal },
            personal: { cantidad: perCant, total: perTotal },
            sinAsignar: { cantidad: sinCant, total: sinTotal },
        };
    }, [cuentas]);

    const hasFilters = !!(filtroMoneda || filtroEstado || filtroTipoTitular || filtroBanco || busqueda);

    const nombreBancoFiltro = useMemo(() => {
        if (filtroBanco === '__sin_banco__') return 'Sin banco';
        const todos = [...catalogoTarjetas.interna, ...catalogoTarjetas.externa];
        return todos.find((b) => b.slug === filtroBanco)?.nombre ?? filtroBanco;
    }, [filtroBanco, catalogoTarjetas]);

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

    const FilterBadge = ({ label, onClear }: { label: string; onClear: () => void }) => (
        <Badge variant="secondary" className="flex cursor-pointer items-center gap-1 px-3 py-1 text-xs" onClick={onClear}>
            {label} <X size={12} />
        </Badge>
    );

    const totalCuentas = cuentas.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio." />
                    {/* Bleed tipo Variante A (mismo patrón que dashboard.tsx, ver
                        docs/patron-mascota-bleed.md) — sin overflow-hidden en el contenedor, anclada
                        abajo, y a una altura mayor que la del banner para que la parte de arriba
                        sobresalga del borde superior. */}
                    <img
                        src="/projects/tarjetas.webp"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                    />
                </div>

                {/* Row 1: KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div onClick={limpiarFiltros} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${hasFilters ? 'border-blue-500/40 bg-blue-100/60 dark:bg-blue-900/30' : 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Equivalente</p>
                            <Wallet className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">
                            {simbolo}: {(resumen?.total_saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-blue-500 dark:text-blue-400">En {monedaPrincipal?.codigo_moneda || 'moneda principal'}</p>
                    </div>

                    <div onClick={limpiarFiltros} className="cursor-pointer rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-900/20">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cuentas</p>
                            <Landmark className="h-5 w-5 text-slate-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-200">{cuentas.length}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{cuentasFiltradas.length} filtradas</p>
                    </div>

                    <div onClick={() => toggleEstado('activa')} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroEstado === 'activa' ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40' : 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Activas</p>
                            <CreditCard className="h-5 w-5 text-emerald-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{resumen?.cuentas_activas ?? cuentas.filter((c) => c.estado === 'activa').length}</p>
                        <p className="text-xs text-emerald-500 dark:text-emerald-400">{simbolo}: {(resumen?.por_estado?.activa?.saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} en moneda principal</p>
                    </div>

                    <div onClick={() => toggleEstado('inactiva')} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroEstado === 'inactiva' ? 'border-gray-500 bg-gray-100 dark:bg-gray-800/60' : 'border-gray-500/20 bg-gray-50/50 dark:bg-gray-800/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivas</p>
                            <CreditCard className="h-5 w-5 text-gray-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-200">{resumen?.cuentas_inactivas ?? cuentas.filter((c) => c.estado === 'inactiva').length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{simbolo}: {(resumen?.por_estado?.inactiva?.saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} en moneda principal</p>
                    </div>
                </div>

                {/* Row 2: Desglose por Tipo Titular */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Externa */}
                    <div onClick={() => toggleTipoTitular('externa')}
                        className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroTipoTitular === 'externa' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 ring-2 ring-offset-1 ring-blue-500' : 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20'}`}>
                        <div className="mb-2 flex items-center justify-between">
                             <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300"><Globe size={16} /> Externa</span>
                             <Badge variant="outline" className="border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300 text-xs">{infoTipoTitular.externa.cantidad} cuentas</Badge>
                        </div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                            {simbolo}: {infoTipoTitular.externa.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-full rounded-full transition-all duration-500 bg-blue-500"
                                style={{ width: `${Math.min(totalCuentas > 0 ? (infoTipoTitular.externa.cantidad / totalCuentas) * 100 : 0, 100)}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {totalCuentas > 0 ? ((infoTipoTitular.externa.cantidad / totalCuentas) * 100).toFixed(0) : 0}% del total
                        </p>
                    </div>

                    {/* Personal */}
                    <div onClick={() => toggleTipoTitular('personal')}
                        className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroTipoTitular === 'personal' ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/40 ring-2 ring-offset-1 ring-violet-500' : 'border-violet-500/20 bg-violet-50/50 dark:bg-violet-900/20'}`}>
                        <div className="mb-2 flex items-center justify-between">
                             <span className="flex items-center gap-1.5 text-sm font-semibold text-violet-700 dark:text-violet-300"><User size={16} /> Personal</span>
                             <Badge variant="outline" className="border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-300 text-xs">{infoTipoTitular.personal.cantidad} cuentas</Badge>
                        </div>
                        <p className="text-2xl font-bold text-violet-900 dark:text-violet-200">
                            {simbolo}: {infoTipoTitular.personal.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-full rounded-full transition-all duration-500 bg-violet-500"
                                style={{ width: `${Math.min(totalCuentas > 0 ? (infoTipoTitular.personal.cantidad / totalCuentas) * 100 : 0, 100)}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {totalCuentas > 0 ? ((infoTipoTitular.personal.cantidad / totalCuentas) * 100).toFixed(0) : 0}% del total
                        </p>
                    </div>

                    {/* Sin asignar */}
                    <div onClick={() => toggleTipoTitular('__sin_asignar__')}
                        className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroTipoTitular === '__sin_asignar__' ? 'border-gray-500 bg-gray-100 dark:bg-gray-800/60 ring-2 ring-offset-1 ring-gray-500' : 'border-gray-500/20 bg-gray-50/50 dark:bg-gray-800/20'}`}>
                        <div className="mb-2 flex items-center justify-between">
                             <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300"><Minus size={16} /> Sin asignar</span>
                             <Badge variant="outline" className="border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 text-xs">{infoTipoTitular.sinAsignar.cantidad} cuentas</Badge>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-200">
                            {simbolo}: {infoTipoTitular.sinAsignar.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className="h-full rounded-full transition-all duration-500 bg-gray-500"
                                style={{ width: `${Math.min(totalCuentas > 0 ? (infoTipoTitular.sinAsignar.cantidad / totalCuentas) * 100 : 0, 100)}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {totalCuentas > 0 ? ((infoTipoTitular.sinAsignar.cantidad / totalCuentas) * 100).toFixed(0) : 0}% del total
                        </p>
                    </div>
                </div>

                {/* Row 3: Desglose por Moneda (solo cuentas permanentes) */}
                {resumen?.por_moneda_perm && Object.keys(resumen.por_moneda_perm).length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {Object.entries(resumen.por_moneda_perm).map(([codigo, info]) => {
                            const active = filtroMoneda === codigo;
                            return (
                                <div key={codigo} onClick={() => toggleMoneda(codigo)}
                                    className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${active ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/40' : 'border-violet-500/20 bg-violet-50/50 dark:bg-violet-900/20'}`}>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className={`text-sm font-semibold ${active ? 'text-violet-800 dark:text-violet-200' : 'text-violet-700 dark:text-violet-300'}`}>{codigo}</span>
                                        <Badge variant="secondary" className="text-xs">{info.cantidad} {info.cantidad === 1 ? 'cuenta' : 'cuentas'}</Badge>
                                    </div>
                                    <p className={`text-xl font-bold ${active ? 'text-violet-900 dark:text-violet-100' : 'text-violet-800 dark:text-violet-200'}`}>
{info.simbolo}: {info.original.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Eq. {simbolo}: {info.equivalente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Filter Bar */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative max-w-sm flex-1">
                                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                                <Input
                                    placeholder="Buscar cuentas..."
                                    className="pl-8"
                                    value={busqueda}
                                    onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Select value={filtroMoneda || 'all'} onValueChange={(v) => { setFiltroMoneda(v === 'all' ? '' : v); setPaginaActual(1); }}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas las monedas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las monedas</SelectItem>
                                        {monedasUnicas.map((m) => (
                                            <SelectItem key={m.codigo_moneda} value={m.codigo_moneda}>{m.nombre_moneda} ({m.codigo_moneda})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={filtroBanco || 'all'} onValueChange={(v) => { setFiltroBanco(v === 'all' ? '' : v); setPaginaActual(1); }}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todos los bancos" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los bancos</SelectItem>
                                        <SelectItem value="__sin_banco__">Sin banco asignado</SelectItem>
                                        {catalogoTarjetas.interna.map((b) => (
                                            <SelectItem key={b.slug} value={b.slug}>{b.nombre}</SelectItem>
                                        ))}
                                        {catalogoTarjetas.externa.map((b) => (
                                            <SelectItem key={b.slug} value={b.slug}>{b.nombre}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Link href={route('cuentas.create')}>
                                    <Button className="flex cursor-pointer items-center gap-2"><Plus size={16} /> Nueva Cuenta</Button>
                                </Link>
                            </div>
                        </div>
                        {hasFilters && (
                            <>
                                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                                    <span className="text-muted-foreground text-xs">Filtros activos:</span>
                                    {filtroMoneda && <FilterBadge label={`Moneda: ${filtroMoneda}`} onClear={() => setFiltroMoneda('')} />}
                                    {filtroEstado && <FilterBadge label={`Estado: ${filtroEstado}`} onClear={() => setFiltroEstado('')} />}
                                    {filtroTipoTitular && <FilterBadge label={`Titular: ${filtroTipoTitular === '__sin_asignar__' ? 'Sin asignar' : filtroTipoTitular.charAt(0).toUpperCase() + filtroTipoTitular.slice(1)}`} onClear={() => setFiltroTipoTitular('')} />}
                                    {filtroBanco && <FilterBadge label={`Banco: ${nombreBancoFiltro}`} onClear={() => setFiltroBanco('')} />}
                                    {busqueda && <FilterBadge label={`Buscar: "${busqueda}"`} onClear={() => setBusqueda('')} />}
                                    <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-7 text-xs">Limpiar todos</Button>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground/80">{cuentasFiltradas.length} cuentas filtradas</span>
                                    <span className="text-muted-foreground/30">|</span>
                                    {Object.entries(filtradoPorMoneda).map(([codigo, info]) => (
                                        <span key={codigo}>
                                            {codigo}: {info.simbolo}: {info.original.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    ))}
                                    <span className="text-muted-foreground/30">|</span>
                                    <span className="font-semibold text-foreground">
                                        Eq. {simbolo}: {totalFiltrado.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </>
                        )}
                    </CardHeader>
                </Card>

                {/* Grilla de cards */}
                {cuentasPagina.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {cuentasPagina.map((cuenta) => (
                            <CuentaCard
                                key={cuenta.id}
                                cuenta={cuenta as CuentaCardData}
                                isAdmin={isAdmin}
                                onEditClick={handleEditClick}
                                onDeleteClick={(c) => handleDeleteClick(c as CuentaConMoneda)}
                                tipoCuenta={tiposCuenta.find((tipo) => tipo.slug === cuenta.tipo)}
                            />
                        ))}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="text-muted-foreground py-12 text-center">
                            {hasFilters ? 'No hay cuentas que coincidan con los filtros aplicados.' : 'No hay cuentas registradas.'}
                        </CardContent>
                    </Card>
                )}

                {cuentasPagina.length > 0 && (
                    <p className="text-muted-foreground text-right text-sm">
                        Total de cuentas filtradas: <span className="text-foreground font-medium">{cuentasFiltradas.length}</span>
                        {' · '}
                        <span className="font-medium text-emerald-600">{simbolo}: {totalFiltrado.toFixed(2)}</span>
                    </p>
                )}

                {/* Pagination */}
                {totalPaginas > 1 && (
                    <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                        <div className="text-muted-foreground text-sm">{desde + 1} - {Math.min(desde + elementosPorPagina, cuentasFiltradas.length)} de {cuentasFiltradas.length} cuentas</div>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                                        className={paginaActual === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                                </PaginationItem>
                                {paginas.map((item, i) =>
                                    item === 'ellipsis' ? (
                                        <PaginationItem key={`e-${i}`}><PaginationEllipsis /></PaginationItem>
                                    ) : (
                                        <PaginationItem key={item}>
                                            <PaginationLink isActive={paginaActual === item} onClick={() => setPaginaActual(item)} className="cursor-pointer">{item}</PaginationLink>
                                        </PaginationItem>
                                    )
                                )}
                                <PaginationItem>
                                    <PaginationNext onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                                        className={paginaActual === totalPaginas ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
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
                            No tienes permisos para realizar esta operación. Solo los administradores pueden editar o eliminar cuentas.
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
                            No se puede eliminar esta cuenta
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>
                                    La cuenta <strong>{cuentaSeleccionada?.nombre_cuenta}</strong> no puede ser eliminada porque tiene un saldo
                                    pendiente.
                                </p>
                                {cuentaSeleccionada && (
                                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">Saldo actual:</span>
                                            <span className="font-bold text-amber-700 dark:text-amber-300">
                                                {cuentaSeleccionada.moneda?.simbolo_moneda || simbolo}{' '}
                                                {Math.abs(Number(cuentaSeleccionada.saldo_cuenta ?? 0)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs">Para eliminar esta cuenta, primero debe llevar su saldo a $0.00.</p>
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
                            ¿Estás seguro de eliminar la cuenta <strong>"{cuentaSeleccionada?.nombre_cuenta}"</strong>? Esta acción no se puede
                            deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCuentaSeleccionada(null)} className="cursor-pointer">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => cuentaSeleccionada && deleteCuenta(cuentaSeleccionada.id)}
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
