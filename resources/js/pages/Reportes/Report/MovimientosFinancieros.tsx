import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Ban, Banknote, Filter, FilterX, Landmark, Receipt, Search, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
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

interface MovimientoFila {
    id: number;
    tipo_movimiento: string;
    efecto: string;
    monto: string | number;
    monto_usd: string | number | null;
    moneda: string;
    descripcion: string | null;
    fecha_operacion: string;
    estado: string;
    origen: string | null;
    destino: string | null;
}

interface MovimientosPaginados {
    data: MovimientoFila[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface PorTipo {
    tipo_id: number;
    nombre: string;
    efecto: string;
    movimientos: number;
    monto_usd: number;
}

interface Filtros {
    buscar: string;
    tipo_movimiento_id: string | number;
    estado: string;
    desde: string;
    hasta: string;
}

interface MovimientosFinancierosProps {
    movimientos: MovimientosPaginados;
    porTipo: PorTipo[];
    totales: { movimientos: number; cancelados: number };
    tipos: Array<{ id: number; nombre: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatearFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Estilo por tipo de movimiento. Clases completas (Tailwind no genera las armadas con variables).
const estilosTipo: Record<
    string,
    {
        icono: React.ElementType;
        estado: 'agotado' | 'disponible' | 'tarjeta' | 'especial' | 'global';
        tarjeta: string;
        circulo: string;
        cifra: string;
        badge: string;
        signo: string;
    }
> = {
    'Gasto Operativo': {
        icono: TrendingDown,
        estado: 'agotado',
        tarjeta: 'border-red-400/30 bg-red-500/5 dark:bg-red-500/10',
        circulo: 'bg-red-500/15 text-red-600 dark:text-red-400',
        cifra: 'bg-gradient-to-r from-red-500 to-red-600 shadow-red-500/30',
        badge: 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300',
        signo: '-',
    },
    'Ingreso por Venta': {
        icono: TrendingUp,
        estado: 'disponible',
        tarjeta: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
        circulo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        cifra: 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/30',
        badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        signo: '+',
    },
    'Transferencia Interna': {
        icono: ArrowLeftRight,
        estado: 'tarjeta',
        tarjeta: 'border-sky-400/30 bg-sky-500/5 dark:bg-sky-500/10',
        circulo: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        cifra: 'bg-gradient-to-r from-sky-500 to-sky-600 shadow-sky-500/30',
        badge: 'border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        signo: '',
    },
    'Pago de Deuda': {
        icono: Banknote,
        estado: 'especial',
        tarjeta: 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10',
        circulo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        cifra: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30',
        badge: 'border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        signo: '-',
    },
};

const estiloPorDefecto = {
    icono: Wallet,
    estado: 'global' as const,
    tarjeta: 'border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/10',
    circulo: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    cifra: 'bg-gradient-to-r from-violet-500 to-violet-600 shadow-violet-500/30',
    badge: 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    signo: '',
};

// Se reconoce por el comienzo del nombre ("Gasto" o "Gasto Operativo", "Ingreso" o "Ingreso por Venta"...).
const estiloDe = (nombre: string) => {
    const clave = Object.keys(estilosTipo).find((c) => nombre.startsWith(c.split(' ')[0]));

    return clave ? estilosTipo[clave] : estiloPorDefecto;
};

export default function MovimientosFinancierosPage({ movimientos, porTipo, totales, tipos, filtros }: MovimientosFinancierosProps) {
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroTipo, setFiltroTipo] = useState(String(filtros.tipo_movimiento_id || 'all'));
    const [filtroEstado, setFiltroEstado] = useState(filtros.estado || 'all');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const aplicarFiltros = () => {
        router.get(
            route('reportes.movimientos_financieros'),
            {
                buscar: filtroBuscar.trim(),
                tipo_movimiento_id: filtroTipo === 'all' ? '' : filtroTipo,
                estado: filtroEstado === 'all' ? '' : filtroEstado,
                desde: filtroDesde,
                hasta: filtroHasta,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setFiltroBuscar('');
        setFiltroTipo('all');
        setFiltroEstado('all');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.movimientos_financieros'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos Financieros" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Movimientos Financieros"
                        description="Historial de ingresos, gastos y transferencias entre cuentas, con su estado y su equivalente en USD."
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
                            Mostrando totales de los {totales.movimientos} movimientos completados que cumplen los filtros (los cancelados no suman)
                        </span>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {porTipo.map((tipo) => {
                        const estilo = estiloDe(tipo.nombre);
                        const Icono = estilo.icono;

                        return (
                            <SpotlightCard
                                key={tipo.tipo_id}
                                estado={estilo.estado}
                                className={`rounded-lg border p-4 shadow-sm backdrop-blur-sm ${estilo.tarjeta}`}
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${estilo.circulo}`}>
                                        <Icono className="h-4 w-4" />
                                    </span>
                                    <p className="text-muted-foreground text-sm font-medium">{tipo.nombre}</p>
                                </div>
                                <Badge className={`gap-1 border-0 px-3 py-1 text-xl font-black text-white shadow-md ${estilo.cifra}`}>
                                    {tipo.movimientos.toLocaleString('es-ES')}
                                </Badge>
                                <p className="text-muted-foreground mt-2 text-xs">Equivale a ${formatearMonto(tipo.monto_usd)} USD</p>
                            </SpotlightCard>
                        );
                    })}

                    {/* Widget: Cancelados */}
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
                        <p className="text-muted-foreground mt-2 text-xs">No suman en los totales</p>
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
                                <CardDescription className="text-slate-300">Acota los movimientos por texto, tipo, estado o fechas.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Buscar por # de movimiento, descripción, cuenta, cliente o destino..."
                                value={filtroBuscar}
                                onChange={(e) => setFiltroBuscar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                className="pl-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Tipo</Label>
                                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        {tipos.map((tipo) => (
                                            <SelectItem key={tipo.id} value={tipo.id.toString()}>
                                                {tipo.nombre}
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
                                        <SelectItem value="cancelado">Cancelados</SelectItem>
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
                                <CardTitle className="text-white">Registro de Transacciones</CardTitle>
                                <CardDescription className="text-slate-300">Los más recientes primero.</CardDescription>
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
                                        <th className="px-4 py-3 text-left font-semibold">Movimiento</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                                        <th className="px-4 py-3 text-left font-semibold">Descripción</th>
                                        <th className="px-4 py-3 text-left font-semibold">Origen</th>
                                        <th className="px-4 py-3 text-left font-semibold">Destino</th>
                                        <th className="px-4 py-3 text-left font-semibold">Monto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {movimientos.data.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos
                                                    ? 'Ningún movimiento coincide con los filtros.'
                                                    : 'Todavía no hay movimientos financieros.'}
                                            </td>
                                        </tr>
                                    )}
                                    {movimientos.data.map((mov) => {
                                        const estilo = estiloDe(mov.tipo_movimiento);
                                        const cancelado = mov.estado === 'cancelado';
                                        const monto = Number(mov.monto);
                                        const montoUsd = mov.monto_usd !== null ? Number(mov.monto_usd) : null;

                                        return (
                                            <tr key={mov.id} className={`hover:bg-muted/40 transition-colors ${cancelado ? 'opacity-60' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">#{mov.id}</div>
                                                    <div className="text-muted-foreground text-xs whitespace-nowrap">
                                                        {formatearFechaHora(mov.fecha_operacion)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={`font-medium whitespace-nowrap ${estilo.badge}`}>{mov.tipo_movimiento}</Badge>
                                                </td>
                                                <td className="max-w-xs px-4 py-3">{mov.descripcion || '—'}</td>
                                                <td className="px-4 py-3">{mov.origen || '—'}</td>
                                                <td className="px-4 py-3">{mov.destino || '—'}</td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className={`font-semibold ${cancelado ? 'line-through' : ''}`}>
                                                        {estilo.signo}
                                                        {formatearMonto(monto)} {mov.moneda}
                                                    </div>
                                                    {montoUsd !== null && mov.moneda !== 'USD' && (
                                                        <div className="text-muted-foreground text-xs">≈ ${formatearMonto(montoUsd)} USD</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        className={`font-medium ${
                                                            cancelado
                                                                ? 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                                                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {cancelado ? 'Cancelado' : 'Completado'}
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
                                Mostrando {movimientos.from ?? 0} a {movimientos.to ?? 0} de {movimientos.total} resultados
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {movimientos.links.map((link, index) => {
                                    const etiqueta = link.label
                                        .replace('&laquo;', '«')
                                        .replace('&raquo;', '»')
                                        .replace('pagination.previous', '«')
                                        .replace('pagination.next', '»');

                                    return (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                        >
                                            {etiqueta}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
