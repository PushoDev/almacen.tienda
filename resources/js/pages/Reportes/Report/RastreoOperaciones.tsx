import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowLeftRight, ChevronDown, ChevronRight, FileText, History, PackagePlus, Search, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Rastreo de Operaciones',
        href: route('reportes.rastreo_operaciones'),
    },
];

interface DetalleProducto {
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

interface DetallePago {
    metodo: string;
    moneda: string | null;
    monto_original: number;
    equivalente_usd: number;
    tasa_cambio: number;
    destino: string;
    via: string | null;
}

interface DetalleVenta {
    info_general: {
        fecha: string;
        almacen: string | null;
    };
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
}

interface EntidadMovimiento {
    tipo: 'cuenta' | 'cliente' | 'proveedor';
    nombre: string;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    moneda: string | null;
}

interface DetalleMovimiento {
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

interface DetallePagoCompra {
    tipo_pago: string;
    monto: number;
    // Nombre de la cuenta o cliente que pagó — '—' cuando tipo_pago es 'deuda_proveedor'
    // (esa fila de compra_pago no representa una cuenta/cliente real, ver render de la fila).
    origen: string;
}

interface DetalleProductoCompra {
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

interface DetalleCompra {
    info_general: {
        fecha: string;
        tipo_compra: string;
    };
    // Quién recibió el pago — solo uno de los dos, nunca ambos.
    proveedor: string | null;
    cliente: string | null;
    pagos: DetallePagoCompra[];
    productos: DetalleProductoCompra[];
}

interface Operacion {
    id: number;
    fecha: string;
    tipo: string;
    monto: number;
    moneda: string;
    usuario: string;
    user_id: number | null;
    referencia: string;
    descripcion: string;
    detalle_venta: DetalleVenta | null;
    detalle_movimiento: DetalleMovimiento | null;
    detalle_compra: DetalleCompra | null;
}

interface PaginatedOperaciones {
    data: Operacion[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface RastreoOperacionesPageProps {
    operaciones: PaginatedOperaciones;
    usuarios: User[];
    filtros: {
        fecha?: string;
        user_id?: string;
        tipo?: string;
        buscar?: string;
    };
    puedeVerCosto: boolean;
    conteoPorTipo: {
        Venta: number;
        Gasto: number;
        Ingreso: number;
        Transferencia: number;
        // Ausente por completo para vendedor (Compra es admin/moderador-only) — nunca 0
        // implícito, la clave simplemente no viene en el payload.
        Compra?: number;
    };
}

// $ fijo: solo para montos que son SIEMPRE USD (detalle de Venta, comisiones, equivalente_usd).
// Para montos que pueden estar en otra moneda (ej. pagos.monto_original), usar formatMonto().
const fmt = (n: number | null | undefined, sufijo = '') => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}${sufijo}`);

// El detalle de Venta siempre está en USD; Gasto/Ingreso/Transferencia pueden ser
// USD/CUP/MLC según la cuenta origen/destino — mostrar siempre la moneda explícita,
// no asumir que un número sin sigla es USD.
const formatMonto = (monto: number, moneda: string) => `${moneda} ${monto.toFixed(2)}`;

// Mismo esquema de badge de color por tipo que ya usa el proyecto en
// Cuentas/Show.tsx (getFuenteColorClase) — para que se vea consistente en todo el sistema.
const colorTipo = (tipo: string) => {
    switch (tipo) {
        case 'Venta':
            return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300';
        case 'Gasto':
            return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300';
        case 'Ingreso':
            return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-300';
        case 'Transferencia':
            return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300';
        case 'Compra':
            return 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300';
        default:
            return 'border-border bg-muted text-foreground';
    }
};

// Cuenta Envía / Cuenta que Recibe (columnas de la tabla, no del detalle expandido):
// Gasto solo llena origen, Ingreso solo destino, Transferencia llena ambos — mismo dato que
// ya arma detalle_movimiento.origen/destino en el backend, acá solo se lee para la fila
// compacta. Venta no tiene "cuenta envía" (el dinero entra de un cliente, no sale de una
// cuenta del sistema); su "Cuenta que Recibe" se arma aparte con un badge por cada pago,
// directo desde detalle_venta.pagos, ver el render de la celda.
const cuentaEnvia = (op: Operacion) => op.detalle_movimiento?.origen?.nombre ?? '—';

const montoEnvia = (op: Operacion) => (op.detalle_movimiento?.origen ? formatMonto(op.monto, op.moneda) : '—');

const cuentaRecibeMovimiento = (op: Operacion) => op.detalle_movimiento?.destino?.nombre ?? '—';

// Transferencia con conversión real: el monto que llegó al destino es monto_destino (ya en
// la moneda del destino), no 'op.monto' (ese es el lado origen). Sin conversión, o en
// Ingreso, es el mismo monto de siempre.
const montoRecibeMovimiento = (op: Operacion) => {
    const destino = op.detalle_movimiento?.destino;
    if (!destino) return '—';
    const monto = op.detalle_movimiento?.info_general.monto_destino ?? op.monto;
    return formatMonto(monto, destino.moneda ?? op.moneda);
};

// Solo Transferencia puede tener una tasa de conversión propia de la operación — Gasto/
// Ingreso son de una sola moneda, y Venta es la suma de varios pagos que ya llevan su
// propia tasa individual en el detalle (mostrarla acá sería ambigua con más de un pago).
const tasaOperacion = (op: Operacion) => {
    const tasa = op.detalle_movimiento?.info_general.tasa_cambio_aplicada;
    return tasa !== null && tasa !== undefined ? tasa : '—';
};

// Colores de badge por pago dentro de una Venta — sin relación con colorTipo(), sirven
// para identificar visualmente el mismo pago entre las columnas Cuenta que Recibe / Monto /
// Tasa de la Operación (mismo índice de pago = mismo color). Cicla si hay más de 6 pagos.
const coloresPago = [
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300',
    'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950/20 dark:text-pink-300',
    'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-300',
    'border-lime-200 bg-lime-50 text-lime-700 dark:border-lime-800 dark:bg-lime-950/20 dark:text-lime-300',
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300',
    'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-800 dark:bg-fuchsia-950/20 dark:text-fuchsia-300',
];
const colorPago = (index: number) => coloresPago[index % coloresPago.length];

// Compra: quién pagó — badges por pago cuando es pago_cash (puede ser varias cuentas y/o
// clientes a la vez, el mismo caso de "varios orígenes en una operación" que ya resolvimos
// para venta.pagos, aplicado acá al lado que sale en vez del que entra). compra_pago sí
// guarda una fila con tipo_pago 'deuda_proveedor' cuando la compra es a crédito, pero esa
// fila no representa una cuenta/cliente real que pagó — se filtra, deuda_proveedor no
// llena "Cuenta Envía" (no salió dinero de ninguna cuenta del sistema).
const pagosCompraConOrigen = (op: Operacion) => (op.detalle_compra?.pagos ?? []).filter((p) => p.tipo_pago !== 'deuda_proveedor');

// Cuenta que Recibe / Monto para Compra: quien recibe el pago es siempre uno solo
// (proveedor o cliente-proveedor), a diferencia de "Cuenta Envía" que puede ser varios —
// no hace falta badges acá, un nombre y el total alcanzan.
const cuentaRecibeCompra = (op: Operacion) => op.detalle_compra?.proveedor ?? op.detalle_compra?.cliente ?? '—';

// Widgets informativos sobre el filtro: mismo orden fijo y familia de color que colorTipo()
// arriba, solo que como ícono en vez de texto (el valor grande se queda en tinta neutra —
// el color identifica la categoría, no decora el número).
const resumenTipos = [
    { tipo: 'Venta' as const, label: 'Ventas', icon: ShoppingBag, iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
    { tipo: 'Gasto' as const, label: 'Gastos', icon: TrendingDown, iconClass: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' },
    { tipo: 'Ingreso' as const, label: 'Ingresos', icon: TrendingUp, iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400' },
    { tipo: 'Transferencia' as const, label: 'Transferencias', icon: ArrowLeftRight, iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
    { tipo: 'Compra' as const, label: 'Compras', icon: PackagePlus, iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
];

// ─── Componente: DetalleVentaExpandido (contenido de la fila colapsable) ─────

const DetalleVentaExpandido = ({ detalle }: { detalle: DetalleVenta }) => (
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

// ─── Componente: DetalleMovimientoExpandido (Gasto / Ingreso, sin tasa de cambio —
// Gasto/Ingreso son de una sola moneda y un solo lado, no hay conversión que mostrar) ──

const EntidadMovimientoCard = ({ titulo, entidad }: { titulo: string; entidad: EntidadMovimiento }) => (
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

const DetalleMovimientoExpandido = ({
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

// ─── Componente: DetalleCompraExpandido (sin costo/ganancia — la compra ES el costo) ──

const DetalleCompraExpandido = ({ detalle, monto, usuario }: { detalle: DetalleCompra; monto: number; usuario: string }) => (
    <div className="space-y-4 py-2">
        <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span>
                <strong className="text-foreground">Fecha:</strong> {new Date(detalle.info_general.fecha).toLocaleDateString()}
            </span>
            <span>
                <strong className="text-foreground">Tipo de Compra:</strong>{' '}
                {detalle.info_general.tipo_compra === 'deuda_proveedor' ? 'Deuda con proveedor' : 'Pago al contado'}
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

// ─── Página Principal ────────────────────────────────────────────────────────

export default function RastreoOperacionesPage({ operaciones, usuarios, filtros, puedeVerCosto, conteoPorTipo }: RastreoOperacionesPageProps) {
    const [fecha, setFecha] = useState(filtros.fecha || '');
    const [userId, setUserId] = useState(filtros.user_id || 'all');
    const [tipo, setTipo] = useState(filtros.tipo || 'all');
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Solo una fila abierta a la vez — evita que la pantalla se llene si el
    // usuario expande varias operaciones seguidas.
    const toggleRow = (key: string) => {
        setExpandedRow((prev) => (prev === key ? null : key));
    };

    const buildParams = (page: number = 1) => ({
        fecha,
        user_id: userId === 'all' ? '' : userId,
        tipo: tipo === 'all' ? '' : tipo,
        buscar,
        page,
    });

    const handleFilter = () => {
        router.get(route('reportes.rastreo_operaciones'), buildParams(1), {
            preserveState: true,
            replace: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('reportes.rastreo_operaciones'), buildParams(page), {
            preserveState: true,
            replace: true,
        });
    };

    const getPageNumbers = (current: number, last: number): (number | '...')[] => {
        if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

        const pages: (number | '...')[] = [1];

        if (current > 3) pages.push('...');

        for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
            pages.push(i);
        }

        if (current < last - 2) pages.push('...');
        pages.push(last);

        return pages;
    };

    const exportToPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('REPORTE GENERAL DE OPERACIONES', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 20, 30);
            if (fecha) {
                doc.text(`Fecha: ${fecha}`, 20, 35);
            }

            const tableData = operaciones.data.map((op) => [
                new Date(op.fecha).toLocaleString(),
                op.tipo,
                op.referencia,
                op.usuario,
                formatMonto(parseFloat(op.monto.toString()), op.moneda),
                op.descripcion || '-',
            ]);

            (doc as any).autoTable({
                startY: 45,
                head: [['Fecha', 'Tipo', 'Referencia', 'Usuario', 'Monto', 'Detalles']],
                body: tableData,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [71, 85, 105] },
            });

            doc.save(`rastreo_operaciones_${new Date().getTime()}.pdf`);
            toast.success('PDF generado correctamente');
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF');
        }
    };

    const { data: ops, current_page, last_page, total, from, to } = operaciones;
    const pageNumbers = getPageNumbers(current_page, last_page);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rastreo de Operaciones" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Auditoría General de Operaciones"
                        description={
                            puedeVerCosto
                                ? 'Ventas, Gastos, Ingresos, Transferencias y Compras del sistema, con detalle completo por operación. Cierres de caja se agregan en fases siguientes.'
                                : 'Ventas, Gastos, Ingresos y Transferencias del sistema, con detalle completo por operación. Cierres de caja se agregan en fases siguientes.'
                        }
                    />
                    <History
                        size={70}
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse text-slate-500 opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Widgets informativos: cantidad por tipo de operación (respeta fecha/usuario/
                    buscar, no el filtro de Tipo, para que sigan sirviendo como resumen aunque
                    la tabla esté filtrada a un solo tipo). Compra solo se muestra a
                    admin/moderador — conteoPorTipo.Compra ni viene en el payload para
                    vendedor (ver RastreoOperacionesController), mismo gate que el resto de
                    los datos de Compra en este reporte. */}
                <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${puedeVerCosto ? 'lg:grid-cols-5' : ''}`}>
                    {resumenTipos.filter(({ tipo }) => tipo !== 'Compra' || puedeVerCosto).map(({ tipo, label, icon: Icon, iconClass }) => (
                        <Card key={tipo}>
                            <CardContent className="flex items-center gap-3 p-4">
                                <div className={`rounded-lg p-2 ${iconClass}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</p>
                                    <p className="text-2xl font-semibold">{conteoPorTipo[tipo]}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Filtros de Búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3 lg:grid-cols-6">
                            <div className="space-y-2 lg:col-span-2">
                                <Label htmlFor="buscar">Buscar</Label>
                                <Input
                                    id="buscar"
                                    placeholder="Descripción, usuario, cuenta, cliente..."
                                    value={buscar}
                                    onChange={(e) => setBuscar(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fecha">Fecha</Label>
                                <Input
                                    id="fecha"
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Operación</Label>
                                <Select value={tipo} onValueChange={setTipo}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        <SelectItem value="Venta">Venta</SelectItem>
                                        <SelectItem value="Gasto">Gasto</SelectItem>
                                        <SelectItem value="Ingreso">Ingreso</SelectItem>
                                        <SelectItem value="Transferencia">Transferencia</SelectItem>
                                        {puedeVerCosto && <SelectItem value="Compra">Compra</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Usuario</Label>
                                <Select value={userId} onValueChange={setUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los usuarios</SelectItem>
                                        {usuarios.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleFilter} className="w-full">
                                    <Search className="mr-2 h-4 w-4" /> Filtrar
                                </Button>
                                <Button variant="outline" onClick={exportToPDF}>
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla */}
                <Card className="flex-1">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-sidebar-border">
                                <thead className="bg-sidebar-accent/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Referencia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuenta Envía</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Cuenta que Recibe</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasa de la Operación</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border">
                                    {ops.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                                                No se encontraron operaciones con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        ops.map((op, idx) => {
                                            const rowKey = `${op.tipo}-${op.id}-${idx}`;
                                            const esColapsable = Boolean(op.detalle_venta) || Boolean(op.detalle_movimiento) || Boolean(op.detalle_compra);
                                            const expandida = expandedRow === rowKey;
                                            return (
                                                <React.Fragment key={rowKey}>
                                                    <tr
                                                        className={`hover:bg-sidebar-accent/30 transition-colors ${esColapsable ? 'cursor-pointer' : ''}`}
                                                        onClick={() => esColapsable && toggleRow(rowKey)}
                                                    >
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                {esColapsable ? (
                                                                    expandida ? (
                                                                        <ChevronDown className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4" />
                                                                    )
                                                                ) : (
                                                                    <span className="w-4" />
                                                                )}
                                                                <Badge variant="outline" className={colorTipo(op.tipo)}>
                                                                    {op.referencia}
                                                                </Badge>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            {op.tipo === 'Compra' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {pagosCompraConOrigen(op).length > 0
                                                                        ? pagosCompraConOrigen(op).map((p, i) => (
                                                                              <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                                  {p.origen}
                                                                              </Badge>
                                                                          ))
                                                                        : '—'}
                                                                </div>
                                                            ) : (
                                                                cuentaEnvia(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono whitespace-nowrap">
                                                            {op.tipo === 'Compra' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {pagosCompraConOrigen(op).length > 0 ? (
                                                                        pagosCompraConOrigen(op).map((p, i) => (
                                                                            <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                                {formatMonto(p.monto, 'USD')}
                                                                            </Badge>
                                                                        ))
                                                                    ) : op.detalle_compra?.info_general.tipo_compra === 'deuda_proveedor' ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="border-amber-200 bg-amber-50 font-normal text-amber-700 whitespace-nowrap dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300"
                                                                        >
                                                                            Deuda pendiente
                                                                        </Badge>
                                                                    ) : (
                                                                        '—'
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                montoEnvia(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {op.tipo === 'Venta' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {op.detalle_venta?.pagos.map((p, i) => (
                                                                        <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                            {p.destino}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : op.tipo === 'Compra' ? (
                                                                cuentaRecibeCompra(op)
                                                            ) : (
                                                                cuentaRecibeMovimiento(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono">
                                                            {op.tipo === 'Venta' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {op.detalle_venta?.pagos.map((p, i) => (
                                                                        <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                            {p.moneda ? formatMonto(p.monto_original, p.moneda) : fmt(p.monto_original)}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : op.tipo === 'Compra' ? (
                                                                <span
                                                                    className={
                                                                        op.detalle_compra?.info_general.tipo_compra === 'deuda_proveedor'
                                                                            ? 'text-amber-600 dark:text-amber-400'
                                                                            : ''
                                                                    }
                                                                    title={
                                                                        op.detalle_compra?.info_general.tipo_compra === 'deuda_proveedor'
                                                                            ? 'Quedó registrada como deuda con el proveedor, no se pagó desde ninguna cuenta'
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {formatMonto(op.monto, op.moneda)}
                                                                </span>
                                                            ) : (
                                                                montoRecibeMovimiento(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm">
                                                            {op.tipo === 'Venta' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {op.detalle_venta?.pagos.map((p, i) => (
                                                                        <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                            {p.tasa_cambio}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                tasaOperacion(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                                            {op.descripcion || '-'}
                                                        </td>
                                                    </tr>
                                                    {esColapsable && expandida && (
                                                        <tr>
                                                            <td colSpan={7} className="bg-sidebar-accent/20 px-6 py-3">
                                                                {op.detalle_venta ? (
                                                                    <DetalleVentaExpandido detalle={op.detalle_venta} />
                                                                ) : op.detalle_movimiento ? (
                                                                    <DetalleMovimientoExpandido
                                                                        detalle={op.detalle_movimiento}
                                                                        monto={parseFloat(op.monto.toString())}
                                                                        moneda={op.moneda}
                                                                        descripcion={op.descripcion}
                                                                        usuario={op.usuario}
                                                                    />
                                                                ) : op.detalle_compra ? (
                                                                    <DetalleCompraExpandido
                                                                        detalle={op.detalle_compra}
                                                                        monto={parseFloat(op.monto.toString())}
                                                                        usuario={op.usuario}
                                                                    />
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-sidebar-border px-6 py-4">
                                <p className="text-sm text-muted-foreground">
                                    Mostrando {from}–{to} de {total} operaciones
                                </p>
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page > 1) handlePageChange(current_page - 1);
                                                }}
                                                className={current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {pageNumbers.map((page, idx) =>
                                            page === '...' ? (
                                                <PaginationItem key={`ellipsis-${idx}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={page === current_page}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePageChange(page as number);
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page < last_page) handlePageChange(current_page + 1);
                                                }}
                                                className={current_page === last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
