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
import { Boxes, CalendarClock, DollarSign, Filter, FilterX, Package, Search, ShoppingBag, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Productos Más Vendidos',
        href: route('reportes.productos_mas_vendidos'),
    },
];

interface ProductoVendido {
    id: number;
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    capacidad_producto: string | null;
    color_producto: string | null;
    total_vendido: number;
    veces_vendido: number;
    ingresos: number;
    ganancia: number;
}

interface Totales {
    unidades: number;
    productos: number;
    ventas: number;
    ingresos: number;
}

interface Filtros {
    almacen_id: string | number;
    desde: string;
    hasta: string;
    buscar: string;
}

interface ProductosMasVendidosProps {
    productos: ProductoVendido[];
    totales: Totales;
    almacenes: Array<{ id: number; nombre_almacen: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Puestos 1 a 3 en metálico; el resto en vidrio (sin blur: el badge se repite por fila).
const claseRanking = (posicion: number) => {
    if (posicion === 1) {
        return 'border-0 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 font-black text-amber-950';
    }

    if (posicion === 2) {
        return 'border-0 bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 font-black text-slate-800';
    }

    if (posicion === 3) {
        return 'border-0 bg-gradient-to-r from-orange-300 via-amber-500 to-orange-300 font-black text-orange-950';
    }

    return 'border-cyan-400/30 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-300';
};

export default function ProductosMasVendidosPage({ productos, totales, almacenes, filtros }: ProductosMasVendidosProps) {
    const [filtroAlmacenId, setFiltroAlmacenId] = useState(String(filtros.almacen_id || ''));
    const [filtroAlmacenSearch, setFiltroAlmacenSearch] = useState('');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const nombreAlmacen = (id: string) => almacenes.find((a) => a.id.toString() === id)?.nombre_almacen ?? '';

    const aplicarFiltros = () => {
        router.get(
            route('reportes.productos_mas_vendidos'),
            {
                almacen_id: filtroAlmacenId,
                desde: filtroDesde,
                hasta: filtroHasta,
                buscar: filtroBuscar.trim(),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const limpiarFiltros = () => {
        setFiltroAlmacenId('');
        setFiltroDesde('');
        setFiltroHasta('');
        setFiltroBuscar('');
        router.get(route('reportes.productos_mas_vendidos'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos Más Vendidos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Productos Más Vendidos"
                        description="Los 10 productos con más unidades vendidas, solo de ventas completadas, con filtros."
                    />
                    <TrendingUp
                        size={70}
                        color="#22d3ee"
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
                    {/* Widget: Unidades vendidas */}
                    <SpotlightCard
                        estado="indigo"
                        className="rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-cyan-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                <Package className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Unidades vendidas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-cyan-500/30">
                            {totales.unidades.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Productos distintos */}
                    <SpotlightCard
                        estado="global"
                        className="rounded-lg border border-violet-400/30 bg-violet-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-violet-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                <Boxes className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Productos distintos</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-violet-500 to-violet-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-violet-500/30">
                            {totales.productos.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Ventas */}
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

                    {/* Widget: Ingresos */}
                    <SpotlightCard
                        estado="especial"
                        className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <DollarSign className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ingresos por ventas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xl font-black text-white shadow-md shadow-amber-500/30">
                            {formatearMonto(totales.ingresos)}
                        </Badge>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-cyan-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-cyan-100">Acota las ventas por producto, almacén o fechas.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Buscar por producto, marca o modelo..."
                                value={filtroBuscar}
                                onChange={(e) => setFiltroBuscar(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                className="pl-9"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
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

                <Card className="overflow-hidden border-l-4 border-cyan-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Top 10 productos más vendidos</CardTitle>
                                <CardDescription className="text-cyan-100">Ordenados por unidades vendidas.</CardDescription>
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
                                        <th className="w-16 px-4 py-3 text-left font-semibold">Puesto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Unidades vendidas</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ventas</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ingresos</th>
                                        <th className="px-4 py-3 text-left font-semibold">Ganancia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {productos.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos ? 'Ninguna venta coincide con los filtros.' : 'Todavía no hay ventas completadas.'}
                                            </td>
                                        </tr>
                                    )}
                                    {productos.map((producto, index) => (
                                        <tr key={producto.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="px-4 py-3">
                                                <Badge className={`px-3 ${claseRanking(index + 1)}`}>#{index + 1}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{producto.nombre_producto}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {[
                                                        producto.marca_producto,
                                                        producto.modelo_producto,
                                                        producto.capacidad_producto,
                                                        producto.color_producto,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge className="border-cyan-400/30 bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-300">
                                                    {producto.total_vendido.toLocaleString('es-ES')}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">{producto.veces_vendido.toLocaleString('es-ES')}</td>
                                            <td className="px-4 py-3">{formatearMonto(producto.ingresos)}</td>
                                            <td
                                                className={`px-4 py-3 font-semibold ${producto.ganancia >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                                            >
                                                {producto.ganancia < 0 ? '-' : ''}
                                                {formatearMonto(Math.abs(producto.ganancia))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 text-sm">
                            Mostrando {productos.length} de {totales.productos.toLocaleString('es-ES')} productos vendidos
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
