import AppLogoIcon from '@/components/app-logo-icon';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';

interface AlmacenImprimir {
    nombre: string;
    ciudad: string | null;
    provincia: string | null;
}

interface DetalleImprimir {
    id: number;
    producto: {
        nombre: string | null;
        marca: string | null;
        modelo: string | null;
        capacidad: string | null;
        color: string | null;
        codigo: string | null;
    };
    cantidad_enviada: number;
    cantidad_recibida: number | null;
    observaciones: string | null;
}

interface MovimientoImprimir {
    id: number;
    estado: string;
    es_evidencia: boolean;
    created_at: string;
    fecha_envio: string | null;
    fecha_recepcion: string | null;
    guia_transporte: string | null;
    transportista: string | null;
    observaciones: string | null;
    solicitado_por: string | null;
    enviado_por: string | null;
    recibido_por: string | null;
    almacen_origen: AlmacenImprimir;
    almacen_destino: AlmacenImprimir;
    detalles: DetalleImprimir[];
}

const ETIQUETA_ESTADO: Record<string, string> = {
    pendiente_confirmacion: 'Pendiente de envío',
    en_transito: 'En tránsito',
    recibido_parcial: 'Recibido parcial',
    recibido_completo: 'Recibido completo',
    rechazado: 'Rechazado',
    cancelado: 'Cancelado',
};

const formatFecha = (fecha: string | null) =>
    fecha
        ? new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : null;

const ubicacion = (almacen: AlmacenImprimir) => [almacen.ciudad, almacen.provincia].filter(Boolean).join(', ');

export default function ImprimirMovimiento({ movimiento }: { movimiento: MovimientoImprimir }) {
    const esEvidencia = movimiento.es_evidencia;
    const totalEnviado = movimiento.detalles.reduce((total, detalle) => total + detalle.cantidad_enviada, 0);
    const totalRecibido = movimiento.detalles.reduce((total, detalle) => total + (detalle.cantidad_recibida ?? 0), 0);

    // Un movimiento grande (100+ productos) no puede ocupar 6 páginas: con más de 12 productos las filas
    // se compactan (~8mm, aún suficiente para anotar a mano) y la letra baja un punto. Con pocos
    // productos se mantienen holgadas (~12mm), más cómodas para escribir.
    const compacto = movimiento.detalles.length > 12;
    const relleno = compacto ? 'py-0.5 text-[9px] leading-tight' : 'py-2';
    const tamanoCantidad = compacto ? 'text-[11px]' : 'text-sm';

    return (
        <>
            <Head title={`Hoja de Movimiento #${movimiento.id}`} />

            <style>{`
                @media print {
                    /* A diferencia de la factura (Vendor/Imprimir.tsx, una sola hoja con margin: 0), esta hoja
                       puede ocupar varias páginas si el movimiento tiene muchos productos: el margen tiene
                       que venir de @page para que TODAS las páginas lo tengan, no solo la primera. Si el
                       diálogo de impresión muestra fecha/URL arriba o abajo, se quita con "Encabezados y
                       pies de página" desactivado. */
                    @page {
                        size: A4 portrait;
                        margin: 12mm;
                        @top-left { content: "Movimiento No. ${movimiento.id}"; font-size: 8px; color: #64748b; }
                        @bottom-right { content: "Página " counter(page) " de " counter(pages); font-size: 8px; color: #64748b; }
                    }
                    .no-print { display: none !important; }
                    .print-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
                    body { background: white !important; }
                    thead { display: table-header-group; }
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
                                <h1 className="text-base font-bold tracking-wide uppercase">Hoja de Movimiento de Inventario</h1>
                                <p className="text-slate-600">
                                    {esEvidencia ? 'EVIDENCIA DE RECEPCIÓN' : 'COMPROBANTE DE ENVÍO — revisar y anotar lo recibido'}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold">No. {movimiento.id}</p>
                            <p className="text-slate-600">{ETIQUETA_ESTADO[movimiento.estado] ?? movimiento.estado}</p>
                        </div>
                    </div>

                    {/* Origen / Destino */}
                    <div className="mt-3 grid grid-cols-2 gap-4">
                        <div className="rounded border border-slate-400 p-2">
                            <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Origen (envía)</p>
                            <p className="text-sm font-bold">{movimiento.almacen_origen.nombre}</p>
                            {ubicacion(movimiento.almacen_origen) && <p className="text-slate-600">{ubicacion(movimiento.almacen_origen)}</p>}
                        </div>
                        <div className="rounded border border-slate-400 p-2">
                            <p className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">Destino (recibe)</p>
                            <p className="text-sm font-bold">{movimiento.almacen_destino.nombre}</p>
                            {ubicacion(movimiento.almacen_destino) && <p className="text-slate-600">{ubicacion(movimiento.almacen_destino)}</p>}
                        </div>
                    </div>

                    {/* Datos del envío */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                        <p>
                            <span className="font-semibold">Creado:</span> {formatFecha(movimiento.created_at)}
                        </p>
                        <p>
                            <span className="font-semibold">Solicitado por:</span> {movimiento.solicitado_por ?? '—'}
                        </p>
                        <p>
                            <span className="font-semibold">Enviado:</span> {formatFecha(movimiento.fecha_envio) ?? '________________'}
                        </p>
                        <p>
                            <span className="font-semibold">Enviado por:</span> {movimiento.enviado_por ?? '________________'}
                        </p>
                        <p>
                            <span className="font-semibold">Transportista:</span> {movimiento.transportista ?? '________________'}
                        </p>
                        <p>
                            <span className="font-semibold">Guía:</span> {movimiento.guia_transporte ?? '________________'}
                        </p>
                        {esEvidencia && (
                            <>
                                <p>
                                    <span className="font-semibold">Recibido:</span> {formatFecha(movimiento.fecha_recepcion) ?? '—'}
                                </p>
                                <p>
                                    <span className="font-semibold">Recibido por:</span> {movimiento.recibido_por ?? '—'}
                                </p>
                            </>
                        )}
                    </div>
                    {movimiento.observaciones && (
                        <p className="mt-1">
                            <span className="font-semibold">Observaciones:</span> {movimiento.observaciones}
                        </p>
                    )}

                    {/* Productos */}
                    <table className="mt-4 w-full border-collapse border border-slate-500">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="w-8 border border-slate-400 px-1 py-1 text-center font-semibold">#</th>
                                <th className="border border-slate-400 px-2 py-1 text-left font-semibold">Producto</th>
                                <th className="w-20 border border-slate-400 px-1 py-1 text-center font-semibold">Enviado</th>
                                <th className="w-24 border border-slate-400 px-1 py-1 text-center font-semibold">Recibido</th>
                                {esEvidencia && <th className="w-20 border border-slate-400 px-1 py-1 text-center font-semibold">Diferencia</th>}
                                <th className="w-40 border border-slate-400 px-2 py-1 text-left font-semibold">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movimiento.detalles.map((detalle, indice) => {
                                const diferencia = esEvidencia ? detalle.cantidad_enviada - (detalle.cantidad_recibida ?? 0) : 0;

                                const especificaciones =
                                    [detalle.producto.marca, detalle.producto.modelo, detalle.producto.capacidad, detalle.producto.color]
                                        .filter(Boolean)
                                        .join(' · ') + (detalle.producto.codigo ? ` — ${detalle.producto.codigo}` : '');

                                return (
                                    <tr key={detalle.id} className={compacto ? 'h-[8mm]' : ''}>
                                        <td className={`border border-slate-400 px-1 text-center ${relleno}`}>{indice + 1}</td>
                                        <td className={`border border-slate-400 px-2 ${relleno}`}>
                                            {compacto ? (
                                                <>
                                                    <span className="font-semibold">{detalle.producto.nombre}</span>{' '}
                                                    <span className="text-slate-600">{especificaciones}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="font-semibold">{detalle.producto.nombre}</div>
                                                    <div className="text-slate-600">{especificaciones}</div>
                                                </>
                                            )}
                                        </td>
                                        <td className={`border border-slate-400 px-1 text-center font-bold ${relleno} ${tamanoCantidad}`}>
                                            {detalle.cantidad_enviada}
                                        </td>
                                        <td className={`border border-slate-400 px-1 text-center font-bold ${relleno} ${tamanoCantidad}`}>
                                            {esEvidencia ? detalle.cantidad_recibida : ''}
                                        </td>
                                        {esEvidencia && (
                                            <td
                                                className={`border border-slate-400 px-1 text-center font-bold ${relleno} ${tamanoCantidad} ${diferencia !== 0 ? 'text-red-700' : ''}`}
                                            >
                                                {diferencia}
                                            </td>
                                        )}
                                        <td className={`border border-slate-400 px-2 text-slate-700 ${relleno}`}>{detalle.observaciones ?? ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 font-bold">
                                <td colSpan={2} className="border border-slate-400 px-2 py-1 text-right">
                                    TOTAL DE UNIDADES
                                </td>
                                <td className="border border-slate-400 px-1 py-1 text-center">{totalEnviado}</td>
                                <td className="border border-slate-400 px-1 py-1 text-center">{esEvidencia ? totalRecibido : ''}</td>
                                {esEvidencia && <td className="border border-slate-400 px-1 py-1 text-center">{totalEnviado - totalRecibido}</td>}
                                <td className="border border-slate-400 px-1 py-1"></td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Firmas */}
                    <div className="mt-16 grid break-inside-avoid grid-cols-2 gap-16 text-center">
                        <div>
                            <div className="border-t border-slate-600 pt-1 font-semibold">ENTREGA / ENVÍA</div>
                            <div className="text-slate-600">{movimiento.enviado_por ?? ''}</div>
                        </div>
                        <div>
                            <div className="border-t border-slate-600 pt-1 font-semibold">RECIBE CONFORME</div>
                            <div className="text-slate-600">{esEvidencia ? (movimiento.recibido_por ?? '') : ''}</div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
