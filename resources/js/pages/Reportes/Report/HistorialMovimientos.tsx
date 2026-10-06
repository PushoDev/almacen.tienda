import HeadingSmall from '@/components/heading-small';
import { EstadoBadge, resumenUnidades } from '@/components/movimiento-estado';
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
import { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronRight,
    ClipboardList,
    Filter,
    FilterX,
    ListCheck,
    PackageCheck,
    PackageMinus,
    Printer,
    Repeat,
    Search,
    Send,
    TrendingUp,
} from 'lucide-react';
import { Fragment, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Historial de Movimientos',
        href: route('reportes.historial_movimientos'),
    },
];

interface MovimientoFila {
    id: number;
    estado: string;
    created_at: string;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    guia_transporte: string | null;
    transportista: string | null;
    almacen_origen: { id: number; nombre_almacen: string } | null;
    almacen_destino: { id: number; nombre_almacen: string } | null;
    usuario: { id: number; name: string } | null;
    enviado_por: string | null;
    recibido_por: string | null;
    rechazado_por: string | null;
    detalles: Array<{
        id: number;
        cantidad_solicitada: number;
        cantidad_despachada: number;
        cantidad_recibida: number | null;
        observaciones: string | null;
        producto: {
            id: number;
            nombre_producto: string;
            marca_producto: string | null;
            modelo_producto: string | null;
            capacidad_producto: string | null;
            color_producto: string | null;
        } | null;
    }>;
}

interface Totales {
    movimientos: number;
    unidades_solicitadas: number;
    unidades_despachadas: number;
    unidades_recibidas: number;
    por_estado: Record<string, number>;
    parciales: {
        movimientos: number;
        unidades_faltantes: number;
    };
}

interface MovimientoPaginado {
    data: MovimientoFila[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Filtros {
    estado: string;
    almacen_origen_id: string | number;
    almacen_destino_id: string | number;
    sentido: string;
    desde: string;
    hasta: string;
    buscar: string;
}

interface HistorialMovimientosProps {
    movimientos: MovimientoPaginado;
    totales: Totales;
    almacenes: Array<{ id: number; nombre_almacen: string }>;
    esVendedor: boolean;
    filtros: Filtros;
    estados: Record<string, string>;
}

const formatearFecha = (fecha: string | null) =>
    fecha ? new Date(fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function HistorialMovimientosPage({ movimientos, totales, almacenes, esVendedor, filtros, estados }: HistorialMovimientosProps) {
    const [filaAbiertaId, setFilaAbiertaId] = useState<number | null>(null);
    const [filtroEstado, setFiltroEstado] = useState(filtros.estado || 'all');
    const [filtroSentido, setFiltroSentido] = useState(filtros.sentido || 'all');
    const [filtroOrigenId, setFiltroOrigenId] = useState(String(filtros.almacen_origen_id || ''));
    const [filtroDestinoId, setFiltroDestinoId] = useState(String(filtros.almacen_destino_id || ''));
    const [filtroOrigenSearch, setFiltroOrigenSearch] = useState('');
    const [filtroDestinoSearch, setFiltroDestinoSearch] = useState('');
    const [filtroDesde, setFiltroDesde] = useState(filtros.desde || '');
    const [filtroHasta, setFiltroHasta] = useState(filtros.hasta || '');
    const [filtroBuscar, setFiltroBuscar] = useState(filtros.buscar || '');

    const hayFiltrosActivos = Object.values(filtros).some((valor) => valor !== '' && valor !== null);

    const nombreAlmacen = (id: string) => almacenes.find((a) => a.id.toString() === id)?.nombre_almacen ?? '';

    // `estadoForzado` permite filtrar desde un widget sin esperar a que el estado local se actualice
    const aplicarFiltros = (estadoForzado?: string) => {
        const estado = estadoForzado ?? filtroEstado;

        router.get(
            route('reportes.historial_movimientos'),
            {
                estado: estado === 'all' ? '' : estado,
                sentido: filtroSentido === 'all' ? '' : filtroSentido,
                almacen_origen_id: filtroOrigenId,
                almacen_destino_id: filtroDestinoId,
                desde: filtroDesde,
                hasta: filtroHasta,
                buscar: filtroBuscar.trim(),
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // El widget "Recibidos parcialmente" alterna el filtro de estado: lo aplica, o lo quita si ya estaba
    const soloParciales = filtros.estado === 'recibido_parcial';

    const alternarSoloParciales = () => {
        const estado = soloParciales ? 'all' : 'recibido_parcial';

        setFiltroEstado(estado);
        aplicarFiltros(estado);
    };

    const limpiarFiltros = () => {
        setFiltroEstado('all');
        setFiltroSentido('all');
        setFiltroOrigenId('');
        setFiltroDestinoId('');
        setFiltroDesde('');
        setFiltroHasta('');
        setFiltroBuscar('');
        router.get(route('reportes.historial_movimientos'), {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Movimientos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de Movimientos"
                        description="Todos los traslados de inventario entre almacenes, con filtros y detalle."
                    />
                    <Repeat
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {hayFiltrosActivos && (
                    <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                        <Filter size={12} />
                        <span>Mostrando totales de los {totales.movimientos} movimientos que cumplen los filtros</span>
                    </div>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {/* Widget: Movimientos (con el desglose por estado) */}
                    <SpotlightCard
                        estado="global"
                        className="rounded-lg border border-violet-400/30 bg-violet-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-violet-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                <Repeat className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Movimientos</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-violet-500 to-violet-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-violet-500/30">
                            {totales.movimientos.toLocaleString('es-ES')}
                        </Badge>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                            {Object.entries(totales.por_estado).map(([estado, total]) => (
                                <span key={estado} className="text-muted-foreground text-xs">
                                    {total} {(estados[estado] ?? estado).toLowerCase()}
                                </span>
                            ))}
                        </div>
                    </SpotlightCard>

                    {/* Widget: Unidades solicitadas */}
                    <SpotlightCard
                        estado="tarjeta"
                        className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-blue-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                <ClipboardList className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Unidades solicitadas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-blue-500/30">
                            {totales.unidades_solicitadas.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Unidades despachadas */}
                    <SpotlightCard
                        estado="especial"
                        className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                <Send className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Unidades despachadas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xl font-black text-white shadow-md shadow-amber-500/30">
                            {totales.unidades_despachadas.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Unidades recibidas */}
                    <SpotlightCard
                        estado="disponible"
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <PackageCheck className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Unidades recibidas</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-emerald-500/30">
                            {totales.unidades_recibidas.toLocaleString('es-ES')}
                        </Badge>
                    </SpotlightCard>

                    {/* Widget: Recibidos parcialmente (llegó menos de lo despachado) */}
                    <SpotlightCard
                        estado="indigo"
                        role="button"
                        tabIndex={0}
                        aria-pressed={soloParciales}
                        aria-label={soloParciales ? 'Quitar el filtro de recibidos parcialmente' : 'Filtrar por recibidos parcialmente'}
                        onClick={alternarSoloParciales}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                alternarSoloParciales();
                            }
                        }}
                        className={`cursor-pointer rounded-lg border border-cyan-400/30 bg-cyan-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-cyan-500/10 ${soloParciales ? 'ring-2 ring-cyan-400/60' : ''}`}
                    >
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                                <PackageMinus className="h-4 w-4" />
                            </span>
                            <p className="text-muted-foreground text-sm font-medium">Recibidos parcialmente</p>
                        </div>
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-cyan-500/30">
                            {totales.parciales.movimientos.toLocaleString('es-ES')}
                        </Badge>
                        <p className="text-muted-foreground mt-2 text-xs">
                            {totales.parciales.unidades_faltantes.toLocaleString('es-ES')}{' '}
                            {totales.parciales.unidades_faltantes === 1 ? 'unidad no llegó' : 'unidades no llegaron'}
                        </p>
                        <p className="mt-1 text-xs text-cyan-600 dark:text-cyan-400">
                            {soloParciales ? 'Mostrando solo parciales · clic para quitar' : 'Clic para ver solo estos'}
                        </p>
                    </SpotlightCard>
                </div>

                <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-white">Movimientos registrados</CardTitle>
                                <CardDescription className="text-violet-100">
                                    {esVendedor ? 'Los que salen de o llegan a tus almacenes.' : 'Todos los almacenes.'}
                                </CardDescription>
                            </div>
                            <Link href={route('movimientos.index')}>
                                <Button variant="secondary" size="sm" className="gap-1">
                                    <Repeat className="h-4 w-4" /> Ir a Movimientos
                                </Button>
                            </Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted/30 mb-4 space-y-3 rounded-lg border p-4">
                            <div className="relative">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    type="text"
                                    placeholder="Buscar por # de movimiento, producto, marca, modelo o solicitante..."
                                    value={filtroBuscar}
                                    onChange={(e) => setFiltroBuscar(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                    className="pl-9"
                                />
                            </div>
                            <div className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${esVendedor ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
                                <div>
                                    <Label className="text-muted-foreground mb-1 block text-xs">Estado</Label>
                                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Todos" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos los estados</SelectItem>
                                            {Object.entries(estados).map(([valor, etiqueta]) => (
                                                <SelectItem key={valor} value={valor}>
                                                    {etiqueta}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {esVendedor && (
                                    <div>
                                        <Label className="text-muted-foreground mb-1 block text-xs">Sentido</Label>
                                        <Select value={filtroSentido} onValueChange={setFiltroSentido}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Todos" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Salientes y entrantes</SelectItem>
                                                <SelectItem value="salientes">Salientes (de mis almacenes)</SelectItem>
                                                <SelectItem value="entrantes">Entrantes (a mis almacenes)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div>
                                    <Label className="text-muted-foreground mb-1 block text-xs">Almacén origen</Label>
                                    <Combobox
                                        value={filtroOrigenId || null}
                                        onValueChange={(val) => setFiltroOrigenId(val ?? '')}
                                        onInputValueChange={setFiltroOrigenSearch}
                                        itemToStringLabel={nombreAlmacen}
                                    >
                                        <ComboboxInput className="w-full" placeholder="Cualquiera..." showClear />
                                        <ComboboxContent>
                                            <ComboboxList>
                                                {almacenes
                                                    .filter(
                                                        (a) =>
                                                            !filtroOrigenSearch ||
                                                            a.nombre_almacen.toLowerCase().includes(filtroOrigenSearch.toLowerCase()),
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
                                    <Label className="text-muted-foreground mb-1 block text-xs">Almacén destino</Label>
                                    <Combobox
                                        value={filtroDestinoId || null}
                                        onValueChange={(val) => setFiltroDestinoId(val ?? '')}
                                        onInputValueChange={setFiltroDestinoSearch}
                                        itemToStringLabel={nombreAlmacen}
                                    >
                                        <ComboboxInput className="w-full" placeholder="Cualquiera..." showClear />
                                        <ComboboxContent>
                                            <ComboboxList>
                                                {almacenes
                                                    .filter(
                                                        (a) =>
                                                            !filtroDestinoSearch ||
                                                            a.nombre_almacen.toLowerCase().includes(filtroDestinoSearch.toLowerCase()),
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
                                <Button size="sm" onClick={() => aplicarFiltros()} className="gap-1">
                                    <Filter className="h-4 w-4" /> Filtrar
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <tr>
                                        <th className="w-10 px-2 py-3"></th>
                                        <th className="px-4 py-3 text-left font-semibold">Movimiento</th>
                                        <th className="px-4 py-3 text-left font-semibold">Origen → Destino</th>
                                        <th className="px-4 py-3 text-left font-semibold">Productos / Unidades</th>
                                        <th className="px-4 py-3 text-left font-semibold">Estado</th>
                                        <th className="px-4 py-3 text-left font-semibold">Solicitado por</th>
                                        <th className="px-4 py-3 text-left font-semibold">Envío</th>
                                        <th className="px-4 py-3 text-left font-semibold">Recepción</th>
                                        <th className="px-4 py-3 text-left font-semibold">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {movimientos.data.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-muted-foreground px-6 py-10 text-center">
                                                {hayFiltrosActivos ? 'Ningún movimiento coincide con los filtros.' : 'Todavía no hay movimientos.'}
                                            </td>
                                        </tr>
                                    )}
                                    {movimientos.data.map((movimiento) => (
                                        <Fragment key={movimiento.id}>
                                            <tr className="hover:bg-muted/40 transition-colors">
                                                <td className="px-2 py-3">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setFilaAbiertaId(filaAbiertaId === movimiento.id ? null : movimiento.id)}
                                                        aria-label={`${filaAbiertaId === movimiento.id ? 'Ocultar' : 'Ver'} productos del movimiento ${movimiento.id}`}
                                                        aria-expanded={filaAbiertaId === movimiento.id}
                                                    >
                                                        {filaAbiertaId === movimiento.id ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">#{movimiento.id}</div>
                                                    <div className="text-muted-foreground text-xs">{formatearFecha(movimiento.created_at)}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{movimiento.almacen_origen?.nombre_almacen}</span>
                                                        <TrendingUp className="h-4 w-4 shrink-0 rotate-90" />
                                                        <span className="font-medium">{movimiento.almacen_destino?.nombre_almacen}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold">
                                                        {movimiento.detalles.length} {movimiento.detalles.length === 1 ? 'producto' : 'productos'}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">{resumenUnidades(movimiento)}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <EstadoBadge estado={movimiento.estado} label={estados[movimiento.estado]} />
                                                </td>
                                                <td className="px-4 py-3">{movimiento.usuario?.name}</td>
                                                <td className="px-4 py-3">
                                                    <div>{formatearFecha(movimiento.fecha_envio)}</div>
                                                    {movimiento.enviado_por && (
                                                        <div className="text-muted-foreground text-xs">Por {movimiento.enviado_por}</div>
                                                    )}
                                                    {(movimiento.transportista || movimiento.guia_transporte) && (
                                                        <div className="text-muted-foreground text-xs">
                                                            {[
                                                                movimiento.transportista,
                                                                movimiento.guia_transporte && `Guía ${movimiento.guia_transporte}`,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div>{formatearFecha(movimiento.fecha_recepcion)}</div>
                                                    {movimiento.recibido_por && (
                                                        <div className="text-muted-foreground text-xs">Por {movimiento.recibido_por}</div>
                                                    )}
                                                    {movimiento.rechazado_por && (
                                                        <div className="text-xs text-red-500">Rechazado por {movimiento.rechazado_por}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link href={route('movimientos.show', movimiento.id)}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                title="Ver detalle completo"
                                                                aria-label={`Ver detalle del movimiento ${movimiento.id}`}
                                                            >
                                                                <ListCheck className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Imprimir hoja del movimiento"
                                                            aria-label={`Imprimir hoja del movimiento ${movimiento.id}`}
                                                            onClick={() => window.open(route('movimientos.imprimir', movimiento.id), '_blank')}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {filaAbiertaId === movimiento.id && (
                                                <tr className="bg-muted/20">
                                                    <td colSpan={9} className="px-6 py-4">
                                                        <table className="w-full text-xs">
                                                            <thead className="text-muted-foreground">
                                                                <tr>
                                                                    <th className="py-1 text-left font-semibold">Producto</th>
                                                                    <th className="py-1 text-center font-semibold">Solicitado</th>
                                                                    <th className="py-1 text-center font-semibold">Despachado</th>
                                                                    <th className="py-1 text-center font-semibold">Recibido</th>
                                                                    <th className="py-1 text-center font-semibold">Diferencia</th>
                                                                    <th className="py-1 text-left font-semibold">Observaciones</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {movimiento.detalles.map((detalle) => {
                                                                    const fueRecibido = ['recibido_completo', 'recibido_parcial'].includes(
                                                                        movimiento.estado,
                                                                    );
                                                                    const diferencia = fueRecibido
                                                                        ? detalle.cantidad_despachada - (detalle.cantidad_recibida ?? 0)
                                                                        : 0;

                                                                    return (
                                                                        <tr key={detalle.id}>
                                                                            <td className="py-1.5">
                                                                                <div className="font-medium">{detalle.producto?.nombre_producto}</div>
                                                                                <div className="text-muted-foreground">
                                                                                    {[
                                                                                        detalle.producto?.marca_producto,
                                                                                        detalle.producto?.modelo_producto,
                                                                                        detalle.producto?.capacidad_producto,
                                                                                        detalle.producto?.color_producto,
                                                                                    ]
                                                                                        .filter(Boolean)
                                                                                        .join(' · ')}
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-1.5 text-center">{detalle.cantidad_solicitada}</td>
                                                                            <td className="py-1.5 text-center">{detalle.cantidad_despachada}</td>
                                                                            <td className="py-1.5 text-center">
                                                                                {fueRecibido ? (detalle.cantidad_recibida ?? 0) : '—'}
                                                                            </td>
                                                                            <td
                                                                                className={`py-1.5 text-center font-semibold ${diferencia !== 0 ? 'text-amber-500' : ''}`}
                                                                            >
                                                                                {fueRecibido ? diferencia : '—'}
                                                                            </td>
                                                                            <td className="text-muted-foreground py-1.5">
                                                                                {detalle.observaciones || '—'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
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
