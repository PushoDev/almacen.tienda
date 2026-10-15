import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftRight,
    ArrowUpRight,
    Ban,
    Edit3,
    Filter,
    FilterX,
    Landmark,
    Receipt,
    Search,
    Shuffle,
    TrendingDown,
    TrendingUp,
    Truck,
} from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Movimientos Financieros',
        href: route('reportes.movimientos_financieros'),
    },
];

type EstadoMovimiento = 'completado' | 'en_transito' | 'cancelado';

interface MovimientoFila {
    tipo: string;
    id: number;
    fecha: string;
    estado: EstadoMovimiento;
    estado_texto: string;
    descripcion: string | null;
    origen: string | null;
    destino: string | null;
    monto: string | number;
    moneda: string | null;
    monto_usd: string | number | null;
    monto_destino: string | number | null;
    moneda_destino: string | null;
    salida_monto: string | number | null;
    salida_moneda: string | null;
    mensajero_monto: string | number | null;
    mensajero_moneda: string | null;
    saldo_anterior: string | number | null;
    saldo_posterior: string | number | null;
    usuario: string | null;
}

interface MovimientosPaginados {
    data: MovimientoFila[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface PorTipo {
    tipo: string;
    movimientos: number;
    monto_usd: number | null;
    con_usd: boolean;
}

interface Filtros {
    buscar: string;
    tipo: string;
    estado: string;
    user_id: string | number;
    desde: string;
    hasta: string;
}

interface MovimientosFinancierosProps {
    movimientos: MovimientosPaginados;
    porTipo: PorTipo[];
    totales: { movimientos: number; cancelados: number };
    tipos: string[];
    usuarios: Array<{ id: number; name: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatearFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Estilo por tipo de operación. Clases completas (Tailwind no genera las armadas con variables).
// `signo` es explícito: no se deduce del nombre. El Ajuste lleva su signo en el propio monto.
const estilosTipo: Record<
    string,
    {
        icono: React.ElementType;
        estado: 'agotado' | 'disponible' | 'tarjeta' | 'especial' | 'completo' | 'global';
        tarjeta: string;
        circulo: string;
        cifra: string;
        badge: string;
        signo: string;
    }
> = {
    Gasto: {
        icono: TrendingDown,
        estado: 'agotado',
        tarjeta: 'border-red-400/30 bg-red-500/5 dark:bg-red-500/10',
        circulo: 'bg-red-500/15 text-red-600 dark:text-red-400',
        cifra: 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30',
        badge: 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300',
        signo: '-',
    },
    Ingreso: {
        icono: TrendingUp,
        estado: 'disponible',
        tarjeta: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
        circulo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        cifra: 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30',
        badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        signo: '+',
    },
    Transferencia: {
        icono: ArrowLeftRight,
        estado: 'tarjeta',
        tarjeta: 'border-sky-400/30 bg-sky-500/5 dark:bg-sky-500/10',
        circulo: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        cifra: 'bg-gradient-to-r from-sky-500 to-sky-600 shadow-sky-500/30',
        badge: 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        signo: '',
    },
    'Envío en tránsito': {
        icono: Truck,
        estado: 'especial',
        tarjeta: 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10',
        circulo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        cifra: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30',
        badge: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        signo: '',
    },
    'Operación Múltiple': {
        icono: Shuffle,
        estado: 'completo',
        tarjeta: 'border-cyan-400/30 bg-cyan-500/5 dark:bg-cyan-500/10',
        circulo: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
        cifra: 'bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-cyan-500/30',
        badge: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
        signo: '',
    },
    Ajuste: {
        icono: Edit3,
        estado: 'global',
        tarjeta: 'border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/10',
        circulo: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
        cifra: 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-violet-500/30',
        badge: 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
        signo: '',
    },
};

const estiloPorDefecto = {
    ...estilosTipo.Ajuste,
    badge: 'border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

const estiloDe = (tipo: string) => estilosTipo[tipo] ?? estiloPorDefecto;

const estilosEstado: Record<EstadoMovimiento, string> = {
    completado: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    en_transito: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    cancelado: 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300',
};

// Pantalla propia de la operación. Un Ajuste de saldo no tiene pantalla; un Envío en tránsito se
// atiende desde la lista de envíos.
const rutaDe = (mov: MovimientoFila): string | null => {
    switch (mov.tipo) {
        case 'Gasto':
        case 'Ingreso':
        case 'Transferencia':
            return route('transacciones.show', mov.id);
        case 'Operación Múltiple':
            return route('transacciones.remesa.show', mov.id);
        case 'Envío en tránsito':
            return route('transacciones.envios.index');
        default:
            return null;
    }
};

const getPageNumbers = (current: number, last: number): (number | '...')[] => {
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

    const pages: (number | '...')[] = [1];

    if (current > 3) pages.push('...');

    for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
        pages.push(i);
    }

    if (current < last - 2) pages.push('...');
    pages.push(last);

    return pages;
};

export default function MovimientosFinancierosPage({ movimientos, porTipo, totales, tipos, usuarios, filtros }: MovimientosFinancierosProps) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;

    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroTipo, setFiltroTipo] = useState(filtros.tipo || 'all');
    const [filtroEstado, setFiltroEstado] = useState(filtros.estado || 'all');
    const [filtroUsuario, setFiltroUsuario] = useState(String(filtros.user_id || 'all'));
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const construirParametros = (page: number = 1) => ({
        buscar: filtroBuscar.trim(),
        tipo: filtroTipo === 'all' ? '' : filtroTipo,
        estado: filtroEstado === 'all' ? '' : filtroEstado,
        user_id: filtroUsuario === 'all' ? '' : filtroUsuario,
        desde: filtroDesde,
        hasta: filtroHasta,
        page,
    });

    const aplicarFiltros = () => {
        router.get(route('reportes.movimientos_financieros'), construirParametros(1), { preserveState: true, preserveScroll: true, replace: true });
    };

    const cambiarPagina = (page: number) => {
        router.get(route('reportes.movimientos_financieros'), construirParametros(page), { preserveState: true, preserveScroll: true, replace: true });
    };

    const limpiarFiltros = () => {
        setFiltroBuscar('');
        setFiltroTipo('all');
        setFiltroEstado('all');
        setFiltroUsuario('all');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.movimientos_financieros'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    const { data: filas, current_page, last_page, total, from, to } = movimientos;
    const pageNumbers = getPageNumbers(current_page, last_page);
    const mensajesError = Object.values(errors ?? {});

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos Financieros" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Movimientos Financieros"
                        description="Las operaciones de caja: gastos, ingresos, transferencias, envíos en tránsito, operaciones múltiples y ajustes de saldo."
                    />
                    <Landmark
                        size={70}
                        color="#a1a1aa"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {hayFiltrosActivos && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <Filter size={12} />
                        <span>
                            Mostrando totales de los {totales.movimientos} movimientos vigentes que cumplen los filtros (los cancelados y anulados no
                            suman)
                        </span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                    {porTipo.map((tipo) => {
                        const estilo = estiloDe(tipo.tipo);
                        const Icono = estilo.icono;

                        return (
                            <SpotlightCard
                                key={tipo.tipo}
                                estado={estilo.estado}
                                className={`rounded-lg border p-4 shadow-sm backdrop-blur-sm ${estilo.tarjeta}`}
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${estilo.circulo}`}>
                                        <Icono className="h-4 w-4" />
                                    </span>
                                    <p className="text-muted-foreground text-sm font-medium">{tipo.tipo}</p>
                                </div>
                                <Badge className={`gap-1 border-0 px-3 py-1 text-xl font-black text-white shadow-md ${estilo.cifra}`}>
                                    {tipo.movimientos.toLocaleString('es-ES')}
                                </Badge>
                                <p className="text-muted-foreground mt-2 text-xs">
                                    {tipo.con_usd && tipo.monto_usd !== null
                                        ? `Equivale a $${formatearMonto(tipo.monto_usd)} USD`
                                        : 'Sin equivalente en USD: no se guarda'}
                                </p>
                            </SpotlightCard>
                        );
                    })}

                    {/* Widget: Cancelados y anulados */}
                    <SpotlightCard
                        estado="indigo"
                        className="rounded-lg border border-slate-400/30 bg-slate-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-slate-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400">
                                <Ban className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Cancelados</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-slate-500 to-slate-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-slate-500/30">
                            {totales.cancelados.toLocaleString('es-ES')}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">Cancelados, anulados y rechazados: no suman</p>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-slate-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-slate-300">
                                    Acota los movimientos por texto, tipo, estado, usuario o fechas.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Buscar por # de operación, descripción, cuenta, cliente, destino o usuario..."
                                value={filtroBuscar}
                                onChange={(e) => setFiltroBuscar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                className="pl-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Tipo</Label>
                                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        {tipos.map((tipo) => (
                                            <SelectItem key={tipo} value={tipo}>
                                                {tipo}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Estado</Label>
                                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los estados</SelectItem>
                                        <SelectItem value="completado">Completados</SelectItem>
                                        <SelectItem value="en_transito">En tránsito</SelectItem>
                                        <SelectItem value="cancelado">Cancelados / anulados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Usuario</Label>
                                <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los usuarios</SelectItem>
                                        {usuarios.map((usuario) => (
                                            <SelectItem key={usuario.id} value={usuario.id.toString()}>
                                                {usuario.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Desde</Label>
                                <Input type="date" value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} className="w-full" />
                            </div>
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Hasta</Label>
                                <Input type="date" value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} className="w-full" />
                            </div>
                        </div>
                        {mensajesError.length > 0 && (
                            <div className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                                {mensajesError.map((mensaje, i) => (
                                    <p key={i}>{mensaje}</p>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {hayFiltrosActivos && (
                                <Button variant="outline" size="sm" onClick={limpiarFiltros} className="gap-1">
                                    <FilterX className="h-4 w-4" /> Limpiar
                                </Button>
                            )}
                            <Button size="sm" onClick={aplicarFiltros} className="gap-1">
                                <Filter className="h-4 w-4" /> Filtrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-l-4 border-slate-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Registro de Operaciones de Caja</CardTitle>
                                <CardDescription className="text-slate-300">Las más recientes primero.</CardDescription>
                            </div>
                            <Link href={route('reportes.rastreo_operaciones')}>
                                <Button variant="secondary" size="sm" className="gap-1">
                                    <Receipt className="h-4 w-4" /> Ir a Rastreo de Operaciones
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Operación</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                                        <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                                        <th className="px-4 py-3 text-left font-semibold">Origen</th>
                                        <th className="px-4 py-3 text-left font-semibold">Destino</th>
                                        <th className="px-4 py-3 text-left font-semibold">Monto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Registrado por</th>
                                        <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filas.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos
                                                    ? 'Ninguna operación coincide con los filtros.'
                                                    : 'Todavía no hay operaciones de caja.'}
                                            </td>
                                        </tr>
                                    )}
                                    {filas.map((mov) => {
                                        const estilo = estiloDe(mov.tipo);
                                        const cancelado = mov.estado === 'cancelado';
                                        const monto = Number(mov.monto);
                                        const montoUsd = mov.monto_usd !== null ? Number(mov.monto_usd) : null;
                                        const enlace = rutaDe(mov);
                                        const esAjuste = mov.tipo === 'Ajuste';
                                        const esOperacionMultiple = mov.tipo === 'Operación Múltiple';

                                        return (
                                            <tr
                                                key={`${mov.tipo}-${mov.id}`}
                                                className={`hover:bg-muted/40 transition-colors ${cancelado ? 'opacity-60' : ''}`}
                                            >
                                                <td className="px-4 py-3">
                                                    {enlace ? (
                                                        <Link
                                                            href={enlace}
                                                            title="Ver la operación completa"
                                                            className="inline-flex items-center gap-1 font-semibold hover:underline"
                                                        >
                                                            #{mov.id}
                                                            <ArrowUpRight className="h-3 w-3" />
                                                        </Link>
                                                    ) : (
                                                        <div className="font-semibold">#{mov.id}</div>
                                                    )}
                                                    <div className="text-muted-foreground text-xs whitespace-nowrap">
                                                        {formatearFechaHora(mov.fecha)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`font-medium whitespace-nowrap ${estilo.badge}`}>{mov.tipo}</Badge>
                                                </td>
                                                <td className="max-w-xs px-4 py-3">{mov.descripcion || '—'}</td>
                                                <td className="px-4 py-3">{mov.origen || '—'}</td>
                                                <td className="px-4 py-3">{mov.destino || '—'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className={`font-semibold ${cancelado ? 'line-through' : ''}`}>
                                                        {esAjuste && monto > 0 ? '+' : estilo.signo}
                                                        {formatearMonto(monto)} {mov.moneda}
                                                    </div>
                                                    {mov.monto_destino !== null && mov.moneda_destino && (
                                                        <div className="text-muted-foreground text-xs">
                                                            → {formatearMonto(Number(mov.monto_destino))} {mov.moneda_destino}
                                                        </div>
                                                    )}
                                                    {montoUsd !== null && mov.moneda !== 'USD' && (
                                                        <div className="text-muted-foreground text-xs">≈ ${formatearMonto(montoUsd)} USD</div>
                                                    )}
                                                    {esOperacionMultiple && mov.salida_monto !== null && (
                                                        <div className="text-muted-foreground text-xs">
                                                            Pagó {formatearMonto(Number(mov.salida_monto))} {mov.salida_moneda}
                                                        </div>
                                                    )}
                                                    {esOperacionMultiple && mov.mensajero_monto !== null && (
                                                        <div className="text-muted-foreground text-xs">
                                                            Mensajero {formatearMonto(Number(mov.mensajero_monto))} {mov.mensajero_moneda}
                                                        </div>
                                                    )}
                                                    {esAjuste && mov.saldo_anterior !== null && mov.saldo_posterior !== null && (
                                                        <div className="text-muted-foreground text-xs">
                                                            Saldo {formatearMonto(Number(mov.saldo_anterior))} → {formatearMonto(Number(mov.saldo_posterior))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">{mov.usuario || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`font-medium whitespace-nowrap ${estilosEstado[mov.estado]}`}>
                                                        {mov.estado_texto}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                                Mostrando {from ?? 0} a {to ?? 0} de {total} resultados
                            </div>
                            {last_page > 1 && (
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page > 1) cambiarPagina(current_page - 1);
                                                }}
                                                className={current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {pageNumbers.map((page, idx) =>
                                            page === '...' ? (
                                                <PaginationItem key={`ellipsis-${idx}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={page === current_page}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            cambiarPagina(page as number);
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            ),
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page < last_page) cambiarPagina(current_page + 1);
                                                }}
                                                className={current_page === last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
