import AppLogoIcon from '@/components/app-logo-icon';
import { formatear } from '@/components/transacciones/entidad';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';

interface CuentaImprimir {
    nombre: string;
    moneda: string | null;
    responsables?: string[];
}

interface EnvioImprimir {
    id: number;
    estado: string;
    es_evidencia: boolean;
    monto: number;
    moneda: string;
    monto_destino: number;
    moneda_destino: string;
    tasa_cambio_aplicada: number | null;
    comentario: string | null;
    monto_recibido: number | null;
    diferencia: number;
    diferencia_por_resolver: boolean;
    diferencia_nota: string | null;
    fecha_envio: string | null;
    fecha_confirmacion: string | null;
    enviado_por: string | null;
    confirmado_por: string | null;
    motivo_cierre: { observaciones: string | null; usuario: string | null } | null;
    cuenta_origen: CuentaImprimir;
    cuenta_destino: CuentaImprimir;
}

const ETIQUETA_ESTADO: Record<string, string> = {
    en_transito: 'En tránsito',
    recibido: 'Recibido completo',
    recibido_parcial: 'Recibido con diferencia',
    rechazado: 'Rechazado',
    anulado: 'Anulado',
};

const formatFecha = (fecha: string | null) =>
    fecha
        ? new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : null;

const LINEA = '________________';

export default function ImprimirEnvio({ envio }: { envio: EnvioImprimir }) {
    const recibido = envio.estado === 'recibido' || envio.estado === 'recibido_parcial';
    const cerradoSinRecibir = envio.estado === 'rechazado' || envio.estado === 'anulado';
    const cambioDeMoneda = envio.moneda !== envio.moneda_destino;

    return (
        <>
            <Head title={`Hoja de Envío #${envio.id}`} />

            <style>{`
                @media print {
                    /* Mismo criterio que la hoja de Movimientos: el margen viene de @page para que todas las páginas lo tengan. */
                    @page {
                        size: A4 portrait;
                        margin: 12mm;
                        @top-left { content: "Envío de dinero No. ${envio.id}"; font-size: 8px; color: #64748b; }
                        @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 8px; color: #64748b; }
                    }
                    .no-print { display: none !important; }
                    .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
                    body { background: white !important; }
                    tr { break-inside: avoid; }
                }
            `}</style>

            <div className="min-h-screen bg-slate-200 py-8 dark:bg-slate-900 print:bg-white print:py-0">
                <div className="no-print mx-auto mb-4 flex max-w-4xl items-center justify-between px-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Vista de impresión — usá Ctrl+P (o Cmd+P) para imprimir o guardar como PDF.
                    </p>
                    <button
                        onClick={() => window.print()}
                        className="flex cursor-pointer items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                    >
                        <Printer size={16} />
                        Imprimir / Guardar PDF
                    </button>
                </div>

                <div className="print-sheet mx-auto w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-lg">
                    {/* Encabezado */}
                    <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="[&_img]:!h-12 [&_img]:!w-12">
                                <AppLogoIcon />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-wide uppercase">Hoja de Envío de Dinero</h1>
                                <p className="text-slate-600">
                                    {envio.es_evidencia ? 'EVIDENCIA DEL ENVÍO' : 'COMPROBANTE DE ENVÍO — anotar lo recibido al contar el dinero'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold">No. {envio.id}</p>
                            <p className="text-slate-600">{ETIQUETA_ESTADO[envio.estado] ?? envio.estado}</p>
                        </div>
                    </div>

                    {/* Origen / Destino */}
                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <div className="rounded border border-slate-400 p-2">
                            <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Sale de (envía)</p>
                            <p className="text-sm font-bold">{envio.cuenta_origen.nombre}</p>
                            {envio.cuenta_origen.moneda && <p className="text-slate-600">{envio.cuenta_origen.moneda}</p>}
                        </div>
                        <div className="rounded border border-slate-400 p-2">
                            <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Llega a (recibe)</p>
                            <p className="text-sm font-bold">{envio.cuenta_destino.nombre}</p>
                            {envio.cuenta_destino.moneda && <p className="text-slate-600">{envio.cuenta_destino.moneda}</p>}
                            {envio.cuenta_destino.responsables && envio.cuenta_destino.responsables.length > 0 && (
                                <p className="text-slate-600">Responsable: {envio.cuenta_destino.responsables.join(', ')}</p>
                            )}
                        </div>
                    </div>

                    {/* Monto */}
                    <div className="mt-3 rounded border-2 border-slate-800 p-3 text-center">
                        <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Monto enviado</p>
                        <p className="text-2xl font-black tabular-nums">
                            {formatear(envio.monto)} {envio.moneda}
                        </p>
                        {cambioDeMoneda && (
                            <p className="text-slate-600">
                                A acreditar: {formatear(envio.monto_destino)} {envio.moneda_destino}
                                {envio.tasa_cambio_aplicada ? ` (tasa ${formatear(envio.tasa_cambio_aplicada)})` : ''}
                            </p>
                        )}
                    </div>

                    {/* Datos del envío */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>
                            <span className="font-semibold">Enviado:</span> {formatFecha(envio.fecha_envio) ?? LINEA}
                        </p>
                        <p>
                            <span className="font-semibold">Enviado por:</span> {envio.enviado_por ?? LINEA}
                        </p>
                        {recibido && (
                            <>
                                <p>
                                    <span className="font-semibold">Confirmado:</span> {formatFecha(envio.fecha_confirmacion) ?? '—'}
                                </p>
                                <p>
                                    <span className="font-semibold">Confirmado por:</span> {envio.confirmado_por ?? '—'}
                                </p>
                            </>
                        )}
                        {cerradoSinRecibir && (
                            <>
                                <p>
                                    <span className="font-semibold">{envio.estado === 'rechazado' ? 'Rechazado' : 'Anulado'}:</span>{' '}
                                    {formatFecha(envio.fecha_confirmacion) ?? '—'}
                                </p>
                                <p>
                                    <span className="font-semibold">Por:</span> {envio.motivo_cierre?.usuario ?? '—'}
                                </p>
                            </>
                        )}
                    </div>
                    {envio.comentario && (
                        <p className="mt-1">
                            <span className="font-semibold">Comentario:</span> {envio.comentario}
                        </p>
                    )}
                    {cerradoSinRecibir && envio.motivo_cierre?.observaciones && (
                        <p className="mt-1">
                            <span className="font-semibold">Motivo:</span> {envio.motivo_cierre.observaciones}
                        </p>
                    )}

                    {/* Recepción */}
                    {!cerradoSinRecibir && (
                        <table className="mt-4 w-full border-collapse border border-slate-500">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="border border-slate-400 px-2 py-1 text-center font-semibold">Enviado</th>
                                    <th className="border border-slate-400 px-2 py-1 text-center font-semibold">Recibido</th>
                                    <th className="border border-slate-400 px-2 py-1 text-center font-semibold">Diferencia</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="h-[14mm]">
                                    <td className="border border-slate-400 px-2 text-center text-sm font-bold tabular-nums">
                                        {formatear(envio.monto)} {envio.moneda}
                                    </td>
                                    <td className="border border-slate-400 px-2 text-center text-sm font-bold tabular-nums">
                                        {recibido && envio.monto_recibido !== null ? `${formatear(envio.monto_recibido)} ${envio.moneda}` : ''}
                                    </td>
                                    <td
                                        className={`border border-slate-400 px-2 text-center text-sm font-bold tabular-nums ${envio.diferencia > 0 ? 'text-red-700' : ''}`}
                                    >
                                        {recibido ? `${formatear(envio.diferencia)} ${envio.moneda}` : ''}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}

                    {recibido && envio.diferencia > 0 && (
                        <p className="mt-2">
                            <span className="font-semibold">Diferencia:</span>{' '}
                            {envio.diferencia_por_resolver
                                ? 'por resolver.'
                                : envio.diferencia_nota
                                  ? `resuelta — ${envio.diferencia_nota}`
                                  : 'resuelta.'}
                        </p>
                    )}

                    {!envio.es_evidencia && (
                        <div className="mt-4">
                            <p className="font-semibold">Observaciones:</p>
                            <div className="mt-1 h-[22mm] rounded border border-slate-400" />
                        </div>
                    )}

                    {/* Firmas */}
                    <div className="mt-16 grid break-inside-avoid grid-cols-2 gap-16 text-center">
                        <div>
                            <div className="border-t border-slate-600 pt-1 font-semibold">ENTREGA / ENVÍA</div>
                            <div className="text-slate-600">{envio.enviado_por ?? ''}</div>
                        </div>
                        <div>
                            <div className="border-t border-slate-600 pt-1 font-semibold">RECIBE CONFORME</div>
                            <div className="text-slate-600">{recibido ? (envio.confirmado_por ?? '') : ''}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
