import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, DollarSign, Filter, FilterX, HandCoins, Search, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Ventas por Vendedor',
        href: route('reportes.ventas_por_vendedor'),
    },
];

interface VendedorFila {
    id: number;
    vendedor: string;
    rol: string;
    total_ventas: number;
    monto_total_vendido: number;
    ganancia: number;
    comision: number;
}

interface Totales {
    vendedores: number;
    ventas: number;
    total: number;
    ganancia: number;
    comision: number;
}

interface Filtros {
    buscar: string;
    desde: string;
    hasta: string;
}

interface VentasPorVendedorProps {
    vendedores: VendedorFila[];
    totales: Totales;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatearMontoConSigno = (monto: number) => `${monto < 0 ? '-' : ''}${formatearMonto(Math.abs(monto))}`;

const etiquetasRol: Record<string, string> = {
    admin: 'Administrador',
    moderador: 'Moderador',
    vendedor: 'Vendedor',
};

// Vidrio por rol (sin blur: el badge se repite por fila).
const claseRol = (rol: string) => {
    if (rol === 'admin') {
        return 'border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300';
    }

    if (rol === 'moderador') {
        return 'border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300';
    }

    return 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300';
};

export default function VentasPorVendedorPage({ vendedores, totales, filtros }: VentasPorVendedorProps) {
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const aplicarFiltros = () => {
        router.get(
            route('reportes.ventas_por_vendedor'),
            { buscar: filtroBuscar.trim(), desde: filtroDesde, hasta: filtroHasta },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setFiltroBuscar('');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.ventas_por_vendedor'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas por Vendedor" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Ventas por Vendedor"
                        description="Rendimiento de cada vendedor en ventas completadas: total vendido, ganancia y comisión, por periodo."
                    />
                    <Users
                        size={70}
                        color="#e879f9"
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
                    {/* Widget: Vendedores */}
                    <SpotlightCard
                        estado="global"
                        className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-fuchsia-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                                <Users className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Vendedores con ventas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-fuchsia-500/30">
                            {totales.vendedores.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Ventas completadas */}
                    <SpotlightCard
                        estado="disponible"
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <ShoppingBag className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ventas completadas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-emerald-500/30">
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

                    {/* Widget: Ganancia (con la comisión pagada debajo) */}
                    <SpotlightCard
                        estado="tarjeta"
                        className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-sky-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ganancia</p>
                        </div>
                        <Badge
                            className={`gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md ${
                                totales.ganancia >= 0 ? 'from-sky-500 to-sky-600 shadow-sky-500/30' : 'from-red-500 to-red-600 shadow-red-500/30'
                            }`}
                        >
                            {formatearMontoConSigno(totales.ganancia)}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">Comisión: {formatearMonto(totales.comision)}</p>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-fuchsia-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-fuchsia-100">Acota las ventas por vendedor o por periodo.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="relative md:col-span-1">
                                <Label className="text-muted-foreground mb-1 block text-xs">Vendedor</Label>
                                <Search className="text-muted-foreground absolute top-[calc(50%+10px)] left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={filtroBuscar}
                                    onChange={(e) => setFiltroBuscar(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                    className="pl-9"
                                />
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

                <Card className="overflow-hidden border-l-4 border-fuchsia-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Rendimiento por Vendedor</CardTitle>
                                <CardDescription className="text-fuchsia-100">Ordenado por total vendido.</CardDescription>
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
                                        <th className="px-4 py-3 text-left font-semibold">Vendedor</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ventas</th>
                                        <th className="px-4 py-3 text-left font-semibold">Total vendido</th>
                                        <th className="px-4 py-3 text-left font-semibold">% del total</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ganancia</th>
                                        <th className="px-4 py-3 text-left font-semibold">Comisión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {vendedores.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos ? 'Ninguna venta coincide con los filtros.' : 'Todavía no hay ventas completadas.'}
                                            </td>
                                        </tr>
                                    )}
                                    {vendedores.map((vendedor) => {
                                        const participacion = totales.total > 0 ? (vendedor.monto_total_vendido / totales.total) * 100 : 0;

                                        return (
                                            <tr key={vendedor.id} className="hover:bg-muted/40 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">{vendedor.vendedor}</div>
                                                    <Badge className={`mt-1 text-xs font-medium ${claseRol(vendedor.rol)}`}>
                                                        {etiquetasRol[vendedor.rol] ?? vendedor.rol}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">{vendedor.total_ventas.toLocaleString('es-ES')}</td>
                                                <td className="px-4 py-3 font-semibold">{formatearMonto(vendedor.monto_total_vendido)}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className="border-fuchsia-400/30 bg-fuchsia-500/10 font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                                                        {participacion.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 1,
                                                            maximumFractionDigits: 1,
                                                        })}
                                                        %
                                                    </Badge>
                                                </td>
                                                <td
                                                    className={`px-4 py-3 font-semibold ${vendedor.ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                                                >
                                                    {formatearMontoConSigno(vendedor.ganancia)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <HandCoins className="text-muted-foreground h-3.5 w-3.5" />
                                                        {formatearMonto(vendedor.comision)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 text-sm">
                            Mostrando {vendedores.length} {vendedores.length === 1 ? 'vendedor' : 'vendedores'}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
