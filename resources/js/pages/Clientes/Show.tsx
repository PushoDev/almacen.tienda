import HeadingSmall from '@/components/heading-small';
import {
    DetalleCompra,
    DetalleCompraExpandido,
    DetalleMovimiento,
    DetalleMovimientoExpandido,
    DetalleVenta,
    DetalleVentaExpandido,
} from '@/components/detalle-operacion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowLeft,
    ArrowRightLeft,
    Building,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    DollarSign,
    Edit3,
    ExternalLink,
    Eye,
    HandHeart,
    History,
    Home,
    MapPin,
    Package,
    Phone,
    Receipt,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    User,
    Users,
    Wallet,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface CompraCliente {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: string;
    proveedor: { id: number; nombre_proveedor: string } | null;
    productos: Array<{
        id: number;
        nombre_producto: string;
        codigo_producto?: string;
        pivot: { cantidad: number; precio: number; almacen_id: number };
    }>;
    pagos: Array<{
        id: number;
        tipo_pago: string;
        monto: number;
        cuenta?: { id: number; nombre_cuenta: string };
        cliente?: { id: number; nombre_cliente: string };
    }>;
    pivot: { monto: number; tipo_pago: string; saldo_anterior: number | null; saldo_posterior: number | null };
    detalle: DetalleCompra | null;
}

interface TipoMovimientoFinanciero {
    id: number;
    nombre: string;
}

interface MovimientoFinanciero {
    id: number;
    tipo_movimiento_id: number;
    tipo_movimiento: TipoMovimientoFinanciero;
    cuenta_origen_id?: number;
    cuenta_origen?: { id: number; nombre_cuenta: string };
    cliente_origen_id?: number;
    cliente_origen?: { id: number; nombre_cliente: string };
    cuenta_destino_id?: number;
    cuenta_destino?: { id: number; nombre_cuenta: string };
    cliente_destino_id?: number;
    cliente_destino?: { id: number; nombre_cliente: string };
    proveedor_destino_id?: number;
    proveedor_destino?: { id: number; nombre_proveedor: string };
    monto: number;
    moneda: string;
    tasa_cambio_aplicada: number;
    descripcion: string;
    fecha_operacion: string;
    estado: string;
    saldo_anterior_origen: number | null;
    saldo_posterior_origen: number | null;
    saldo_anterior_destino: number | null;
    saldo_posterior_destino: number | null;
    detalle: DetalleMovimiento | null;
    user: { id: number; name: string } | null;
}

interface VentaCliente {
    id: number;
    total: number;
    estado: string;
    created_at: string;
    es_venta_gestor?: boolean;
    gestor_monto?: number;
    gestor_comentario?: string;
    tasa_aplicada_gestor?: number;
    gestor_cuenta?: { id: number; nombre_cuenta: string } | null;
    almacen: { id: number; nombre_almacen: string };
    destinatario: {
        id: number;
        nombre: string;
        apellidos: string;
        carnet_identidad: string;
        direccion_residencia: string;
        telefono_contacto: string;
        parentesco_cliente: string;
        observaciones: string;
    } | null;
    detalles: Array<{
        id: number;
        cantidad: number;
        precio_venta: number;
        subtotal: number;
        costo_unitario: number;
        producto: {
            id: number;
            nombre_producto: string;
            marca_producto: string;
            categoria: { nombre_categoria: string } | null;
        };
    }>;
    pagos: Array<{
        id: number;
        tipo_pago: string;
        monto: number;
        monto_equivalente: number;
        tasa_cambio_aplicada: number;
        moneda: { id: number; codigo_moneda: string; nombre_moneda: string } | null;
        cuenta: {
            id: number;
            nombre_cuenta: string;
            moneda: { id: number; codigo_moneda: string; nombre_moneda: string } | null;
        };
    }>;
    moneda: { id: number; codigo_moneda: string; nombre_moneda: string } | null;
    tasa_cambio_principal: number;
    usuario: { id: number; name: string; email: string; role: string };
}

// Pagos de ventas recibidos por el cliente como abono de su deuda
interface PagoVentaRecibido {
    id: number;
    venta_id: number;
    tipo_pago: string;
    moneda_id: number | null;
    cuenta_id: number | null;
    cliente_id: number;
    via_pago: string | null;
    monto: number;
    tasa_cambio_aplicada: number;
    monto_equivalente: number | null;
    referencia: string | null;
    created_at: string;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    detalle: DetalleVenta | null;
    moneda: { id: number; codigo_moneda: string; nombre_moneda: string } | null;
    venta: {
        id: number;
        total: number;
        estado: string;
        created_at: string;
        almacen: { id: number; nombre_almacen: string } | null;
        usuario: { id: number; name: string } | null;
        cliente: { id: number; nombre_cliente: string } | null;
        moneda: { id: number; codigo_moneda: string } | null;
    } | null;
}

interface ShowClientePageProps {
    cliente: ClienteProps & {
        compras_como_pagador?: CompraCliente[];
        movimientos_como_origen?: MovimientoFinanciero[];
        movimientos_como_destino?: MovimientoFinanciero[];
        ventas?: VentaCliente[];
        pagos_venta?: PagoVentaRecibido[];
    };
}

const breadcrumbs = (clienteNombre: string): BreadcrumbItem[] => [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Clientes', href: '/clientes' },
    { title: `Detalles: ${clienteNombre}`, href: '#' },
];

// ─── Componente: TablaTransacciones ─────────────────────────────────────────

const TablaTransacciones = ({
    movimientos,
    cliente,
    formatearMoneda,
    formatearFecha,
}: {
    movimientos: MovimientoFinanciero[];
    cliente: ClienteProps;
    formatearMoneda: (valor: number | null | undefined) => string;
    formatearFecha: (fecha: string) => string;
}) => {
    const getMovimientoIcon = (id: number) => {
        switch (id) {
            case 1: return TrendingDown;
            case 2: return TrendingUp;
            case 3: return ArrowRightLeft;
            default: return DollarSign;
        }
    };
    const getMovimientoColor = (id: number) => {
        switch (id) {
            case 1: return 'text-red-600 bg-red-50 border-red-200';
            case 2: return 'text-green-600 bg-green-50 border-green-200';
            case 3: return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    return (
        <ScrollArea className="h-[420px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Dirección</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movimientos.length > 0 ? (
                        movimientos.map((mov) => {
                            const Icon = getMovimientoIcon(mov.tipo_movimiento_id);
                            const colorClase = getMovimientoColor(mov.tipo_movimiento_id);
                            const dir = mov.cliente_origen_id === cliente.id ? 'origen' : 'destino';
                            const expandida = expandedRow === mov.id;
                            return (
                                <Fragment key={mov.id}>
                                    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedRow(expandida ? null : mov.id)}>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {expandida ? (
                                                    <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                ) : (
                                                    <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                )}
                                                <Calendar size={12} className="text-muted-foreground" />
                                                <span className="text-sm">{formatearFecha(mov.fecha_operacion)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`flex w-28 items-center gap-1 ${colorClase}`}>
                                                <Icon size={12} />
                                                {mov.tipo_movimiento.nombre}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[180px] truncate text-sm">{mov.descripcion}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`font-medium ${
                                                    mov.tipo_movimiento_id === 1
                                                        ? 'text-red-600'
                                                        : mov.tipo_movimiento_id === 2
                                                          ? 'text-green-600'
                                                          : 'text-blue-600'
                                                }`}
                                            >
                                                {formatearMoneda(mov.monto)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{mov.moneda}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={dir === 'origen' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}
                                            >
                                                {dir === 'origen' ? 'Salida' : 'Entrada'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    {expandida && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={6} className="bg-muted/30 px-6 py-3">
                                                {mov.detalle ? (
                                                    <DetalleMovimientoExpandido
                                                        detalle={mov.detalle}
                                                        monto={mov.monto}
                                                        moneda={mov.moneda}
                                                        descripcion={mov.descripcion}
                                                        usuario={mov.user?.name ?? '—'}
                                                    />
                                                ) : (
                                                    <p className="text-muted-foreground text-xs">Sin detalle disponible.</p>
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
                                    <ArrowRightLeft size={32} className="opacity-40" />
                                    <p className="font-medium">Sin transacciones financieras</p>
                                    <p className="text-xs">Gastos, ingresos y transferencias donde participe este cliente aparecerán aquí</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

// ─── Componente: TablaVentas ─────────────────────────────────────────────────

const TablaVentas = ({
    ventas,
    formatearMoneda,
    formatearFecha,
}: {
    ventas: VentaCliente[];
    formatearMoneda: (valor: number | null | undefined) => string;
    formatearFecha: (fecha: string) => string;
}) => {
    const getEstadoColor = (estado: string) => {
        switch (estado) {
            case 'completada': return 'bg-green-100 text-green-800 border-green-200';
            case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const getEstadoIcon = (estado: string) => {
        switch (estado) {
            case 'completada': return CheckCircle;
            case 'pendiente': return AlertCircle;
            case 'cancelada': return AlertCircle;
            default: return History;
        }
    };

    return (
        <ScrollArea className="h-[420px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Venta</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Almacén</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Destinatario</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ventas.length > 0 ? (
                        ventas.map((venta) => {
                            const EstadoIcon = getEstadoIcon(venta.estado);
                            const estadoColor = getEstadoColor(venta.estado);
                            return (
                                <TableRow key={venta.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="outline">#{venta.id}</Badge>
                                            {venta.es_venta_gestor && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-violet-200 bg-violet-50 text-xs text-violet-700 dark:bg-violet-900/20 dark:text-violet-400"
                                                >
                                                    <Users size={10} className="mr-1" />
                                                    Con Gestor
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-muted-foreground" />
                                            <span className="text-sm">{formatearFecha(venta.created_at)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm font-medium">{venta.almacen.nombre_almacen}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold">{formatearMoneda(venta.total)}</span>
                                            {venta.moneda && (
                                                <Badge variant="outline" className="text-xs">
                                                    {venta.moneda.codigo_moneda}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex w-24 items-center gap-1 ${estadoColor}`}>
                                            <EstadoIcon size={12} />
                                            {venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {venta.destinatario ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="cursor-default bg-blue-50 text-blue-700">
                                                        <User size={11} className="mr-1" />
                                                        {venta.destinatario.nombre}
                                                    </Badge>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <div className="space-y-1 text-xs">
                                                        <p>
                                                            <strong>Nombre:</strong> {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                                        </p>
                                                        <p>
                                                            <strong>CI:</strong> {venta.destinatario.carnet_identidad}
                                                        </p>
                                                        <p>
                                                            <strong>Teléfono:</strong> {venta.destinatario.telefono_contacto}
                                                        </p>
                                                        <p>
                                                            <strong>Dirección:</strong> {venta.destinatario.direccion_residencia}
                                                        </p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">Sin destinatario</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                        <Eye size={13} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="max-w-[220px]">
                                                    <div className="space-y-1 text-xs">
                                                        <p>
                                                            <strong>Vendedor:</strong> {venta.usuario.name}
                                                        </p>
                                                        <p>
                                                            <strong>Productos:</strong> {venta.detalles.length}
                                                        </p>
                                                        <p>
                                                            <strong>Pagos:</strong> {venta.pagos.length}
                                                        </p>
                                                        {venta.moneda && (
                                                            <p>
                                                                <strong>Moneda:</strong> {venta.moneda.nombre_moneda}
                                                            </p>
                                                        )}
                                                        <p>
                                                            <strong>Tasa:</strong> {venta.tasa_cambio_principal}
                                                        </p>
                                                        {venta.es_venta_gestor && venta.gestor_cuenta && (
                                                            <>
                                                                <div className="my-1 border-t border-violet-200" />
                                                                <p className="text-violet-700">
                                                                    <strong>Gestor:</strong> {venta.gestor_cuenta.nombre_cuenta}
                                                                </p>
                                                                <p className="text-violet-700">
                                                                    <strong>Comisión:</strong> {formatearMoneda(venta.gestor_monto)}
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Link href={route('ventas.show', { id: venta.id })}>
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
                                                    <p className="text-xs">Ver venta completa</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Receipt size={32} className="opacity-40" />
                                    <p className="font-medium">Sin ventas registradas</p>
                                    <p className="text-xs">Las ventas donde este cliente sea el comprador aparecerán aquí</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

// ─── Componente: TablaPagosRecibidos (NUEVO) ─────────────────────────────────

const TablaPagosRecibidos = ({
    pagos,
    formatearMoneda,
    formatearFecha,
}: {
    pagos: PagoVentaRecibido[];
    formatearMoneda: (valor: number | null | undefined) => string;
    formatearFecha: (fecha: string) => string;
}) => {
    const getEstadoVentaColor = (estado: string) => {
        switch (estado) {
            case 'completada': return 'bg-green-100 text-green-800 border-green-200';
            case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelada': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    return (
        <ScrollArea className="h-[420px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Venta</TableHead>
                        <TableHead>Almacén</TableHead>
                        <TableHead>Monto Recibido</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Vía de Pago</TableHead>
                        <TableHead>Estado Venta</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pagos.length > 0 ? (
                        pagos.map((pago) => {
                            const expandida = expandedRow === pago.id;
                            return (
                                <Fragment key={pago.id}>
                                    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => setExpandedRow(expandida ? null : pago.id)}>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {expandida ? (
                                                    <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                ) : (
                                                    <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                )}
                                                <Calendar size={12} className="text-muted-foreground" />
                                                <span className="text-sm">{formatearFecha(pago.created_at)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {pago.venta ? (
                                                <Badge variant="outline" className="font-mono">
                                                    #{pago.venta.id}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{pago.venta?.almacen?.nombre_almacen ?? '—'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-emerald-600">{formatearMoneda(pago.monto)}</span>
                                            {pago.saldo_anterior !== null && pago.saldo_posterior !== null && (
                                                <div className="text-muted-foreground text-[11px]">
                                                    {formatearMoneda(pago.saldo_anterior)} → {formatearMoneda(pago.saldo_posterior)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{pago.moneda?.codigo_moneda ?? 'USD'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {pago.via_pago ? (
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {pago.via_pago}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {pago.venta ? (
                                                <Badge variant="outline" className={`text-xs ${getEstadoVentaColor(pago.venta.estado)}`}>
                                                    {pago.venta.estado.charAt(0).toUpperCase() + pago.venta.estado.slice(1)}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    {expandida && (
                                        <TableRow className="hover:bg-transparent">
                                            <TableCell colSpan={7} className="bg-muted/30 px-6 py-3">
                                                {pago.detalle ? (
                                                    <DetalleVentaExpandido detalle={pago.detalle} />
                                                ) : (
                                                    <p className="text-muted-foreground text-xs">Sin detalle disponible.</p>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-muted-foreground py-10 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Wallet size={32} className="opacity-40" />
                                    <p className="font-medium">Sin pagos recibidos por ventas</p>
                                    <p className="text-xs">Cuando una venta dirija su cobro a este cliente como abono, aparecerá aquí</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

// ─── Página Principal ────────────────────────────────────────────────────────

export default function ShowClientePage({ cliente }: ShowClientePageProps) {
    const [activeVentasFilter, setActiveVentasFilter] = useState('todas');
    const [activeTransFilter, setActiveTransFilter] = useState('todas');
    const [expandedCompraRow, setExpandedCompraRow] = useState<number | null>(null);

    const formatearMoneda = (valor: number | null | undefined) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    const formatearFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

    const compras = cliente.compras_como_pagador || [];
    const ventas = cliente.ventas || [];
    const pagosVenta = cliente.pagos_venta || [];
    const movimientosOrigen = cliente.movimientos_como_origen || [];
    const movimientosDestino = cliente.movimientos_como_destino || [];

    const metricas = useMemo(() => {
        const totalCompras = compras.length;
        const montoTotalAportado = compras.reduce((sum, c) => sum + Number(c.pivot.monto), 0);

        const totalVentas = ventas.length;
        const montoTotalVentas = ventas.reduce((sum, v) => sum + Number(v.total), 0);
        const ventasCompletadas = ventas.filter((v) => v.estado === 'completada').length;
        const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length;
        const ventasCanceladas = ventas.filter((v) => v.estado === 'cancelada').length;

        const totalPagosVenta = pagosVenta.length;
        const montoTotalPagosVenta = pagosVenta.reduce((sum, p) => sum + Number(p.monto), 0);

        const totalTransacciones = movimientosOrigen.length + movimientosDestino.length;
        const montoTransaccionesOrigen = movimientosOrigen.reduce((sum, m) => sum + Number(m.monto), 0);
        const montoTransaccionesDestino = movimientosDestino.reduce((sum, m) => sum + Number(m.monto), 0);
        const saldoNetoTransacciones = montoTransaccionesDestino - montoTransaccionesOrigen;

        const saldoActual = Number(cliente.deuda_pago_cliente) || 0;

        return {
            totalCompras,
            montoTotalAportado,
            saldoActual,
            totalVentas,
            montoTotalVentas,
            ventasCompletadas,
            ventasPendientes,
            ventasCanceladas,
            totalPagosVenta,
            montoTotalPagosVenta,
            totalTransacciones,
            montoTransaccionesOrigen,
            montoTransaccionesDestino,
            saldoNetoTransacciones,
        };
    }, [compras, ventas, pagosVenta, movimientosOrigen, movimientosDestino, cliente.deuda_pago_cliente]);

    const getEstadoFinanciero = (saldo: number | null | undefined) => {
        if (saldo === null || saldo === undefined) {
            return { color: 'gray', icon: History, texto: 'Sin información' };
        }
        if (saldo > 0) {
            return { color: 'green', icon: ArrowDownCircle, texto: 'Fondo disponible' };
        } else if (saldo < 0) {
            return { color: 'red', icon: AlertCircle, texto: 'Deuda pendiente' };
        } else {
            return { color: 'gray', icon: CheckCircle, texto: 'Al día' };
        }
    };

    const estado = getEstadoFinanciero(cliente.deuda_pago_cliente);
    const EstadoIcon = estado.icon;

    const todosMovimientos = useMemo(
        () =>
            [...movimientosOrigen, ...movimientosDestino].sort(
                (a, b) => new Date(b.fecha_operacion).getTime() - new Date(a.fecha_operacion).getTime(),
            ),
        [movimientosOrigen, movimientosDestino],
    );

    const ventasFiltradas = useMemo(() => {
        switch (activeVentasFilter) {
            case 'completadas': return ventas.filter((v) => v.estado === 'completada');
            case 'pendientes': return ventas.filter((v) => v.estado === 'pendiente');
            case 'canceladas': return ventas.filter((v) => v.estado === 'cancelada');
            default: return ventas;
        }
    }, [ventas, activeVentasFilter]);

    const movimientosFiltrados = useMemo(() => {
        switch (activeTransFilter) {
            case 'origen': return movimientosOrigen;
            case 'destino': return movimientosDestino;
            default: return todosMovimientos;
        }
    }, [todosMovimientos, movimientosOrigen, movimientosDestino, activeTransFilter]);

    return (
        <AppLayout breadcrumbs={breadcrumbs(cliente.nombre_cliente)}>
            <Head title={`Detalles: ${cliente.nombre_cliente}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">

                    {/* ── Header ── NO MODIFICAR ───────────────────────────── */}
                    <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title={`Cliente: ${cliente.nombre_cliente}`}
                            description="Información detallada e historial de compras, ventas y transacciones financieras"
                        />
                        <HandHeart
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                        />
                    </div>

                    {/* Navegación */}
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={route('clientes.edit', { cliente: cliente.id })}>
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <Edit3 size={16} />
                                        Editar
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Editar información del cliente</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href={route('clientes.index')}>
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <ArrowLeft size={16} />
                                        Volver
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Volver al listado de clientes</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* ── Info del Cliente + Métricas Financieras ────────────── */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                        {/* Datos básicos */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información del Cliente
                                </CardTitle>
                                <CardDescription>Datos básicos y contacto</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">ID:</span>
                                    </div>
                                    <Badge variant="outline">#{cliente.id}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Tipo:</span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className={
                                            cliente.tipo_cliente === 'asociado'
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-500'
                                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-500'
                                        }
                                    >
                                        {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                    </Badge>
                                </div>
                                {cliente.telefono_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Phone className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Teléfono:</span>
                                        </div>
                                        <span className="text-sm">{cliente.telefono_cliente}</span>
                                    </div>
                                )}
                                {cliente.ciudad_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Ciudad:</span>
                                        </div>
                                        <span className="text-sm">{cliente.ciudad_cliente}</span>
                                    </div>
                                )}
                                {cliente.direccion_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Home className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Dirección:</span>
                                        </div>
                                        <span className="text-muted-foreground max-w-[130px] truncate text-xs">
                                            {cliente.direccion_cliente}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Estado Financiero — 4 mini-cards */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Estado Financiero
                                </CardTitle>
                                <CardDescription>Resumen de la situación económica con el cliente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">

                                    {/* Saldo Actual */}
                                    <Card
                                        className={`border-l-4 ${
                                            estado.color === 'red'
                                                ? 'border-l-red-500'
                                                : estado.color === 'green'
                                                  ? 'border-l-green-500'
                                                  : 'border-l-gray-400'
                                        }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <EstadoIcon
                                                    className={`h-4 w-4 ${
                                                        estado.color === 'red'
                                                            ? 'text-red-500'
                                                            : estado.color === 'green'
                                                              ? 'text-green-500'
                                                              : 'text-gray-400'
                                                    }`}
                                                />
                                                <span className="text-xs font-medium">Saldo Actual</span>
                                            </div>
                                            <div
                                                className={`mt-2 text-xl font-bold ${
                                                    estado.color === 'red'
                                                        ? 'text-red-600'
                                                        : estado.color === 'green'
                                                          ? 'text-green-600'
                                                          : 'text-gray-600'
                                                }`}
                                            >
                                                {formatearMoneda(cliente.deuda_pago_cliente)}
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">{estado.texto}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Pagos Recibidos */}
                                    <Card className="border-l-4 border-l-emerald-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="h-4 w-4 text-emerald-500" />
                                                <span className="text-xs font-medium">Pagos Recibidos</span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold text-emerald-600">
                                                {metricas.totalPagosVenta}
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {formatearMoneda(metricas.montoTotalPagosVenta)} total
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Compras */}
                                    <Card className="border-l-4 border-l-blue-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                                <span className="text-xs font-medium">Compras</span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold text-blue-600">{metricas.totalCompras}</div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                Aportó {formatearMoneda(metricas.montoTotalAportado)}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Ventas */}
                                    <Card className="border-l-4 border-l-purple-500">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="h-4 w-4 text-purple-500" />
                                                <span className="text-xs font-medium">Ventas</span>
                                            </div>
                                            <div className="mt-2 text-xl font-bold text-purple-600">{metricas.totalVentas}</div>
                                            <p className="text-muted-foreground mt-1 text-xs">
                                                {formatearMoneda(metricas.montoTotalVentas)} total
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Historial Completo — 4 Tabs ──────────────────────── */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Historial Completo
                            </CardTitle>
                            <CardDescription>
                                Ventas, pagos recibidos, compras y transacciones financieras del cliente
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="ventas">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="ventas" className="flex items-center gap-1.5">
                                        <Receipt size={13} />
                                        Ventas
                                        {metricas.totalVentas > 0 && (
                                            <Badge variant="secondary" className="h-4 min-w-[18px] px-1 text-[10px]">
                                                {metricas.totalVentas}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="pagos" className="flex items-center gap-1.5">
                                        <Wallet size={13} />
                                        Pagos Recibidos
                                        {metricas.totalPagosVenta > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="h-4 min-w-[18px] bg-emerald-100 px-1 text-[10px] text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            >
                                                {metricas.totalPagosVenta}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="compras" className="flex items-center gap-1.5">
                                        <ShoppingCart size={13} />
                                        Compras
                                        {metricas.totalCompras > 0 && (
                                            <Badge variant="secondary" className="h-4 min-w-[18px] px-1 text-[10px]">
                                                {metricas.totalCompras}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                    <TabsTrigger value="transacciones" className="flex items-center gap-1.5">
                                        <ArrowRightLeft size={13} />
                                        Transacciones
                                        {metricas.totalTransacciones > 0 && (
                                            <Badge variant="secondary" className="h-4 min-w-[18px] px-1 text-[10px]">
                                                {metricas.totalTransacciones}
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                {/* ── Tab: Ventas ── */}
                                <TabsContent value="ventas" className="mt-4 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { key: 'todas', label: 'Todas', count: metricas.totalVentas },
                                                { key: 'completadas', label: 'Completadas', count: metricas.ventasCompletadas },
                                                { key: 'pendientes', label: 'Pendientes', count: metricas.ventasPendientes },
                                                { key: 'canceladas', label: 'Canceladas', count: metricas.ventasCanceladas },
                                            ].map(({ key, label, count }) => (
                                                <Button
                                                    key={key}
                                                    variant={activeVentasFilter === key ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setActiveVentasFilter(key)}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    {label}
                                                    {count > 0 && (
                                                        <span
                                                            className={`rounded-full px-1.5 text-[10px] font-medium ${
                                                                activeVentasFilter === key
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {count}
                                                        </span>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                        {ventasFiltradas.length > 0 && (
                                            <span className="text-muted-foreground text-sm">
                                                {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''} ·{' '}
                                                {formatearMoneda(ventasFiltradas.reduce((s, v) => s + Number(v.total), 0))}
                                            </span>
                                        )}
                                    </div>
                                    <TablaVentas ventas={ventasFiltradas} formatearMoneda={formatearMoneda} formatearFecha={formatearFecha} />
                                </TabsContent>

                                {/* ── Tab: Pagos Recibidos ── */}
                                <TabsContent value="pagos" className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-muted-foreground text-sm">
                                            Pagos de ventas dirigidos a este cliente como abono de su deuda
                                        </p>
                                        {pagosVenta.length > 0 && (
                                            <span className="text-sm font-semibold text-emerald-600">
                                                Total abonado: {formatearMoneda(metricas.montoTotalPagosVenta)}
                                            </span>
                                        )}
                                    </div>
                                    <TablaPagosRecibidos
                                        pagos={pagosVenta}
                                        formatearMoneda={formatearMoneda}
                                        formatearFecha={formatearFecha}
                                    />
                                </TabsContent>

                                {/* ── Tab: Compras ── */}
                                <TabsContent value="compras" className="mt-4">
                                    <Tabs defaultValue="resumen">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="resumen">Resumen General</TabsTrigger>
                                            <TabsTrigger value="detalles">Tabla de Detalles</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="resumen" className="mt-4 space-y-4">
                                            <ScrollArea className="h-[400px]">
                                                <div className="space-y-3">
                                                    {compras.length > 0 ? (
                                                        compras.map((compra) => (
                                                            <Card key={compra.id} className="bg-muted/50">
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center gap-3">
                                                                                <Badge variant="secondary">Compra #{compra.id}</Badge>
                                                                                <span className="text-muted-foreground text-sm">
                                                                                    {formatearFecha(compra.fecha_compra)}
                                                                                </span>
                                                                            </div>
                                                                            <div>
                                                                                {compra.proveedor ? (
                                                                                    <Link
                                                                                        href={route('proveedores.show', { proveedor: compra.proveedor.id })}
                                                                                        className="font-semibold hover:text-blue-600 hover:underline"
                                                                                    >
                                                                                        {compra.proveedor.nombre_proveedor}
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-sm font-semibold">Sin proveedor</span>
                                                                                )}
                                                                                <p className="text-muted-foreground text-sm">
                                                                                    Total: {formatearMoneda(compra.total_compra)}
                                                                                </p>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 text-sm">
                                                                                <span className="flex items-center gap-1">
                                                                                    <Package size={13} />
                                                                                    {compra.productos.length} producto(s)
                                                                                </span>
                                                                                <span className="flex items-center gap-1 text-green-600">
                                                                                    <DollarSign size={13} />
                                                                                    Aportó: {formatearMoneda(compra.pivot.monto)}
                                                                                </span>
                                                                            </div>
                                                                            {compra.pivot.saldo_anterior !== null && compra.pivot.saldo_posterior !== null && (
                                                                                <p className="text-muted-foreground text-xs">
                                                                                    Saldo: {formatearMoneda(compra.pivot.saldo_anterior)} → {formatearMoneda(compra.pivot.saldo_posterior)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={
                                                                                compra.tipo_compra === 'pago_cash'
                                                                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                                                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                                                            }
                                                                        >
                                                                            {compra.tipo_compra === 'pago_cash' ? 'Pago Inmediato' : 'Deuda Proveedor'}
                                                                        </Badge>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))
                                                    ) : (
                                                        <div className="text-muted-foreground py-10 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ShoppingCart size={32} className="opacity-40" />
                                                                <p className="font-medium">Sin compras como método de pago</p>
                                                                <p className="text-sm">
                                                                    Las compras donde este cliente sea usado como método de pago aparecerán aquí
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                            {compras.length > 0 && (
                                                <div className="text-muted-foreground flex items-center justify-between text-sm">
                                                    <span>
                                                        {compras.length} compra{compras.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="detalles" className="mt-4 space-y-4">
                                            <ScrollArea className="h-[500px]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Compra</TableHead>
                                                            <TableHead>Fecha</TableHead>
                                                            <TableHead>Proveedor</TableHead>
                                                            <TableHead>Total Compra</TableHead>
                                                            <TableHead>Monto Aportado</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {compras.length > 0 ? (
                                                            compras.map((compra) => {
                                                                const expandida = expandedCompraRow === compra.id;
                                                                return (
                                                                    <Fragment key={compra.id}>
                                                                        <TableRow
                                                                            className="hover:bg-muted/50 cursor-pointer"
                                                                            onClick={() => setExpandedCompraRow(expandida ? null : compra.id)}
                                                                        >
                                                                            <TableCell>
                                                                                <div className="flex items-center gap-1">
                                                                                    {expandida ? (
                                                                                        <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                                                    ) : (
                                                                                        <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                                                                    )}
                                                                                    <Badge variant="outline">#{compra.id}</Badge>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <div className="flex items-center gap-1">
                                                                                    <Calendar size={12} className="text-muted-foreground" />
                                                                                    <span className="text-sm">{formatearFecha(compra.fecha_compra)}</span>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {compra.proveedor ? (
                                                                                    <Link
                                                                                        href={route('proveedores.show', { proveedor: compra.proveedor.id })}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <Button variant="link" className="h-auto p-0 text-sm font-medium">
                                                                                            {compra.proveedor.nombre_proveedor}
                                                                                        </Button>
                                                                                    </Link>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-xs">—</span>
                                                                                )}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="font-medium">{formatearMoneda(compra.total_compra)}</span>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="font-semibold text-green-600">
                                                                                    {formatearMoneda(compra.pivot.monto)}
                                                                                </span>
                                                                                {compra.pivot.saldo_anterior !== null && compra.pivot.saldo_posterior !== null && (
                                                                                    <div className="text-muted-foreground text-[11px]">
                                                                                        {formatearMoneda(compra.pivot.saldo_anterior)} → {formatearMoneda(compra.pivot.saldo_posterior)}
                                                                                    </div>
                                                                                )}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        {expandida && (
                                                                            <TableRow className="hover:bg-transparent">
                                                                                <TableCell colSpan={5} className="bg-muted/30 px-6 py-3">
                                                                                    {compra.detalle ? (
                                                                                        <DetalleCompraExpandido
                                                                                            detalle={compra.detalle}
                                                                                            monto={Number(compra.total_compra)}
                                                                                            usuario="—"
                                                                                        />
                                                                                    ) : (
                                                                                        <p className="text-muted-foreground text-xs">Sin detalle disponible.</p>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </Fragment>
                                                                );
                                                            })
                                                        ) : (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <ShoppingCart size={32} className="opacity-40" />
                                                                        <p>No hay compras registradas como método de pago</p>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                            {compras.length > 0 && (
                                                <div className="text-muted-foreground flex items-center justify-between text-sm">
                                                    <span>
                                                        {compras.length} compra{compras.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </TabsContent>

                                {/* ── Tab: Transacciones ── */}
                                <TabsContent value="transacciones" className="mt-4 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex gap-2">
                                            {[
                                                { key: 'todas', label: 'Todas', count: metricas.totalTransacciones },
                                                { key: 'origen', label: 'Como Origen', count: movimientosOrigen.length },
                                                { key: 'destino', label: 'Como Destino', count: movimientosDestino.length },
                                            ].map(({ key, label, count }) => (
                                                <Button
                                                    key={key}
                                                    variant={activeTransFilter === key ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setActiveTransFilter(key)}
                                                    className="flex items-center gap-1.5"
                                                >
                                                    {label}
                                                    {count > 0 && (
                                                        <span
                                                            className={`rounded-full px-1.5 text-[10px] font-medium ${
                                                                activeTransFilter === key
                                                                    ? 'bg-white/20 text-white'
                                                                    : 'bg-muted text-muted-foreground'
                                                            }`}
                                                        >
                                                            {count}
                                                        </span>
                                                    )}
                                                </Button>
                                            ))}
                                        </div>
                                        {movimientosFiltrados.length > 0 && (
                                            <span className="text-muted-foreground text-sm">
                                                {movimientosFiltrados.length} transacción{movimientosFiltrados.length !== 1 ? 'es' : ''} ·{' '}
                                                {formatearMoneda(movimientosFiltrados.reduce((s, m) => s + Number(m.monto), 0))}
                                            </span>
                                        )}
                                    </div>

                                    <TablaTransacciones
                                        movimientos={movimientosFiltrados}
                                        cliente={cliente}
                                        formatearMoneda={formatearMoneda}
                                        formatearFecha={formatearFecha}
                                    />

                                    {metricas.totalTransacciones > 0 && (
                                        <div className="grid grid-cols-3 gap-3 border-t pt-4">
                                            <div className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                                    <span className="text-xs font-medium">Entradas</span>
                                                </div>
                                                <span className="text-sm font-semibold text-green-600">
                                                    {formatearMoneda(metricas.montoTransaccionesDestino)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                                    <span className="text-xs font-medium">Salidas</span>
                                                </div>
                                                <span className="text-sm font-semibold text-red-600">
                                                    {formatearMoneda(metricas.montoTransaccionesOrigen)}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-blue-500" />
                                                    <span className="text-xs font-medium">Saldo Neto</span>
                                                </div>
                                                <span
                                                    className={`text-sm font-semibold ${
                                                        metricas.saldoNetoTransacciones >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {formatearMoneda(metricas.saldoNetoTransacciones)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
