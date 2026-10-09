import { AnularOperacionDialog } from '@/components/anular-operacion-dialog';
import { labelMotivoAnulacion } from '@/components/detalle-operacion';
import HeadingSmall from '@/components/heading-small';
import { claseBadge, formatear, ResumenCard, ResumenDato } from '@/components/transacciones/entidad';
import LadoOperacion, { type DetallesSaldo } from '@/components/transacciones/lado-operacion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollProgress } from '@/components/ui/scroll';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Handshake, Plus, Receipt, Send, Shuffle, XCircle } from 'lucide-react';
import { useEffect } from 'react';

interface Remesa {
    id: number;
    notas: string | null;
    fecha_operacion: string;
    estado: string;
    motivo_anulacion: string | null;
    detalle_anulacion: string | null;
    created_at: string;
    user?: { id: number; name: string; email: string; role: string };
    turno_vendedor?: { nombre_vendedor: string } | null;
}

interface Props {
    remesa: Remesa;
    detallesEntrada: DetallesSaldo;
    detallesSalida: DetallesSaldo;
    detallesMensajero: DetallesSaldo | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Transacciones', href: '/transacciones' },
    { title: 'Detalle de Operación Múltiple', href: '#' },
];

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

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

    const anulada = remesa.estado === 'anulada';
    const montoEntrada = Math.abs(detallesEntrada.monto_operacion);
    const montoSalida = Math.abs(detallesSalida.monto_operacion);
    // Referencia informativa, igual que en el formulario: cuánto salió por cada unidad que entró cuando las monedas difieren
    const tasaImplicita =
        detallesEntrada.moneda && detallesSalida.moneda && detallesEntrada.moneda !== detallesSalida.moneda && montoEntrada > 0 && montoSalida > 0
            ? montoSalida / montoEntrada
            : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Operación Múltiple #${remesa.id}`} />
            <Toaster position="top-center" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Operación Múltiple #${remesa.id}`} description="Detalle completo de la Operación Múltiple" />
                    <Send size={70} color="#d6d3d1" className="pointer-events-none absolute right-2 bottom-0 animate-pulse opacity-40" />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <Badge className={cn('gap-2 border-0 px-3 py-1 text-sm font-bold text-white shadow-md', claseBadge('violet'))}>
                            <Shuffle className="h-4 w-4" />
                            Operación Múltiple
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
                        {!anulada && <AnularOperacionDialog url={route('transacciones.remesa.anular', remesa.id)} />}
                    </div>
                </div>

                {anulada && (
                    <Alert className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <AlertDescription className="text-red-800 dark:text-red-300">
                            <strong>Operación Múltiple anulada.</strong> Motivo: {labelMotivoAnulacion(remesa.motivo_anulacion)}
                            {remesa.detalle_anulacion && <> — {remesa.detalle_anulacion}</>}
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-6 lg:grid-cols-5">
                    <div className="space-y-8 lg:col-span-3">
                        <LadoOperacion
                            id="lado-entrada"
                            titulo="Entrada: el dinero que entró"
                            icono={ArrowDownToLine}
                            acento="emerald"
                            detalles={detallesEntrada}
                        />
                        <LadoOperacion
                            id="lado-salida"
                            titulo="Salida: el dinero que salió"
                            icono={ArrowUpFromLine}
                            acento="rose"
                            detalles={detallesSalida}
                        />
                        {detallesMensajero && (
                            <LadoOperacion id="lado-mensajero" titulo="Mensajero" icono={Handshake} acento="blue" detalles={detallesMensajero} />
                        )}
                    </div>

                    <aside className="lg:col-span-2">
                        <ResumenCard acento="violet" titulo="Resumen de la operación" icono={Receipt}>
                            <ResumenDato titulo="Entrada">
                                <p className="truncate text-sm font-semibold">{detallesEntrada.nombre ?? 'No especificado'}</p>
                                <p className="text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                                    + {detallesEntrada.simbolo} {formatear(montoEntrada)}
                                </p>
                            </ResumenDato>

                            <ResumenDato titulo="Salida">
                                <p className="truncate text-sm font-semibold">{detallesSalida.nombre ?? 'No especificado'}</p>
                                <p className="text-3xl font-black text-rose-600 tabular-nums dark:text-rose-400">
                                    − {detallesSalida.simbolo} {formatear(montoSalida)}
                                </p>
                            </ResumenDato>

                            {detallesMensajero && (
                                <ResumenDato titulo="Mensajero">
                                    <p className="truncate text-sm font-semibold">{detallesMensajero.nombre ?? 'No especificado'}</p>
                                    <p className="text-2xl font-black text-blue-600 tabular-nums dark:text-blue-400">
                                        − {detallesMensajero.simbolo} {formatear(Math.abs(detallesMensajero.monto_operacion))}
                                    </p>
                                </ResumenDato>
                            )}

                            {tasaImplicita !== null && (
                                <ResumenDato titulo="Tasa implícita" separado>
                                    <p className="text-lg font-bold tabular-nums">
                                        1 {detallesEntrada.moneda} ={' '}
                                        {tasaImplicita.toLocaleString('es-ES', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: tasaImplicita >= 1 ? 2 : 6,
                                        })}{' '}
                                        {detallesSalida.moneda}
                                    </p>
                                    <p className="text-muted-foreground text-xs">Solo de referencia, sale de los dos montos.</p>
                                </ResumenDato>
                            )}

                            {remesa.notas && (
                                <ResumenDato titulo="Notas" separado>
                                    <p className="text-sm">{remesa.notas}</p>
                                </ResumenDato>
                            )}

                            <ResumenDato titulo="Fecha y hora" separado>
                                <p className="text-sm font-medium">{formatearFecha(remesa.fecha_operacion)}</p>
                            </ResumenDato>

                            <ResumenDato titulo="Registrada por" separado>
                                <p className="text-sm font-medium">{remesa.user?.name ?? 'No especificado'}</p>
                                {remesa.user?.role && (
                                    <Badge variant="secondary" className="capitalize">
                                        {remesa.user.role}
                                    </Badge>
                                )}
                            </ResumenDato>

                            <ResumenDato titulo="Atendido por">
                                <p className="text-sm font-medium">
                                    {remesa.turno_vendedor?.nombre_vendedor ?? remesa.user?.name ?? 'No especificado'}
                                </p>
                            </ResumenDato>

                            <p className="text-muted-foreground border-t pt-3 text-xs">
                                Operación Múltiple #{remesa.id} · registrada el {new Date(remesa.created_at).toLocaleString('es-ES')}
                            </p>
                        </ResumenCard>
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
