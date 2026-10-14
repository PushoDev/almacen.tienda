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
import { Calculator, CalendarClock, DollarSign, Filter, FilterX, Receipt, Search, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Ventas por Período',
        href: route('reportes.ventas_por_periodo'),
    },
];

interface VentaFila {
    id: number;
    created_at: string;
    total: string | number;
    total_ganancia: string | number | null;
    es_venta_especial: boolean;
    es_venta_sin_comision: boolean;
    usuario: { id: number; name: string } | null;
    almacen: { id: number; nombre_almacen: string } | null;
    destinatario: { nombre: string; apellidos: string; telefono_contacto: string | null } | null;
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
    ganancia: number;
    promedio: number;
}

interface Filtros {
    buscar: string;
    user_id: string | number;
    almacen_id: string | number;
    desde: string;
    hasta: string;
}

interface VentasPorPeriodoProps {
    ventas: VentasPaginadas;
    totales: Totales;
    usuarios: Array<{ id: number; name: string }>;
    almacenes: Array<{ id: number; nombre_almacen: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatearFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function VentasPorPeriodoPage({ ventas, totales, usuarios, almacenes, filtros }: VentasPorPeriodoProps) {
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroUsuarioId, setFiltroUsuarioId] = useState(String(filtros.user_id || ''));
    const [filtroUsuarioSearch, setFiltroUsuarioSearch] = useState('');
    const [filtroAlmacenId, setFiltroAlmacenId] = useState(String(filtros.almacen_id || ''));
    const [filtroAlmacenSearch, setFiltroAlmacenSearch] = useState('');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const nombreUsuario = (id: string) => usuarios.find((u) => u.id.toString() === id)?.name ?? '';
    const nombreAlmacen = (id: string) => almacenes.find((a) => a.id.toString() === id)?.nombre_almacen ?? '';

    const aplicarFiltros = () => {
        router.get(
            route('reportes.ventas_por_periodo'),
            {
                buscar: filtroBuscar.trim(),
                user_id: filtroUsuarioId,
                almacen_id: filtroAlmacenId,
                desde: filtroDesde,
                hasta: filtroHasta,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setFiltroBuscar('');
        setFiltroUsuarioId('');
        setFiltroAlmacenId('');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.ventas_por_periodo'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas por Período" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Ventas por Período"
                        description="Historial de ventas completadas con su receptor, filtrable por fechas, vendedor y almacén."
                    />
                    <CalendarClock
                        size={70}
                        color="#2dd4bf"
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
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {/* Widget: Ventas completadas */}
                    <SpotlightCard
                        estado="disponible"
                        className="rounded-lg border border-teal-400/30 bg-teal-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-teal-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
                                <ShoppingBag className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ventas completadas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-teal-500/30">
                            {totales.ventas.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

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
                    </SpotlightCard>

                    {/* Widget: Ganancia */}
                    <SpotlightCard
                        estado="tarjeta"
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ganancia</p>
                        </div>
                        <Badge
                            className={`gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md ${
                                totales.ganancia >= 0
                                    ? 'from-emerald-500 to-emerald-600 shadow-emerald-500/30'
                                    : 'from-red-500 to-red-600 shadow-red-500/30'
                            }`}
                        >
                            {totales.ganancia < 0 ? '-' : ''}
                            {formatearMonto(Math.abs(totales.ganancia))}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Venta promedio */}
                    <SpotlightCard
                        estado="indigo"
                        className="rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-indigo-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                                <Calculator className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Venta promedio</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-indigo-500/30">
                            {formatearMonto(totales.promedio)}
                        </Badge>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-teal-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-teal-100">
                                    Acota las ventas por número, vendedor, receptor, almacén o fechas.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Buscar por # de venta, vendedor o por nombre, apellidos o teléfono del receptor..."
                                value={filtroBuscar}
                                onChange={(e) => setFiltroBuscar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                className="pl-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                                <Label className="text-muted-foreground mb-1 block text-xs">Almacén</Label>
                                <Combobox
                                    value={filtroAlmacenId || null}
                                    onValueChange={(val) => setFiltroAlmacenId(val ?? '')}
                                    onInputValueChange={setFiltroAlmacenSearch}
                                    itemToStringLabel={nombreAlmacen}
                                >
                                    <ComboboxInput className="w-full" placeholder="Cualquiera..." showClear />
                                    <ComboboxContent>
                                        <ComboboxList>
                                            {almacenes
                                                .filter(
                                                    (a) =>
                                                        !filtroAlmacenSearch ||
                                                        a.nombre_almacen.toLowerCase().includes(filtroAlmacenSearch.toLowerCase()),
                                                )
                                                .map((almacen) => (
                                                    <ComboboxItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre_almacen}
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

                <Card className="overflow-hidden border-l-4 border-teal-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Historial de Ventas Completadas</CardTitle>
                                <CardDescription className="text-teal-100">Las más recientes primero.</CardDescription>
                            </div>
                            <Link href={route('reportes.ventas_por_vendedor')}>
                                <Button variant="secondary" size="sm" className="gap-1">
                                    <Users className="h-4 w-4" /> Ir a Ventas por Vendedor
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
                                        <th className="px-4 py-3 text-left font-semibold">Almacén</th>
                                        <th className="px-4 py-3 text-left font-semibold">Receptor</th>
                                        <th className="px-4 py-3 text-left font-semibold">Total</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {ventas.data.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos ? 'Ninguna venta coincide con los filtros.' : 'Todavía no hay ventas completadas.'}
                                            </td>
                                        </tr>
                                    )}
                                    {ventas.data.map((venta) => {
                                        const ganancia = Number(venta.total_ganancia ?? 0);

                                        return (
                                            <tr key={venta.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <Link href={route('ventas.show', venta.id)} className="inline-flex items-center gap-1.5">
                                                        <Badge className="border-teal-400/30 bg-teal-500/10 font-semibold text-teal-700 dark:text-teal-300">
                                                            <Receipt className="h-3 w-3" />#{venta.id}
                                                        </Badge>
                                                    </Link>
                                                    {(venta.es_venta_especial || venta.es_venta_sin_comision) && (
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {venta.es_venta_especial && (
                                                                <Badge className="border-amber-400/30 bg-amber-500/10 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                                    Especial
                                                                </Badge>
                                                            )}
                                                            {venta.es_venta_sin_comision && (
                                                                <Badge className="border-fuchsia-400/30 bg-fuchsia-500/10 text-xs font-medium text-fuchsia-700 dark:text-fuchsia-300">
                                                                    Sin comisión
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">{formatearFechaHora(venta.created_at)}</td>
                                                <td className="px-4 py-3">{venta.usuario?.name ?? '—'}</td>
                                                <td className="px-4 py-3">{venta.almacen?.nombre_almacen ?? '—'}</td>
                                                <td className="px-4 py-3">
                                                    {venta.destinatario ? (
                                                        <>
                                                            <div className="font-medium">
                                                                {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                                            </div>
                                                            {venta.destinatario.telefono_contacto && (
                                                                <div className="text-muted-foreground text-xs">
                                                                    {venta.destinatario.telefono_contacto}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground">Sin receptor</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-semibold">{formatearMonto(Number(venta.total))}</td>
                                                <td
                                                    className={`px-4 py-3 font-semibold ${ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                                                >
                                                    {ganancia < 0 ? '-' : ''}
                                                    {formatearMonto(Math.abs(ganancia))}
                                                </td>
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
