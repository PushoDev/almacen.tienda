import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowDownCircle,
    ArrowLeft,
    ArrowRightLeft,
    Banknote,
    Calendar,
    CheckCircle,
    Coins,
    CreditCard,
    DollarSign,
    Edit3,
    ExternalLink,
    FileText,
    Handshake,
    History,
    Landmark,
    LucideIcon,
    Receipt,
    Search,
    ShoppingCart,
    Tag,
    TrendingDown,
    TrendingUp,
    Truck,
    User,
    Wallet,
    X,
} from 'lucide-react';
import { useState } from 'react';

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
    estado: string;
    notas_cuenta: string;
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
    puedeEditar: boolean;
    filtros: {
        transacciones: { q_transacciones?: string; tipo_transacciones?: string; desde_transacciones?: string; hasta_transacciones?: string };
        ventas: { q_ventas?: string; tipo_ventas?: string; desde_ventas?: string; hasta_ventas?: string };
        compras: { q_compras?: string; desde_compras?: string; hasta_compras?: string };
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
        default:
            return DollarSign;
    }
};

const getFuenteColorClase = (monto: number) =>
    monto >= 0
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300';

// Enlace al registro real de origen (venta / movimiento financiero / compra) —
// sin esto no había forma de "entrar" a ver la venta o transacción completa.
const getRutaDetalle = (item: HistorialItem): { href: string; etiqueta: string } | null => {
    switch (item.fuente) {
        case 'movimiento_financiero':
            return { href: route('transacciones.show', { movimiento: item.referencia_id }), etiqueta: 'Ver transacción completa' };
        case 'venta_pago':
        case 'venta_comision':
        case 'venta_gestor':
        case 'venta_mensajero':
            return { href: route('ventas.show', { id: item.referencia_id }), etiqueta: 'Ver venta completa' };
        case 'compra_pago':
            return { href: route('comprar.show', { comprar: item.referencia_id }), etiqueta: 'Ver compra completa' };
        default:
            return null;
    }
};

// ─── Componente: TablaHistorial (reutilizado por las 3 Cards) ───────────────

const TablaHistorial = ({
    titulo,
    descripcion,
    Icono: IconoCard,
    historial,
    emptyTexto,
    filtroKey,
    tiposFiltro,
    filtrosIniciales,
}: {
    titulo: string;
    descripcion: string;
    Icono: LucideIcon;
    historial: HistorialPaginado;
    emptyTexto: string;
    filtroKey: 'transacciones' | 'ventas' | 'compras';
    tiposFiltro?: { value: string; label: string }[];
    filtrosIniciales: FiltrosCard;
}) => {
    const [busqueda, setBusqueda] = useState(filtrosIniciales.q ?? '');
    const [desde, setDesde] = useState(filtrosIniciales.desde ?? '');
    const [hasta, setHasta] = useState(filtrosIniciales.hasta ?? '');
    const tipoActivo = filtrosIniciales.tipo ?? '';

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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <IconoCard className="h-5 w-5" />
                    {titulo}
                    {historial.total > 0 && (
                        <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-[11px]">
                            {historial.total}
                        </Badge>
                    )}
                </CardTitle>
                <CardDescription>{descripcion}</CardDescription>
            </CardHeader>
            <CardContent>
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
                                <TableHead className="text-right">Detalle</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {historial.data.length > 0 ? (
                                historial.data.map((item, idx) => {
                                    const ItemIcono = getFuenteIcono(item);
                                    const colorClase = getFuenteColorClase(Number(item.monto));
                                    const detalle = getRutaDetalle(item);
                                    return (
                                        <TableRow key={`${item.fuente}-${item.referencia_id}-${idx}`} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex items-center gap-1">
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
                                                {item.saldo_anterior !== null && item.saldo_posterior !== null && (
                                                    <div className="text-muted-foreground text-[11px]">
                                                        {Number(item.saldo_anterior).toFixed(2)} → {Number(item.saldo_posterior).toFixed(2)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {detalle && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={detalle.href}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 w-7 p-0 text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                                                                >
                                                                    <ExternalLink size={12} />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="left">
                                                            <p className="text-xs">{detalle.etiqueta}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
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
    puedeEditar,
    filtros,
}: ShowCuentasPageProps) {
    const formatearMoneda = (valor: number, simbolo: string) =>
        `${simbolo} ${Math.abs(valor).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const saldo = cuenta.saldo_cuenta ?? 0;
    const estadoFinanciero =
        saldo > 0
            ? { texto: 'Con Fondo', color: 'green', icon: ArrowDownCircle }
            : saldo < 0
              ? { texto: 'En Deuda', color: 'red', icon: TrendingDown }
              : { texto: 'Neutro', color: 'gray', icon: CheckCircle };
    const EstadoIcon = estadoFinanciero.icon;

    const totalOperaciones = historialTransacciones.total + historialVentas.total + historialCompras.total;

    return (
        <AppLayout breadcrumbs={breadcrumbs(cuenta.nombre_cuenta)}>
            <Head title={`Cuenta: ${cuenta.nombre_cuenta}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title={`Cuenta: ${cuenta.nombre_cuenta}`}
                            description="Detalles de la cuenta y su historial de operaciones."
                        />
                        <Handshake
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                        />
                    </div>

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

                    {/* Info de la Cuenta + Estado Financiero */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Datos básicos */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Landmark className="h-5 w-5" />
                                    Información de la Cuenta
                                </CardTitle>
                                <CardDescription>Datos básicos y configuración</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Tag className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Tipo de Activo:</span>
                                    </div>
                                    <Badge variant="outline" className="capitalize">
                                        {cuenta.tipo === 'efectivo' ? <Banknote size={12} className="mr-1" /> : <CreditCard size={12} className="mr-1" />}
                                        {cuenta.tipo}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Coins className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Moneda:</span>
                                    </div>
                                    <span className="text-sm font-semibold">
                                        {cuenta.moneda?.nombre_moneda} ({cuenta.moneda?.codigo_moneda})
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Landmark className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Tipo de Cuenta:</span>
                                    </div>
                                    <Badge variant="outline" className={cuenta.tipo_cuenta === 'permanentes' ? 'text-emerald-500' : 'text-amber-500'}>
                                        {cuenta.tipo_cuenta === 'permanentes' ? 'Permanente' : 'Temporal'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Tipo Titular:</span>
                                    </div>
                                    {cuenta.tipo_titular ? (
                                        <Badge
                                            variant="outline"
                                            className={
                                                cuenta.tipo_titular === 'externa'
                                                    ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                                                    : 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300'
                                            }
                                        >
                                            {cuenta.tipo_titular === 'externa' ? 'Externa' : 'Personal'}
                                        </Badge>
                                    ) : (
                                        <span className="text-muted-foreground text-xs italic">Sin asignar</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Estado:</span>
                                    </div>
                                    <Badge
                                        className={
                                            cuenta.estado === 'activa'
                                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                : 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                        }
                                    >
                                        {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Creada:</span>
                                    </div>
                                    <span className="text-muted-foreground text-xs">{formatearFecha(cuenta.created_at)}</span>
                                </div>
                                {cuenta.notas_cuenta && (
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <FileText className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Notas:</span>
                                        </div>
                                        <span className="text-muted-foreground max-w-[150px] text-right text-xs">{cuenta.notas_cuenta}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Estado Financiero — mini-cards */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Estado Financiero
                                </CardTitle>
                                <CardDescription>Resumen del saldo y las operaciones de esta cuenta</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                                    {/* Saldo Actual */}
                                    <Card
                                        className={`border-l-4 ${
                                            estadoFinanciero.color === 'red'
                                                ? 'border-l-red-500'
                                                : estadoFinanciero.color === 'green'
                                                  ? 'border-l-green-500'
                                                  : 'border-l-gray-400'
                                        }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <EstadoIcon
                                                    className={`h-4 w-4 ${
                                                        estadoFinanciero.color === 'red'
                                                            ? 'text-red-500'
                                                            : estadoFinanciero.color === 'green'
                                                              ? 'text-green-500'
                                                              : 'text-gray-400'
                                                    }`}
                                                />
                                                <span className="text-xs font-medium">Saldo Actual</span>
                                            </div>
                                            <div
                                                className={`mt-2 text-xl font-bold ${
                                                    estadoFinanciero.color === 'red'
                                                        ? 'text-red-600'
                                                        : estadoFinanciero.color === 'green'
                                                          ? 'text-green-600'
                                                          : 'text-gray-600'
                                                }`}
                                            >
                                                {formatearMoneda(saldo, cuenta.moneda?.simbolo_moneda || '$')}
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">{estadoFinanciero.texto}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Operaciones registradas */}
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <History className="h-4 w-4 text-blue-500" />
                                                <span className="text-xs font-medium">Operaciones</span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold text-blue-600">{totalOperaciones}</div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {historialVentas.total} ventas · {historialTransacciones.total} transacciones
                                                {puedeEditar ? ` · ${historialCompras.total} compras` : ''}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Titularidad */}
                                    <Card className="border-l-4 border-l-violet-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-violet-500" />
                                                <span className="text-xs font-medium">Titularidad</span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold text-violet-600 capitalize">
                                                {cuenta.tipo_titular || 'Sin asignar'}
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">Tipo de titular de la cuenta</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Historial — separado por Card: Compras, Ventas, Transacciones */}
                    {puedeEditar && (
                        <TablaHistorial
                            titulo="Compras"
                            descripcion="Pagos de compra realizados desde esta cuenta"
                            Icono={ShoppingCart}
                            historial={historialCompras}
                            emptyTexto="Los pagos de compra hechos desde esta cuenta aparecerán aquí"
                            filtroKey="compras"
                            filtrosIniciales={{ q: filtros.compras.q_compras, desde: filtros.compras.desde_compras, hasta: filtros.compras.hasta_compras }}
                        />
                    )}

                    <TablaHistorial
                        titulo="Ventas"
                        descripcion="Pagos de venta recibidos y comisiones (vendedor, gestor, mensajería) pagadas desde esta cuenta"
                        Icono={Receipt}
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
