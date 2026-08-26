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

// Términos y condiciones de garantía — fijos para toda la empresa, no dependen de la venta
// ni del almacén (confirmado con el cliente: un solo lugar central atiende los reclamos).
const CLAUSULAS_GARANTIA = [
    'La alteración o falta de información anula este certificado.',
    'La falta o violación del sello de seguridad invalida este certificado.',
    'El tiempo establecido para la revisión y/o solución al problema presentado es: para equipos pequeños de 10 a 15 días hábiles y para equipos grandes de 15 a 30 días hábiles, en dependencia de la envergadura del equipo.',
    'Esta garantía no es transferible.',
    'Esta garantía no representa un cambio del producto de primera instancia, sino la revisión y solución al problema presentado por el mismo.',
    'En caso de que el equipo no pueda ser reparado, la empresa podrá, cajas y accesorios.',
    'Esta garantía aplica en productos devueltos en sus cajas y accesorios.',
    'El cliente debe presentar factura fiscal o recibo de compra y el certificado de garantía al momento de realizar un reclamo en la tienda del vendedor, completamente llenado, firmado o sellado por el vendedor.',
    'La garantía cubre únicamente defectos de fabricación o funcionamiento del equipo. No cubre golpes, roturas, desgaste normal, consumibles ni componentes sujetos a deterioro por uso. En los equipos que incorporen baterías y/o Sistema de Gestión de Batería (BMS), estos componentes quedan expresamente excluidos de la garantía. La garantía aplicará únicamente al resto de los componentes del equipo.',
    'La garantía está respaldada por nuestras tiendas y talleres técnicos asociados a nuestras tiendas.',
    'Las instalaciones, cuando se requieren (auto estéreos, plantas eléctricas, etc.), deberán ser realizadas por personal idóneo, capacitado y de acuerdo al manual de operación y diagrama de instalación.',
    'Los aires acondicionados deben ser instalados por centros de servicios autorizados o personal técnico especializado.',
    'Todo producto que utilice combustible debe ser revisado en los talleres.',
    'No aplica a esta garantía daños ocasionados por fuerza mayor, tales como incendios, inundaciones, terremotos, tormentas, rayos, etc.',
    'No aplica esta garantía a daños ocasionados por accidentes, animales, golpes, transporte, cambios de ubicación, derrame de líquidos o fluidos o uso de cintas y otros accesorios de inferior calidad.',
    'Los equipos que requieran operar con electricidad para estar cubiertos por esta garantía deben estar protegidos con protectores de voltaje, debidamente instalados a fin de evitar daños en sus componentes electrónicos.',
    'No aplican a esta garantía los daños ocasionados por fluctuaciones de voltaje AC de la red eléctrica doméstica, anomalías al suministro regular, conexiones a la red AC distintas a las indicadas en el equipo, descargas eléctricas, conexiones a redes eléctricas defectuosas, mala instalación y/o manipulación de los mismos.',
    'No aplica esta garantía a daños por obstrucción de bombas a consecuencia de monedas, objetos y/o sedimentos de tierra que impidan el adecuado funcionamiento de este equipo.',
    'El gasto de mantenimiento preventivo que requieran los equipos, en especial los equipos de clima, no está cubierto dentro de esta garantía.',
    'La falta comprobada de mantenimiento preventivo adecuado de los equipos, previsto en su Manual de Uso y Cuidado, deja sin efecto la garantía.',
    'Los equipos de clima requieren que se realice al menos cada 6 meses mantenimiento preventivo.',
    'No aplica a esta garantía los daños causados por la instalación o reparación del equipo por personas no autorizadas.',
    'No aplica a esta garantía cuando el funcionamiento inapropiado del equipo se debe a negligencia, mal uso del mismo o sea utilizado para fines distintos al uso doméstico.',
    'Si el serial del producto está alterado o removido, dejará sin efecto la garantía.',
    'No están cubiertos por garantía micrófonos, control remoto, control de juegos, cornetas, memorias USB, transformadores, partes plásticas, adaptadores o fuentes de voltaje y piezas sujetas al desgaste normal por uso.',
    'Las cornetas para carros y bocinas no tienen garantía.',
    'No están cubiertos por esta garantía los daños ocasionados por humedad, corrosión, oxidación, salinidad, filtraciones de agua, condensación excesiva o exposición del equipo a ambientes inadecuados.',
    'La garantía no cubre configuraciones de software, actualizaciones, instalación de aplicaciones, pérdida de información, restauración de datos, desbloqueos, ni incompatibilidades con aplicaciones, dispositivos o servicios de terceros.',
    'Una vez entregado el producto al cliente o recibido conforme en el domicilio indicado, cualquier daño ocasionado por transporte, manipulación posterior, traslado, almacenamiento inadecuado o uso indebido será responsabilidad exclusiva del cliente.',
    'Si durante la evaluación técnica no se detecta ninguna falla cubierta por la garantía o se determina que el funcionamiento del equipo es normal, el producto será devuelto al cliente sin que proceda reparación, sustitución o compensación alguna.',
    'Los equipos reparados, sustituidos o evaluados bajo garantía deberán ser retirados por el cliente dentro de los treinta (30) días calendario posteriores a la notificación de disponibilidad. Transcurrido dicho plazo, la empresa podrá aplicar cargos por almacenamiento o disponer del equipo de conformidad con la legislación aplicable.',
];

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
                    <div className="w-[38%] shrink-0 p-3 font-mono text-[9px] leading-snug">
                        <div className="mb-1.5 border-b border-slate-300 pb-1.5 text-center">
                            <div className="mb-0.5 flex justify-center [&_img]:!h-9 [&_img]:!w-9">
                                <AppLogoIcon />
                            </div>
                            <p className="text-xs font-bold">{venta.almacen.nombre}</p>
                            {ubicacionAlmacen && <p className="text-slate-500">{ubicacionAlmacen}</p>}
                            <p className="mt-0.5">No. Factura: {venta.id}</p>
                            <p>{formatFecha(venta.fecha)}</p>
                            <p>Vendedor: {venta.usuario.nombre}</p>
                        </div>

                        {venta.destinatario && (
                            <div className="mb-1.5 border-b border-slate-300 pb-1.5">
                                <p className="font-bold">
                                    {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                </p>
                                <p>CI: {venta.destinatario.carnet_identidad || '—'}</p>
                                <p>Tel: {venta.destinatario.telefono_contacto || '—'}</p>
                            </div>
                        )}

                        <div className="mb-1.5 border-b border-slate-300 pb-1.5">
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
                    <div className="flex-1 p-3 text-[9px] leading-snug">
                        <div className="mb-1.5 flex items-start justify-between">
                            <div className="flex w-12 shrink-0 justify-start [&_img]:!h-9 [&_img]:!w-9">
                                <AppLogoIcon />
                            </div>
                            <div className="flex-1 text-center">
                                <h1 className="text-sm font-bold tracking-wide">FACTURA DE VENTA</h1>
                                <p className="text-xs font-semibold">{venta.almacen.nombre}</p>
                                {ubicacionAlmacen && <p className="text-slate-500">{ubicacionAlmacen}</p>}
                            </div>
                            <img src={qrCode} alt="Código QR de la venta" className="h-12 w-12 shrink-0" />
                        </div>

                        <div className="mb-1.5 flex justify-between border-t border-b border-slate-300 py-1">
                            <span>Fecha Compra: {formatFechaCorta(venta.fecha)}</span>
                            <span>No. Factura: {venta.id}</span>
                        </div>

                        <div className="mb-1.5 border-b border-slate-300 pb-1.5">
                            <p>
                                Nombre Cliente: {venta.destinatario ? `${venta.destinatario.nombre} ${venta.destinatario.apellidos}` : '_'.repeat(30)}
                            </p>
                            <div className="mt-0.5 flex gap-4">
                                <span>CI: {venta.destinatario?.carnet_identidad || '_'.repeat(15)}</span>
                                <span>Teléfono: {venta.destinatario?.telefono_contacto || '_'.repeat(15)}</span>
                            </div>
                        </div>

                        <table className="mb-1.5 w-full border-collapse text-[8px]">
                            <thead>
                                <tr className="border-y border-slate-400">
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-center font-semibold">Cant</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-left font-semibold">Descripción del equipo</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-center font-semibold">Días Garantía</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-left font-semibold">Modelo</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-center font-semibold">No. Serie</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-center font-semibold">Sello</th>
                                    <th className="border-r border-slate-300 px-1 py-0.5 text-right font-semibold">Precio</th>
                                    <th className="px-1 py-0.5 text-right font-semibold">Sub.Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venta.items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="border-r border-slate-200 px-1 py-0.5 text-center">{item.cantidad}</td>
                                        <td className="border-r border-slate-200 px-1 py-0.5">
                                            {item.producto.nombre}
                                            {(item.producto.marca || item.producto.modelo) && (
                                                <span className="text-slate-500">
                                                    {' '}
                                                    ({[item.producto.marca, item.producto.modelo].filter(Boolean).join(' · ')})
                                                </span>
                                            )}
                                        </td>
                                        <td className="border-r border-slate-200 px-1 py-0.5 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-0.5">{item.producto.modelo || ''}</td>
                                        <td className="border-r border-slate-200 px-1 py-0.5 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-0.5 text-center"></td>
                                        <td className="border-r border-slate-200 px-1 py-0.5 text-right">
                                            {formatMonto(item.subtotal / item.cantidad)}
                                        </td>
                                        <td className="px-1 py-0.5 text-right">{formatMonto(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-slate-400">
                                    <td colSpan={7} className="px-1 py-0.5 text-right font-bold">
                                        TOTAL:
                                    </td>
                                    <td className="px-1 py-0.5 text-right font-bold">{formatMonto(venta.total)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className="mt-3 flex justify-around text-center">
                            <div>
                                <div className="w-32 border-t border-slate-500 pt-0.5">FIRMA VENDEDOR</div>
                            </div>
                            <div>
                                <div className="w-32 border-t border-slate-500 pt-0.5">FIRMA CLIENTE</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── PÁGINA 2 — Reverso: garantía (fija, misma para toda la empresa) ── */}
                <div className="print-sheet mx-auto mt-8 max-w-4xl bg-white p-2 text-slate-900 shadow-lg print:mt-0 print:rounded-none print:shadow-none print:break-before-page">
                    <h2 className="mb-1 text-center text-[10px] font-bold tracking-wide">TÉRMINOS Y CONDICIONES DE GARANTÍA</h2>
                    <div className="columns-2 gap-4 text-[7px] leading-[1.15] text-slate-700 [column-rule:1px_solid_#e2e8f0]">
                        {CLAUSULAS_GARANTIA.map((clausula, index) => (
                            <p key={index} className="mb-0.5 break-inside-avoid">
                                <span className="font-semibold">{index + 1}. </span>
                                {clausula}
                            </p>
                        ))}
                    </div>

                    <div className="mt-1.5 border border-slate-300 bg-slate-50 p-1 text-[7px] leading-[1.15] text-slate-700">
                        <span className="font-semibold">Nota:</span> El horario de atención a clientes para evaluación de equipos en garantía
                        es de 9:00 a.m. a 2:00 p.m. de lunes a sábado en la tienda ubicada en Dr. Codina 110 / Martí y Mártires de Vietnam
                        (DIVEP).
                    </div>

                    <div className="mt-1.5 text-center text-[8px] font-bold tracking-wide">CLÁUSULA DE ACEPTACIÓN</div>
                    <p className="text-center text-[7px] leading-[1.15] text-slate-700">
                        La compra, recepción, uso o aceptación del producto por parte del cliente implica la aceptación total de los
                        presentes términos y condiciones de garantía, así como de todas sus limitaciones, exclusiones y procedimientos.
                    </p>

                    <div className="mt-1.5 border border-slate-300 p-1 text-[7px] leading-[1.15] text-slate-700">
                        <span className="font-semibold">Importante:</span> El cliente debe revisar cuidadosamente el producto comprado,
                        verificando que no presente golpes, rayones, plásticos partidos, falta de componentes o accesorios, entre otros.
                        Una vez retirado de la tienda o aceptada su entrega a domicilio, no se aceptarán reclamos relacionados con estos
                        conceptos ni por considerar que el equipo no cumple con sus expectativas.
                    </div>
                </div>
            </div>
        </>
    );
}
