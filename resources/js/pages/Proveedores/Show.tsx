import HeadingSmall from '@/components/heading-small';
import { DetalleCompraExpandido, DetalleMovimientoExpandido } from '@/components/detalle-operacion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { CompraProveedor, EstadisticasProveedor, ProveedorProps, TransaccionProveedor, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    Building,
    Calendar,
    ChevronDown,
    ChevronRight,
    CreditCard,
    DollarSign,
    FileText,
    Handshake,
    History,
    Mail,
    MapPin,
    Package,
    Phone,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import React, { useState } from 'react';

interface ShowProveedoresPageProps {
    proveedor: ProveedorProps;
    compras: CompraProveedor[];
    transacciones: TransaccionProveedor[];
    estadisticas: EstadisticasProveedor;
}

const breadcrumbs = (proveedor: ProveedorProps): BreadcrumbItem[] => [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
    {
        title: `Detalles - ${proveedor.nombre_proveedor}`,
        href: '#',
    },
];

export default function ShowProveedoresPage({ proveedor, compras, transacciones, estadisticas }: ShowProveedoresPageProps) {
    // Solo una fila abierta a la vez — mismo patrón que Rastreo de Operaciones
    // (RastreoOperaciones.tsx), compartido entre las dos tablas de esta página.
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const toggleRow = (key: string) => {
        setExpandedRow((prev) => (prev === key ? null : key));
    };

    // Función para formatear el saldo
    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined || isNaN(valor)) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // Función para formatear fecha
    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Determinar el estado del saldo — mismo criterio rojo/ámbar/esmeralda que ya usa el
    // resto del proyecto (ver estado de compra en Comprar/Index, Rastreo de Operaciones):
    // rojo = deuda (negativo), ámbar = neutral, esmeralda = con fondo (positivo). El Badge
    // genérico de shadcn (variant="default"/"secondary") no da estos colores — "default" es
    // el color primario del tema, "secondary" es gris, ninguno lee como amarillo/verde.
    const getEstadoSaldo = (saldo: number) => {
        if (saldo < 0)
            return {
                texto: 'En Deuda',
                icon: TrendingDown,
                badgeClass: 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300',
                textClass: 'text-red-600 dark:text-red-400',
            };
        if (saldo > 0)
            return {
                texto: 'Con Fondo',
                icon: TrendingUp,
                badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300',
                textClass: 'text-emerald-600 dark:text-emerald-400',
            };
        return {
            texto: 'Neutral',
            icon: DollarSign,
            badgeClass: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300',
            textClass: 'text-amber-600 dark:text-amber-400',
        };
    };

    const estadoSaldo = getEstadoSaldo(proveedor.saldo_proveedor);

    return (
        <AppLayout breadcrumbs={breadcrumbs(proveedor)}>
            <Head title={`Proveedor - ${proveedor.nombre_proveedor}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header Section */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <HeadingSmall
                                title={`Proveedor: ${proveedor.nombre_proveedor}`}
                                description="Detalles completos del proveedor y sus operaciones"
                            />
                        </div>
                    </div>
                    <Handshake
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Link href={route('proveedores.index')}>
                        <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                            <ArrowLeft size={16} />
                            Volver
                        </Button>
                    </Link>
                    <Link href={route('proveedores.edit', { proveedor: proveedor.id })}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            Editar
                        </Button>
                    </Link>
                </div>
                <Separator className="col-span-4" />

                {/* Información Principal del Proveedor */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Información Básica */}
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg lg:col-span-2">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                            <div className="flex flex-1 items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Building className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Información del Proveedor</CardTitle>
                                        <CardDescription className="text-indigo-100">Datos de contacto y ubicación</CardDescription>
                                    </div>
                                </div>
                                {proveedor.created_at && (
                                    <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                                        <Calendar className="mr-1 h-3 w-3" />
                                        Proveedor desde{' '}
                                        {new Date(proveedor.created_at).toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-3">
                                    <Phone className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Teléfono</p>
                                        {proveedor.telefono_proveedor ? (
                                            <p className="text-muted-foreground text-sm">{proveedor.telefono_proveedor}</p>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                No especificado
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Correo Electrónico</p>
                                        {proveedor.correo_proveedor ? (
                                            <p className="text-muted-foreground text-sm">{proveedor.correo_proveedor}</p>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                No especificado
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Localidad</p>
                                        {proveedor.localidad_proveedor ? (
                                            <p className="text-muted-foreground text-sm">{proveedor.localidad_proveedor}</p>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground mt-0.5 font-normal">
                                                No especificado
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Separator />
                            <div className="flex items-start gap-3">
                                <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">Notas</p>
                                    {proveedor.notas_proveedor ? (
                                        <p className="text-muted-foreground text-sm">{proveedor.notas_proveedor}</p>
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
                                    <CardDescription className="text-teal-100">Saldo y estadísticas</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-5">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Saldo Actual</span>
                                <Badge variant="outline" className={cn('flex items-center gap-1 font-normal', estadoSaldo.badgeClass)}>
                                    <estadoSaldo.icon className="h-3 w-3" />
                                    {estadoSaldo.texto}
                                </Badge>
                            </div>
                            <div className={cn('text-2xl font-bold', estadoSaldo.textClass)}>{formatearMoneda(proveedor.saldo_proveedor)}</div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <Package className="text-muted-foreground h-3.5 w-3.5" />
                                        Total Compras:
                                    </span>
                                    <span className="font-medium">{estadisticas.total_compras}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <DollarSign className="text-muted-foreground h-3.5 w-3.5" />
                                        Monto en Compras:
                                    </span>
                                    <span className="font-medium">{formatearMoneda(estadisticas.monto_total_compras)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <CreditCard className="text-muted-foreground h-3.5 w-3.5" />
                                        Transacciones:
                                    </span>
                                    <span className="font-medium">{estadisticas.total_transacciones}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <TrendingUp className="text-muted-foreground h-3.5 w-3.5" />
                                        Ingresos Recibidos:
                                    </span>
                                    <span className="font-medium text-emerald-600">{formatearMoneda(estadisticas.monto_total_ingresos)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs para Compras y Transacciones */}
                <Tabs defaultValue="compras" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="compras" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Compras ({compras.length})
                        </TabsTrigger>
                        <TabsTrigger value="transacciones" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Transacciones ({transacciones.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab de Compras */}
                    <TabsContent value="compras" className="space-y-4">
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <History className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Historial de Compras</CardTitle>
                                        <CardDescription className="text-amber-100">Todas las compras realizadas a este proveedor</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {compras.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Productos</TableHead>
                                                    <TableHead>Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {compras.map((compra) => {
                                                    const rowKey = `compra-${compra.id}`;
                                                    const expandida = expandedRow === rowKey;
                                                    return (
                                                        <React.Fragment key={compra.id}>
                                                            <TableRow
                                                                className="hover:bg-sidebar-accent/30 cursor-pointer transition-colors"
                                                                onClick={() => toggleRow(rowKey)}
                                                            >
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {expandida ? (
                                                                            <ChevronDown className="h-4 w-4 shrink-0" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 shrink-0" />
                                                                        )}
                                                                        <Calendar className="text-muted-foreground h-4 w-4" />
                                                                        {formatearFecha(compra.fecha_compra)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        className={cn(
                                                                            'text-white hover:opacity-90',
                                                                            compra.tipo_compra === 'deuda_proveedor'
                                                                                ? 'bg-red-500'
                                                                                : compra.es_parcial
                                                                                  ? 'bg-amber-500'
                                                                                  : 'bg-emerald-500',
                                                                        )}
                                                                    >
                                                                        {compra.tipo_compra === 'deuda_proveedor' ? (
                                                                            <CreditCard className="h-3 w-3" />
                                                                        ) : compra.es_parcial ? (
                                                                            <AlertTriangle className="h-3 w-3" />
                                                                        ) : (
                                                                            <DollarSign className="h-3 w-3" />
                                                                        )}
                                                                        {compra.tipo_compra === 'deuda_proveedor'
                                                                            ? 'A Crédito'
                                                                            : compra.es_parcial
                                                                              ? 'Parcial'
                                                                              : 'Al Contado'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="max-w-[200px]">
                                                                        {compra.productos.slice(0, 2).map((producto) => (
                                                                            <div key={producto.id} className="truncate text-sm">
                                                                                {producto.nombre_producto} ({producto.pivot.cantidad})
                                                                            </div>
                                                                        ))}
                                                                        {compra.productos.length > 2 && (
                                                                            <div className="text-muted-foreground text-xs">
                                                                                +{compra.productos.length - 2} más
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    {formatearMoneda(compra.total_compra)}
                                                                    {compra.receptor_saldo_anterior !== null && compra.receptor_saldo_posterior !== null && (
                                                                        <div className="text-muted-foreground text-[11px] font-normal">
                                                                            {formatearMoneda(compra.receptor_saldo_anterior)} → {formatearMoneda(compra.receptor_saldo_posterior)}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                            {expandida && (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="bg-sidebar-accent/20 p-4">
                                                                        {compra.detalle ? (
                                                                            <DetalleCompraExpandido
                                                                                detalle={compra.detalle}
                                                                                monto={Number(compra.total_compra)}
                                                                                usuario={compra.usuario?.name ?? '—'}
                                                                            />
                                                                        ) : (
                                                                            <p className="text-muted-foreground text-xs">Sin detalle disponible.</p>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                        <p className="text-muted-foreground">No se han realizado compras a este proveedor</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab de Transacciones */}
                    <TabsContent value="transacciones" className="space-y-4">
                        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Historial de Transacciones</CardTitle>
                                        <CardDescription className="text-violet-100">
                                            Transacciones financieras donde el proveedor recibió fondos
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5">
                                {transacciones.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Monto</TableHead>
                                                    <TableHead>Moneda</TableHead>
                                                    <TableHead>Origen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transacciones.map((transaccion) => {
                                                    const rowKey = `transaccion-${transaccion.id}`;
                                                    const expandida = expandedRow === rowKey;
                                                    const esColapsable = transaccion.detalle !== null;
                                                    return (
                                                        <React.Fragment key={transaccion.id}>
                                                            <TableRow
                                                                className={cn(
                                                                    'transition-colors',
                                                                    esColapsable && 'hover:bg-sidebar-accent/30 cursor-pointer',
                                                                )}
                                                                onClick={() => esColapsable && toggleRow(rowKey)}
                                                            >
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {esColapsable ? (
                                                                            expandida ? (
                                                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                                                            ) : (
                                                                                <ChevronRight className="h-4 w-4 shrink-0" />
                                                                            )
                                                                        ) : (
                                                                            <span className="w-4 shrink-0" />
                                                                        )}
                                                                        <Calendar className="text-muted-foreground h-4 w-4" />
                                                                        {formatearFecha(transaccion.fecha_operacion)}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge
                                                                        variant={
                                                                            transaccion.tipo_movimiento_id === 1
                                                                                ? 'destructive'
                                                                                : transaccion.tipo_movimiento_id === 2
                                                                                  ? 'default'
                                                                                  : 'secondary'
                                                                        }
                                                                    >
                                                                        {transaccion.tipo_movimiento_id === 1
                                                                            ? 'Gasto'
                                                                            : transaccion.tipo_movimiento_id === 2
                                                                              ? 'Ingreso'
                                                                              : 'Transferencia'}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell className="max-w-[200px] truncate">{transaccion.descripcion}</TableCell>
                                                                <TableCell className="font-medium text-green-600">
                                                                    +{formatearMoneda(transaccion.monto)}
                                                                    {transaccion.saldo_anterior_destino !== null && transaccion.saldo_posterior_destino !== null && (
                                                                        <div className="text-muted-foreground text-[11px] font-normal">
                                                                            {formatearMoneda(transaccion.saldo_anterior_destino)} → {formatearMoneda(transaccion.saldo_posterior_destino)}
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Badge variant="outline">{transaccion.moneda}</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {transaccion.cuenta_origen_id && transaccion.cuenta_origen && (
                                                                        <span className="text-sm">
                                                                            Cuenta: {transaccion.cuenta_origen.nombre_cuenta}
                                                                        </span>
                                                                    )}
                                                                    {transaccion.cliente_origen_id && transaccion.cliente_origen && (
                                                                        <span className="text-sm">
                                                                            Cliente: {transaccion.cliente_origen.nombre_cliente}
                                                                        </span>
                                                                    )}
                                                                    {!transaccion.cuenta_origen_id && !transaccion.cliente_origen_id && (
                                                                        <span className="text-muted-foreground text-sm">N/A</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                            {esColapsable && expandida && transaccion.detalle && (
                                                                <TableRow>
                                                                    <TableCell colSpan={6} className="bg-sidebar-accent/20 p-4">
                                                                        <DetalleMovimientoExpandido
                                                                            detalle={transaccion.detalle}
                                                                            monto={transaccion.monto}
                                                                            moneda={transaccion.moneda}
                                                                            descripcion={transaccion.descripcion}
                                                                            usuario={transaccion.user?.name ?? '—'}
                                                                        />
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <CreditCard className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                        <p className="text-muted-foreground">No hay transacciones registradas para este proveedor</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
