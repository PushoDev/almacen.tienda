import { AnularOperacionDialog } from '@/components/anular-operacion-dialog';
import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import { labelMotivoAnulacion } from '@/components/detalle-operacion';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Building, Calendar, CheckCircle, DollarSign, Download, FileText, Info, TrendingDown, TrendingUp, User, XCircle } from 'lucide-react';
import { useEffect } from 'react';

interface MovimientoFinanciero {
    id: number;
    user_id: number;
    tipo_movimiento_id: number;
    cuenta_origen_id: number | null;
    cliente_origen_id: number | null;
    cuenta_destino_id: number | null;
    cliente_destino_id: number | null;
    proveedor_destino_id: number | null;
    monto: number;
    moneda: string;
    tasa_cambio_aplicada: number | null;
    descripcion: string | null;
    fecha_operacion: string;
    estado: string;
    motivo_anulacion: string | null;
    detalle_anulacion: string | null;
    created_at: string;
    updated_at: string;

    // Nuevos campos de saldos
    saldo_anterior_origen: number | null;
    saldo_posterior_origen: number | null;
    moneda_origen: string | null;
    saldo_anterior_destino: number | null;
    saldo_posterior_destino: number | null;
    moneda_destino: string | null;

    // Relaciones
    user?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    // Quién atendía realmente (feature "Atendido por" / Turnos) — distinto de `user`
    // (la cuenta de punto de venta). Null en movimientos anteriores a esta feature o
    // creados por admin (nunca captura turno). Laravel serializa la relación
    // `turnoVendedor()` en snake_case ($snakeAttributes por defecto), de ahí el nombre
    // de la prop acá — no es un typo.
    turno_vendedor?: {
        nombre_vendedor: string;
    } | null;
    tipoMovimiento?: {
        id: number;
        nombre_tipo: string;
        descripcion: string;
    };
    cuentaOrigen?: {
        id: number;
        nombre_cuenta: string;
        saldo_cuenta: number;
        moneda?: {
            codigo_moneda: string;
        };
    };
    cuentaDestino?: {
        id: number;
        nombre_cuenta: string;
        saldo_cuenta: number;
        moneda?: {
            codigo_moneda: string;
        };
    };
    clienteOrigen?: {
        id: number;
        nombre_cliente: string;
        deuda_pago_cliente: number;
    };
    clienteDestino?: {
        id: number;
        nombre_cliente: string;
        deuda_pago_cliente: number;
    };
    proveedorDestino?: {
        id: number;
        nombre_proveedor: string;
        saldo_proveedor: number;
    };
}

interface DetallesSaldo {
    tipo: 'cuenta' | 'cliente' | 'proveedor';
    nombre: string;
    moneda: string;
    tiene_datos_historicos: boolean;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    monto_operacion: number;
    saldo_actual: number | null;
}

interface Props {
    movimiento: MovimientoFinanciero;
    detallesOrigen?: DetallesSaldo | null;
    detallesDestino?: DetallesSaldo | null;
    userRole?: 'admin' | 'moderador' | 'vendedor';
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Transacciones',
        href: '/transacciones',
    },
    {
        title: 'Detalle de Transacción',
        href: '#',
    },
];

// Componente para mostrar flujo de saldos
function FlujoSaldo({ detalles, esOrigen }: { detalles: DetallesSaldo; esOrigen: boolean }) {
    const colorClass = esOrigen ? 'border-red-600' : 'border-green-600';
    const iconColorClass = esOrigen ? 'text-red-600' : 'text-green-600';
    const Icon = esOrigen ? TrendingDown : TrendingUp;

    if (!detalles.tiene_datos_historicos) {
        return (
            <Alert className="border-amber-200">
                <Info className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                    <strong>Transacción antigua:</strong> Esta transacción se realizó antes de implementar el registro de saldos históricos.
                    Solo se muestra el saldo actual.
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <div className={`rounded-lg border-2 p-4 ${colorClass}`}>
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`h-5 w-5 ${iconColorClass}`} />
                <h4 className="font-semibold text-sidebar-accent">Flujo de Saldos</h4>
            </div>

            <div className="space-y-3">
                {/* Saldo Anterior */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-chart-3">Saldo Anterior:</span>
                    <span className="font-mono font-semibold">
                        {detalles.moneda} {detalles.saldo_anterior?.toFixed(2) ?? '0.00'}
                    </span>
                </div>

                {/* Operación */}
                <div className="flex items-center justify-between border-y py-2">
                    <span className="text-sm text-chart-3">{esOrigen ? 'Monto Enviado:' : 'Monto Recibido:'}</span>
                    <span className={`font-mono font-bold ${esOrigen ? 'text-red-600' : 'text-green-600'}`}>
                        {esOrigen ? '-' : '+'} {detalles.moneda} {Math.abs(detalles.monto_operacion).toFixed(2)}
                    </span>
                </div>

                {/* Saldo Posterior */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-chart-3">Saldo Posterior:</span>
                    <span className="font-mono font-bold text-lg">
                        {detalles.moneda} {detalles.saldo_posterior?.toFixed(2) ?? '0.00'}
                    </span>
                </div>

                {/* Saldo Actual (si difiere) */}
                {detalles.saldo_actual !== null && Math.abs(detalles.saldo_actual - (detalles.saldo_posterior ?? 0)) > 0.01 && (
                    <div className="pt-2 border-t">
                        <Alert className="py-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                <strong>Saldo actual:</strong> {detalles.moneda} {detalles.saldo_actual.toFixed(2)}
                                <br />
                                <span className="text-gray-500">
                                    (Han ocurrido otras transacciones después de esta)
                                </span>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerDetalleTransacciones({ movimiento, detallesOrigen, detallesDestino }: Props) {
    const page = usePage();
    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            sileo.success({ title: 'Transacción registrada', description: flash.success });
        }
        if (flash.error) {
            sileo.error({ title: 'Error', description: flash.error });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const getTipoMovimiento = (tipoId: number) => {
        switch (tipoId) {
            case 1:
                return { nombre: 'Gasto', icono: <ArrowLeft className="h-4 w-4" />, color: 'destructive' as const };
            case 2:
                return { nombre: 'Ingreso', icono: <ArrowRight className="h-4 w-4" />, color: 'default' as const };
            case 3:
                return { nombre: 'Transferencia', icono: <DollarSign className="h-4 w-4" />, color: 'secondary' as const };
            default:
                return { nombre: 'Desconocido', icono: <Banknote className="h-4 w-4" />, color: 'outline' as const };
        }
    };

    const tipo = getTipoMovimiento(movimiento.tipo_movimiento_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Transacción #${movimiento.id}`} />
                <ScrollProgress />
                <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                        <HeadingSmall title={`Transacción #${movimiento.id}`} description="Detalles completos del movimiento financiero" />
                        <Banknote
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    </div>

                    <Separator />

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge variant={tipo.color} className="flex items-center gap-2">
                            {tipo.icono}
                            {tipo.nombre}
                        </Badge>
                        <Badge variant={movimiento.estado === 'completado' ? 'default' : 'destructive'} className="flex items-center gap-2">
                            {movimiento.estado === 'completado' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            <span className="capitalize">{movimiento.estado}</span>
                        </Badge>
                    </div>

                    {/* Anulada — banner con motivo, mismo criterio visual que Venta */}
                    {movimiento.estado === 'cancelado' && (
                        <Alert className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10">
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <AlertDescription className="text-red-800 dark:text-red-300">
                                <strong>Operación anulada.</strong> Motivo: {labelMotivoAnulacion(movimiento.motivo_anulacion)}
                                {movimiento.detalle_anulacion && <> — {movimiento.detalle_anulacion}</>}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Botones */}
                    <div className="flex items-center justify-between">
                        <Link href={route('transacciones')}>
                            <Button variant="ghost" className='cursor-pointer bg-primary hover:bg-emerald-400' size="sm">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Realizar Nueva Transacción
                            </Button>
                        </Link>

                        <div className="flex gap-2">
                            {movimiento.estado !== 'cancelado' && <AnularOperacionDialog url={route('transacciones.anular', movimiento.id)} />}
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Exportar PDF
                            </Button>
                            <Button variant="secondary" size="sm">
                                <FileText className="mr-2 h-4 w-4" />
                                Exportar Excel
                            </Button>
                        </div>
                    </div>

                    {/* Grid principal */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Detalles del Movimiento */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Banknote className="h-5 w-5" />
                                    Detalles del Movimiento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">ID Transacción</p>
                                        <p className="font-mono text-lg">#{movimiento.id}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Fecha y Hora</p>
                                        <p className="flex items-center gap-2 text-sm">
                                            <Calendar className="h-4 w-4" />
                                            {new Date(movimiento.fecha_operacion).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Monto</p>
                                        <p className="text-primary text-2xl font-bold">
                                            {movimiento.moneda} {movimiento.monto.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Moneda</p>
                                        <p className="text-lg font-semibold">{movimiento.moneda}</p>
                                    </div>
                                </div>

                                {movimiento.tasa_cambio_aplicada && movimiento.tasa_cambio_aplicada > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Tasa de Cambio Aplicada</p>
                                        <p className="bg-muted rounded-md px-3 py-2 font-mono text-sm">
                                            1 USD = {movimiento.tasa_cambio_aplicada.toFixed(4)} {movimiento.moneda}
                                        </p>
                                    </div>
                                )}

                                {movimiento.descripcion && (
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Descripción</p>
                                        <p className="bg-muted rounded-md p-3 text-sm">{movimiento.descripcion}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Información de Entidades MEJORADA */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowRight className="h-5 w-5" />
                                    Información de Entidades
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Origen */}
                                {detallesOrigen && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-destructive h-2 w-2 rounded-full"></div>
                                            <p className="font-medium text-red-500">Origen: {detallesOrigen.nombre}</p>
                                        </div>
                                        <FlujoSaldo detalles={detallesOrigen} esOrigen={true} />
                                    </div>
                                )}

                                {/* Destino */}
                                {detallesDestino && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-emerald-700 h-2 w-2 rounded-full"></div>
                                            <p className="font-medium text-emerald-600">Destino: {detallesDestino.nombre}</p>
                                        </div>
                                        <FlujoSaldo detalles={detallesDestino} esOrigen={false} />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Información del Sistema */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información del Sistema
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Usuario</p>
                                        <p className="font-medium">{movimiento.user?.name || 'No especificado'}</p>
                                        <p className="text-muted-foreground text-sm">{movimiento.user?.email || 'No disponible'}</p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Atendido por</p>
                                        {/* Cae al nombre de la cuenta cuando no hay turno (admin, que nunca
                                            captura uno, o movimientos anteriores a esta feature) — para admin
                                            la cuenta ya es la persona real. */}
                                        <p className="font-medium">{movimiento.turno_vendedor?.nombre_vendedor ?? movimiento.user?.name ?? 'No especificado'}</p>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Rol</p>
                                        <Badge variant="secondary" className="capitalize">
                                            {movimiento.user?.role || 'Desconocido'}
                                        </Badge>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Estado</p>
                                        <Badge variant={movimiento.estado === 'completado' ? 'default' : 'destructive'} className="capitalize">
                                            {movimiento.estado}
                                        </Badge>
                                    </div>

                                    <div>
                                        <p className="text-muted-foreground text-sm font-medium">Fecha de Registro</p>
                                        <p className="text-sm">{new Date(movimiento.created_at).toLocaleString('es-ES')}</p>
                                    </div>

                                    {movimiento.updated_at !== movimiento.created_at && (
                                        <div>
                                            <p className="text-muted-foreground text-sm font-medium">Última Actualización</p>
                                            <p className="text-sm">{new Date(movimiento.updated_at).toLocaleString('es-ES')}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Resumen de la Transacción */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Resumen de la Transacción
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Tipo de Operación */}
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-sm font-medium">Tipo de Operación</p>
                                    <div className="flex items-center gap-2">
                                        {tipo.icono}
                                        <p className="font-semibold text-lg">{tipo.nombre}</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Entidades Involucradas */}
                                <div className="space-y-3">
                                    <p className="text-muted-foreground text-sm font-medium">Entidades Involucradas</p>

                                    {/* Origen */}
                                    {(movimiento.cuentaOrigen || movimiento.clienteOrigen) && (
                                        <div className="rounded-lg border p-3 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-destructive h-2 w-2 rounded-full"></div>
                                                <p className="text-xs text-muted-foreground">Origen</p>
                                            </div>
                                            {movimiento.cuentaOrigen && (
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-destructive" />
                                                    <div>
                                                        <p className="font-medium">{movimiento.cuentaOrigen.nombre_cuenta}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Cuenta • {movimiento.cuentaOrigen.moneda?.codigo_moneda || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {movimiento.clienteOrigen && (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-destructive" />
                                                    <div>
                                                        <p className="font-medium">{movimiento.clienteOrigen.nombre_cliente}</p>
                                                        <p className="text-xs text-muted-foreground">Cliente • USD</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Destino */}
                                    {(movimiento.cuentaDestino || movimiento.clienteDestino || movimiento.proveedorDestino) && (
                                        <div className="rounded-lg border p-3 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-primary h-2 w-2 rounded-full"></div>
                                                <p className="text-xs text-muted-foreground">Destino</p>
                                            </div>
                                            {movimiento.cuentaDestino && (
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <p className="font-medium">{movimiento.cuentaDestino.nombre_cuenta}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Cuenta • {movimiento.cuentaDestino.moneda?.codigo_moneda || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {movimiento.clienteDestino && (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <p className="font-medium">{movimiento.clienteDestino.nombre_cliente}</p>
                                                        <p className="text-xs text-muted-foreground">Cliente • USD</p>
                                                    </div>
                                                </div>
                                            )}
                                            {movimiento.proveedorDestino && (
                                                <div className="flex items-center gap-2">
                                                    <Building className="h-4 w-4 text-primary" />
                                                    <div>
                                                        <p className="font-medium">{movimiento.proveedorDestino.nombre_proveedor}</p>
                                                        <p className="text-xs text-muted-foreground">Proveedor • USD</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                {/* Monedas */}
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-sm font-medium">Información de Monedas</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-lg border p-2">
                                            <p className="text-xs text-muted-foreground mb-1">Moneda Transacción</p>
                                            <p className="font-semibold">{movimiento.moneda}</p>
                                        </div>
                                        {movimiento.tasa_cambio_aplicada && movimiento.tasa_cambio_aplicada > 0 && (
                                            <div className="rounded-lg border p-2">
                                                <p className="text-xs text-muted-foreground mb-1">Tasa de Cambio</p>
                                                <p className="font-semibold">{movimiento.tasa_cambio_aplicada.toFixed(2)}</p>
                                            </div>
                                        )}
                                        {movimiento.moneda_origen && movimiento.moneda_origen !== movimiento.moneda && (
                                            <div className="rounded-lg border p-2">
                                                <p className="text-xs text-muted-foreground mb-1">Moneda Origen</p>
                                                <p className="font-semibold">{movimiento.moneda_origen}</p>
                                            </div>
                                        )}
                                        {movimiento.moneda_destino && movimiento.moneda_destino !== movimiento.moneda && (
                                            <div className="rounded-lg border p-2">
                                                <p className="text-xs text-muted-foreground mb-1">Moneda Destino</p>
                                                <p className="font-semibold">{movimiento.moneda_destino}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <Toaster position="top-center" />
            </AppLayout>
    );
}
