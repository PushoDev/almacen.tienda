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

    // La mitad de página está pensada para el caso normal de hasta 5 productos —
    // con ese tope se ve cómoda y siempre sale del mismo tamaño. Si una venta
    // puntual tiene más, se compacta un poco para seguir cabiendo en la misma
    // media hoja en vez de desbordar a una hoja completa.
    const esComoda = venta.items.length <= 5;
    const tallaTicket = esComoda ? 'text-[10px]' : 'text-[9px]';
    const tallaFactura = esComoda ? 'text-[10px]' : 'text-[9px]';
    const tallaTablaFactura = esComoda ? 'text-[9px]' : 'text-[8px]';
    const filaFactura = esComoda ? 'px-1 py-1' : 'px-1 py-0.5';

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

    const ubicacionAlmacen = [venta.almacen.ciudad, venta.almacen.provincia].filter(Boolean).join(', ');

    // Ticket + Factura se repiten dos veces en la misma hoja (una para el cliente, otra
    // para que se quede en el punto de venta como comprobante/garantía) — mismo contenido,
    // sin variar por copia, así que se arma una sola vez acá y se reutiliza abajo.
    const contenidoTicketFactura = (
        <div className="flex divide-x divide-dashed divide-slate-400 print:divide-slate-500">
            {/* ── TICKET (angosto, resumen rápido) ── */}
            <div className={`relative w-[38%] shrink-0 p-3 font-mono leading-snug ${tallaTicket}`}>
                {/* QR movido a la Factura (2026-08-28), entre las firmas — este header
                    vuelve a ser texto centrado simple, sin necesitar el espacio de balance
                    que pedía la columna del QR. */}
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

                {/* Datos del cliente — con guiones bajos para llenar a mano cuando no hay
                    destinatario capturado. */}
                <div className="mb-1.5 border-b border-slate-300 pb-1.5">
                    <p>Cliente: {venta.destinatario ? `${venta.destinatario.nombre} ${venta.destinatario.apellidos}` : '_'.repeat(20)}</p>
                    <p>CI: {venta.destinatario?.carnet_identidad || '_'.repeat(12)}</p>
                    <p>Tel: {venta.destinatario?.telefono_contacto || '_'.repeat(12)}</p>
                </div>

                <div className="mb-1.5 min-h-[32mm] border-b border-slate-300 pb-1.5">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-300">
                                <th className="text-left font-semibold">Producto</th>
                                <th className="text-center font-semibold">Cant</th>
                                <th className="text-right font-semibold">Precio</th>
                                <th className="text-right font-semibold">Sub.Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {venta.items.map((item, index) => (
                                <tr key={index}>
                                    <td className="text-left">{item.producto.nombre}</td>
                                    <td className="text-center">{item.cantidad}</td>
                                    <td className="text-right">{formatMonto(item.subtotal / item.cantidad)}</td>
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

            {/* ── FACTURA DE VENTA (formal, con la garantía en la Página 2) ──
                Header (mascota/título/almacén/fecha/no.factura) quitado (2026-08-28) — esa
                identificación ya está completa en el Ticket de al lado, y sacarla de acá le
                da todo ese margen a la tabla. La marca de agua SÍ se restauró (pedido
                explícito) — sigue detrás de la tabla, sin ocupar espacio real del layout. */}
            <div className={`relative flex-1 p-3 leading-snug ${tallaFactura}`}>
                {/* Marca de agua — va primero en el DOM y sin z-index propio, así el
                    contenido real (envuelto abajo en un `relative`) siempre pinta encima. */}
                <img
                    src="/projects/mascota/mascota.webp"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2 bottom-2 h-48 w-48 opacity-25 select-none"
                />
                <div className="relative">
                    {/* Precio/Sub.Total quitados (2026-08-28) — ya están en el Ticket. Modelo
                    queda en blanco como Días Garantía/No.Serie/Sello (llenado a mano); ese
                    espacio liberado se usa para ensanchar No. Serie y Sello, que a menudo
                    llevan datos/escritura larga. table-fixed + colgroup para que los anchos
                    se respeten de verdad. */}
                    <table className={`mb-1.5 min-h-[32mm] w-full table-fixed border-collapse border border-slate-400 align-top ${tallaTablaFactura}`}>
                        <colgroup>
                            <col className="w-[7%]" />
                            <col className="w-[33%]" />
                            <col className="w-[10%]" />
                            <col className="w-[12%]" />
                            <col className="w-[20%]" />
                            <col className="w-[18%]" />
                        </colgroup>
                        <thead>
                            <tr className="border-y border-slate-400">
                                <th className={`border-r border-slate-300 text-center font-semibold ${filaFactura}`}>Cant</th>
                                <th className={`border-r border-slate-300 text-left font-semibold ${filaFactura}`}>Descripción del equipo</th>
                                <th className={`border-r border-slate-300 text-center font-semibold ${filaFactura}`}>Días Garantía</th>
                                <th className={`border-r border-slate-300 text-left font-semibold ${filaFactura}`}>Modelo</th>
                                <th className={`border-r border-slate-300 text-center font-semibold ${filaFactura}`}>No. Serie</th>
                                <th className={`text-center font-semibold ${filaFactura}`}>Sello</th>
                            </tr>
                        </thead>
                        <tbody>
                            {venta.items.map((item, index) => (
                                <tr key={index} className="border-b border-slate-200">
                                    <td className={`border-r border-slate-200 text-center ${filaFactura}`}>{item.cantidad}</td>
                                    <td className={`border-r border-slate-200 ${filaFactura}`}>
                                        {item.producto.nombre}
                                        {(item.producto.marca || item.producto.modelo) && (
                                            <div className="text-slate-500">
                                                ({[item.producto.marca, item.producto.modelo].filter(Boolean).join(' · ')})
                                            </div>
                                        )}
                                    </td>
                                    <td className={`border-r border-slate-200 text-center ${filaFactura}`}></td>
                                    <td className={`border-r border-slate-200 ${filaFactura}`}></td>
                                    <td className={`border-r border-slate-200 text-center ${filaFactura}`}></td>
                                    <td className={`text-center ${filaFactura}`}></td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-slate-400">
                                <td colSpan={6} className={`text-right font-bold ${filaFactura}`}>
                                    TOTAL: {formatMonto(venta.total)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="mt-24 flex items-end justify-around text-center">
                        <div>
                            <div className="w-32 border-t border-slate-500 pt-0.5">FIRMA VENDEDOR</div>
                        </div>
                        {/* QR movido acá (2026-08-28) — antes vivía en el header del Ticket,
                            quedaba descentrado; en el medio de las firmas deja el header del
                            Ticket volver a ser texto simple centrado. */}
                        <div className="flex flex-col items-center gap-0.5">
                            <img src={qrCode} alt="Código QR de la venta" className="h-12 w-12" />
                            <p className="text-center text-[6px] leading-none text-slate-500">Escaneá para verificar</p>
                        </div>
                        <div>
                            <div className="w-32 border-t border-slate-500 pt-0.5">FIRMA CLIENTE</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Las 31 cláusulas de garantía se repiten igual que el Ticket/Factura — misma copia
    // arriba y abajo, para que cada mitad de la hoja tenga su propio reverso completo.
    const contenidoGarantia = (
        <div className="relative">
            <div className="columns-3 gap-3 text-[9px] leading-[1.2] text-slate-700 [column-rule:1px_solid_#e2e8f0]">
                {CLAUSULAS_GARANTIA.map((clausula, index) => (
                    <p key={index} className="mb-0.5 break-inside-avoid">
                        <span className="font-semibold">{index + 1}. </span>
                        {clausula}
                    </p>
                ))}

                {/* Aceptación fluye dentro de las mismas 3 columnas, igual que en la
                plantilla real — ocupa el espacio que sobra en la última columna en
                vez de agregar un bloque a todo el ancho debajo, que desperdicia
                espacio vertical.
                Nota de horario/dirección quitada (2026-08-28): cada almacén tiene su
                propia dirección, un texto fijo hardcodeado a una sola tienda era
                incorrecto para el resto. */}
                <div className="mb-1 break-inside-avoid">
                    <div className="font-bold underline">CLÁUSULA DE ACEPTACIÓN</div>
                    <p>
                        La compra, recepción, uso o aceptación del producto por parte del cliente implica la aceptación total de
                        los presentes términos y condiciones de garantía, así como de todas sus limitaciones, exclusiones y
                        procedimientos.
                    </p>
                </div>
            </div>

            <div className="mt-1.5 border border-slate-300 p-1 text-[9px] leading-[1.2] text-slate-700">
                <span className="font-semibold">Importante:</span> El cliente debe revisar cuidadosamente el producto comprado,
                verificando que no presente golpes, rayones, plásticos partidos, falta de componentes o accesorios, entre otros.
                Una vez retirado de la tienda o aceptada su entrega a domicilio, no se aceptarán reclamos relacionados con estos
                conceptos ni por considerar que el equipo no cumple con sus expectativas.
            </div>
        </div>
    );

    return (
        <>
            <Head title={`Imprimir Venta #${venta.id}`} />

            <style>{`
                @media print {
                    /* margin: 0 a propósito — con cualquier margen > 0 en @page, Chrome reserva esa
                       franja para dibujar su encabezado/pie nativos (fecha/hora, título, URL, número
                       de página) si el usuario tiene esa opción activada en el diálogo de impresión,
                       lo que le roba espacio real a la media hoja. Con margin: 0 no hay franja donde
                       dibujarlos y Chrome los omite — el inset visual de 10mm lo recreamos nosotros
                       con padding en cada print-sheet (ver Página 1 y Página 2 más abajo). */
                    @page { size: A4 portrait; margin: 0; }
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

                {/* Hoja A4 completa — Ticket + Factura repetidos dos veces, una copia arriba
                    y otra abajo, para que al cortar por la línea del medio salgan dos copias
                    idénticas: una se la lleva el cliente, la otra se queda en el punto de venta
                    como comprobante/garantía (pedido explícito del cliente 2026-09-05).
                    Cada copia va con position:absolute + un offset fijo en mm desde el tope de
                    este contenedor — no en flujo normal apilado una debajo de la otra — así
                    ninguna depende de que la copia de arriba realmente termine midiendo 148.5mm
                    en el motor de impresión real de Chrome (ver [[reference_chrome_print_minheight_overflow_bug]]:
                    un contenedor flex con min-height puede salir más corto en el PDF real que en
                    pantalla). Ancladas por posición y no por altura medida, la copia de abajo
                    siempre cae exactamente en la mitad física de la hoja, sin importar si la de
                    arriba se quedó corta. */}
                <div className="print-sheet relative mx-auto min-h-[297mm] max-w-4xl rounded-md bg-white text-slate-900 shadow-lg print:rounded-none print:shadow-none">
                    {/* Línea de corte física, a la mitad exacta de la hoja A4 — separa las dos
                        copias idénticas de arriba y de abajo. */}
                    <div className="pointer-events-none absolute inset-x-0 top-[148.5mm] border-t-2 border-dashed border-red-500" />
                    <span className="no-print pointer-events-none absolute top-[148.5mm] right-1 -translate-y-1/2 bg-white px-1 text-[7px] font-semibold text-red-500">
                        ✂ línea de corte — cliente arriba, punto de venta abajo
                    </span>

                    {/* Copia 1 — para el cliente */}
                    <div className="absolute inset-x-0 top-0 h-[148.5mm] print:p-[10mm]">
                        <div className="mt-[21mm]">{contenidoTicketFactura}</div>
                    </div>

                    {/* Copia 2 — para el punto de venta */}
                    <div className="absolute inset-x-0 top-[148.5mm] h-[148.5mm] print:p-[10mm]">
                        <div className="mt-[21mm]">{contenidoTicketFactura}</div>
                    </div>
                </div>

                {/* ── PÁGINA 2 — Reverso: garantía, también repetida dos veces (misma razón
                    que la Página 1: cada copia física — cliente arriba, punto de venta abajo —
                    necesita su propio reverso completo, no solo la de arriba). @page ya no da
                    margen (ver arriba) — este print-sheet arranca justo en el borde físico de la
                    hoja, así que su propio top ya ES el 0mm físico de esta página. */}
                <div className="print-sheet relative mx-auto mt-8 min-h-[297mm] max-w-4xl bg-white text-slate-900 shadow-lg print:mt-0 print:rounded-none print:shadow-none print:break-before-page">
                    {/* Línea de corte — misma posición y misma razón que en la Página 1. */}
                    <div className="pointer-events-none absolute inset-x-0 top-[148.5mm] border-t-2 border-dashed border-red-500" />
                    <span className="no-print pointer-events-none absolute top-[148.5mm] right-1 -translate-y-1/2 bg-white px-1 text-[7px] font-semibold text-red-500">
                        ✂ línea de corte — cliente arriba, punto de venta abajo
                    </span>

                    {/* Copia 1 — reverso de la copia del cliente */}
                    <div className="absolute inset-x-0 top-0 h-[148.5mm] print:p-[10mm]">
                        {/* Marca de agua central — opacity-20 (2026-08-28, antes 10) porque en la
                            impresión real casi no se veía; el texto de garantía tiene que seguir
                            siendo legible encima. */}
                        <img
                            src="/projects/mascota/mascota.webp"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 opacity-20 select-none"
                        />
                        {contenidoGarantia}
                    </div>

                    {/* Copia 2 — reverso de la copia del punto de venta */}
                    <div className="absolute inset-x-0 top-[148.5mm] h-[148.5mm] print:p-[10mm]">
                        <img
                            src="/projects/mascota/mascota.webp"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 opacity-20 select-none"
                        />
                        {contenidoGarantia}
                    </div>
                </div>
            </div>
        </>
    );
}
