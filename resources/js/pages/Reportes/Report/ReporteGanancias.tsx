import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, CalendarClock, DollarSign, Filter, FilterX, HandCoins, PiggyBank, Receipt, Search, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Reporte de Ganancias',
        href: route('reportes.reporte_ganancias'),
    },
];

interface VentaFila {
    id: number;
    created_at: string;
    total: string | number;
    total_ganancia: string | number | null;
    ganancia_perdida_cambiaria: string | number | null;
    total_comision: string | number | null;
    ganancia_neta: string | number | null;
    usuario: { id: number; name: string } | null;
}

interface VentasPaginadas {
    data: VentaFila[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Totales {
    ventas: number;
    total: number;
    productos: number;
    cambiaria: number;
    comision: number;
    neta: number;
}

interface Filtros {
    buscar: string;
    user_id: string | number;
    desde: string;
    hasta: string;
}

interface ReporteGananciasProps {
    ventas: VentasPaginadas;
    totales: Totales;
    usuarios: Array<{ id: number; name: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatearMontoConSigno = (monto: number) => `${monto < 0 ? '-' : ''}${formatearMonto(Math.abs(monto))}`;

const claseSigno = (monto: number) => (monto >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400');

const formatearFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function ReporteGananciasPage({ ventas, totales, usuarios, filtros }: ReporteGananciasProps) {
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroUsuarioId, setFiltroUsuarioId] = useState(String(filtros.user_id || ''));
    const [filtroUsuarioSearch, setFiltroUsuarioSearch] = useState('');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const nombreUsuario = (id: string) => usuarios.find((u) => u.id.toString() === id)?.name ?? '';

    const aplicarFiltros = () => {
        router.get(
            route('reportes.reporte_ganancias'),
            { buscar: filtroBuscar.trim(), user_id: filtroUsuarioId, desde: filtroDesde, hasta: filtroHasta },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setFiltroBuscar('');
        setFiltroUsuarioId('');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.reporte_ganancias'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Ganancias" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte de Ganancias"
                        description="Rentabilidad de cada venta completada: ganancia de productos, resultado cambiario, comisión y ganancia neta."
                    />
                    <DollarSign
                        size={70}
                        color="#4ade80"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {hayFiltrosActivos && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <Filter size={12} />
                        <span>Mostrando totales de las {totales.ventas} ventas que cumplen los filtros</span>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {/* Widget: Total vendido */}
                    <SpotlightCard
                        estado="especial"
                        className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <DollarSign className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Total vendido</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xl font-black text-white shadow-md shadow-amber-500/30">
                            {formatearMonto(totales.total)}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">{totales.ventas.toLocaleString('es-ES')} ventas</p>
                    </SpotlightCard>

                    {/* Widget: Ganancia de productos */}
                    <SpotlightCard
                        estado="tarjeta"
                        className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-sky-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ganancia de productos</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-sky-500 to-sky-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-sky-500/30">
                            {formatearMontoConSigno(totales.productos)}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Resultado cambiario */}
                    <SpotlightCard
                        estado="indigo"
                        className="rounded-lg border border-violet-400/30 bg-violet-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-violet-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                <ArrowLeftRight className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Resultado cambiario</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-violet-500 to-violet-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-violet-500/30">
                            {formatearMontoConSigno(totales.cambiaria)}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Comisiones */}
                    <SpotlightCard
                        estado="agotado"
                        className="rounded-lg border border-rose-400/30 bg-rose-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-rose-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                <HandCoins className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Comisiones</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-rose-500/30">
                            {formatearMonto(totales.comision)}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Ganancia neta */}
                    <SpotlightCard
                        estado="disponible"
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <PiggyBank className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ganancia neta</p>
                        </div>
                        <Badge
                            className={`gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md ${
                                totales.neta >= 0
                                    ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/30'
                                    : 'from-red-500 to-red-600 shadow-red-500/30'
                            }`}
                        >
                            {formatearMontoConSigno(totales.neta)}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">Productos ± cambiario − comisión</p>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-green-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-green-100">Acota las ventas por número, vendedor o periodo.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Buscar por # de venta o vendedor..."
                                value={filtroBuscar}
                                onChange={(e) => setFiltroBuscar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                className="pl-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Vendedor</Label>
                                <Combobox
                                    value={filtroUsuarioId || null}
                                    onValueChange={(val) => setFiltroUsuarioId(val ?? '')}
                                    onInputValueChange={setFiltroUsuarioSearch}
                                    itemToStringLabel={nombreUsuario}
                                >
                                    <ComboboxInput className="w-full" placeholder="Cualquiera..." showClear />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            {usuarios
                                                .filter(
                                                    (u) => !filtroUsuarioSearch || u.name.toLowerCase().includes(filtroUsuarioSearch.toLowerCase()),
                                                )
                                                .map((usuario) => (
                                                    <ComboboxItem key={usuario.id} value={usuario.id.toString()}>
                                                        {usuario.name}
                                                    </ComboboxItem>
                                                ))}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
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

                <Card className="overflow-hidden border-l-4 border-green-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Detalle de Ganancias por Venta</CardTitle>
                                <CardDescription className="text-green-100">Las más recientes primero.</CardDescription>
                            </div>
                            <Link href={route('reportes.ventas_por_periodo')}>
                                <Button variant="secondary" size="sm" className="gap-1">
                                    <CalendarClock className="h-4 w-4" /> Ir a Ventas por Período
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Venta</th>
                                        <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                        <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                                        <th className="px-4 py-3 text-left font-semibold">Total vendido</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ganancia de productos</th>
                                        <th className="px-4 py-3 text-left font-semibold">Cambiario</th>
                                        <th className="px-4 py-3 text-left font-semibold">Comisión</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ganancia neta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {ventas.data.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos ? 'Ninguna venta coincide con los filtros.' : 'Todavía no hay ventas completadas.'}
                                            </td>
                                        </tr>
                                    )}
                                    {ventas.data.map((venta) => {
                                        const productos = Number(venta.total_ganancia ?? 0);
                                        const cambiaria = Number(venta.ganancia_perdida_cambiaria ?? 0);
                                        const comision = Number(venta.total_comision ?? 0);
                                        const neta = Number(venta.ganancia_neta ?? 0);

                                        return (
                                            <tr key={venta.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <Link href={route('ventas.show', venta.id)} className="inline-flex items-center gap-1.5">
                                                        <Badge className="border-green-400/30 bg-green-500/10 font-semibold text-green-700 dark:text-green-300">
                                                            <Receipt className="h-3 w-3" />#{venta.id}
                                                        </Badge>
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3">{formatearFechaHora(venta.created_at)}</td>
                                                <td className="px-4 py-3">{venta.usuario?.name ?? '—'}</td>
                                                <td className="px-4 py-3 font-semibold">{formatearMonto(Number(venta.total))}</td>
                                                <td className={`px-4 py-3 ${claseSigno(productos)}`}>{formatearMontoConSigno(productos)}</td>
                                                <td className={`px-4 py-3 ${cambiaria === 0 ? 'text-muted-foreground' : claseSigno(cambiaria)}`}>
                                                    {formatearMontoConSigno(cambiaria)}
                                                </td>
                                                <td className="px-4 py-3">{formatearMonto(comision)}</td>
                                                <td className={`px-4 py-3 font-bold ${claseSigno(neta)}`}>{formatearMontoConSigno(neta)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                                Mostrando {ventas.from ?? 0} a {ventas.to ?? 0} de {ventas.total} resultados
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ventas.links.map((link, index) => {
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
