import HeadingSmall from '@/components/heading-small';
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
    CreditCard,
    DollarSign,
    Edit3,
    Eye,
    History,
    Home,
    MapPin,
    Package,
    Phone,
    Receipt,
    ShoppingCart,
    Store,
    TrendingDown,
    TrendingUp,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// Definir tipos para las compras del cliente
interface CompraCliente {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: string;
    proveedor: {
        id: number;
        nombre_proveedor: string;
    };
    productos: Array<{
        id: number;
        nombre_producto: string;
        codigo_producto?: string;
        pivot: {
            cantidad: number;
            precio: number;
            almacen_id: number;
        };
    }>;
    pagos: Array<{
        id: number;
        tipo_pago: string;
        monto: number;
        cuenta?: {
            id: number;
            nombre_cuenta: string;
        };
        cliente?: {
            id: number;
            nombre_cliente: string;
        };
    }>;
    pivot: {
        monto: number;
        tipo_pago: string;
    };
}

// Definir tipos para movimientos financieros
interface TipoMovimientoFinanciero {
    id: number;
    nombre: string;
}

interface MovimientoFinanciero {
    id: number;
    tipo_movimiento_id: number;
    tipo_movimiento: TipoMovimientoFinanciero;
    cuenta_origen_id?: number;
    cuenta_origen?: {
        id: number;
        nombre_cuenta: string;
    };
    cliente_origen_id?: number;
    cliente_origen?: {
        id: number;
        nombre_cliente: string;
    };
    cuenta_destino_id?: number;
    cuenta_destino?: {
        id: number;
        nombre_cuenta: string;
    };
    cliente_destino_id?: number;
    cliente_destino?: {
        id: number;
        nombre_cliente: string;
    };
    proveedor_destino_id?: number;
    proveedor_destino?: {
        id: number;
        nombre_proveedor: string;
    };
    monto: number;
    moneda: string;
    tasa_cambio_aplicada: number;
    descripcion: string;
    fecha_operacion: string;
    estado: string;
}

// Definir tipos para las ventas del cliente
interface VentaCliente {
    id: number;
    total: number;
    estado: string;
    created_at: string;
    almacen: {
        id: number;
        nombre_almacen: string;
    };
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
            categoria: {
                nombre_categoria: string;
            } | null;
        };
    }>;
    pagos: Array<{
        id: number;
        tipo_pago: string;
        monto: number;
        monto_equivalente: number;
        tasa_cambio_aplicada: number;
        moneda: {
            id: number;
            codigo_moneda: string;
            nombre_moneda: string;
        } | null;
        cuenta: {
            id: number;
            nombre_cuenta: string;
            moneda: {
                id: number;
                codigo_moneda: string;
                nombre_moneda: string;
            } | null;
        };
    }>;
    moneda: {
        id: number;
        codigo_moneda: string;
        nombre_moneda: string;
    } | null;
    tasa_cambio_principal: number;
    usuario: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
}

interface ShowClientePageProps {
    cliente: ClienteProps & {
        compras_como_pagador?: CompraCliente[];
        movimientos_como_origen?: MovimientoFinanciero[];
        movimientos_como_destino?: MovimientoFinanciero[];
        ventas?: VentaCliente[];
    };
}

const breadcrumbs = (clienteNombre: string): BreadcrumbItem[] => [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Clientes',
        href: '/clientes',
    },
    {
        title: `Detalles: ${clienteNombre}`,
        href: '#',
    },
];

// Componente para renderizar la tabla de transacciones
const TablaTransacciones = ({
    movimientos,
    cliente,
    formatearMoneda,
    formatearFecha,
}: {
    movimientos: MovimientoFinanciero[];
    cliente: any;
    formatearMoneda: (valor: number | null | undefined) => string;
    formatearFecha: (fecha: string) => string;
}) => {
    // Función para obtener icono de tipo de movimiento
    const getMovimientoIcon = (tipoMovimientoId: number) => {
        switch (tipoMovimientoId) {
            case 1: // Gasto
                return TrendingDown;
            case 2: // Ingreso
                return TrendingUp;
            case 3: // Transferencia
                return ArrowRightLeft;
            default:
                return DollarSign;
        }
    };

    // Función para obtener color de tipo de movimiento
    const getMovimientoColor = (tipoMovimientoId: number) => {
        switch (tipoMovimientoId) {
            case 1: // Gasto
                return 'text-red-600 bg-red-50 border-red-200';
            case 2: // Ingreso
                return 'text-green-600 bg-green-50 border-green-200';
            case 3: // Transferencia
                return 'text-blue-600 bg-blue-50 border-blue-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <ScrollArea className="h-[400px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Detalles</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {movimientos.length > 0 ? (
                        movimientos.map((movimiento) => {
                            const MovimientoIcon = getMovimientoIcon(movimiento.tipo_movimiento_id);
                            const colorClase = getMovimientoColor(movimiento.tipo_movimiento_id);
                            const direccion = movimiento.cliente_origen_id === cliente.id ? 'origen' : 'destino';

                            return (
                                <TableRow key={movimiento.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} className="text-muted-foreground" />
                                            <span className="text-sm">{formatearFecha(movimiento.fecha_operacion)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex w-28 items-center gap-1 ${colorClase}`}>
                                            <MovimientoIcon size={12} />
                                            {movimiento.tipo_movimiento.nombre}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{movimiento.descripcion}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`font-medium ${
                                                movimiento.tipo_movimiento_id === 1
                                                    ? 'text-red-600'
                                                    : movimiento.tipo_movimiento_id === 2
                                                      ? 'text-green-600'
                                                      : 'text-blue-600'
                                            }`}
                                        >
                                            {formatearMoneda(movimiento.monto)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{movimiento.moneda}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={direccion === 'origen' ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'}
                                        >
                                            {direccion === 'origen' ? 'Origen' : 'Destino'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Eye size={14} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="space-y-1 text-xs">
                                                    <p>
                                                        <strong>Tipo:</strong> {movimiento.tipo_movimiento.nombre}
                                                    </p>
                                                    <p>
                                                        <strong>Monto:</strong> {formatearMoneda(movimiento.monto)} {movimiento.moneda}
                                                    </p>
                                                    <p>
                                                        <strong>Tasa:</strong> {movimiento.tasa_cambio_aplicada}
                                                    </p>
                                                    {movimiento.cuenta_origen && (
                                                        <p>
                                                            <strong>Cuenta Origen:</strong> {movimiento.cuenta_origen.nombre_cuenta}
                                                        </p>
                                                    )}
                                                    {movimiento.cliente_origen && movimiento.cliente_origen.id !== cliente.id && (
                                                        <p>
                                                            <strong>Cliente Origen:</strong> {movimiento.cliente_origen.nombre_cliente}
                                                        </p>
                                                    )}
                                                    {movimiento.cuenta_destino && (
                                                        <p>
                                                            <strong>Cuenta Destino:</strong> {movimiento.cuenta_destino.nombre_cuenta}
                                                        </p>
                                                    )}
                                                    {movimiento.cliente_destino && movimiento.cliente_destino.id !== cliente.id && (
                                                        <p>
                                                            <strong>Cliente Destino:</strong> {movimiento.cliente_destino.nombre_cliente}
                                                        </p>
                                                    )}
                                                    {movimiento.proveedor_destino && (
                                                        <p>
                                                            <strong>Proveedor Destino:</strong> {movimiento.proveedor_destino.nombre_proveedor}
                                                        </p>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <ArrowRightLeft size={32} className="opacity-50" />
                                    <p>No hay transacciones financieras registradas</p>
                                    <p className="text-sm">Las transacciones donde este cliente participe aparecerán aquí</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

// Componente para renderizar la tabla de ventas
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
            case 'completada':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'pendiente':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelada':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getEstadoIcon = (estado: string) => {
        switch (estado) {
            case 'completada':
                return CheckCircle;
            case 'pendiente':
                return AlertCircle;
            case 'cancelada':
                return AlertCircle;
            default:
                return History;
        }
    };

    return (
        <ScrollArea className="h-[400px]">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Venta ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Almacén</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Destinatario</TableHead>
                        <TableHead>Detalles</TableHead>
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
                                        <Badge variant="outline">#{venta.id}</Badge>
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
                                        <span className="font-medium">{formatearMoneda(venta.total)}</span>
                                        {venta.moneda && (
                                            <Badge variant="outline" className="ml-1 text-xs">
                                                {venta.moneda.codigo_moneda}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex w-24 items-center gap-1 ${estadoColor}`}>
                                            <EstadoIcon size={12} />
                                            {venta.estado.charAt(0).toUpperCase() + venta.estado.slice(1)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                    <Package size={14} />
                                                    <span className="ml-1 text-xs">{venta.detalles.length}</span>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="space-y-1 text-xs">
                                                    {venta.detalles.map((detalle) => (
                                                        <div key={detalle.id} className="flex justify-between gap-2">
                                                            <span>{detalle.producto.nombre_producto}</span>
                                                            <span>
                                                                {detalle.cantidad} x {formatearMoneda(detalle.precio_venta)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        {venta.destinatario ? (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                        <User size={12} className="mr-1" />
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
                                            <Badge variant="outline" className="text-muted-foreground">
                                                Sin destinatario
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <Eye size={14} />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div className="space-y-1 text-xs">
                                                    <p>
                                                        <strong>Vendedor:</strong> {venta.usuario.name}
                                                    </p>
                                                    <p>
                                                        <strong>Total:</strong> {formatearMoneda(venta.total)}
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
                                                        <strong>Tasa Cambio:</strong> {venta.tasa_cambio_principal}
                                                    </p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <Receipt size={32} className="opacity-50" />
                                    <p>No hay ventas registradas para este cliente</p>
                                    <p className="text-sm">Las ventas donde este cliente sea el comprador aparecerán aquí</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </ScrollArea>
    );
};

export default function ShowClientePage({ cliente }: ShowClientePageProps) {
    const [activeTab, setActiveTab] = useState('resumen');
    const [activeTransaccionesTab, setActiveTransaccionesTab] = useState('todas');
    const [activeVentasTab, setActiveVentasTab] = useState('todas');

    // ✅ CORREGIDO: Acepta number | null | undefined
    const formatearMoneda = (valor: number | null | undefined) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Calcular métricas basadas en las compras como pagador, ventas y transacciones
    const metricas = useMemo(() => {
        const compras = cliente.compras_como_pagador || [];
        const ventas = cliente.ventas || [];
        const movimientosOrigen = cliente.movimientos_como_origen || [];
        const movimientosDestino = cliente.movimientos_como_destino || [];

        const totalCompras = compras.length;
        const montoTotalAportado = compras.reduce((sum, compra) => sum + Number(compra.pivot.monto), 0);
        const montoTotalCompras = compras.reduce((sum, compra) => sum + Number(compra.total_compra), 0);

        // Calcular métricas de ventas
        const totalVentas = ventas.length;
        const montoTotalVentas = ventas.reduce((sum, venta) => sum + Number(venta.total), 0);
        const ventasCompletadas = ventas.filter((v) => v.estado === 'completada').length;
        const ventasPendientes = ventas.filter((v) => v.estado === 'pendiente').length;

        // Calcular métricas de transacciones
        const totalTransacciones = movimientosOrigen.length + movimientosDestino.length;
        const montoTransaccionesOrigen = movimientosOrigen.reduce((sum, mov) => sum + Number(mov.monto), 0);
        const montoTransaccionesDestino = movimientosDestino.reduce((sum, mov) => sum + Number(mov.monto), 0);
        const saldoNetoTransacciones = montoTransaccionesDestino - montoTransaccionesOrigen;

        // ✅ CORREGIDO: LÓGICA ACTUALIZADA - igual que Index.tsx
        const saldoActual = Number(cliente.deuda_pago_cliente) || 0;

        return {
            totalCompras,
            montoTotalAportado,
            montoTotalCompras,
            saldoActual, // Cambiado de deudaActual a saldoActual para mayor claridad
            comprasConProveedor: Array.from(new Set(compras.map((c) => c.proveedor.nombre_proveedor))).length,
            totalVentas,
            montoTotalVentas,
            ventasCompletadas,
            ventasPendientes,
            totalTransacciones,
            montoTransaccionesOrigen,
            montoTransaccionesDestino,
            saldoNetoTransacciones,
        };
    }, [cliente.compras_como_pagador, cliente.ventas, cliente.movimientos_como_origen, cliente.movimientos_como_destino, cliente.deuda_pago_cliente]);

    // ✅ CORREGIDO: LÓGICA ACTUALIZADA - igual que Index.tsx
    // > 0 = Fondo disponible (empresa tiene fondos con el cliente)
    // < 0 = Deuda pendiente (empresa le debe al cliente)
    const getEstadoFinanciero = (saldo: number | null | undefined) => {
        if (saldo === null || saldo === undefined) {
            return { tipo: 'sin-info', color: 'gray', icon: History, texto: 'Sin información' };
        }

        // LÓGICA CORRECTA (igual que Index.tsx):
        if (saldo > 0) {
            return {
                tipo: 'fondo', // ✅ CORRECTO
                color: 'green',
                icon: ArrowDownCircle,
                texto: 'Fondo disponible',
                descripcion: 'Tienes fondo disponible con el cliente',
            };
        } else if (saldo < 0) {
            return {
                tipo: 'deuda', // ✅ CORRECTO
                color: 'red',
                icon: AlertCircle,
                texto: 'Deuda pendiente',
                descripcion: 'Tienes deuda pendiente con el cliente',
            };
        } else {
            return {
                tipo: 'neutral',
                color: 'gray',
                icon: CheckCircle,
                texto: 'Al día',
                descripcion: 'Sin fondos ni deudas pendientes',
            };
        }
    };

    // ✅ CORREGIDO: Pasar el valor correcto con la lógica actualizada
    const estado = getEstadoFinanciero(cliente.deuda_pago_cliente);
    const EstadoIcon = estado.icon;

    // Combinar y ordenar movimientos para la pestaña "todas"
    const todosMovimientos = useMemo(() => {
        const movimientosOrigen = cliente.movimientos_como_origen || [];
        const movimientosDestino = cliente.movimientos_como_destino || [];

        return [...movimientosOrigen, ...movimientosDestino].sort(
            (a, b) => new Date(b.fecha_operacion).getTime() - new Date(a.fecha_operacion).getTime(),
        );
    }, [cliente.movimientos_como_origen, cliente.movimientos_como_destino]);

    // Filtrar ventas según la pestaña activa
    const getVentasFiltradas = () => {
        const ventas = cliente.ventas || [];
        switch (activeVentasTab) {
            case 'completadas':
                return ventas.filter((v) => v.estado === 'completada');
            case 'pendientes':
                return ventas.filter((v) => v.estado === 'pendiente');
            case 'canceladas':
                return ventas.filter((v) => v.estado === 'cancelada');
            case 'todas':
            default:
                return ventas;
        }
    };

    const ventasFiltradas = getVentasFiltradas();

    // Obtener movimientos filtrados según la pestaña activa
    const getMovimientosFiltrados = () => {
        switch (activeTransaccionesTab) {
            case 'origen':
                return cliente.movimientos_como_origen || [];
            case 'destino':
                return cliente.movimientos_como_destino || [];
            case 'todas':
            default:
                return todosMovimientos;
        }
    };

    const movimientosFiltrados = getMovimientosFiltrados();

    return (
        <AppLayout breadcrumbs={breadcrumbs(cliente.nombre_cliente)}>
            <Head title={`Detalles: ${cliente.nombre_cliente}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <div className="flex items-center justify-between">
                            <HeadingSmall
                                title={`Cliente: ${cliente.nombre_cliente}`}
                                description="Información detallada e historial de compras, ventas y transacciones financieras"
                            />
                            <div className="flex items-center gap-3">
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
                        </div>
                    </div>

                    {/* Información Principal */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Tarjeta de Información del Cliente */}
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
                                        variant={cliente.tipo_cliente === 'asociado' ? 'default' : 'secondary'}
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
                                        <span className="text-muted-foreground max-w-[120px] truncate text-xs">{cliente.direccion_cliente}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Estado Financiero y Métricas */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Estado Financiero
                                </CardTitle>
                                <CardDescription>Resumen de la situación financiera con el cliente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {/* Estado Actual */}
                                    <Card
                                        className={`border-l-4 ${
                                            estado.color === 'red'
                                                ? 'border-l-red-500'
                                                : estado.color === 'green'
                                                  ? 'border-l-green-500'
                                                  : 'border-l-gray-500'
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
                                                              : 'text-gray-500'
                                                    }`}
                                                />
                                                <span className="text-sm font-medium">Estado Actual</span>
                                            </div>
                                            <div
                                                className={`mt-2 text-2xl font-bold ${
                                                    estado.color === 'red'
                                                        ? 'text-red-600'
                                                        : estado.color === 'green'
                                                          ? 'text-green-600'
                                                          : 'text-gray-600'
                                                }`}
                                            >
                                                {/* ✅ CORREGIDO: Mostrar el valor real (puede ser positivo o negativo) */}
                                                {formatearMoneda(cliente.deuda_pago_cliente)}
                                            </div>
                                            <p className="text-muted-foreground text-xs">{estado.texto}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Total Compras */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium">Compras Participadas</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-blue-600">{metricas.totalCompras}</div>
                                            <p className="text-muted-foreground text-xs">Como método de pago</p>
                                        </CardContent>
                                    </Card>

                                    {/* Total Ventas */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="h-4 w-4 text-green-500" />
                                                <span className="text-sm font-medium">Ventas Realizadas</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-green-600">{metricas.totalVentas}</div>
                                            <p className="text-muted-foreground text-xs">Como comprador</p>
                                        </CardContent>
                                    </Card>

                                    {/* Desglose */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-orange-500" />
                                                <span className="text-sm font-medium">Actividad</span>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span>Monto Aportado:</span>
                                                    <span className="font-medium">{formatearMoneda(metricas.montoTotalAportado)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Total Ventas:</span>
                                                    <span className="font-medium text-green-600">{formatearMoneda(metricas.montoTotalVentas)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Trans. Entrada:</span>
                                                    <span className="font-medium text-green-600">
                                                        {formatearMoneda(metricas.montoTransaccionesDestino)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Trans. Salida:</span>
                                                    <span className="font-medium text-red-600">
                                                        {formatearMoneda(metricas.montoTransaccionesOrigen)}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Historial de Ventas como Comprador */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5" />
                                Ventas como Comprador
                            </CardTitle>
                            <CardDescription>Historial de ventas donde este cliente ha sido el comprador</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="todas" onValueChange={setActiveVentasTab}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="todas">Todas</TabsTrigger>
                                    <TabsTrigger value="completadas">Completadas</TabsTrigger>
                                    <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
                                    <TabsTrigger value="canceladas">Canceladas</TabsTrigger>
                                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                                </TabsList>

                                <TabsContent value="todas" className="space-y-4">
                                    <TablaVentas ventas={ventasFiltradas} formatearMoneda={formatearMoneda} formatearFecha={formatearFecha} />
                                    {ventasFiltradas.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(ventasFiltradas.reduce((sum, venta) => sum + Number(venta.total), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="completadas" className="space-y-4">
                                    <TablaVentas ventas={ventasFiltradas} formatearMoneda={formatearMoneda} formatearFecha={formatearFecha} />
                                    {ventasFiltradas.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''} completada
                                                {ventasFiltradas.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(ventasFiltradas.reduce((sum, venta) => sum + Number(venta.total), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="pendientes" className="space-y-4">
                                    <TablaVentas ventas={ventasFiltradas} formatearMoneda={formatearMoneda} formatearFecha={formatearFecha} />
                                    {ventasFiltradas.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''} pendiente
                                                {ventasFiltradas.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(ventasFiltradas.reduce((sum, venta) => sum + Number(venta.total), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="canceladas" className="space-y-4">
                                    <TablaVentas ventas={ventasFiltradas} formatearMoneda={formatearMoneda} formatearFecha={formatearFecha} />
                                    {ventasFiltradas.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''} cancelada
                                                {ventasFiltradas.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(ventasFiltradas.reduce((sum, venta) => sum + Number(venta.total), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="resumen" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <Receipt className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium">Total Ventas</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-blue-600">{metricas.totalVentas}</div>
                                                <p className="text-muted-foreground text-xs">Todas las ventas</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium">Completadas</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-green-600">{metricas.ventasCompletadas}</div>
                                                <p className="text-muted-foreground text-xs">Ventas finalizadas</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                                                    <span className="text-sm font-medium">Pendientes</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-yellow-600">{metricas.ventasPendientes}</div>
                                                <p className="text-muted-foreground text-xs">Por aprobar</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-purple-500" />
                                                    <span className="text-sm font-medium">Monto Total</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-purple-600">
                                                    {formatearMoneda(metricas.montoTotalVentas)}
                                                </div>
                                                <p className="text-muted-foreground text-xs">En ventas</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Historial de Compras como Pagador */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Compras como Método de Pago
                            </CardTitle>
                            <CardDescription>Historial de compras en las que este cliente ha sido utilizado como método de pago</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="resumen" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="resumen">Resumen General</TabsTrigger>
                                    <TabsTrigger value="detalles">Detalles de Compras</TabsTrigger>
                                </TabsList>

                                <TabsContent value="resumen" className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-4">
                                            {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 ? (
                                                cliente.compras_como_pagador.map((compra) => (
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
                                                                        <p className="font-semibold">{compra.proveedor.nombre_proveedor}</p>
                                                                        <p className="text-muted-foreground text-sm">
                                                                            Total: {formatearMoneda(compra.total_compra)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-sm">
                                                                        <span className="flex items-center gap-1">
                                                                            <Package size={14} />
                                                                            {compra.productos.length} producto(s)
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-green-600">
                                                                            <DollarSign size={14} />
                                                                            Aportó: {formatearMoneda(compra.pivot.monto)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    variant={compra.tipo_compra === 'pago_cash' ? 'default' : 'outline'}
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
                                                <div className="text-muted-foreground py-8 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <ShoppingCart size={32} className="opacity-50" />
                                                        <p>No hay compras registradas como método de pago</p>
                                                        <p className="text-sm">
                                                            Las compras en las que este cliente sea utilizado como método de pago aparecerán aquí
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Resumen */}
                                    {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {cliente.compras_como_pagador.length} compra
                                                {cliente.compras_como_pagador.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="detalles" className="space-y-4">
                                    <ScrollArea className="h-[600px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Compra</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Total Compra</TableHead>
                                                    <TableHead>Monto Aportado</TableHead>
                                                    <TableHead>Productos</TableHead>
                                                    <TableHead>Métodos de Pago</TableHead>
                                                    <TableHead>Detalles</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 ? (
                                                    cliente.compras_como_pagador.map((compra) => (
                                                        <TableRow key={compra.id} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <Badge variant="outline">#{compra.id}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={12} className="text-muted-foreground" />
                                                                    <span className="text-sm">{formatearFecha(compra.fecha_compra)}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-medium">{compra.proveedor.nombre_proveedor}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium">{formatearMoneda(compra.total_compra)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium text-green-600">
                                                                    {formatearMoneda(compra.pivot.monto)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                            <Package size={14} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1 text-xs">
                                                                            {compra.productos.map((producto) => (
                                                                                <div key={producto.id} className="flex justify-between gap-2">
                                                                                    <span>{producto.nombre_producto}</span>
                                                                                    <span>
                                                                                        {producto.pivot.cantidad} x{' '}
                                                                                        {formatearMoneda(producto.pivot.precio)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                            <CreditCard size={14} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1 text-xs">
                                                                            {compra.pagos.map((pago) => (
                                                                                <div key={pago.id} className="flex justify-between gap-2">
                                                                                    {pago.tipo_pago === 'cliente' ? (
                                                                                        <span>Cliente: {pago.cliente?.nombre_cliente}</span>
                                                                                    ) : pago.tipo_pago === 'cuenta' ? (
                                                                                        <span>Cuenta: {pago.cuenta?.nombre_cuenta}</span>
                                                                                    ) : (
                                                                                        <span>Deuda Proveedor</span>
                                                                                    )}
                                                                                    <span>{formatearMoneda(pago.monto)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm">
                                                                            <Eye size={14} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1 text-xs">
                                                                            <p>
                                                                                <strong>Tipo:</strong> {compra.tipo_compra}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Proveedor:</strong> {compra.proveedor.nombre_proveedor}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Total:</strong> {formatearMoneda(compra.total_compra)}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Aportado:</strong> {formatearMoneda(compra.pivot.monto)}
                                                                            </p>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ShoppingCart size={32} className="opacity-50" />
                                                                <p>No hay compras registradas como método de pago</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>

                                    {/* Resumen */}
                                    {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {cliente.compras_como_pagador.length} compra
                                                {cliente.compras_como_pagador.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Historial de Transacciones Financieras */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowRightLeft className="h-5 w-5" />
                                Transacciones Financieras
                            </CardTitle>
                            <CardDescription>Historial de gastos, ingresos y transferencias donde el cliente ha participado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="todas" onValueChange={setActiveTransaccionesTab}>
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="todas">Todas</TabsTrigger>
                                    <TabsTrigger value="origen">Como Origen</TabsTrigger>
                                    <TabsTrigger value="destino">Como Destino</TabsTrigger>
                                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                                </TabsList>

                                <TabsContent value="todas" className="space-y-4">
                                    <TablaTransacciones
                                        movimientos={movimientosFiltrados}
                                        cliente={cliente}
                                        formatearMoneda={formatearMoneda}
                                        formatearFecha={formatearFecha}
                                    />
                                    {movimientosFiltrados.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {movimientosFiltrados.length} transacción{movimientosFiltrados.length !== 1 ? 'es' : ''}
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(movimientosFiltrados.reduce((sum, mov) => sum + Number(mov.monto), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="origen" className="space-y-4">
                                    <TablaTransacciones
                                        movimientos={movimientosFiltrados}
                                        cliente={cliente}
                                        formatearMoneda={formatearMoneda}
                                        formatearFecha={formatearFecha}
                                    />
                                    {movimientosFiltrados.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {movimientosFiltrados.length} transacción{movimientosFiltrados.length !== 1 ? 'es' : ''}{' '}
                                                como origen
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(movimientosFiltrados.reduce((sum, mov) => sum + Number(mov.monto), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="destino" className="space-y-4">
                                    <TablaTransacciones
                                        movimientos={movimientosFiltrados}
                                        cliente={cliente}
                                        formatearMoneda={formatearMoneda}
                                        formatearFecha={formatearFecha}
                                    />
                                    {movimientosFiltrados.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {movimientosFiltrados.length} transacción{movimientosFiltrados.length !== 1 ? 'es' : ''}{' '}
                                                como destino
                                            </span>
                                            <span>
                                                Total: {formatearMoneda(movimientosFiltrados.reduce((sum, mov) => sum + Number(mov.monto), 0))}
                                            </span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="resumen" className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-green-500" />
                                                    <span className="text-sm font-medium">Entradas</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-green-600">
                                                    {formatearMoneda(metricas.montoTransaccionesDestino)}
                                                </div>
                                                <p className="text-muted-foreground text-xs">Como destino</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="h-4 w-4 text-red-500" />
                                                    <span className="text-sm font-medium">Salidas</span>
                                                </div>
                                                <div className="mt-2 text-2xl font-bold text-red-600">
                                                    {formatearMoneda(metricas.montoTransaccionesOrigen)}
                                                </div>
                                                <p className="text-muted-foreground text-xs">Como origen</p>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-blue-500" />
                                                    <span className="text-sm font-medium">Saldo Neto</span>
                                                </div>
                                                <div
                                                    className={`mt-2 text-2xl font-bold ${
                                                        metricas.saldoNetoTransacciones >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}
                                                >
                                                    {formatearMoneda(metricas.saldoNetoTransacciones)}
                                                </div>
                                                <p className="text-muted-foreground text-xs">En transacciones</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
