import { AnularOperacionDialog } from '@/components/anular-operacion-dialog';
import { labelMotivoAnulacion } from '@/components/detalle-operacion';
import HeadingSmall from '@/components/heading-small';
import { type Acento, claseBadge, claseCifra, formatear, ResumenCard, ResumenDato } from '@/components/transacciones/entidad';
import LadoOperacion, { type DetallesSaldo } from '@/components/transacciones/lado-operacion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollProgress } from '@/components/ui/scroll';
import { Toaster } from '@/components/ui/sileo-toaster';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, Banknote, CheckCircle2, Plus, Receipt, Truck, XCircle } from 'lucide-react';
import { useEffect } from 'react';

interface MovimientoFinanciero {
    id: number;
    tipo_movimiento_id: number;
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
    moneda_origen: string | null;
    moneda_destino: string | null;
    user?: { id: number; name: string; email: string; role: string };
    // Quién atendía realmente (feature "Atendido por" / Turnos), distinto de `user` (la cuenta de punto de venta).
    // Null en movimientos anteriores a esa feature o creados por admin. Laravel serializa la relación
    // `turnoVendedor()` en snake_case, de ahí el nombre — no es un typo.
    turno_vendedor?: { nombre_vendedor: string } | null;
}

interface EnvioOrigen {
    id: number;
    estado: string;
    enviado_por: string | null;
    fecha_envio: string;
    confirmado_por: string | null;
    fecha_confirmacion: string | null;
    diferencia: number | null;
}

interface Props {
    movimiento: MovimientoFinanciero;
    detallesOrigen?: DetallesSaldo | null;
    detallesDestino?: DetallesSaldo | null;
    envioOrigen?: EnvioOrigen | null;
    userRole?: 'admin' | 'moderador' | 'vendedor';
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Transacciones', href: '/transacciones' },
    { title: 'Detalle de Transacción', href: '#' },
];

const TIPOS: Record<number, { nombre: string; acento: Acento; icono: React.ElementType }> = {
    1: { nombre: 'Gasto', acento: 'rose', icono: ArrowUpFromLine },
    2: { nombre: 'Ingreso', acento: 'emerald', icono: ArrowDownToLine },
    3: { nombre: 'Transferencia', acento: 'blue', icono: ArrowLeftRight },
};

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ESTADO_ENVIO: Record<string, string> = {
    recibido: 'Confirmado',
    recibido_parcial: 'Recibido con diferencia',
};

export default function VerDetalleTransacciones({ movimiento, detallesOrigen, detallesDestino, envioOrigen }: Props) {
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

    const tipo = TIPOS[movimiento.tipo_movimiento_id] ?? { nombre: 'Operación', acento: 'violet' as Acento, icono: Banknote };
    const anulada = movimiento.estado === 'cancelado';
    const TipoIcono = tipo.icono;
    const hayConversion = !!movimiento.moneda_origen && !!movimiento.moneda_destino && movimiento.moneda_origen !== movimiento.moneda_destino;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Transacción #${movimiento.id}`} />
            <Toaster position="top-center" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Transacción #${movimiento.id}`} description="Detalles completos del movimiento financiero" />
                    <Banknote size={70} color="#d6d3d1" className="pointer-events-none absolute right-2 bottom-0 animate-pulse opacity-40" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn('gap-2 border-0 px-3 py-1 text-sm font-bold text-white shadow-md', claseBadge(tipo.acento))}>
                            <TipoIcono className="h-4 w-4" />
                            {tipo.nombre}
                        </Badge>
                        <Badge
                            className={cn(
                                'gap-2 border-0 px-3 py-1 text-sm font-bold text-white shadow-md',
                                anulada ? 'bg-gradient-to-r from-red-600 to-rose-700' : 'bg-gradient-to-r from-emerald-500 to-green-600',
                            )}
                        >
                            {anulada ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {anulada ? 'Anulada' : 'Completada'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href={route('transacciones')}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva transacción
                            </Link>
                        </Button>
                        {!anulada && <AnularOperacionDialog url={route('transacciones.anular', movimiento.id)} />}
                    </div>
                </div>

                {anulada && (
                    <Alert className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-300">
                            <strong>Operación anulada.</strong> Motivo: {labelMotivoAnulacion(movimiento.motivo_anulacion)}
                            {movimiento.detalle_anulacion && <> — {movimiento.detalle_anulacion}</>}
                        </AlertDescription>
                    </Alert>
                )}

                {envioOrigen && (
                    <SpotlightCard estado="tarjeta" className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-4 dark:bg-blue-500/10">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                <Truck className="h-5 w-5" />
                            </span>
                            <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                                <p className="font-semibold">Esta transferencia nació de un envío en tránsito</p>
                                <p className="text-muted-foreground">
                                    Enviado por {envioOrigen.enviado_por ?? '—'} el {formatearFecha(envioOrigen.fecha_envio)}
                                    {envioOrigen.confirmado_por && envioOrigen.fecha_confirmacion && (
                                        <>
                                            {' · '}
                                            {ESTADO_ENVIO[envioOrigen.estado] ?? 'Confirmado'} por {envioOrigen.confirmado_por} el{' '}
                                            {formatearFecha(envioOrigen.fecha_confirmacion)}
                                        </>
                                    )}
                                </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <Link href={route('transacciones.envios.index')}>Ver envíos</Link>
                            </Button>
                        </div>
                    </SpotlightCard>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="space-y-8 lg:col-span-3">
                        {detallesOrigen && (
                            <LadoOperacion
                                id="lado-origen"
                                titulo="Origen: de dónde salió"
                                icono={ArrowUpFromLine}
                                acento="rose"
                                detalles={detallesOrigen}
                            />
                        )}
                        {detallesDestino && (
                            <LadoOperacion
                                id="lado-destino"
                                titulo="Destino: a dónde llegó"
                                icono={ArrowDownToLine}
                                acento="emerald"
                                detalles={detallesDestino}
                            />
                        )}
                        {!detallesOrigen && !detallesDestino && (
                            <p className="text-muted-foreground text-sm">Esta operación no tiene origen ni destino registrados.</p>
                        )}
                    </div>

                    <aside className="lg:col-span-2">
                        <ResumenCard acento={tipo.acento} titulo="Resumen de la operación" icono={Receipt}>
                            <ResumenDato titulo="Monto">
                                <p className={cn('text-4xl font-black tabular-nums', claseCifra(tipo.acento))}>
                                    {movimiento.moneda} {formatear(movimiento.monto)}
                                </p>
                            </ResumenDato>

                            {hayConversion && movimiento.tasa_cambio_aplicada && movimiento.tasa_cambio_aplicada > 0 && (
                                <ResumenDato titulo="Tasa de cambio aplicada" separado>
                                    <p className="text-lg font-bold tabular-nums">
                                        {movimiento.tasa_cambio_aplicada.toLocaleString('es-ES', { maximumFractionDigits: 6 })}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        De {movimiento.moneda_origen} a {movimiento.moneda_destino}
                                    </p>
                                </ResumenDato>
                            )}

                            {movimiento.descripcion && (
                                <ResumenDato titulo="Concepto" separado>
                                    <p className="text-sm">{movimiento.descripcion}</p>
                                </ResumenDato>
                            )}

                            <ResumenDato titulo="Fecha y hora" separado>
                                <p className="text-sm font-medium">{formatearFecha(movimiento.fecha_operacion)}</p>
                            </ResumenDato>

                            <ResumenDato titulo="Registrada por" separado>
                                <p className="text-sm font-medium">{movimiento.user?.name ?? 'No especificado'}</p>
                                {movimiento.user?.role && (
                                    <Badge variant="secondary" className="capitalize">
                                        {movimiento.user.role}
                                    </Badge>
                                )}
                            </ResumenDato>

                            <ResumenDato titulo="Atendido por">
                                {/* Cae al nombre de la cuenta cuando no hay turno (admin, que nunca captura uno, o movimientos anteriores a
                                    esta feature): para admin la cuenta ya es la persona real. */}
                                <p className="text-sm font-medium">
                                    {movimiento.turno_vendedor?.nombre_vendedor ?? movimiento.user?.name ?? 'No especificado'}
                                </p>
                            </ResumenDato>

                            <p className="text-muted-foreground border-t pt-3 text-xs">
                                Operación #{movimiento.id} · registrada el {new Date(movimiento.created_at).toLocaleString('es-ES')}
                            </p>
                        </ResumenCard>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
