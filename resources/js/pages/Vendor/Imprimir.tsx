import AppLogoIcon from '@/components/app-logo-icon';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';

interface ProductoImprimir {
    nombre: string;
    marca: string | null;
    modelo: string | null;
    categoria: string;
}

interface ItemImprimir {
    producto: ProductoImprimir;
    cantidad: number;
    subtotal: number;
}

interface DestinatarioImprimir {
    nombre: string;
    apellidos: string;
    carnet_identidad: string | null;
    telefono_contacto: string | null;
}

interface VentaImprimir {
    id: number;
    fecha: string;
    almacen: {
        nombre: string;
        ciudad: string | null;
        provincia: string | null;
    };
    usuario: {
        nombre: string;
    };
    destinatario: DestinatarioImprimir | null;
    items: ItemImprimir[];
    total: number;
    total_pagado: number;
    restante: number;
    moneda_principal: {
        codigo: string;
        simbolo: string | null;
    } | null;
}

interface Props {
    venta: VentaImprimir;
    qrCode: string;
}

export default function Imprimir({ venta, qrCode }: Props) {
    const codigo = venta.moneda_principal?.codigo || 'USD';

    const formatMonto = (monto: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: codigo, minimumFractionDigits: 2 }).format(monto);

    const formatFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const formatFechaCorta = (fecha: string) => new Date(fecha).toLocaleDateString('es-ES');

    const ubicacionAlmacen = [venta.almacen.ciudad, venta.almacen.provincia].filter(Boolean).join(', ');

    return (
        <>
            <Head title={`Imprimir Venta #${venta.id}`} />

            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    .no-print { display: none !important; }
                    .print-sheet { box-shadow: none !important; border: none !important; }
                    body { background: white !important; }
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

                {/* Media hoja A4 — Ticket + Factura de Venta lado a lado */}
                <div className="print-sheet mx-auto flex max-w-4xl divide-x divide-dashed divide-slate-400 rounded-md bg-white text-slate-900 shadow-lg print:divide-slate-500 print:rounded-none print:shadow-none">
                    {/* ── TICKET (angosto, para el vendedor) ── */}
                    <div className="w-[38%] shrink-0 p-4 font-mono text-[11px] leading-relaxed">
                        <div className="mb-2 border-b border-slate-300 pb-2 text-center">
                            <div className="mb-1 flex justify-center">
                                <AppLogoIcon />
                            </div>
                            <p className="text-sm font-bold">{venta.almacen.nombre}</p>
                            {ubicacionAlmacen && <p className="text-slate-500">{ubicacionAlmacen}</p>}
                            <p className="mt-1">No. Factura: {venta.id}</p>
                            <p>{formatFecha(venta.fecha)}</p>
                            <p>Vendedor: {venta.usuario.nombre}</p>
                        </div>

                        {venta.destinatario && (
                            <div className="mb-2 border-b border-slate-300 pb-2">
                                <p className="font-bold">
                                    {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                </p>
                                <p>CI: {venta.destinatario.carnet_identidad || '—'}</p>
                                <p>Tel: {venta.destinatario.telefono_contacto || '—'}</p>
                            </div>
                        )}

                        <div className="mb-2 border-b border-slate-300 pb-2">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-300">
                                        <th className="text-left font-semibold">Producto</th>
                                        <th className="text-center font-semibold">Cant</th>
                                        <th className="text-right font-semibold">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {venta.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="text-left">{item.producto.nombre}</td>
                                            <td className="text-center">{item.cantidad}</td>
                                            <td className="text-right">{formatMonto(item.subtotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <div className="flex justify-between font-bold">
                                <span>Total:</span>
                                <span>{formatMonto(venta.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Pagado:</span>
                                <span>{formatMonto(venta.total_pagado)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Restante:</span>
                                <span>{formatMonto(venta.restante)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── FACTURA DE VENTA (formal, para el cliente) ── */}
                    <div className="flex-1 p-4 text-[11px] leading-relaxed">
                        <div className="mb-2 flex items-start justify-between">
                            <div className="flex w-16 shrink-0 justify-start">
                                <AppLogoIcon />
                            </div>
                            <div className="flex-1 text-center">
                                <h1 className="text-lg font-bold tracking-wide">FACTURA DE VENTA</h1>
                                <p className="text-sm font-semibold">{venta.almacen.nombre}</p>
                                {ubicacionAlmacen && <p className="text-slate-500">{ubicacionAlmacen}</p>}
                            </div>
                            <img src={qrCode} alt="Código QR de la venta" className="h-16 w-16 shrink-0" />
                        </div>

                        <div className="mb-2 flex justify-between border-t border-b border-slate-300 py-1.5">
                            <span>Fecha Compra: {formatFechaCorta(venta.fecha)}</span>
                            <span>No. Factura: {venta.id}</span>
                        </div>

                        <div className="mb-2 border-b border-slate-300 pb-2">
                            <p>
                                Nombre Cliente: {venta.destinatario ? `${venta.destinatario.nombre} ${venta.destinatario.apellidos}` : '_'.repeat(30)}
                            </p>
                            <div className="mt-1 flex gap-4">
                                <span>CI: {venta.destinatario?.carnet_identidad || '_'.repeat(15)}</span>
                                <span>Teléfono: {venta.destinatario?.telefono_contacto || '_'.repeat(15)}</span>
                            </div>
                        </div>

                        <table className="mb-2 w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="border-y border-slate-400">
                                    <th className="border-r border-slate-300 px-1 py-1 text-center font-semibold">Cant</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-left font-semibold">Descripción del equipo</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-center font-semibold">Días Garantía</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-left font-semibold">Modelo</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-center font-semibold">No. Serie</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-center font-semibold">Sello</th>
                                    <th className="border-r border-slate-300 px-1 py-1 text-right font-semibold">Precio</th>
                                    <th className="px-1 py-1 text-right font-semibold">Sub.Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venta.items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="border-r border-slate-200 px-1 py-1 text-center">{item.cantidad}</td>
                                        <td className="border-r border-slate-200 px-1 py-1">
                                            {item.producto.nombre}
                                            {(item.producto.marca || item.producto.modelo) && (
                                                <span className="text-slate-500">
                                                    {' '}
                                                    ({[item.producto.marca, item.producto.modelo].filter(Boolean).join(' · ')})
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-r border-slate-200 px-1 py-1 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-1">{item.producto.modelo || ''}</td>
                                        <td className="border-r border-slate-200 px-1 py-1 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-1 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-1 text-right">
                                            {formatMonto(item.subtotal / item.cantidad)}
                                        </td>
                                        <td className="px-1 py-1 text-right">{formatMonto(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-slate-400">
                                    <td colSpan={7} className="px-1 py-1 text-right font-bold">
                                        TOTAL:
                                    </td>
                                    <td className="px-1 py-1 text-right font-bold">{formatMonto(venta.total)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-8 flex justify-around text-center">
                            <div>
                                <div className="w-40 border-t border-slate-500 pt-1">FIRMA VENDEDOR</div>
                            </div>
                            <div>
                                <div className="w-40 border-t border-slate-500 pt-1">FIRMA CLIENTE</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
