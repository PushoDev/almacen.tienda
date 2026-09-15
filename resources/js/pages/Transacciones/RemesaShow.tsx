import { AnularOperacionDialog } from '@/components/anular-operacion-dialog';
import { labelMotivoAnulacion } from '@/components/detalle-operacion';
import HeadingSmall from '@/components/heading-small';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Building, Calendar, Info, Send, TrendingDown, TrendingUp, User } from 'lucide-react';
import { useEffect } from 'react';

interface DetallesSaldo {
    tipo: 'cuenta' | 'cliente' | 'proveedor';
    nombre: string | null;
    moneda: string | null;
    monto_operacion: number;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    saldo_actual: number | null;
}

interface Remesa {
    id: number;
    notas: string | null;
    fecha_operacion: string;
    estado: string;
    motivo_anulacion: string | null;
    detalle_anulacion: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        role: string;
    };
    turno_vendedor?: {
        nombre_vendedor: string;
    } | null;
}

interface Props {
    remesa: Remesa;
    detallesEntrada: DetallesSaldo;
    detallesSalida: DetallesSaldo;
    detallesMensajero: DetallesSaldo | null;
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
        title: 'Detalle de Operación Múltiple',
        href: '#',
    },
];

const iconoPorTipo = {
    cuenta: <TrendingUp className="h-4 w-4" />,
    cliente: <User className="h-4 w-4" />,
    proveedor: <Building className="h-4 w-4" />,
};

function FlujoSaldo({ detalles, titulo, colorClass, iconColorClass, Icon }: { detalles: DetallesSaldo; titulo: string; colorClass: string; iconColorClass: string; Icon: typeof TrendingUp }) {
    const esNegativo = detalles.monto_operacion < 0;

    return (
        <div className={`rounded-lg border-2 p-4 ${colorClass}`}>
            <div className="mb-3 flex items-center gap-2">
                <Icon className={`h-5 w-5 ${iconColorClass}`} />
                <h4 className="font-semibold">{titulo}</h4>
                {iconoPorTipo[detalles.tipo]}
                <span className="text-sm text-muted-foreground">{detalles.nombre ?? 'No especificado'}</span>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Saldo Anterior:</span>
                    <span className="font-mono font-semibold">
                        {detalles.moneda} {detalles.saldo_anterior?.toFixed(2) ?? '0.00'}
                    </span>
                </div>

                <div className="flex items-center justify-between border-y py-2">
                    <span className="text-muted-foreground text-sm">Monto:</span>
                    <span className={`font-mono font-bold ${esNegativo ? 'text-red-600' : 'text-green-600'}`}>
                        {esNegativo ? '-' : '+'} {detalles.moneda} {Math.abs(detalles.monto_operacion).toFixed(2)}
                    </span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Saldo Posterior:</span>
                    <span className="font-mono text-lg font-bold">
                        {detalles.moneda} {detalles.saldo_posterior?.toFixed(2) ?? '0.00'}
                    </span>
                </div>

                {detalles.saldo_actual !== null && Math.abs(detalles.saldo_actual - (detalles.saldo_posterior ?? 0)) > 0.01 && (
                    <div className="border-t pt-2">
                        <Alert className="py-2">
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                <strong>Saldo actual:</strong> {detalles.moneda} {detalles.saldo_actual.toFixed(2)}
                                <br />
                                <span className="text-gray-500">(Han ocurrido otras operaciones después de esta)</span>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function RemesaShow({ remesa, detallesEntrada, detallesSalida, detallesMensajero }: Props) {
    const page = usePage();
    const flash = (page.props as { flash?: { success?: string; error?: string } }).flash ?? {};

    useEffect(() => {
        if (flash.success) {
            sileo.success({ title: 'Operación Múltiple registrada', description: flash.success });
        }
        if (flash.error) {
            sileo.error({ title: 'Error', description: flash.error });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Operación Múltiple #${remesa.id}`} />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Operación Múltiple #${remesa.id}`} description="Detalle completo de la Operación Múltiple" />
                    <Send
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {remesa.estado === 'anulada' && (
                    <Alert className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-300">
                            <strong>Operación Múltiple anulada.</strong> Motivo: {labelMotivoAnulacion(remesa.motivo_anulacion)}
                            {remesa.detalle_anulacion && <> — {remesa.detalle_anulacion}</>}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="flex items-center justify-between">
                    <Link href={route('transacciones')}>
                        <Button variant="ghost" className="cursor-pointer bg-primary hover:bg-emerald-400" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Realizar Nueva Transacción
                        </Button>
                    </Link>
                    {remesa.estado !== 'anulada' && <AnularOperacionDialog url={route('transacciones.remesa.anular', remesa.id)} />}
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Entrada */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-green-600" />
                                Entrada
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FlujoSaldo detalles={detallesEntrada} titulo="Entrada" colorClass="border-green-600" iconColorClass="text-green-600" Icon={TrendingUp} />
                        </CardContent>
                    </Card>

                    {/* Salida */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                                Salida
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FlujoSaldo detalles={detallesSalida} titulo="Salida" colorClass="border-red-600" iconColorClass="text-red-600" Icon={TrendingDown} />
                        </CardContent>
                    </Card>

                    {/* Mensajero (opcional) */}
                    {detallesMensajero && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Send className="h-5 w-5 text-amber-600" />
                                    Mensajero
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FlujoSaldo detalles={detallesMensajero} titulo="Mensajero" colorClass="border-amber-600" iconColorClass="text-amber-600" Icon={TrendingDown} />
                            </CardContent>
                        </Card>
                    )}

                    {/* Información del Sistema */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información del Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Usuario</p>
                                <p className="font-medium">{remesa.user?.name || 'No especificado'}</p>
                                <p className="text-muted-foreground text-sm">{remesa.user?.email || 'No disponible'}</p>
                            </div>

                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Atendido por</p>
                                <p className="font-medium">{remesa.turno_vendedor?.nombre_vendedor ?? remesa.user?.name ?? 'No especificado'}</p>
                            </div>

                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Rol</p>
                                <Badge variant="secondary" className="capitalize">
                                    {remesa.user?.role || 'Desconocido'}
                                </Badge>
                            </div>

                            <Separator />

                            <div>
                                <p className="text-muted-foreground text-sm font-medium">Fecha de Operación</p>
                                <p className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(remesa.fecha_operacion).toLocaleString('es-ES', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>

                            {remesa.notas && (
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">Notas</p>
                                    <p className="bg-muted rounded-md p-3 text-sm">{remesa.notas}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
