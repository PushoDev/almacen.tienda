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
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { CuentaProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Coins, CreditCard, Edit3, Eye, Landmark, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

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
    por_estado: Record<string, ResumenPorEstadoItem>;
    cuentas_activas: number;
    cuentas_inactivas: number;
}

const TIPOS = ['permanentes', 'temporales'] as const;
const tipoStyles: Record<string, { label: string; bg: string; text: string; border: string; bar: string }> = {
    permanentes: { label: 'Permanentes', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500' },
    temporales: { label: 'Temporales', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500' },
    deudas: { label: 'Deudas', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bar: 'bg-red-500' },
};

export default function CuentasPage({ cuentas, monedaPrincipal, resumen }: { cuentas: CuentaConMoneda[]; monedaPrincipal: MonedaInfo | null; resumen: ResumenData }) {
    const { props } = usePage();
    const isAdmin = props.auth?.user?.role === 'admin';
    const isVendedor = props.auth?.user?.role === 'vendedor';

    const simbolo = monedaPrincipal?.simbolo_moneda || '$';

    const deleteCuenta = (id: number) => {
        router.delete(route('cuentas.destroy', { cuenta: id }), {
            onSuccess: () => toast.success('Cuenta eliminada correctamente'),
            onError: () => toast.error('Error en el proceso, inténtelo nuevamente'),
        });
    };

    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroMoneda, setFiltroMoneda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [filtroDeudas, setFiltroDeudas] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [paginaActual, setPaginaActual] = useState(1);

    const limpiarFiltros = () => {
        setFiltroTipo('');
        setFiltroMoneda('');
        setFiltroEstado('');
        setFiltroDeudas(false);
        setBusqueda('');
        setPaginaActual(1);
    };

    const toggleTipo = (v: string) => {
        setFiltroTipo((p) => (p === v ? '' : v));
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
    const toggleDeudas = () => {
        setFiltroDeudas((p) => !p);
        setPaginaActual(1);
    };

    const cuentasFiltradas = useMemo(() => {
        return cuentas.filter((c) => {
            const tipoOk = !filtroTipo || c.tipo_cuenta === filtroTipo;
            const monOk = !filtroMoneda || c.moneda?.codigo_moneda === filtroMoneda;
            const estOk = !filtroEstado || c.estado === filtroEstado;
            const deudasOk = !filtroDeudas || (c.saldo_cuenta ?? 0) < 0;
            const busqOk = !busqueda
                || c.nombre_cuenta.toLowerCase().includes(busqueda.toLowerCase())
                || c.moneda?.codigo_moneda.toLowerCase().includes(busqueda.toLowerCase());
            return tipoOk && monOk && estOk && deudasOk && busqOk;
        });
    }, [cuentas, filtroTipo, filtroMoneda, filtroEstado, filtroDeudas, busqueda]);

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

    const hasFilters = !!(filtroTipo || filtroMoneda || filtroEstado || filtroDeudas || busqueda);

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

    const maxTipo = Math.max(
        ...TIPOS.map((t) => Math.abs(resumen?.por_tipo?.[t] ?? 0)),
        infoDeudas.totalEnPrincipal,
        1
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio." />
                    <Landmark size={70} color="#d6d3d1" className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40" />
                </div>

                {/* Row 1: KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div onClick={limpiarFiltros} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${hasFilters ? 'border-blue-500/40 bg-blue-100/60 dark:bg-blue-900/30' : 'border-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Equivalente</p>
                            <Wallet className="h-5 w-5 text-blue-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">
                            {simbolo}{(resumen?.total_saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <p className="text-xs text-emerald-500 dark:text-emerald-400">{simbolo}{(resumen?.por_estado?.activa?.saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} en moneda principal</p>
                    </div>

                    <div onClick={() => toggleEstado('inactiva')} className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${filtroEstado === 'inactiva' ? 'border-gray-500 bg-gray-100 dark:bg-gray-800/60' : 'border-gray-500/20 bg-gray-50/50 dark:bg-gray-800/20'}`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivas</p>
                            <CreditCard className="h-5 w-5 text-gray-500" />
                        </div>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-200">{resumen?.cuentas_inactivas ?? cuentas.filter((c) => c.estado === 'inactiva').length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{simbolo}{(resumen?.por_estado?.inactiva?.saldo ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} en moneda principal</p>
                    </div>
                </div>

                {/* Row 2: Desglose por Tipo */}
                <div className="grid gap-4 md:grid-cols-3">
                    {TIPOS.map((tipo) => {
                        const s = tipoStyles[tipo];
                        const saldo = resumen?.por_tipo?.[tipo] ?? 0;
                        const pct = maxTipo > 0 ? (Math.abs(saldo) / maxTipo) * 100 : 0;
                        const count = cuentas.filter((c) => c.tipo_cuenta === tipo).length;
                        const active = filtroTipo === tipo;
                        return (
                            <div key={tipo} onClick={() => toggleTipo(tipo)}
                                className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${s.border} ${s.bg} ${active ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                                <div className="mb-2 flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${s.text}`}>{s.label}</span>
                                    <Badge variant="outline" className={`${s.text} ${s.border} text-xs`}>{count} cuentas</Badge>
                                </div>
                                <p className={`text-2xl font-bold ${s.text}`}>{saldo < 0 ? '-' : ''}{simbolo}{Math.abs(saldo).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div className={`h-full rounded-full transition-all duration-500 ${s.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <p className="mt-1 text-right text-xs text-muted-foreground">{pct.toFixed(0)}% del mayor tipo</p>
                            </div>
                        );
                    })}
                    {/* Deudas card - computada desde saldo negativo */}
                    <div onClick={toggleDeudas}
                        className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${tipoStyles.deudas.border} ${tipoStyles.deudas.bg} ${filtroDeudas ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                        <div className="mb-2 flex items-center justify-between">
                            <span className={`text-sm font-semibold ${tipoStyles.deudas.text}`}>Deudas</span>
                            <Badge variant="outline" className={`${tipoStyles.deudas.text} ${tipoStyles.deudas.border} text-xs`}>{infoDeudas.cantidad} cuentas</Badge>
                        </div>
                        <p className={`text-2xl font-bold ${tipoStyles.deudas.text}`}>
                            {simbolo}{infoDeudas.totalEnPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div className={`h-full rounded-full transition-all duration-500 ${tipoStyles.deudas.bar}`}
                                style={{ width: `${Math.min(maxTipo > 0 ? (infoDeudas.totalEnPrincipal / maxTipo) * 100 : 0, 100)}%` }} />
                        </div>
                        <p className="mt-1 text-right text-xs text-muted-foreground">
                            {maxTipo > 0 ? ((infoDeudas.totalEnPrincipal / maxTipo) * 100).toFixed(0) : 0}% del mayor tipo
                        </p>
                    </div>
                </div>

                {/* Row 3: Desglose por Moneda */}
                {resumen?.por_moneda && Object.keys(resumen.por_moneda).length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {Object.entries(resumen.por_moneda).map(([codigo, info]) => {
                            const active = filtroMoneda === codigo;
                            return (
                                <div key={codigo} onClick={() => toggleMoneda(codigo)}
                                    className={`cursor-pointer rounded-lg border p-4 shadow-sm transition-all hover:shadow-md ${active ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/40' : 'border-violet-500/20 bg-violet-50/50 dark:bg-violet-900/20'}`}>
                                    <div className="mb-1 flex items-center justify-between">
                                        <span className={`text-sm font-semibold ${active ? 'text-violet-800 dark:text-violet-200' : 'text-violet-700 dark:text-violet-300'}`}>{codigo}</span>
                                        <Badge variant="secondary" className="text-xs">{info.cantidad} {info.cantidad === 1 ? 'cuenta' : 'cuentas'}</Badge>
                                    </div>
                                    <p className={`text-xl font-bold ${active ? 'text-violet-900 dark:text-violet-100' : 'text-violet-800 dark:text-violet-200'}`}>
                                        {info.simbolo}{info.original.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Eq. {simbolo}{info.equivalente.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                                <Select value={filtroTipo || 'all'} onValueChange={(v) => { setFiltroTipo(v === 'all' ? '' : v); setPaginaActual(1); }}>
                                    <SelectTrigger className="w-[150px]"><SelectValue placeholder="Tipo de cuenta" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        <SelectItem value="permanentes">Permanentes</SelectItem>
                                        <SelectItem value="temporales">Temporales</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={filtroMoneda || 'all'} onValueChange={(v) => { setFiltroMoneda(v === 'all' ? '' : v); setPaginaActual(1); }}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas las monedas" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las monedas</SelectItem>
                                        {monedasUnicas.map((m) => (
                                            <SelectItem key={m.codigo_moneda} value={m.codigo_moneda}>{m.nombre_moneda} ({m.codigo_moneda})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!isVendedor && (
                                    <Link href={route('cuentas.create')}>
                                        <Button className="flex cursor-pointer items-center gap-2"><Plus size={16} /> Nueva Cuenta</Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                        {hasFilters && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                                <span className="text-muted-foreground text-xs">Filtros activos:</span>
                                {filtroTipo && <FilterBadge label={`Tipo: ${tipoStyles[filtroTipo]?.label || filtroTipo}`} onClear={() => setFiltroTipo('')} />}
                                {filtroMoneda && <FilterBadge label={`Moneda: ${filtroMoneda}`} onClear={() => setFiltroMoneda('')} />}
                                {filtroEstado && <FilterBadge label={`Estado: ${filtroEstado}`} onClear={() => setFiltroEstado('')} />}
                                {filtroDeudas && <FilterBadge label="Deudas" onClear={() => setFiltroDeudas(false)} />}
                                {busqueda && <FilterBadge label={`Buscar: "${busqueda}"`} onClear={() => setBusqueda('')} />}
                                <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="h-7 text-xs">Limpiar todos</Button>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                {/* Table */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableCaption>Lista de cuentas del sistema - {cuentasFiltradas.length} encontradas</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-[250px] text-white">Cuenta</TableHead>
                                    <TableHead className="text-white">Moneda</TableHead>
                                    <TableHead className="text-white">Saldo</TableHead>
                                    <TableHead className="text-white">Tipo</TableHead>
                                    <TableHead className="text-white">Estado</TableHead>
                                    {!isVendedor && <TableHead className="text-right text-white">Acciones</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cuentasPagina.map((cuenta) => (
                                    <TableRow key={cuenta.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full"><Landmark size={16} className="text-primary" /></div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{cuenta.nombre_cuenta}</span>
                                                    <span className="text-muted-foreground text-xs capitalize">{cuenta.tipo}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20"><Coins size={12} className="text-amber-600" /></div>
                                                            <Badge variant="outline" className="font-mono">{cuenta.moneda?.codigo_moneda || 'N/A'}</Badge>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{cuenta.moneda?.nombre_moneda || 'Moneda no especificada'}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="text-muted-foreground" />
                                                <span className={
                                                    cuenta.saldo_cuenta != null
                                                        ? cuenta.saldo_cuenta > 0 ? 'font-semibold text-emerald-600'
                                                            : cuenta.saldo_cuenta < 0 ? 'font-semibold text-red-600' : 'text-muted-foreground'
                                                        : 'text-muted-foreground'
                                                }>
                                                    {cuenta.saldo_cuenta != null
                                                        ? `${cuenta.moneda?.simbolo_moneda || '$'} ${Math.abs(cuenta.saldo_cuenta).toFixed(2)}`
                                                        : 'Sin saldo'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                cuenta.tipo_cuenta === 'permanentes' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                                : cuenta.tipo_cuenta === 'temporales' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                                                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                                            }>
                                                {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={cuenta.estado === 'activa' ? 'default' : 'secondary'} className={
                                                cuenta.estado === 'activa'
                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                            }>
                                                {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </TableCell>
                                        {!isVendedor && (
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link href={route('cuentas.show', { cuenta: cuenta.id })}>
                                                                    <Button variant="outline" size="sm" className="h-8 w-8 cursor-pointer p-0 hover:bg-blue-50 hover:text-blue-600"><Eye size={14} /></Button>
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Ver detalles</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link href={route('cuentas.edit', { cuenta: cuenta.id })}>
                                                                    <Button variant="outline" size="sm" className="h-8 w-8 cursor-pointer p-0 hover:bg-green-50 hover:text-green-600"><Edit3 size={14} /></Button>
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>Editar cuenta</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <AlertDialog>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="outline" size="sm"
                                                                            className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                            onClick={(e) => { if (!isAdmin) { e.preventDefault(); toast.error('ud no tiene acceso para esta acción'); } }}>
                                                                            <Trash2 size={14} />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>Eliminar cuenta</p></TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta acción eliminará permanentemente la cuenta "{cuenta.nombre_cuenta}". Esta acción no se puede deshacer.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteCuenta(cuenta.id)} className="cursor-pointer bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                                {cuentasPagina.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                            {hasFilters ? 'No hay cuentas que coincidan con los filtros aplicados.' : 'No hay cuentas registradas.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={2} className="font-medium">Total de cuentas filtradas</TableCell>
                                    <TableCell className="font-medium">{cuentasFiltradas.length}</TableCell>
                                    <TableCell colSpan={2} className="font-medium text-right text-emerald-600">{simbolo}{totalFiltrado.toFixed(2)}</TableCell>
                                    {!isVendedor && <TableCell />}
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>

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
            <Toaster position="top-center" />
            <ScrollProgress />
        </AppLayout>
    );
}
