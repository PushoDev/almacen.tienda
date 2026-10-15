import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, Filter, FilterX, History, LibraryBig, Minus, Scale, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reportes', href: route('reportes.index') },
    { title: 'Cambios de Precio de Costo', href: route('reportes.historial_costo_precio') },
];

interface HistorialFila {
    id: number;
    producto: string;
    marca: string;
    modelo: string;
    almacen: string;
    usuario: string;
    precio_anterior: number;
    precio_nuevo: number;
    diferencia: number;
    stock_momento: number;
    impacto_financiero: number;
    motivo: string | null;
    fecha: string;
}

interface HistorialPaginado {
    data: HistorialFila[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Stats {
    cambios: number;
    total_ganancias: number;
    total_perdidas: number;
    neto_impacto: number;
    cambios_con_ganancia: number;
    cambios_con_perdida: number;
}

interface Filtros {
    buscar: string;
    user_id: string | number;
    almacen_id: string | number;
    resultado: string;
    desde: string;
    hasta: string;
}

interface Props {
    historial: HistorialPaginado;
    stats: Stats;
    usuarios: Array<{ id: number; name: string }>;
    almacenes: Array<{ id: number; nombre_almacen: string }>;
    filtros: Filtros;
}

const formatearMonto = (monto: number) => `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatearFechaHora = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function HistorialCostoPrecioPage({ historial, stats, usuarios, almacenes, filtros }: Props) {
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');
    const [filtroUsuarioId, setFiltroUsuarioId] = useState(String(filtros.user_id || ''));
    const [filtroUsuarioSearch, setFiltroUsuarioSearch] = useState('');
    const [filtroAlmacenId, setFiltroAlmacenId] = useState(String(filtros.almacen_id || ''));
    const [filtroAlmacenSearch, setFiltroAlmacenSearch] = useState('');
    const [filtroResultado, setFiltroResultado] = useState(filtros.resultado || 'all');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);
    const netoPositivo = stats.neto_impacto >= 0;

    const nombreUsuario = (id: string) => usuarios.find((u) => u.id.toString() === id)?.name ?? '';
    const nombreAlmacen = (id: string) => almacenes.find((a) => a.id.toString() === id)?.nombre_almacen ?? '';

    const aplicarFiltros = () => {
        router.get(
            route('reportes.historial_costo_precio'),
            {
                buscar: filtroBuscar.trim(),
                user_id: filtroUsuarioId,
                almacen_id: filtroAlmacenId,
                resultado: filtroResultado === 'all' ? '' : filtroResultado,
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
        setFiltroResultado('all');
        setFiltroDesde('');
        setFiltroHasta('');
        router.get(route('reportes.historial_costo_precio'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cambios de Precio de Costo" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Cambios de Precio de Costo"
                        description="Auditoría de cambios al costo de los productos, con su impacto financiero estimado (ganancias y pérdidas en papel)."
                    />
                    <LibraryBig
                        size={70}
                        color="#fb7185"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {hayFiltrosActivos && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <Filter size={12} />
                        <span>Mostrando totales de los {stats.cambios} cambios que cumplen los filtros</span>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {/* Widget: Cambios */}
                    <SpotlightCard
                        estado="global"
                        className="rounded-lg border border-rose-400/30 bg-rose-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-rose-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                <History className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Cambios de costo</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-rose-500/30">
                            {stats.cambios.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Ganancia en papel */}
                    <SpotlightCard
                        estado="disponible"
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Ganancia en papel</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-emerald-500/30">
                            +{formatearMonto(stats.total_ganancias)}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">{stats.cambios_con_ganancia.toLocaleString('es-ES')} cambios</p>
                    </SpotlightCard>

                    {/* Widget: Pérdida en papel */}
                    <SpotlightCard
                        estado="agotado"
                        className="rounded-lg border border-red-400/30 bg-red-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-red-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                                <TrendingDown className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Pérdida en papel</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-red-500 to-red-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-red-500/30">
                            -{formatearMonto(stats.total_perdidas)}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">{stats.cambios_con_perdida.toLocaleString('es-ES')} cambios</p>
                    </SpotlightCard>

                    {/* Widget: Impacto neto */}
                    <SpotlightCard
                        estado="tarjeta"
                        className="rounded-lg border border-sky-400/30 bg-sky-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-sky-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                <Scale className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Impacto neto</p>
                        </div>
                        <Badge
                            className={`gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md ${
                                netoPositivo ? 'from-sky-500 to-sky-600 shadow-sky-500/30' : 'from-orange-500 to-orange-600 shadow-orange-500/30'
                            }`}
                        >
                            {netoPositivo ? '+' : '-'}
                            {formatearMonto(Math.abs(stats.neto_impacto))}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">Ganancias menos pérdidas</p>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-rose-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Search className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros de Búsqueda</CardTitle>
                                <CardDescription className="text-rose-100">
                                    Acota los cambios por producto, usuario, almacén, resultado o fechas.
                                </CardDescription>
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
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
                            <div>
                                <Label className="text-muted-foreground mb-1 block text-xs">Usuario</Label>
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
                                <Label className="text-muted-foreground mb-1 block text-xs">Resultado</Label>
                                <Select value={filtroResultado} onValueChange={setFiltroResultado}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los resultados</SelectItem>
                                        <SelectItem value="ganancia">Con ganancia en papel</SelectItem>
                                        <SelectItem value="perdida">Con pérdida en papel</SelectItem>
                                        <SelectItem value="sin_impacto">Sin impacto</SelectItem>
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

                <Card className="overflow-hidden border-l-4 border-rose-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Cambios registrados</CardTitle>
                                <CardDescription className="text-rose-100">Los más recientes primero.</CardDescription>
                            </div>
                            <Link href={route('reportes.historial_precios')}>
                                <Button variant="secondary" size="sm" className="gap-1">
                                    <History className="h-4 w-4" /> Ir a Historial de Precios
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                                        <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Almacén</th>
                                        <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                                        <th className="px-4 py-3 text-left font-semibold">Costo anterior</th>
                                        <th className="px-4 py-3 text-left font-semibold">Costo nuevo</th>
                                        <th className="px-4 py-3 text-left font-semibold">Stock</th>
                                        <th className="px-4 py-3 text-left font-semibold">Impacto financiero</th>
                                        <th className="px-4 py-3 text-left font-semibold">Motivo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {historial.data.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos
                                                    ? 'Ningún cambio coincide con los filtros.'
                                                    : 'Todavía no hay cambios de costo registrados.'}
                                            </td>
                                        </tr>
                                    )}
                                    {historial.data.map((fila) => (
                                        <tr key={fila.id} className="hover:bg-muted/40 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap">{formatearFechaHora(fila.fecha)}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{fila.producto}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {[fila.marca, fila.modelo].filter(Boolean).join(' · ')}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{fila.almacen}</td>
                                            <td className="px-4 py-3">{fila.usuario}</td>
                                            <td className="px-4 py-3">{formatearMonto(fila.precio_anterior)}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold">{formatearMonto(fila.precio_nuevo)}</div>
                                                {fila.diferencia !== 0 && (
                                                    <div
                                                        className={`inline-flex items-center gap-0.5 text-xs ${fila.diferencia > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                                                    >
                                                        {fila.diferencia > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                        {formatearMonto(Math.abs(fila.diferencia))}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">{fila.stock_momento.toLocaleString('es-ES')}</td>
                                            <td className="px-4 py-3">
                                                {fila.impacto_financiero === 0 ? (
                                                    <span className="text-muted-foreground inline-flex items-center gap-1">
                                                        <Minus className="h-3.5 w-3.5" /> Sin impacto
                                                    </span>
                                                ) : (
                                                    <Badge
                                                        className={`font-semibold ${
                                                            fila.impacto_financiero > 0
                                                                ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                : 'border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300'
                                                        }`}
                                                    >
                                                        {fila.impacto_financiero > 0 ? '+' : '-'}
                                                        {formatearMonto(Math.abs(fila.impacto_financiero))}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="text-muted-foreground px-4 py-3">{fila.motivo ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm">
                                Mostrando {historial.from ?? 0} a {historial.to ?? 0} de {historial.total} resultados
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {historial.links.map((link, index) => {
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
