// Detalle rico y colapsable de una operación (Venta, Compra, Movimiento Financiero) —
// extraído de Reportes/Report/RastreoOperaciones.tsx para poder reusarlo en cualquier
// página que muestre historial de operaciones (Cuentas/Clientes/Proveedores Show) sin
// duplicar esta lógica en cada una. El backend arma este mismo shape vía
// App\Services\DetalleOperacionService, usado tanto por RastreoOperacionesController
// como por los controllers de Cuentas/Clientes/Proveedores.

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertTriangle, CreditCard, DollarSign } from 'lucide-react';

export interface DetalleProducto {
    producto: string;
    imagen_url: string | null;
    marca: string | null;
    modelo: string | null;
    capacidad: string | null;
    color: string | null;
    codigo: string | null;
    cantidad: number;
    precio: number;
    costo_unitario: number | null;
    ganancia_unitaria: number | null;
    comision_unitaria: number;
    subtotal: number;
}

export interface DetallePago {
    metodo: string;
    moneda: string | null;
    monto_original: number;
    equivalente_usd: number;
    tasa_cambio: number;
    destino: string;
    via: string | null;
}

export interface EntidadMovimiento {
    tipo: 'cuenta' | 'cliente' | 'proveedor';
    nombre: string;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    moneda: string | null;
}

// Una "pata" de saldo tocada por Venta/Compra (pago, comisión PV, gestor, mensajero,
// receptor) — mismo shape que EntidadMovimiento (reutiliza EntidadMovimientoCard tal cual)
// más una etiqueta, porque acá puede haber varias entidades en una sola operación en vez de
// un solo origen/destino fijo.
export interface MovimientoSaldoEntry extends EntidadMovimiento {
    etiqueta: string;
}

export interface DetalleVenta {
    info_general: {
        fecha: string;
        almacen: string | null;
    };
    // Solo presente cuando la venta terminó anulada (estado === 'cancelada').
    anulacion: {
        motivo: string | null;
        detalle: string | null;
    } | null;
    receptor: {
        nombre_completo: string;
        carnet_identidad: string | null;
        telefono: string | null;
        direccion: string | null;
    } | null;
    comision_pv: {
        monto_usd: number;
        tasa: number | null;
        monto_cup: number | null;
        cuenta: string | null;
    } | null;
    mensajero: {
        tipo: 'propio' | 'externo' | null;
        monto_usd: number;
        tasa: number | null;
        monto_cup: number | null;
        monto_final_cup: number | null;
        cuenta: string | null;
    } | null;
    gestor: {
        monto: number;
        monto_usd: number;
        tasa_aplicada_gestor: number | null;
        moneda: string | null;
        cuenta: string | null;
        comentario: string | null;
    } | null;
    pagos: DetallePago[];
    resumen_financiero: {
        total_venta: number;
        total_pagado: number;
        restante: number;
        // null para roles sin puedeVerCosto (ej. vendedor) — mismo gate que ya
        // aplica productos_footer a estos mismos valores.
        ganancia_operacional: number | null;
        comision_pv_usd: number;
        comision_pv_cup: number | null;
        ganancia_agencia: number | null;
        ganancia_perdida_cambiaria: number | null;
        ganancia_real_total: number | null;
        tasa_cambio_principal: number;
    };
    productos: DetalleProducto[];
    productos_footer: {
        total_venta: number;
        ganancia_total: number | null;
        comision_vendedor: number;
        ganancia_agencia: number | null;
    };
    movimientos_saldo: MovimientoSaldoEntry[];
}

export interface DetalleMovimiento {
    info_general: {
        fecha: string;
        estado: string;
        // Solo vienen con valor en Transferencia cuando origen y destino usan monedas
        // distintas — Gasto/Ingreso son de un solo lado y una sola moneda, sin conversión.
        tasa_cambio_aplicada: number | null;
        monto_destino: number | null;
    };
    origen: EntidadMovimiento | null;
    destino: EntidadMovimiento | null;
}

export interface DetallePagoCompra {
    tipo_pago: string;
    monto: number;
    // Nombre de la cuenta o cliente que pagó — '—' cuando tipo_pago es 'deuda_proveedor'
    // (esa fila de compra_pago no representa una cuenta/cliente real, ver render de la fila).
    origen: string;
}

export interface DetalleProductoCompra {
    producto: string;
    imagen_url: string | null;
    marca: string | null;
    modelo: string | null;
    capacidad: string | null;
    color: string | null;
    codigo: string | null;
    cantidad: number;
    precio: number;
    subtotal: number;
}

export interface DetalleCompra {
    info_general: {
        fecha: string;
        tipo_compra: string;
        // pago_cash + una línea deuda_proveedor en pagos (flujo "completar con deuda si no
        // alcanza") — mismo criterio que Compra::getEsParcialAttribute en el backend y que
        // Comprar/Index.tsx / Comprar/Show.tsx en el resto del sistema.
        es_parcial: boolean;
    };
    // Quién recibió el pago — solo uno de los dos, nunca ambos.
    proveedor: string | null;
    cliente: string | null;
    pagos: DetallePagoCompra[];
    productos: DetalleProductoCompra[];
    movimientos_saldo: MovimientoSaldoEntry[];
}

// $ fijo: solo para montos que son SIEMPRE USD (detalle de Venta, comisiones, equivalente_usd).
// Para montos que pueden estar en otra moneda (ej. pagos.monto_original), usar formatMonto().
export const fmt = (n: number | null | undefined, sufijo = '') => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}${sufijo}`);

// El detalle de Venta siempre está en USD; Gasto/Ingreso/Transferencia pueden ser
// USD/CUP/MLC según la cuenta origen/destino — mostrar siempre la moneda explícita,
// no asumir que un número sin sigla es USD.
export const formatMonto = (monto: number, moneda: string) => `${moneda} ${monto.toFixed(2)}`;

export const EntidadMovimientoCard = ({ titulo, entidad }: { titulo: string; entidad: EntidadMovimiento }) => (
    <Card className="bg-background/60">
        <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase">
                {titulo} — {entidad.tipo === 'cuenta' ? 'Cuenta' : entidad.tipo === 'cliente' ? 'Cliente' : 'Proveedor'}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
            <p><strong>Nombre:</strong> {entidad.nombre}</p>
            <p>
                <strong>Saldo Anterior:</strong>{' '}
                {entidad.saldo_anterior !== null ? formatMonto(entidad.saldo_anterior, entidad.moneda ?? '') : '—'}
            </p>
            <p>
                <strong>Saldo Posterior:</strong>{' '}
                {entidad.saldo_posterior !== null ? formatMonto(entidad.saldo_posterior, entidad.moneda ?? '') : '—'}
            </p>
        </CardContent>
    </Card>
);

export const DetalleVentaExpandido = ({ detalle }: { detalle: DetalleVenta }) => (
    <div className="space-y-4 py-2">
        {/* Info general */}
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span>
                <strong className="text-foreground">Fecha y Hora:</strong> {new Date(detalle.info_general.fecha).toLocaleString()}
            </span>
            <span>
                <strong className="text-foreground">Almacén:</strong> {detalle.info_general.almacen ?? '—'}
            </span>
        </div>

        {/* Anulación — solo presente cuando la venta terminó cancelada */}
        {detalle.anulacion && (
            <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-1.5 text-xs font-semibold text-red-700 uppercase dark:text-red-300">
                        <AlertTriangle className="h-3.5 w-3.5" /> Venta Anulada
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                    <p><strong>Motivo:</strong> {detalle.anulacion.motivo ?? '—'}</p>
                    {detalle.anulacion.detalle && <p><strong>Detalle:</strong> {detalle.anulacion.detalle}</p>}
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Receptor Registrado */}
            {detalle.receptor && (
                <Card className="bg-background/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase">Receptor Registrado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        <p><strong>Nombre Completo:</strong> {detalle.receptor.nombre_completo}</p>
                        <p><strong>Carnet de Identidad:</strong> {detalle.receptor.carnet_identidad ?? '—'}</p>
                        <p><strong>Teléfono Contacto:</strong> {detalle.receptor.telefono ?? '—'}</p>
                        <p><strong>Dirección:</strong> {detalle.receptor.direccion ?? '—'}</p>
                    </CardContent>
                </Card>
            )}

            {/* Comisión Punto de Venta */}
            {detalle.comision_pv && (
                <Card className="bg-background/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase">Comisión Punto de Venta</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        <p><strong>Monto en USD:</strong> {fmt(detalle.comision_pv.monto_usd)}</p>
                        <p><strong>Tasa aplicada:</strong> {detalle.comision_pv.tasa ?? '—'}</p>
                        <p><strong>Monto en CUP:</strong> {detalle.comision_pv.monto_cup !== null ? `${detalle.comision_pv.monto_cup.toFixed(2)} CUP` : '—'}</p>
                        <p><strong>Cuenta debitada:</strong> {detalle.comision_pv.cuenta ?? '—'}</p>
                    </CardContent>
                </Card>
            )}

            {/* Gestor — XOR con Comisión PV, nunca ambas a la vez */}
            {detalle.gestor && (
                <Card className="bg-background/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase">Gestor — Comisión</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        <p><strong>Descontado:</strong> {detalle.gestor.monto.toFixed(2)} {detalle.gestor.moneda ?? ''}</p>
                        <p><strong>Equivalente USD:</strong> {fmt(detalle.gestor.monto_usd)}</p>
                        <p><strong>Tasa:</strong> {detalle.gestor.tasa_aplicada_gestor ?? '—'}</p>
                        <p><strong>Cuenta:</strong> {detalle.gestor.cuenta ?? '—'}</p>
                        {detalle.gestor.comentario && <p><strong>Comentario:</strong> {detalle.gestor.comentario}</p>}
                    </CardContent>
                </Card>
            )}

            {/* Mensajero — independiente del XOR, puede coexistir con PV o Gestor */}
            {detalle.mensajero && (
                <Card className="bg-background/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase">
                            Mensajería — {detalle.mensajero.tipo === 'propio' ? 'Vehículo Propio' : 'Externo'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs">
                        <p><strong>USD:</strong> {fmt(detalle.mensajero.monto_usd)}</p>
                        <p><strong>Tasa aplicada:</strong> {detalle.mensajero.tasa ?? '—'}</p>
                        <p>
                            <strong>{detalle.mensajero.tipo === 'propio' ? 'Acreditado en cuenta:' : 'Pagado al mensajero:'}</strong>{' '}
                            {(detalle.mensajero.monto_final_cup ?? detalle.mensajero.monto_cup) !== null
                                ? `${(detalle.mensajero.monto_final_cup ?? detalle.mensajero.monto_cup)!.toFixed(2)} CUP`
                                : '—'}
                        </p>
                        <p>
                            <strong>{detalle.mensajero.tipo === 'propio' ? 'Cuenta acreditada:' : 'Cuenta debitada:'}</strong>{' '}
                            {detalle.mensajero.cuenta ?? '—'}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Detalles de Pago */}
        {detalle.pagos.length > 0 && (
            <Card className="bg-background/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase">Detalles de Pago</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Método</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Moneda</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Monto Original</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Equiv. USD</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Tasa Cambio</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Cuenta Destino</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Vía</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sidebar-border/40">
                            {detalle.pagos.map((p, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-1.5 capitalize">{p.metodo}</td>
                                    <td className="px-4 py-1.5">{p.moneda ?? '—'}</td>
                                    <td className="px-4 py-1.5 font-mono">
                                        {p.moneda ? formatMonto(p.monto_original, p.moneda) : fmt(p.monto_original)}
                                    </td>
                                    <td className="px-4 py-1.5 font-mono">{fmt(p.equivalente_usd)}</td>
                                    <td className="px-4 py-1.5">{p.tasa_cambio}</td>
                                    <td className="px-4 py-1.5">{p.destino}</td>
                                    <td className="px-4 py-1.5">{p.via ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        )}

        {/* Movimientos de Saldo — saldo antes/después de cada pata que aprobarVenta() tocó
            (pagos, comisión PV, gestor, mensajero). Ausente en ventas aprobadas antes de esta
            función (saldo_anterior null en BD, filtrado ya en el backend). */}
        {detalle.movimientos_saldo.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {detalle.movimientos_saldo.map((m, i) => (
                    <EntidadMovimientoCard key={i} titulo={m.etiqueta} entidad={m} />
                ))}
            </div>
        )}

        {/* Resumen Financiero */}
        <Card className="bg-background/60">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase">Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-3">
                <p><strong>Total de la Venta:</strong> {fmt(detalle.resumen_financiero.total_venta)}</p>
                <p><strong>Total Pagado:</strong> {fmt(detalle.resumen_financiero.total_pagado)}</p>
                <p><strong>Restante por Pagar:</strong> {fmt(detalle.resumen_financiero.restante)}</p>
                <p><strong>Ganancia Operacional:</strong> {fmt(detalle.resumen_financiero.ganancia_operacional)}</p>
                <p>
                    <strong>Comisión P.V.:</strong> {fmt(detalle.resumen_financiero.comision_pv_usd)}
                    {detalle.resumen_financiero.comision_pv_cup !== null && ` (${detalle.resumen_financiero.comision_pv_cup.toFixed(2)} CUP)`}
                </p>
                <p><strong>Ganancia Agencia:</strong> {fmt(detalle.resumen_financiero.ganancia_agencia)}</p>
                <p><strong>Ganancia/Pérdida Cambiaria:</strong> {fmt(detalle.resumen_financiero.ganancia_perdida_cambiaria)}</p>
                <p><strong>Ganancia Real Total:</strong> {fmt(detalle.resumen_financiero.ganancia_real_total)}</p>
                <p><strong>Tasa Cambio Principal:</strong> {detalle.resumen_financiero.tasa_cambio_principal}</p>
            </CardContent>
        </Card>

        {/* Productos Vendidos */}
        <Card className="bg-background/60">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase">Productos Vendidos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground">
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Producto</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Cantidad</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Precio Unitario</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Costo Unitario</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Ganancia Unitaria</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Comisión Unit.</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border/40">
                        {detalle.productos.map((d, i) => {
                            // Marca/Modelo y Capacidad/Color solo se muestran si el producto los
                            // tiene cargados — mismo criterio que ya usa Productos/Index.tsx, sin
                            // "Sin marca"/"N/A" de relleno acá porque es una fila compacta.
                            const marcaModelo = [d.marca, d.modelo].filter(Boolean).join(' - ');
                            const capacidadColor = [d.capacidad, d.color].filter(Boolean).join(' · ');
                            const subtitulo = [marcaModelo, capacidadColor].filter(Boolean).join(' | ');
                            return (
                            <tr key={i}>
                                    <td className="px-4 py-1.5">
                                        <div className="flex items-center gap-2">
                                            {d.imagen_url && <img src={d.imagen_url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />}
                                            <div>
                                                <div>{d.producto}</div>
                                                {subtitulo && <div className="text-muted-foreground text-[11px]">{subtitulo}</div>}
                                                {d.codigo && <div className="text-muted-foreground font-mono text-[10px]">{d.codigo}</div>}
                                            </div>
                                        </div>
                                </td>
                                <td className="px-4 py-1.5">{d.cantidad}</td>
                                <td className="px-4 py-1.5 font-mono">{fmt(d.precio)}</td>
                                <td className="px-4 py-1.5 font-mono text-muted-foreground">{fmt(d.costo_unitario)}</td>
                                <td className="px-4 py-1.5 font-mono text-emerald-500">{fmt(d.ganancia_unitaria)}</td>
                                <td className="px-4 py-1.5 font-mono text-amber-500">{fmt(d.comision_unitaria)}</td>
                                <td className="px-4 py-1.5 font-mono">{fmt(d.subtotal)}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-sidebar-border/60 font-semibold">
                        <tr>
                            <td colSpan={4} className="px-4 py-1.5 text-right">Total Venta:</td>
                            <td colSpan={3} className="px-4 py-1.5 font-mono">{fmt(detalle.productos_footer.total_venta)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="px-4 py-1.5 text-right">Ganancia Total:</td>
                            <td colSpan={3} className="px-4 py-1.5 font-mono text-emerald-500">{fmt(detalle.productos_footer.ganancia_total)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="px-4 py-1.5 text-right">Comisión Vendedor:</td>
                            <td colSpan={3} className="px-4 py-1.5 font-mono text-amber-500">{fmt(detalle.productos_footer.comision_vendedor)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="px-4 py-1.5 text-right">Ganancia Agencia:</td>
                            <td colSpan={3} className="px-4 py-1.5 font-mono text-indigo-400">{fmt(detalle.productos_footer.ganancia_agencia)}</td>
                        </tr>
                    </tfoot>
                </table>
            </CardContent>
        </Card>
    </div>
);

export const DetalleMovimientoExpandido = ({
    detalle,
    monto,
    moneda,
    descripcion,
    usuario,
}: {
    detalle: DetalleMovimiento;
    monto: number;
    moneda: string;
    descripcion: string;
    usuario: string;
}) => (
    <div className="space-y-4 py-2">
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span>
                <strong className="text-foreground">Fecha y Hora:</strong> {new Date(detalle.info_general.fecha).toLocaleString()}
            </span>
            <span>
                <strong className="text-foreground">Estado:</strong> {detalle.info_general.estado}
            </span>
            <span>
                <strong className="text-foreground">Registrado por:</strong> {usuario}
            </span>
            {detalle.info_general.tasa_cambio_aplicada !== null && (
                <span>
                    <strong className="text-foreground">Tasa de Cambio:</strong> {detalle.info_general.tasa_cambio_aplicada}
                </span>
            )}
        </div>

        {/*
            Gasto/Ingreso solo llenan un lado (origen o destino), así que la card de
            entidad y la de Monto y Detalle caben juntas en una sola fila de 2 columnas.
            Transferencia llena origen Y destino a la vez, así que
            esta misma grilla pasa a 2 filas de 2 (origen+destino, y monto abajo) sin
            tener que tocar este layout.
        */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {detalle.origen && <EntidadMovimientoCard titulo="Origen" entidad={detalle.origen} />}
            {detalle.destino && <EntidadMovimientoCard titulo="Destino" entidad={detalle.destino} />}
            <Card className="bg-background/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase">Monto y Detalle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                    <p><strong>Monto:</strong> {formatMonto(monto, moneda)}</p>
                    {detalle.info_general.monto_destino !== null && detalle.destino?.moneda && (
                        <p className="text-muted-foreground">
                            <strong>Monto Destino:</strong> ≈ {formatMonto(detalle.info_general.monto_destino, detalle.destino.moneda)}
                            {detalle.info_general.tasa_cambio_aplicada !== null && ` @ ${detalle.info_general.tasa_cambio_aplicada}`}
                        </p>
                    )}
                    <p><strong>Descripción:</strong> {descripcion || '—'}</p>
                </CardContent>
            </Card>
        </div>
    </div>
);

export const DetalleCompraExpandido = ({ detalle, monto, usuario }: { detalle: DetalleCompra; monto: number; usuario: string }) => {
    const esCredito = detalle.info_general.tipo_compra === 'deuda_proveedor';
    const esParcial = detalle.info_general.es_parcial;
    // La línea tipo_pago 'deuda_proveedor' dentro de pagos guarda exactamente el resto no
    // cubierto por cuentas/clientes (ver CompraController::store()) — en Crédito 100% es el
    // total completo, en Parcial es solo lo que faltó.
    const montoPendiente = detalle.pagos.filter((p) => p.tipo_pago === 'deuda_proveedor').reduce((acc, p) => acc + p.monto, 0);
    const montoPagado = detalle.pagos.filter((p) => p.tipo_pago !== 'deuda_proveedor').reduce((acc, p) => acc + p.monto, 0);

    return (
    <div className="space-y-4 py-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <span>
                <strong className="text-foreground">Fecha:</strong> {new Date(detalle.info_general.fecha).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1.5">
                <strong className="text-foreground">Tipo de Compra:</strong>
                <Badge className={cn('text-white hover:opacity-90', esCredito ? 'bg-red-500' : esParcial ? 'bg-amber-500' : 'bg-emerald-500')}>
                    {esCredito ? <CreditCard className="h-3 w-3" /> : esParcial ? <AlertTriangle className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                    {esCredito ? 'Crédito' : esParcial ? 'Parcial' : 'Contado'}
                </Badge>
            </span>
            <span>
                <strong className="text-foreground">Registrado por:</strong> {usuario}
            </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="bg-background/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase">Proveedor / Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs">
                    <p><strong>Nombre:</strong> {detalle.proveedor ?? detalle.cliente ?? '—'}</p>
                    <p><strong>Total Compra:</strong> {fmt(monto)}</p>
                    {(esCredito || esParcial) && (
                        <>
                            <p className="text-emerald-600 dark:text-emerald-400"><strong>Pagado:</strong> {fmt(montoPagado)}</p>
                            <p className="text-amber-600 dark:text-amber-400"><strong>Pendiente:</strong> {fmt(montoPendiente)}</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>

        {detalle.pagos.length > 0 && (
            <Card className="bg-background/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase">Métodos de Pago</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <table className="min-w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground">
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Tipo</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Origen</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sidebar-border/40">
                            {detalle.pagos.map((p, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-1.5 capitalize">{p.tipo_pago === 'deuda_proveedor' ? 'Deuda proveedor' : p.tipo_pago}</td>
                                    <td className="px-4 py-1.5">{p.origen}</td>
                                    <td className="px-4 py-1.5 font-mono">{fmt(p.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        )}

        {/* Movimientos de Saldo — saldo antes/después del receptor (proveedor/cliente) y de
            cada pago con cuenta/cliente. Ausente en compras registradas antes de esta función
            (saldo_anterior null en BD, filtrado ya en el backend). */}
        {detalle.movimientos_saldo.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {detalle.movimientos_saldo.map((m, i) => (
                    <EntidadMovimientoCard key={i} titulo={m.etiqueta} entidad={m} />
                ))}
            </div>
        )}

        <Card className="bg-background/60">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase">Productos Comprados</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground">
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Producto</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Cantidad</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Precio Unitario</th>
                            <th className="px-4 py-1.5 text-left font-medium uppercase">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sidebar-border/40">
                        {detalle.productos.map((p, i) => {
                            const marcaModelo = [p.marca, p.modelo].filter(Boolean).join(' - ');
                            const capacidadColor = [p.capacidad, p.color].filter(Boolean).join(' · ');
                            const subtitulo = [marcaModelo, capacidadColor].filter(Boolean).join(' | ');
                            return (
                                <tr key={i}>
                                    <td className="px-4 py-1.5">
                                        <div className="flex items-center gap-2">
                                            {p.imagen_url && <img src={p.imagen_url} alt="" className="h-6 w-6 shrink-0 rounded object-cover" />}
                                            <div>
                                                <div>{p.producto}</div>
                                                {subtitulo && <div className="text-muted-foreground text-[11px]">{subtitulo}</div>}
                                                {p.codigo && <div className="text-muted-foreground font-mono text-[10px]">{p.codigo}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-1.5">{p.cantidad}</td>
                                    <td className="px-4 py-1.5 font-mono">{fmt(p.precio)}</td>
                                    <td className="px-4 py-1.5 font-mono">{fmt(p.subtotal)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="border-t border-sidebar-border/60 font-semibold">
                        <tr>
                            <td colSpan={3} className="px-4 py-1.5 text-right">Total Compra:</td>
                            <td className="px-4 py-1.5 font-mono">{fmt(monto)}</td>
                        </tr>
                    </tfoot>
                </table>
            </CardContent>
        </Card>
    </div>
    );
};
