import HeadingSmall from '@/components/heading-small';
import AvisoEnvios from '@/components/transacciones/aviso-envios';
import {
    DetalleCompra,
    DetalleCompraExpandido,
    DetalleMovimiento,
    DetalleMovimientoExpandido,
    DetalleRemesa,
    DetalleRemesaExpandido,
    DetalleVenta,
    DetalleVentaExpandido,
} from '@/components/detalle-operacion';
import { TipoCuentaLogo, type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowLeft,
    ArrowRightLeft,
    Banknote,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Coins,
    CreditCard,
    DollarSign,
    Edit3,
    FileText,
    Globe,
    Handshake,
    History,
    Landmark,
    LucideIcon,
    Receipt,
    Search,
    Send,
    ShoppingCart,
    Tag,
    TrendingDown,
    TrendingUp,
    Truck,
    User,
    X,
} from 'lucide-react';
import { Fragment, useState } from 'react';

interface MonedaInfo {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
}

interface CuentaShowProps {
    id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number;
    moneda_id: number;
    tipo_cuenta: string;
    tipo_titular?: string | null;
    ambito?: string | null;
    estado: string;
    notas_cuenta: string;
    imagen: string | null;
    banco: { slug: string; nombre: string; imagen_url: string } | null;
    created_at: string;
    updated_at: string;
    moneda: MonedaInfo | null;
}

interface HistorialItem {
    referencia_id: number;
    fecha: string;
    tipo: string;
    monto: number;
    moneda: string;
    descripcion: string | null;
    contraparte: string | null;
    usuario: string;
    fuente: string;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    // Detalle rico para la fila colapsable — mismo shape que arma
    // App\Services\DetalleOperacionService, null para ajustes de saldo (el motivo ya
    // es todo el detalle que existe) o filas de datos históricos sin snapshot.
    detalle: DetalleVenta | DetalleMovimiento | DetalleCompra | DetalleRemesa | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface HistorialPaginado {
    data: HistorialItem[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface FiltrosCard {
    q?: string;
    tipo?: string;
    desde?: string;
    hasta?: string;
}

interface ShowCuentasPageProps {
    cuenta: CuentaShowProps;
    historialTransacciones: HistorialPaginado;
    historialVentas: HistorialPaginado;
    historialCompras: HistorialPaginado;
    historialAjustes: HistorialPaginado;
    historialRemesas: HistorialPaginado;
    puedeEditar: boolean;
    tiposCuenta: TipoCuenta[];
    filtros: {
        transacciones: { q_transacciones?: string; tipo_transacciones?: string; desde_transacciones?: string; hasta_transacciones?: string };
        ventas: { q_ventas?: string; tipo_ventas?: string; desde_ventas?: string; hasta_ventas?: string };
        compras: { q_compras?: string; desde_compras?: string; hasta_compras?: string };
        ajustes: { q_ajustes?: string; desde_ajustes?: string; hasta_ajustes?: string };
        remesas: { q_remesas?: string; desde_remesas?: string; hasta_remesas?: string };
    };
}

const breadcrumbs = (nombreCuenta: string): BreadcrumbItem[] => [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Cuentas', href: '/cuentas' },
    { title: `Detalles: ${nombreCuenta}`, href: '#' },
];

const getFuenteIcono = (item: HistorialItem) => {
    switch (item.fuente) {
        case 'movimiento_financiero':
            if (item.tipo.includes('Ingreso')) return TrendingUp;
            if (item.tipo.includes('Transferencia')) return ArrowRightLeft;
            return TrendingDown;
        case 'venta_pago':
            return Receipt;
        case 'venta_comision':
        case 'venta_gestor':
            return DollarSign;
        case 'venta_mensajero':
            return Truck;
        case 'compra_pago':
            return ShoppingCart;
        case 'ajuste_saldo':
            return Edit3;
        case 'remesa':
            return Send;
        default:
            return DollarSign;
    }
};

const getFuenteColorClase = (monto: number) =>
    monto >= 0
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300';

// Header degradado de cada tabla de historial — mismos colores que Proveedores/Show.tsx para el
// mismo concepto (Compras ámbar, Transacciones violeta, Operaciones Múltiples sky). Clases
// completas a propósito: Tailwind no detecta clases armadas por partes.
const COLORES_HISTORIAL = {
    amber: { header: 'from-amber-600 to-amber-700', descripcion: 'text-amber-100' },
    orange: { header: 'from-orange-600 to-orange-700', descripcion: 'text-orange-100' },
    sky: { header: 'from-sky-600 to-sky-700', descripcion: 'text-sky-100' },
    emerald: { header: 'from-emerald-600 to-emerald-700', descripcion: 'text-emerald-100' },
    violet: { header: 'from-violet-600 to-violet-700', descripcion: 'text-violet-100' },
} as const;

// ─── Componente: TablaHistorial (reutilizado por las 4 Cards) ───────────────

const TablaHistorial = ({
    titulo,
    descripcion,
    Icono: IconoCard,
    color,
    historial,
    emptyTexto,
    filtroKey,
    tiposFiltro,
    filtrosIniciales,
}: {
    titulo: string;
    descripcion: string;
    Icono: LucideIcon;
    color: keyof typeof COLORES_HISTORIAL;
    historial: HistorialPaginado;
    emptyTexto: string;
    filtroKey: 'transacciones' | 'ventas' | 'compras' | 'ajustes' | 'remesas';
    tiposFiltro?: { value: string; label: string }[];
    filtrosIniciales: FiltrosCard;
}) => {
    const [busqueda, setBusqueda] = useState(filtrosIniciales.q ?? '');
    const [desde, setDesde] = useState(filtrosIniciales.desde ?? '');
    const [hasta, setHasta] = useState(filtrosIniciales.hasta ?? '');
    const tipoActivo = filtrosIniciales.tipo ?? '';
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const irAPagina = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const aplicarFiltros = (cambios: Record<string, string | undefined>) => {
        const actuales = Object.fromEntries(new URLSearchParams(window.location.search));
        const nuevos: Record<string, string> = { ...actuales };

        Object.entries(cambios).forEach(([clave, valor]) => {
            if (valor) {
                nuevos[clave] = valor;
            } else {
                delete nuevos[clave];
            }
        });
        // Cualquier cambio de filtro vuelve a la página 1 de esta tabla
        delete nuevos[`pagina_${filtroKey}`];

        router.get(window.location.pathname, nuevos, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hayFiltrosActivos = Boolean(filtrosIniciales.q || filtrosIniciales.tipo || filtrosIniciales.desde || filtrosIniciales.hasta);

    const limpiarFiltros = () => {
        setBusqueda('');
        setDesde('');
        setHasta('');
        aplicarFiltros({
            [`q_${filtroKey}`]: undefined,
            [`tipo_${filtroKey}`]: undefined,
            [`desde_${filtroKey}`]: undefined,
            [`hasta_${filtroKey}`]: undefined,
        });
    };

    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <CardHeader className={cn('bg-gradient-to-r px-6 py-5 text-white', COLORES_HISTORIAL[color].header)}>
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <IconoCard className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="flex items-center gap-2 text-white">
                            {titulo}
                            {historial.total > 0 && (
                                <Badge
                                    variant="outline"
                                    className="h-5 min-w-[20px] border-white/30 bg-white/20 px-1.5 text-[11px] text-white backdrop-blur-sm"
                                >
                                    {historial.total}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription className={COLORES_HISTORIAL[color].descripcion}>{descripcion}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-5">
                {/* Filtros */}
                <div className="mb-4 flex flex-wrap items-end gap-3">
                    <div className="relative min-w-[180px] flex-1">
                        <Search size={14} className="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2" />
                        <Input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') aplicarFiltros({ [`q_${filtroKey}`]: busqueda });
                            }}
                            onBlur={() => aplicarFiltros({ [`q_${filtroKey}`]: busqueda })}
                            placeholder="Buscar..."
                            className="h-8 pl-8 text-sm"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <div className="space-y-1">
                            <label className="text-muted-foreground text-[10px]">Desde</label>
                            <Input
                                type="date"
                                value={desde}
                                onChange={(e) => {
                                    setDesde(e.target.value);
                                    aplicarFiltros({ [`desde_${filtroKey}`]: e.target.value });
                                }}
                                className="h-8 w-[140px] text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-muted-foreground text-[10px]">Hasta</label>
                            <Input
                                type="date"
                                value={hasta}
                                onChange={(e) => {
                                    setHasta(e.target.value);
                                    aplicarFiltros({ [`hasta_${filtroKey}`]: e.target.value });
                                }}
                                className="h-8 w-[140px] text-sm"
                            />
                        </div>
                    </div>
                    {hayFiltrosActivos && (
                        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={limpiarFiltros}>
                            <X size={12} />
                            Limpiar
                        </Button>
                    )}
                </div>
                {tiposFiltro && (
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Button
                            variant={!tipoActivo ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => aplicarFiltros({ [`tipo_${filtroKey}`]: undefined })}
                        >
                            Todas
                        </Button>
                        {tiposFiltro.map((t) => (
                            <Button
                                key={t.value}
                                variant={tipoActivo === t.value ? 'default' : 'outline'}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => aplicarFiltros({ [`tipo_${filtroKey}`]: t.value })}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </div>
                )}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Contraparte</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historial.data.length > 0 ? (
                                historial.data.map((item, idx) => {
                                    const ItemIcono = getFuenteIcono(item);
                                    const colorClase = getFuenteColorClase(Number(item.monto));
                                    const rowKey = `${item.fuente}-${item.referencia_id}-${idx}`;
                                    // Colapsable si hay saldo capturado (Transacciones/Ajustes) O detalle rico cargado
                                    // (Ventas/Compras) — son independientes: una venta puede tener toda su info
                                    // (productos, pagos, tasa) disponible aunque ese pago en particular sea de antes
                                    // del fix de saldo_anterior/posterior y por eso no tenga snapshot.
                                    const esColapsable = (item.saldo_anterior !== null && item.saldo_posterior !== null) || item.detalle !== null;
                                    const expandida = expandedRow === rowKey;
                                    return (
                                        <Fragment key={rowKey}>
                                            <TableRow
                                                className={`hover:bg-muted/50 ${esColapsable ? 'cursor-pointer' : ''}`}
                                                onClick={() => esColapsable && setExpandedRow(expandida ? null : rowKey)}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        {esColapsable ? (
                                                            expandida ? (
                                                                <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                            ) : (
                                                                <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                            )
                                                        ) : (
                                                            <span className="w-3.5 shrink-0" />
                                                        )}
                                                        <Calendar size={12} className="text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {new Date(item.fecha).toLocaleString('es-ES', {
                                                                dateStyle: 'short',
                                                                timeStyle: 'short',
                                                            })}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`flex w-fit items-center gap-1 ${colorClase}`}>
                                                        <ItemIcono size={12} />
                                                        {item.tipo}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[220px] truncate text-sm" title={item.descripcion ?? ''}>
                                                    {item.descripcion || <span className="text-muted-foreground italic">—</span>}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{item.contraparte || '—'}</TableCell>
                                                <TableCell className="text-sm">{item.usuario}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    <span className={Number(item.monto) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                        {Number(item.monto) >= 0 ? '+' : ''}
                                                        {Number(item.monto).toFixed(2)} {item.moneda}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                            {esColapsable && expandida && (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={6} className="bg-muted/30 px-6 py-3">
                                                        {item.fuente === 'movimiento_financiero' && item.detalle ? (
                                                            <DetalleMovimientoExpandido
                                                                detalle={item.detalle as DetalleMovimiento}
                                                                monto={Number(item.monto)}
                                                                moneda={item.moneda}
                                                                descripcion={item.descripcion ?? ''}
                                                                usuario={item.usuario}
                                                            />
                                                        ) : (item.fuente === 'venta_pago' ||
                                                              item.fuente === 'venta_comision' ||
                                                              item.fuente === 'venta_gestor' ||
                                                              item.fuente === 'venta_mensajero') &&
                                                          item.detalle ? (
                                                            <DetalleVentaExpandido detalle={item.detalle as DetalleVenta} />
                                                        ) : item.fuente === 'compra_pago' && item.detalle ? (
                                                            <DetalleCompraExpandido
                                                                detalle={item.detalle as DetalleCompra}
                                                                monto={Number(item.monto)}
                                                                usuario={item.usuario}
                                                            />
                                                        ) : item.fuente === 'remesa' && item.detalle ? (
                                                            <DetalleRemesaExpandido detalle={item.detalle as DetalleRemesa} usuario={item.usuario} />
                                                        ) : (
                                                            // Ajustes de saldo (y cualquier fila sin detalle rico cargado) — el
                                                            // motivo ya se ve en la columna Descripción, acá solo el salto de saldo.
                                                            <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-xs">
                                                                <div>
                                                                    <span className="text-muted-foreground">Saldo Anterior: </span>
                                                                    <span className="font-mono font-medium">
                                                                        {Number(item.saldo_anterior).toFixed(2)} {item.moneda}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-muted-foreground">Saldo Posterior: </span>
                                                                    <span className="font-mono font-medium">
                                                                        {Number(item.saldo_posterior).toFixed(2)} {item.moneda}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <IconoCard size={32} className="opacity-40" />
                                            <p className="font-medium">{hayFiltrosActivos ? 'Sin resultados con los filtros aplicados' : 'Sin operaciones registradas'}</p>
                                            <p className="text-xs">{hayFiltrosActivos ? 'Prueba a limpiar los filtros para ver todas las operaciones' : emptyTexto}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {historial.links.length > 3 && (
                    <div className="flex flex-col items-center justify-between gap-2 border-t pt-4 sm:flex-row">
                        <div className="text-muted-foreground text-sm">
                            Mostrando {historial.from ?? 0} a {historial.to ?? 0} de {historial.total} resultados
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {historial.links.map((link, index) => {
                                const displayLabel = link.label
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
                                        onClick={() => irAPagina(link.url)}
                                    >
                                        {displayLabel}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ─── Página Principal ────────────────────────────────────────────────────────

export default function ShowCuentasPage({
    cuenta,
    historialTransacciones,
    historialVentas,
    historialCompras,
    historialAjustes,
    historialRemesas,
    puedeEditar,
    tiposCuenta,
    filtros,
}: ShowCuentasPageProps) {
    const tipoDeCuenta = tiposCuenta.find((tipo) => tipo.slug === cuenta.tipo);

    const formatearMoneda = (valor: number, simbolo: string) =>
        `${simbolo} ${Math.abs(valor).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const saldo = cuenta.saldo_cuenta ?? 0;
    const estadoFinanciero =
        saldo > 0
            ? {
                  texto: 'Con Fondo',
                  icon: ArrowDownCircle,
                  textClass: 'text-emerald-600',
                  badgeClass:
                      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300',
              }
            : saldo < 0
              ? {
                    texto: 'En Deuda',
                    icon: TrendingDown,
                    textClass: 'text-red-600',
                    badgeClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300',
                }
              : {
                    texto: 'Neutro',
                    icon: CheckCircle,
                    textClass: 'text-gray-600 dark:text-gray-300',
                    badgeClass: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300',
                };
    const EstadoIcon = estadoFinanciero.icon;

    const totalOperaciones =
        historialTransacciones.total + historialVentas.total + historialCompras.total + historialAjustes.total + historialRemesas.total;

    return (
        <AppLayout breadcrumbs={breadcrumbs(cuenta.nombre_cuenta)}>
            <Head title={`Cuenta: ${cuenta.nombre_cuenta}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title={`Cuenta: ${cuenta.nombre_cuenta}`}
                            description="Detalles de la cuenta y su historial de operaciones."
                        />
                        {cuenta.tipo === 'efectivo' && !cuenta.banco ? (
                            // Efectivo sin insignia elegida todavía — ícono genérico de siempre.
                            <Handshake
                                size={70}
                                color="#d6d3d1"
                                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                            />
                        ) : cuenta.banco ? (
                            // Tarjeta con banco asignado — efecto bleed (docs/patron-mascota-bleed.md
                            // Variante A), sin overflow-hidden en el contenedor para que sobresalga
                            // por el borde superior.
                            <img
                                src={cuenta.banco.imagen_url}
                                alt=""
                                aria-hidden="true"
                                className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                            />
                        ) : (
                            // Tarjeta sin banco todavía.
                            <div className="pointer-events-none absolute top-1/2 right-4 flex -translate-y-1/2 flex-col items-center gap-1 opacity-40">
                                <CreditCard size={44} color="#d6d3d1" />
                                <span className="text-[10px] font-medium whitespace-nowrap text-[#d6d3d1]">Sin banco asignado</span>
                            </div>
                        )}
                    </div>

                    <AvisoEnvios />

                    {/* Navegación */}
                    <div className="flex items-center gap-2">
                        {puedeEditar && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link href={route('cuentas.edit', { cuenta: cuenta.id })}>
                                        <Button variant="outline" className="flex items-center gap-2">
                                            <Edit3 size={16} />
                                            Editar
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Editar información de la cuenta</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={route('cuentas.index')}>
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <ArrowLeft size={16} />
                                        Volver
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Volver al listado de cuentas</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* Info de la Cuenta + Estado Financiero — mismo esquema que Proveedores/Show.tsx */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Datos básicos */}
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg lg:col-span-2">
                            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                                <div className="flex flex-1 items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <Landmark className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Información de la Cuenta</CardTitle>
                                            <CardDescription className="text-indigo-100">Datos básicos y configuración</CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                                        <Calendar className="mr-1 h-3 w-3" />
                                        Creada el {formatearFecha(cuenta.created_at)}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex items-center gap-3">
                                        <Tag className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Tipo de Activo</p>
                                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                                {tipoDeCuenta && <TipoCuentaLogo tipo={tipoDeCuenta} className="h-6" />}
                                                <span className="capitalize">{tipoDeCuenta?.nombre ?? cuenta.tipo}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {cuenta.tipo === 'efectivo' ? (
                                            <Banknote className="text-muted-foreground h-4 w-4 shrink-0" />
                                        ) : (
                                            <CreditCard className="text-muted-foreground h-4 w-4 shrink-0" />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{cuenta.tipo === 'efectivo' ? 'Insignia' : 'Banco'}</p>
                                            {cuenta.banco ? (
                                                <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                                    <img src={cuenta.banco.imagen_url} alt="" className="h-4 w-6 object-contain" />
                                                    {cuenta.banco.nombre}
                                                </span>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                    Sin asignar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Coins className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Moneda</p>
                                            <p className="text-muted-foreground text-sm">
                                                {cuenta.moneda?.nombre_moneda} ({cuenta.moneda?.codigo_moneda})
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Globe className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Ámbito</p>
                                            {cuenta.ambito ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'mt-0.5',
                                                        cuenta.ambito === 'nacional'
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                                            : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-300',
                                                    )}
                                                >
                                                    {cuenta.ambito === 'nacional' ? 'Nacional' : 'Internacional'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                    Sin clasificar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Tipo Titular</p>
                                            {cuenta.tipo_titular ? (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'mt-0.5',
                                                        cuenta.tipo_titular === 'externa'
                                                            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                                                            : 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300',
                                                    )}
                                                >
                                                    {cuenta.tipo_titular === 'externa' ? 'Externa' : 'Personal'}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                    Sin asignar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="text-muted-foreground h-4 w-4 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium">Estado</p>
                                            <div className="mt-0.5 flex flex-wrap gap-1.5">
                                                <Badge
                                                    className={
                                                        cuenta.estado === 'activa'
                                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                                    }
                                                >
                                                    {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                                <Badge
                                                    variant="outline"
                                                    className={cuenta.tipo_cuenta === 'permanentes' ? 'text-emerald-500' : 'text-amber-500'}
                                                >
                                                    {cuenta.tipo_cuenta === 'permanentes' ? 'Permanente' : 'Temporal'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-3">
                                    <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium">Notas</p>
                                        {cuenta.notas_cuenta ? (
                                            <p className="text-muted-foreground text-sm">{cuenta.notas_cuenta}</p>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                Sin notas adicionales
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Estado Financiero */}
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Estado Financiero</CardTitle>
                                        <CardDescription className="text-teal-100">Saldo y operaciones de esta cuenta</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Saldo Actual</span>
                                    <Badge variant="outline" className={cn('flex items-center gap-1 font-normal', estadoFinanciero.badgeClass)}>
                                        <EstadoIcon className="h-3 w-3" />
                                        {estadoFinanciero.texto}
                                    </Badge>
                                </div>
                                <div className={cn('text-2xl font-bold', estadoFinanciero.textClass)}>
                                    {formatearMoneda(saldo, cuenta.moneda?.simbolo_moneda || '$')}
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <History className="text-muted-foreground h-3.5 w-3.5" />
                                            Operaciones:
                                        </span>
                                        <span className="font-medium">{totalOperaciones}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <Receipt className="text-muted-foreground h-3.5 w-3.5" />
                                            Ventas:
                                        </span>
                                        <span className="font-medium">{historialVentas.total}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-2">
                                            <ArrowRightLeft className="text-muted-foreground h-3.5 w-3.5" />
                                            Transacciones:
                                        </span>
                                        <span className="font-medium">{historialTransacciones.total}</span>
                                    </div>
                                    {puedeEditar && (
                                        <>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2">
                                                    <ShoppingCart className="text-muted-foreground h-3.5 w-3.5" />
                                                    Compras:
                                                </span>
                                                <span className="font-medium">{historialCompras.total}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2">
                                                    <Edit3 className="text-muted-foreground h-3.5 w-3.5" />
                                                    Ajustes de saldo:
                                                </span>
                                                <span className="font-medium">{historialAjustes.total}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2">
                                                    <Send className="text-muted-foreground h-3.5 w-3.5" />
                                                    Operaciones Múltiples:
                                                </span>
                                                <span className="font-medium">{historialRemesas.total}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Historial — separado por Card: Compras, Ajustes, Ventas, Transacciones */}
                    {puedeEditar && (
                        <TablaHistorial
                            titulo="Compras"
                            descripcion="Pagos de compra realizados desde esta cuenta"
                            Icono={ShoppingCart}
                            color="amber"
                            historial={historialCompras}
                            emptyTexto="Los pagos de compra hechos desde esta cuenta aparecerán aquí"
                            filtroKey="compras"
                            filtrosIniciales={{ q: filtros.compras.q_compras, desde: filtros.compras.desde_compras, hasta: filtros.compras.hasta_compras }}
                        />
                    )}

                    {puedeEditar && (
                        <TablaHistorial
                            titulo="Ajustes de Saldo"
                            descripcion="Correcciones manuales del saldo hechas desde Editar Cuenta"
                            Icono={Edit3}
                            color="orange"
                            historial={historialAjustes}
                            emptyTexto="Los ajustes manuales de saldo de esta cuenta aparecerán aquí"
                            filtroKey="ajustes"
                            filtrosIniciales={{ q: filtros.ajustes.q_ajustes, desde: filtros.ajustes.desde_ajustes, hasta: filtros.ajustes.hasta_ajustes }}
                        />
                    )}

                    {puedeEditar && (
                        <TablaHistorial
                            titulo="Operaciones Múltiples"
                            descripcion="Operaciones Múltiples donde esta cuenta participó como entrada, salida o mensajero"
                            Icono={Send}
                            color="sky"
                            historial={historialRemesas}
                            emptyTexto="Las Operaciones Múltiples que involucren esta cuenta aparecerán aquí"
                            filtroKey="remesas"
                            filtrosIniciales={{ q: filtros.remesas.q_remesas, desde: filtros.remesas.desde_remesas, hasta: filtros.remesas.hasta_remesas }}
                        />
                    )}

                    <TablaHistorial
                        titulo="Ventas"
                        descripcion="Pagos de venta recibidos y comisiones (vendedor, gestor, mensajería) pagadas desde esta cuenta"
                        Icono={Receipt}
                        color="emerald"
                        historial={historialVentas}
                        emptyTexto="Los pagos y comisiones de venta que afecten esta cuenta aparecerán aquí"
                        filtroKey="ventas"
                        tiposFiltro={[
                            { value: 'venta_pago', label: 'Pagos' },
                            { value: 'venta_comision', label: 'Comisión Vendedor' },
                            { value: 'venta_gestor', label: 'Comisión Gestor' },
                            { value: 'venta_mensajero', label: 'Mensajería' },
                        ]}
                        filtrosIniciales={{
                            q: filtros.ventas.q_ventas,
                            tipo: filtros.ventas.tipo_ventas,
                            desde: filtros.ventas.desde_ventas,
                            hasta: filtros.ventas.hasta_ventas,
                        }}
                    />

                    <TablaHistorial
                        titulo="Transacciones"
                        descripcion="Gastos, ingresos y transferencias registrados directamente sobre esta cuenta"
                        Icono={ArrowRightLeft}
                        color="violet"
                        historial={historialTransacciones}
                        emptyTexto="Los gastos, ingresos y transferencias de esta cuenta aparecerán aquí"
                        filtroKey="transacciones"
                        tiposFiltro={[
                            { value: 'Gasto Operativo', label: 'Gastos' },
                            { value: 'Ingreso por Venta', label: 'Ingresos' },
                            { value: 'Transferencia Interna', label: 'Transferencias' },
                        ]}
                        filtrosIniciales={{
                            q: filtros.transacciones.q_transacciones,
                            tipo: filtros.transacciones.tipo_transacciones,
                            desde: filtros.transacciones.desde_transacciones,
                            hasta: filtros.transacciones.hasta_transacciones,
                        }}
                    />
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
