import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Banknote, Building, Calendar, CheckCircle, DollarSign, Download, FileText, Info, User, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

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
    created_at: string;
    updated_at: string;

    // Relaciones (pueden venir null)
    user?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
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

interface Props {
    movimiento: MovimientoFinanciero;
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

export default function VerDetalleTransacciones({ movimiento, userRole }: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};
    const [showNotification, setShowNotification] = useState(false);

    useEffect(() => {
        if (flash.success || flash.error) {
            setShowNotification(true);
            const timer = setTimeout(() => setShowNotification(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [flash.success, flash.error]);

    // Función para obtener el tipo de movimiento
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
        <>
            {/* Notificación de éxito o error usando shadcn/ui Alert */}
            {showNotification && (
                <div className="fixed top-4 right-4 z-50 max-w-sm">
                    <Alert className={flash.success ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}>
                        {flash.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <AlertDescription>{flash.success || flash.error}</AlertDescription>
                    </Alert>
                </div>
            )}

            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`Transacción #${movimiento.id}`} />
                <ScrollProgress />
                <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                    {/* Header limpio como estaba */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                        <HeadingSmall title={`Transacción #${movimiento.id}`} description="Detalles completos del movimiento financiero" />
                        <Banknote
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    </div>

                    <Separator />

                    {/* Badges de tipo y estado */}
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

                    {/* Botones de exportación y volver */}
                    <div className="flex items-center justify-between">
                        <Link href={route('transacciones')}>
                            <Button variant="outline" size="sm" className="cursor-pointer">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver
                            </Button>
                        </Link>

                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="cursor-pointer">
                                <Download className="mr-2 h-4 w-4" />
                                Exportar PDF
                            </Button>
                            <Button variant="secondary" size="sm" className="cursor-pointer">
                                <FileText className="mr-2 h-4 w-4" />
                                Exportar Excel
                            </Button>
                        </div>
                    </div>

                    {/* Grid de cards principal */}
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

                        {/* Información de Entidades */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ArrowRight className="h-5 w-5" />
                                    Información de Entidades
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Origen */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-destructive h-2 w-2 rounded-full"></div>
                                        <p className="font-medium">Origen</p>
                                    </div>
                                    {movimiento.cuentaOrigen ? (
                                        <div className="bg-destructive/5 flex items-center gap-3 rounded-lg border p-4">
                                            <DollarSign className="text-destructive h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium">{movimiento.cuentaOrigen.nombre_cuenta}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    {movimiento.cuentaOrigen.moneda?.codigo_moneda || 'N/A'} - Saldo:{' '}
                                                    {movimiento.cuentaOrigen.saldo_cuenta?.toFixed(2) || '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : movimiento.clienteOrigen ? (
                                        <div className="bg-destructive/5 flex items-center gap-3 rounded-lg border p-4">
                                            <User className="text-destructive h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium">{movimiento.clienteOrigen.nombre_cliente}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    Cliente - Deuda: {movimiento.clienteOrigen.deuda_pago_cliente?.toFixed(2) || '0.00'} USD
                                                </p>
                                            </div>
                                        </div>
                                    ) : movimiento.cliente_origen_id ? (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Cliente (ID: {movimiento.cliente_origen_id}) - Los datos se están cargando...
                                            </AlertDescription>
                                        </Alert>
                                    ) : movimiento.cuenta_origen_id ? (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Cuenta (ID: {movimiento.cuenta_origen_id}) - Los datos se están cargando...
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>No especificado</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                {/* Destino */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary h-2 w-2 rounded-full"></div>
                                        <p className="font-medium">Destino</p>
                                    </div>
                                    {movimiento.cuentaDestino ? (
                                        <div className="bg-primary/5 flex items-center gap-3 rounded-lg border p-4">
                                            <DollarSign className="text-primary h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium">{movimiento.cuentaDestino.nombre_cuenta}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    {movimiento.cuentaDestino.moneda?.codigo_moneda || 'N/A'} - Saldo:{' '}
                                                    {movimiento.cuentaDestino.saldo_cuenta?.toFixed(2) || '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : movimiento.clienteDestino ? (
                                        <div className="bg-primary/5 flex items-center gap-3 rounded-lg border p-4">
                                            <User className="text-primary h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium">{movimiento.clienteDestino.nombre_cliente}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    Cliente - Deuda: {movimiento.clienteDestino.deuda_pago_cliente?.toFixed(2) || '0.00'} USD
                                                </p>
                                            </div>
                                        </div>
                                    ) : movimiento.proveedorDestino ? (
                                        <div className="bg-primary/5 flex items-center gap-3 rounded-lg border p-4">
                                            <Building className="text-primary h-5 w-5" />
                                            <div className="flex-1">
                                                <p className="font-medium">{movimiento.proveedorDestino.nombre_proveedor}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    Proveedor - Saldo: {movimiento.proveedorDestino.saldo_proveedor?.toFixed(2) || '0.00'} USD
                                                </p>
                                            </div>
                                        </div>
                                    ) : movimiento.cuenta_destino_id ? (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Cuenta (ID: {movimiento.cuenta_destino_id}) - Los datos se están cargando...
                                            </AlertDescription>
                                        </Alert>
                                    ) : movimiento.cliente_destino_id ? (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Cliente (ID: {movimiento.cliente_destino_id}) - Los datos se están cargando...
                                            </AlertDescription>
                                        </Alert>
                                    ) : movimiento.proveedor_destino_id ? (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>
                                                Proveedor (ID: {movimiento.proveedor_destino_id}) - Los datos se están cargando...
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertDescription>No especificado</AlertDescription>
                                        </Alert>
                                    )}
                                </div>
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

                        {/* Información Técnica */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    Información Técnica
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">ID Usuario</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.user_id}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Tipo Movimiento ID</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.tipo_movimiento_id}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Cuenta Origen ID</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.cuenta_origen_id || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Cuenta Destino ID</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.cuenta_destino_id || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Cliente Origen ID</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.cliente_origen_id || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-muted-foreground text-sm font-medium">Cliente Destino ID</p>
                                        <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.cliente_destino_id || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-sm font-medium">Proveedor Destino ID</p>
                                    <p className="bg-muted rounded px-3 py-2 font-mono text-sm">{movimiento.proveedor_destino_id || 'N/A'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </AppLayout>
        </>
    );
}
