import HeadingSmall from '@/components/heading-small';
import {
    DetalleCompra,
    DetalleCompraExpandido,
    DetalleMovimiento,
    DetalleMovimientoExpandido,
    DetalleRemesa,
    DetalleRemesaExpandido,
    DetalleVenta,
    DetalleVentaExpandido,
    fmt,
    formatMonto,
} from '@/components/detalle-operacion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxCollection,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    useComboboxAnchor,
} from '@/components/ui/combobox';
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
import { ArrowLeftRight, ChevronDown, ChevronRight, Edit3, FileText, History, PackagePlus, Search, Shuffle, ShoppingBag, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

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
    detalle_remesa: DetalleRemesa | null;
}

// Forma mínima que manda el backend para los combobox de filtro (id + nombre) — no hace
// falta el resto de campos de ClienteProps/ProveedorProps/CuentaProps de @/types acá.
interface EntidadFiltro {
    id: number;
    nombre: string;
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
    clientes: EntidadFiltro[];
    proveedores: EntidadFiltro[];
    cuentas: EntidadFiltro[];
    filtros: {
        fecha?: string;
        user_id?: string;
        tipo?: string;
        buscar?: string;
        cliente_ids?: string[];
        proveedor_ids?: string[];
        cuenta_ids?: string[];
        cliente_direccion?: Direccion;
        proveedor_direccion?: Direccion;
        cuenta_direccion?: Direccion;
    };
    puedeVerCosto: boolean;
    // Mismo valor que puedeVerCosto hoy (ambos son admin/moderador), con su propio nombre
    // porque Remesa no es dato de costo — es el mismo gate que ya usan Cuentas/Clientes/
    // Proveedores Show para su historial de Remesas.
    puedeVerRemesas: boolean;
    conteoPorTipo: {
        Venta: number;
        Gasto: number;
        Ingreso: number;
        Transferencia: number;
        Ajuste: number;
        // Ausentes por completo para vendedor (Compra/Remesa son admin/moderador-only) —
        // nunca 0 implícito, la clave simplemente no viene en el payload.
        Compra?: number;
        Remesa?: number;
    };
}

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
        case 'Ajuste':
            return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300';
        case 'Remesa':
            return 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/20 dark:text-cyan-300';
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

// Lo que quedó sin cubrir con cuentas/clientes — presente tanto en Crédito 100% (todo el
// total) como en Parcial (solo el resto, junto con pagosCompraConOrigen). Se muestra aparte
// del listado de arriba porque no representa una cuenta/cliente real que pagó.
const montoPendienteCompra = (op: Operacion) =>
    (op.detalle_compra?.pagos ?? []).filter((p) => p.tipo_pago === 'deuda_proveedor').reduce((acc, p) => acc + p.monto, 0);

// Cuenta que Recibe / Monto para Compra: quien recibe el pago es siempre uno solo
// (proveedor o cliente-proveedor), a diferencia de "Cuenta Envía" que puede ser varios —
// no hace falta badges acá, un nombre y el total alcanzan.
const cuentaRecibeCompra = (op: Operacion) => op.detalle_compra?.proveedor ?? op.detalle_compra?.cliente ?? '—';

// Remesa ("Operación Múltiple"): Salida = pata que envía (dinero SALE de esa entidad,
// pago al destinatario final) → columna "Cuenta Envía". Entrada = pata que recibe (dinero
// ENTRA a esa entidad) → columna "Cuenta que Recibe" — ver comentario en
// RastreoOperacionesController::construirSubqueryRemesa(). El monto de cada pata se deriva
// del propio saldo_anterior/saldo_posterior que ya trae movimientos_saldo (sin pedirle un
// campo nuevo a detalleRemesa(), que es compartido con Cuentas/Clientes/Proveedores Show).
const remesaLeg = (op: Operacion, etiqueta: 'Entrada' | 'Salida') => op.detalle_remesa?.movimientos_saldo.find((m) => m.etiqueta === etiqueta);

const cuentaEnviaRemesa = (op: Operacion) => remesaLeg(op, 'Salida')?.nombre ?? '—';

const montoEnviaRemesa = (op: Operacion) => {
    const leg = remesaLeg(op, 'Salida');
    return leg ? formatMonto(Math.abs((leg.saldo_posterior ?? 0) - (leg.saldo_anterior ?? 0)), leg.moneda ?? op.moneda) : '—';
};

const cuentaRecibeRemesa = (op: Operacion) => remesaLeg(op, 'Entrada')?.nombre ?? '—';

const montoRecibeRemesa = (op: Operacion) => {
    const leg = remesaLeg(op, 'Entrada');
    return leg ? formatMonto(Math.abs((leg.saldo_posterior ?? 0) - (leg.saldo_anterior ?? 0)), leg.moneda ?? op.moneda) : '—';
};

// Widgets informativos sobre el filtro: mismo orden fijo y familia de color que colorTipo()
// arriba, solo que como ícono en vez de texto (el valor grande se queda en tinta neutra —
// el color identifica la categoría, no decora el número).
const resumenTipos = [
    { tipo: 'Venta' as const, label: 'Ventas', icon: ShoppingBag, iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
    { tipo: 'Gasto' as const, label: 'Gastos', icon: TrendingDown, iconClass: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' },
    { tipo: 'Ingreso' as const, label: 'Ingresos', icon: TrendingUp, iconClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400' },
    { tipo: 'Transferencia' as const, label: 'Transferencias', icon: ArrowLeftRight, iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
    { tipo: 'Compra' as const, label: 'Compras', icon: PackagePlus, iconClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
    { tipo: 'Ajuste' as const, label: 'Ajustes', icon: Edit3, iconClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400' },
    { tipo: 'Remesa' as const, label: 'Operaciones Múltiples', icon: Shuffle, iconClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400' },
];

// ─── Componente: ComboboxFiltro (multiselect con chips, para Cliente/Proveedor/Cuenta) ──
// Volúmenes chicos (decenas de registros) — se manda la lista completa como prop y este
// componente filtra en el cliente, sin necesidad de un endpoint de búsqueda aparte.

type Direccion = 'envia' | 'recibe' | 'cualquiera';

function ComboboxFiltro({
    label,
    items,
    selected,
    onChange,
    direccion,
    onDireccionChange,
    placeholder,
}: {
    label: string;
    items: { value: number; label: string }[];
    selected: number[];
    onChange: (ids: number[]) => void;
    direccion: Direccion;
    onDireccionChange: (d: Direccion) => void;
    placeholder: string;
}) {
    const anchor = useComboboxAnchor();
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <Label>{label}</Label>
                {/* Envía/Recibe acota a un solo lado de la operación (mismo concepto que las
                    columnas "Cuenta Envía"/"Cuenta que Recibe" de la tabla) — Cualquiera
                    (default) es el comportamiento de antes, coincide en cualquier lado. */}
                <Select value={direccion} onValueChange={(v) => onDireccionChange(v as Direccion)}>
                    <SelectTrigger className="h-6 w-auto gap-1 border-none bg-transparent px-1 text-xs text-muted-foreground shadow-none hover:bg-accent">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                        <SelectItem value="cualquiera">Cualquiera</SelectItem>
                        <SelectItem value="envia">Envía</SelectItem>
                        <SelectItem value="recibe">Recibe</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Combobox multiple items={items} value={selected} onValueChange={onChange}>
                <div ref={anchor}>
                    <ComboboxChips>
                        {selected.map((id) => {
                            const item = items.find((i) => i.value === id);
                            return item ? <ComboboxChip key={id}>{item.label}</ComboboxChip> : null;
                        })}
                        <ComboboxChipsInput placeholder={placeholder} />
                    </ComboboxChips>
                </div>
                <ComboboxContent anchor={anchor}>
                    <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                    <ComboboxList>
                        <ComboboxCollection>
                            {(item: { value: number; label: string }) => (
                                <ComboboxItem key={item.value} value={item.value}>
                                    {item.label}
                                </ComboboxItem>
                            )}
                        </ComboboxCollection>
                    </ComboboxList>
                </ComboboxContent>
            </Combobox>
        </div>
    );
}

// ─── Página Principal ────────────────────────────────────────────────────────

export default function RastreoOperacionesPage({
    operaciones,
    usuarios,
    clientes,
    proveedores,
    cuentas,
    filtros,
    puedeVerCosto,
    puedeVerRemesas,
    conteoPorTipo,
}: RastreoOperacionesPageProps) {
    const [fecha, setFecha] = useState(filtros.fecha || '');
    const [userId, setUserId] = useState(filtros.user_id || 'all');
    const [tipo, setTipo] = useState(filtros.tipo || 'all');
    const [buscar, setBuscar] = useState(filtros.buscar || '');
    const [clienteIds, setClienteIds] = useState<number[]>((filtros.cliente_ids || []).map(Number));
    const [proveedorIds, setProveedorIds] = useState<number[]>((filtros.proveedor_ids || []).map(Number));
    const [cuentaIds, setCuentaIds] = useState<number[]>((filtros.cuenta_ids || []).map(Number));
    const [clienteDireccion, setClienteDireccion] = useState<Direccion>(filtros.cliente_direccion || 'cualquiera');
    const [proveedorDireccion, setProveedorDireccion] = useState<Direccion>(filtros.proveedor_direccion || 'cualquiera');
    const [cuentaDireccion, setCuentaDireccion] = useState<Direccion>(filtros.cuenta_direccion || 'cualquiera');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const clienteItems = clientes.map((c) => ({ value: c.id, label: c.nombre }));
    const proveedorItems = proveedores.map((p) => ({ value: p.id, label: p.nombre }));
    const cuentaItems = cuentas.map((c) => ({ value: c.id, label: c.nombre }));

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
        cliente_ids: clienteIds,
        proveedor_ids: proveedorIds,
        cuenta_ids: cuentaIds,
        cliente_direccion: clienteDireccion,
        proveedor_direccion: proveedorDireccion,
        cuenta_direccion: cuentaDireccion,
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

    // Mismas 5 columnas de dinero que la tabla en pantalla (Cuenta Envía/Monto/Cuenta que
    // Recibe/Monto/Tasa), aplanadas a texto plano porque el PDF no puede mostrar los badges
    // por pago — se listan separados por coma, mismo orden que sus badges de color.
    const textoCuentaEnvia = (op: Operacion): string => {
        if (op.tipo === 'Compra') {
            const pagos = pagosCompraConOrigen(op);

            return pagos.length > 0 ? pagos.map((p) => p.origen).join(', ') : '—';
        }
        if (op.tipo === 'Remesa') {
            return cuentaEnviaRemesa(op);
        }

        return cuentaEnvia(op);
    };

    const textoMontoEnvia = (op: Operacion): string => {
        if (op.tipo === 'Compra') {
            const partes = pagosCompraConOrigen(op).map((p) => formatMonto(p.monto, 'USD'));
            const pendiente = montoPendienteCompra(op);
            if (pendiente > 0) partes.push(`Deuda pendiente: ${formatMonto(pendiente, 'USD')}`);

            return partes.length > 0 ? partes.join(', ') : '—';
        }
        if (op.tipo === 'Remesa') {
            return montoEnviaRemesa(op);
        }

        return montoEnvia(op);
    };

    const textoCuentaRecibe = (op: Operacion): string => {
        if (op.tipo === 'Venta') {
            return op.detalle_venta?.pagos.map((p) => p.destino).join(', ') || '—';
        }
        if (op.tipo === 'Compra') {
            return cuentaRecibeCompra(op);
        }
        if (op.tipo === 'Remesa') {
            return cuentaRecibeRemesa(op);
        }

        return cuentaRecibeMovimiento(op);
    };

    const textoMontoRecibe = (op: Operacion): string => {
        if (op.tipo === 'Venta') {
            return (
                op.detalle_venta?.pagos.map((p) => (p.moneda ? formatMonto(p.monto_original, p.moneda) : fmt(p.monto_original))).join(', ') || '—'
            );
        }
        if (op.tipo === 'Compra') {
            return formatMonto(op.monto, op.moneda);
        }
        if (op.tipo === 'Remesa') {
            return montoRecibeRemesa(op);
        }

        return montoRecibeMovimiento(op);
    };

    const textoTasa = (op: Operacion): string => {
        if (op.tipo === 'Venta') {
            return op.detalle_venta?.pagos.map((p) => String(p.tasa_cambio)).join(', ') || '—';
        }

        return String(tasaOperacion(op));
    };

    const exportToPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            // jspdf-autotable v5 dejó de enganchar doc.autoTable() como efecto secundario del
            // import (así funcionaba en v3/v4) — ahora exporta una función aparte que recibe
            // el doc como primer argumento. Sin este cambio, doc.autoTable() no existe y el
            // botón tira "TypeError: doc.autoTable is not a function" sin generar nada.
            const { default: autoTable } = await import('jspdf-autotable');
            const doc = new jsPDF({ orientation: 'landscape' });

            doc.setFontSize(18);
            doc.text('REPORTE GENERAL DE OPERACIONES', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);
            if (fecha) {
                doc.text(`Fecha: ${fecha}`, 14, 35);
            }

            const tableData = operaciones.data.map((op) => [
                op.referencia,
                textoCuentaEnvia(op),
                textoMontoEnvia(op),
                textoCuentaRecibe(op),
                textoMontoRecibe(op),
                textoTasa(op),
                op.descripcion || '-',
            ]);

            autoTable(doc, {
                startY: 45,
                head: [['Referencia', 'Cuenta Envía', 'Monto', 'Cuenta que Recibe', 'Monto', 'Tasa de la Operación', 'Detalles']],
                body: tableData,
                styles: { fontSize: 7 },
                headStyles: { fillColor: [71, 85, 105] },
            });

            doc.save(`rastreo_operaciones_${new Date().getTime()}.pdf`);
            sileo.success({ title: 'PDF generado', description: 'El reporte se generó correctamente' });
        } catch (error) {
            console.error('Error generando PDF:', error);
            sileo.error({ title: 'Error al generar', description: 'No se pudo generar el PDF' });
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
                                ? 'Ventas, Gastos, Ingresos, Transferencias, Compras y Operaciones Múltiples del sistema, con detalle completo por operación. Cierres de caja se agregan en fases siguientes.'
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
                <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${puedeVerCosto ? 'lg:grid-cols-7' : 'lg:grid-cols-5'}`}>
                    {resumenTipos
                        .filter(({ tipo }) => (tipo !== 'Compra' || puedeVerCosto) && (tipo !== 'Remesa' || puedeVerRemesas))
                        .map(({ tipo, label, icon: Icon, iconClass }) => (
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
                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="buscar">Buscar</Label>
                                <Input
                                    id="buscar"
                                    placeholder="Descripción, usuario, cuenta, cliente, o el número de referencia (ej. 34)..."
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
                                        <SelectItem value="Ajuste">Ajuste</SelectItem>
                                        {puedeVerCosto && <SelectItem value="Compra">Compra</SelectItem>}
                                        {puedeVerRemesas && <SelectItem value="Remesa">Operación Múltiple</SelectItem>}
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
                            <ComboboxFiltro
                                label="Cliente"
                                items={clienteItems}
                                selected={clienteIds}
                                onChange={setClienteIds}
                                direccion={clienteDireccion}
                                onDireccionChange={setClienteDireccion}
                                placeholder="Buscar cliente..."
                            />
                            <ComboboxFiltro
                                label="Proveedor"
                                items={proveedorItems}
                                selected={proveedorIds}
                                onChange={setProveedorIds}
                                direccion={proveedorDireccion}
                                onDireccionChange={setProveedorDireccion}
                                placeholder="Buscar proveedor..."
                            />
                            <ComboboxFiltro
                                label="Cuenta"
                                items={cuentaItems}
                                selected={cuentaIds}
                                onChange={setCuentaIds}
                                direccion={cuentaDireccion}
                                onDireccionChange={setCuentaDireccion}
                                placeholder="Buscar cuenta..."
                            />
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
                                            const esColapsable =
                                                Boolean(op.detalle_venta) || Boolean(op.detalle_movimiento) || Boolean(op.detalle_compra) || Boolean(op.detalle_remesa);
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
                                                            ) : op.tipo === 'Remesa' ? (
                                                                cuentaEnviaRemesa(op)
                                                            ) : (
                                                                cuentaEnvia(op)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono whitespace-nowrap">
                                                            {op.tipo === 'Compra' ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {pagosCompraConOrigen(op).map((p, i) => (
                                                                        <Badge key={i} variant="outline" className={`font-normal whitespace-nowrap ${colorPago(i)}`}>
                                                                            {formatMonto(p.monto, 'USD')}
                                                                        </Badge>
                                                                    ))}
                                                                    {montoPendienteCompra(op) > 0 && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="border-red-200 bg-red-50 font-normal text-red-700 whitespace-nowrap dark:border-red-800 dark:bg-red-950/20 dark:text-red-300"
                                                                        >
                                                                            Deuda pendiente: {formatMonto(montoPendienteCompra(op), 'USD')}
                                                                        </Badge>
                                                                    )}
                                                                    {pagosCompraConOrigen(op).length === 0 && montoPendienteCompra(op) === 0 && '—'}
                                                                </div>
                                                            ) : op.tipo === 'Remesa' ? (
                                                                montoEnviaRemesa(op)
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
                                                            ) : op.tipo === 'Remesa' ? (
                                                                cuentaRecibeRemesa(op)
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
                                                            ) : op.tipo === 'Remesa' ? (
                                                                montoRecibeRemesa(op)
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
                                                                ) : op.detalle_remesa ? (
                                                                    <DetalleRemesaExpandido detalle={op.detalle_remesa} usuario={op.usuario} />
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
            <Toaster position="top-center" />
        </AppLayout>
    );
}
