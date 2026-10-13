import HeadingSmall from '@/components/heading-small';
import { RolBadge } from '@/components/rol-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, ComputerIcon, Eye, Filter, History, Plus, ShoppingCart, Store, TrendingDown, Truck, User, Wallet, X } from 'lucide-react';
import { useMemo } from 'react';

interface Cierre {
    id: number;
    fecha_apertura: string | null;
    fecha_cierre: string;
    usuario: { name: string; role: 'admin' | 'moderador' | 'vendedor' };
    // Monto real del cierre: saldo_esperado se calcula de las operaciones reales del período,
    // a diferencia de saldo_contado (conteo físico manual, sin input real en la UI todavía —
    // decisión del cliente).
    saldo_esperado: number;
    // Nombres distintos de quienes atendieron dentro del rango del cierre: la cuenta es compartida por
    // punto de venta, no por persona, así que varios empleados pueden haberse relevado antes de cerrar.
    responsables_turno: string[];
    /** Quién cerró (turno activo al cerrar); null en los cierres anteriores a guardarlo. */
    turno_cierre: string | null;
    ventas_total_usd: number;
    /** null en los cierres anteriores a guardar los turnos (no se inventa). */
    ventas_count: number | null;
    /** false en los cierres anteriores a guardar los envíos en tránsito. */
    envios_guardados: boolean;
    envios_en_transito_total: number;
    envios_atrasados: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Vendedor {
    id: number;
    name: string;
}

interface ResumenListado {
    total: number;
    ventas_total_usd: number;
    saldo_negativo: number;
    con_transito: number;
    envios_atrasados: number;
}

interface Props extends PageProps {
    cierres: {
        data: Cierre[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    resumen: ResumenListado;
    filters: {
        fecha_desde?: string;
        fecha_hasta?: string;
        user_id?: string;
    };
    vendedores: Vendedor[];
    es_admin_o_moderador: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
    {
        title: 'Cierres de Caja',
        href: '/vendor/cierres',
    },
];

const formatMonto = (monto: number | null | undefined): string => {
    const numero = Number(monto || 0);
    return isNaN(numero) ? '0.00' : numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const aTextoFecha = (fecha: Date): string => {
    const dosDigitos = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
};

/** Rangos rápidos de fecha (en la hora local del navegador). */
const RANGOS_RAPIDOS: Array<{ etiqueta: string; calcular: () => { desde: string; hasta: string } }> = [
    { etiqueta: 'Hoy', calcular: () => ({ desde: aTextoFecha(new Date()), hasta: aTextoFecha(new Date()) }) },
    {
        etiqueta: 'Ayer',
        calcular: () => {
            const ayer = new Date();
            ayer.setDate(ayer.getDate() - 1);
            return { desde: aTextoFecha(ayer), hasta: aTextoFecha(ayer) };
        },
    },
    {
        etiqueta: 'Últimos 7 días',
        calcular: () => {
            const inicio = new Date();
            inicio.setDate(inicio.getDate() - 6);
            return { desde: aTextoFecha(inicio), hasta: aTextoFecha(new Date()) };
        },
    },
    {
        etiqueta: 'Este mes',
        calcular: () => {
            const hoy = new Date();
            return { desde: aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aTextoFecha(hoy) };
        },
    },
];

const FORMATO_FECHA: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const FORMATO_HORA: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

/** Lo que duró el periodo que cubre el cierre: "45 min", "6 h 20 min", "2 d 4 h". */
function duracionDelPeriodo(apertura: string | null, cierre: string): string | null {
    if (!apertura) {
        return null;
    }
    const minutos = Math.max(0, Math.round((new Date(cierre).getTime() - new Date(apertura).getTime()) / 60000));
    if (minutos < 60) {
        return `${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    if (horas < 24) {
        return `${horas} h ${minutos % 60} min`;
    }
    return `${Math.floor(horas / 24)} d ${horas % 24} h`;
}

export default function Index({ cierres, resumen, filters, vendedores, es_admin_o_moderador }: Props) {
    const { flash } = usePage<PageProps & { flash: { success?: string; error?: string } }>().props;

    const fechaDesde = filters.fecha_desde || '';
    const fechaHasta = filters.fecha_hasta || '';
    const vendedorId = filters.user_id || 'todos';
    const vendedorSeleccionado = vendedores.find((v) => String(v.id) === vendedorId);
    const hayFiltros = fechaDesde !== '' || fechaHasta !== '' || vendedorId !== 'todos';

    // Cada cambio de filtro se aplica solo: no hay que acordarse de pulsar "Filtrar".
    const aplicarFiltros = (cambios: { fecha_desde?: string; fecha_hasta?: string; user_id?: string }) => {
        const siguiente = {
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
            user_id: vendedorId === 'todos' ? '' : vendedorId,
            ...cambios,
        };
        router.get(route('ventas.cierres'), siguiente, { preserveState: true, preserveScroll: true });
    };

    const limpiarFiltros = () => aplicarFiltros({ fecha_desde: '', fecha_hasta: '', user_id: '' });

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    // La paginación nativa de Laravel manda TODOS los números de página en `links` — con
    // muchos cierres eso se vuelve una fila larga de botones. Se recorta a una ventana chica
    // alrededor de la página actual + primera/última, mismo criterio que Vendor/Listado.tsx.
    const paginationLinksVisibles = useMemo(() => {
        const numeradas = cierres.links.slice(1, -1);
        if (numeradas.length <= 7) return cierres.links;

        const actual = numeradas.findIndex((link) => link.active);
        const mantener = new Set([0, numeradas.length - 1, actual - 1, actual, actual + 1].filter((i) => i >= 0 && i < numeradas.length));

        const resultado: PaginationLink[] = [cierres.links[0]];
        let ultimoIncluido = -1;
        numeradas.forEach((link, i) => {
            if (mantener.has(i)) {
                if (i - ultimoIncluido > 1) {
                    resultado.push({ url: null, label: '...', active: false });
                }
                resultado.push(link);
                ultimoIncluido = i;
            }
        });
        resultado.push(cierres.links[cierres.links.length - 1]);
        return resultado;
    }, [cierres.links]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierres de Caja" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall title="Cierres de Caja" description="Historial y gestión de cierres diarios." />
                    <ComputerIcon
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform animate-pulse opacity-40"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link href={route('ventas.cierres.create')}>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Cierre
                        </Link>
                    </Button>
                </div>

                {/* Mensajes Flash */}
                {flash.success && <div className="rounded-md border border-green-200 bg-green-50 p-4 text-green-700">{flash.success}</div>}
                {flash.error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">{flash.error}</div>}

                {/* Resumen de lo que cumple el filtro (no solo de esta página) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <SpotlightCard estado="tarjeta" className="rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                                <History className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Cierres</p>
                                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{resumen.total}</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-3 text-xs">{hayFiltros ? 'Con los filtros aplicados' : 'En total'}</p>
                    </SpotlightCard>

                    <SpotlightCard estado="disponible" className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30">
                                <ShoppingCart className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Ventas</p>
                                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${formatMonto(resumen.ventas_total_usd)}</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-3 text-xs">Cobrado en USD en esos cierres</p>
                    </SpotlightCard>

                    <SpotlightCard estado="agotado" className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-red-500/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30">
                                <TrendingDown className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Saldo negativo</p>
                                <p className="text-2xl font-black text-red-600 dark:text-red-400">{resumen.saldo_negativo}</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mt-3 text-xs">Cierres con saldo esperado por debajo de cero</p>
                    </SpotlightCard>

                    <SpotlightCard estado="especial" className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30">
                                <Truck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Con envíos en tránsito</p>
                                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{resumen.con_transito}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-muted-foreground text-xs">Dinero que seguía viajando al cerrar</span>
                            {resumen.envios_atrasados > 0 && (
                                <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 backdrop-blur-sm dark:text-red-300">
                                    {resumen.envios_atrasados} atrasado{resumen.envios_atrasados === 1 ? '' : 's'}
                                </Badge>
                            )}
                        </div>
                    </SpotlightCard>
                </div>

                {/* Filtros */}
                <Card className="gap-0 overflow-hidden border-l-4 border-slate-500/30 py-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Filter className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Filtros</CardTitle>
                                <CardDescription className="text-slate-200">
                                    Busca cierres por fecha{es_admin_o_moderador ? ' o punto de venta' : ''}. Se aplican solos al cambiarlos.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground mr-1 text-xs font-medium">Rápido:</span>
                            {RANGOS_RAPIDOS.map((rango) => {
                                const { desde, hasta } = rango.calcular();
                                return (
                                    <Button
                                        key={rango.etiqueta}
                                        variant={fechaDesde === desde && fechaHasta === hasta ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => aplicarFiltros({ fecha_desde: desde, fecha_hasta: hasta })}
                                    >
                                        {rango.etiqueta}
                                    </Button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
                            <div className="w-full md:w-auto">
                                <label className="text-muted-foreground mb-1 block text-xs">Desde</label>
                                <Input type="date" value={fechaDesde} onChange={(e) => aplicarFiltros({ fecha_desde: e.target.value })} className="w-full" />
                            </div>
                            <div className="w-full md:w-auto">
                                <label className="text-muted-foreground mb-1 block text-xs">Hasta</label>
                                <Input type="date" value={fechaHasta} onChange={(e) => aplicarFiltros({ fecha_hasta: e.target.value })} className="w-full" />
                            </div>
                            {es_admin_o_moderador && (
                                <div className="w-full md:w-56">
                                    <label className="text-muted-foreground mb-1 block text-xs">Punto de Venta</label>
                                    <Select value={vendedorId} onValueChange={(valor) => aplicarFiltros({ user_id: valor === 'todos' ? '' : valor })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Punto de Venta" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todos los puntos de venta</SelectItem>
                                            {vendedores.map((v) => (
                                                <SelectItem key={v.id} value={String(v.id)}>
                                                    {v.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {hayFiltros && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-muted-foreground text-xs font-medium">Filtrando por:</span>
                                {fechaDesde && (
                                    <Badge className="gap-1 border border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                                        Desde {fechaDesde}
                                        <button type="button" aria-label="Quitar fecha desde" onClick={() => aplicarFiltros({ fecha_desde: '' })}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {fechaHasta && (
                                    <Badge className="gap-1 border border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                                        Hasta {fechaHasta}
                                        <button type="button" aria-label="Quitar fecha hasta" onClick={() => aplicarFiltros({ fecha_hasta: '' })}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                {vendedorSeleccionado && (
                                    <Badge className="gap-1 border border-blue-400/30 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                        {vendedorSeleccionado.name}
                                        <button type="button" aria-label="Quitar punto de venta" onClick={() => aplicarFiltros({ user_id: '' })}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                )}
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={limpiarFiltros}>
                                    Limpiar todo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="gap-0 overflow-hidden border-l-4 border-amber-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Cierres Registrados</CardTitle>
                                <CardDescription className="text-amber-100">
                                    {cierres.total} {cierres.total === 1 ? 'cierre' : 'cierres'} {hayFiltros ? 'con los filtros aplicados' : 'en total'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableHead>Cierre</TableHead>
                                    <TableHead>Punto de Venta</TableHead>
                                    <TableHead className="hidden lg:table-cell">Responsables del Turno</TableHead>
                                    <TableHead className="text-right">Ventas</TableHead>
                                    <TableHead className="hidden text-center md:table-cell">En tránsito</TableHead>
                                    <TableHead className="text-right">Saldo esperado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cierres.data.length > 0 ? (
                                    cierres.data.map((cierre) => {
                                        const fechaCierre = new Date(cierre.fecha_cierre);
                                        const duracion = duracionDelPeriodo(cierre.fecha_apertura, cierre.fecha_cierre);

                                        return (
                                            <TableRow
                                                key={cierre.id}
                                                className="hover:bg-muted/50 cursor-pointer"
                                                onClick={() => router.visit(route('ventas.cierres.show', cierre.id))}
                                            >
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="w-fit gap-1 border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300"
                                                        >
                                                            <Calendar className="h-3 w-3" />
                                                            {fechaCierre.toLocaleDateString('es-ES', FORMATO_FECHA)} · {fechaCierre.toLocaleTimeString('es-ES', FORMATO_HORA)}
                                                        </Badge>
                                                        <p className="text-muted-foreground text-[11px]">
                                                            #{cierre.id}
                                                            {duracion ? ` · cubre ${duracion}` : ''}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <Badge
                                                            variant="outline"
                                                            className="w-fit gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
                                                        >
                                                            <Store className="h-3 w-3" />
                                                            {cierre.usuario.name}
                                                        </Badge>
                                                        {cierre.turno_cierre && <p className="text-muted-foreground text-[11px]">Cerró: {cierre.turno_cierre}</p>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden lg:table-cell">
                                                    {cierre.responsables_turno.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {cierre.responsables_turno.map((nombre) => (
                                                                <Badge
                                                                    key={nombre}
                                                                    variant="outline"
                                                                    className="w-fit gap-1 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300"
                                                                >
                                                                    <User className="h-3 w-3" />
                                                                    {nombre}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : cierre.usuario.role === 'admin' ? (
                                                        // Admin nunca captura turno: no es un dato faltante, es esperado.
                                                        <RolBadge role="admin" />
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground w-fit gap-1">
                                                            Sin registrar
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <Badge className="border border-emerald-400/30 bg-emerald-500/10 font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                                            ${formatMonto(cierre.ventas_total_usd)}
                                                        </Badge>
                                                        {cierre.ventas_count !== null && (
                                                            <span className="text-muted-foreground text-[11px]">
                                                                {cierre.ventas_count} {cierre.ventas_count === 1 ? 'venta' : 'ventas'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden text-center md:table-cell">
                                                    {!cierre.envios_guardados ? (
                                                        <span className="text-muted-foreground" title="Este cierre se guardó antes de registrar los envíos en tránsito">
                                                            —
                                                        </span>
                                                    ) : cierre.envios_en_transito_total > 0 ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <Badge className="gap-1 border border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                                <Truck className="h-3 w-3" />
                                                                {cierre.envios_en_transito_total} {cierre.envios_en_transito_total === 1 ? 'envío' : 'envíos'}
                                                            </Badge>
                                                            {cierre.envios_atrasados > 0 && (
                                                                <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 dark:text-red-300">
                                                                    {cierre.envios_atrasados} atrasado{cierre.envios_atrasados === 1 ? '' : 's'}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Ninguno</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge
                                                        variant="outline"
                                                        className={`w-fit gap-1 font-semibold ${
                                                            cierre.saldo_esperado < 0
                                                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                                                                : 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-300'
                                                        }`}
                                                        title="Lo que se movió en cuentas durante el periodo del cierre: ventas e ingresos menos gastos, salidas y comisiones"
                                                    >
                                                        <Wallet className="h-3 w-3" />
                                                        {cierre.saldo_esperado < 0 ? '-' : ''}${formatMonto(Math.abs(cierre.saldo_esperado))}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                                                        <Link href={route('ventas.cierres.show', cierre.id)}>
                                                            <Eye className="mr-1 h-3.5 w-3.5" />
                                                            Ver detalle
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-muted-foreground h-24 text-center italic">
                                            {hayFiltros ? 'No se encontraron cierres con los filtros aplicados.' : 'Todavía no hay cierres registrados.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    {cierres.links.length > 3 && (
                        <CardFooter className="flex flex-col items-center justify-between gap-2 border-t py-4 sm:flex-row">
                            <div className="text-muted-foreground text-sm">
                                Mostrando {cierres.from ?? 0} a {cierres.to ?? 0} de {cierres.total} resultados
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {paginationLinksVisibles.map((link, index) => (
                                    <Button
                                        key={index}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => goToPage(link.url)}
                                    >
                                        {renderPaginationLabel(link.label)}
                                    </Button>
                                ))}
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </AppLayout>
    );
}

// Defensa en el frontend, igual que Vendor/Listado.tsx — si por lo que sea el backend vuelve
// a mandar la clave cruda ('pagination.previous'/'pagination.next') en vez del texto traducido,
// esto lo normaliza a un símbolo limpio de todas formas, sin depender de la traducción del servidor.
const renderPaginationLabel = (label: string) => {
    if (!label) return '';
    const normalized = label.toLowerCase();
    if (normalized.includes('pagination.previous') || normalized.includes('previous') || normalized.includes('anterior')) return '«';
    if (normalized.includes('pagination.next') || normalized.includes('next') || normalized.includes('siguiente')) return '»';
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
};
