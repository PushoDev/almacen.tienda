import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Banknote, Building, Calendar, CheckCircle, DollarSign, Download, FileText, User, XCircle } from 'lucide-react';

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
    userRole: 'admin' | 'moderador' | 'vendedor';
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
    // Función para obtener el tipo de movimiento
    const getTipoMovimiento = (tipoId: number) => {
        switch (tipoId) {
            case 1:
                return { nombre: 'Gasto', icono: <ArrowLeft className="h-5 w-5 text-red-500" />, color: 'red' };
            case 2:
                return { nombre: 'Ingreso', icono: <ArrowRight className="h-5 w-5 text-green-500" />, color: 'green' };
            case 3:
                return { nombre: 'Transferencia', icono: <DollarSign className="h-5 w-5 text-blue-500" />, color: 'blue' };
            default:
                return { nombre: 'Desconocido', icono: <Banknote className="h-5 w-5 text-gray-500" />, color: 'gray' };
        }
    };

    const tipo = getTipoMovimiento(movimiento.tipo_movimiento_id);

    // Simple badge component
    const Badge = ({ children, className = '', variant = 'default' }: { children: React.ReactNode; className?: string; variant?: string }) => {
        const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
        const variantClasses = {
            default: 'bg-blue-100 text-blue-800 border border-blue-200',
            secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
            destructive: 'bg-red-100 text-red-800 border border-red-200',
            outline: 'border border-gray-300 text-gray-700',
        };

        return <span className={`${baseClasses} ${variantClasses[variant as keyof typeof variantClasses]} ${className}`}>{children}</span>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Transacción #${movimiento.id}`} />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <HeadingSmall title={`Transacción #${movimiento.id}`} description="Detalles completos del movimiento financiero" />
                            <div className="mt-2 flex items-center gap-2">
                                <Badge className={`bg-${tipo.color}-100 text-${tipo.color}-800 border-${tipo.color}-200`}>
                                    <div className="flex items-center gap-1">
                                        {tipo.icono}
                                        <span>{tipo.nombre}</span>
                                    </div>
                                </Badge>
                                <Badge variant="outline" className="flex items-center gap-1">
                                    {movimiento.estado === 'completado' ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-red-500" />
                                    )}
                                    <span className="capitalize">{movimiento.estado}</span>
                                </Badge>
                            </div>
                        </div>
                        <Banknote
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    </div>
                </div>
                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex items-center justify-between">
                    <Link href={route('transacciones')}>
                        <Button variant="outline" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Volver a Transacciones
                        </Button>
                    </Link>

                    <div className="flex gap-2">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Exportar PDF
                        </Button>
                        <Button variant="secondary" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Detalles del Movimiento */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Banknote className="h-5 w-5" />
                                Detalles del Movimiento
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">ID Transacción</p>
                                    <p className="font-mono">#{movimiento.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Fecha y Hora</p>
                                    <p className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(movimiento.fecha_operacion).toLocaleString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Monto</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {movimiento.moneda} {movimiento.monto.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Moneda</p>
                                    <p className="font-semibold">{movimiento.moneda}</p>
                                </div>
                            </div>

                            {movimiento.tasa_cambio_aplicada && movimiento.tasa_cambio_aplicada > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Tasa de Cambio Aplicada</p>
                                    <p className="font-mono">
                                        1 USD = {movimiento.tasa_cambio_aplicada.toFixed(4)} {movimiento.moneda}
                                    </p>
                                </div>
                            )}

                            {movimiento.descripcion && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Descripción</p>
                                    <p className="text-gray-700">{movimiento.descripcion}</p>
                                </div>
                            )}

                            <div>
                                <p className="text-sm font-medium text-gray-500">Tipo de Movimiento</p>
                                <p className="font-medium">{tipo.nombre}</p>
                            </div>
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
                        <CardContent className="space-y-4">
                            {/* Origen */}
                            <div>
                                <p className="mb-2 font-medium text-red-700">Origen</p>
                                {movimiento.cuentaOrigen ? (
                                    <div className="flex items-center gap-2 rounded bg-red-50 p-3">
                                        <DollarSign className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <p className="font-medium">{movimiento.cuentaOrigen.nombre_cuenta}</p>
                                            <p className="text-sm text-gray-500">
                                                {movimiento.cuentaOrigen.moneda?.codigo_moneda || 'N/A'} - Saldo:{' '}
                                                {movimiento.cuentaOrigen.saldo_cuenta?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>
                                ) : movimiento.clienteOrigen ? (
                                    <div className="flex items-center gap-2 rounded bg-red-50 p-3">
                                        <User className="h-4 w-4 text-purple-500" />
                                        <div>
                                            <p className="font-medium">{movimiento.clienteOrigen.nombre_cliente}</p>
                                            <p className="text-sm text-gray-500">
                                                Cliente - Deuda: {movimiento.clienteOrigen.deuda_pago_cliente?.toFixed(2) || '0.00'} USD
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded bg-gray-50 p-3">
                                        <p className="text-gray-500">No especificado</p>
                                    </div>
                                )}
                            </div>

                            {/* Destino */}
                            <div>
                                <p className="mb-2 font-medium text-green-700">Destino</p>
                                {movimiento.cuentaDestino ? (
                                    <div className="flex items-center gap-2 rounded bg-green-50 p-3">
                                        <DollarSign className="h-4 w-4 text-green-500" />
                                        <div>
                                            <p className="font-medium">{movimiento.cuentaDestino.nombre_cuenta}</p>
                                            <p className="text-sm text-gray-500">
                                                {movimiento.cuentaDestino.moneda?.codigo_moneda || 'N/A'} - Saldo:{' '}
                                                {movimiento.cuentaDestino.saldo_cuenta?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>
                                ) : movimiento.clienteDestino ? (
                                    <div className="flex items-center gap-2 rounded bg-green-50 p-3">
                                        <User className="h-4 w-4 text-purple-500" />
                                        <div>
                                            <p className="font-medium">{movimiento.clienteDestino.nombre_cliente}</p>
                                            <p className="text-sm text-gray-500">
                                                Cliente - Deuda: {movimiento.clienteDestino.deuda_pago_cliente?.toFixed(2) || '0.00'} USD
                                            </p>
                                        </div>
                                    </div>
                                ) : movimiento.proveedorDestino ? (
                                    <div className="flex items-center gap-2 rounded bg-green-50 p-3">
                                        <Building className="h-4 w-4 text-orange-500" />
                                        <div>
                                            <p className="font-medium">{movimiento.proveedorDestino.nombre_proveedor}</p>
                                            <p className="text-sm text-gray-500">
                                                Proveedor - Saldo: {movimiento.proveedorDestino.saldo_proveedor?.toFixed(2) || '0.00'} USD
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded bg-gray-50 p-3">
                                        <p className="text-gray-500">No especificado</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información del Sistema */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Información del Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Usuario</p>
                                <p className="font-medium">{movimiento.user?.name || 'No especificado'}</p>
                                <p className="text-sm text-gray-500">{movimiento.user?.email || 'No disponible'}</p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Rol</p>
                                <Badge variant="secondary" className="capitalize">
                                    {movimiento.user?.role || 'Desconocido'}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Estado</p>
                                <Badge variant={movimiento.estado === 'completado' ? 'default' : 'destructive'} className="capitalize">
                                    {movimiento.estado}
                                </Badge>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Fecha de Registro</p>
                                <p className="text-sm">{new Date(movimiento.created_at).toLocaleString('es-ES')}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Información Técnica */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información Técnica
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">ID Usuario</p>
                                    <p className="font-mono text-sm">{movimiento.user_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Tipo Movimiento ID</p>
                                    <p className="font-mono text-sm">{movimiento.tipo_movimiento_id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Cuenta Origen ID</p>
                                    <p className="font-mono text-sm">{movimiento.cuenta_origen_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Cuenta Destino ID</p>
                                    <p className="font-mono text-sm">{movimiento.cuenta_destino_id || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Cliente Origen ID</p>
                                    <p className="font-mono text-sm">{movimiento.cliente_origen_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Cliente Destino ID</p>
                                    <p className="font-mono text-sm">{movimiento.cliente_destino_id || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-500">Proveedor Destino ID</p>
                                <p className="font-mono text-sm">{movimiento.proveedor_destino_id || 'N/A'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
