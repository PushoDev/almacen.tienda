import HeadingSmall from '@/components/heading-small';
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
import { ChevronDown, ChevronRight, FileText, History, Search } from 'lucide-react';
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
        ganancia_operacional: number;
        comision_pv_usd: number;
        comision_pv_cup: number | null;
        ganancia_agencia: number;
        ganancia_perdida_cambiaria: number;
        ganancia_real_total: number;
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
        start_date?: string;
        end_date?: string;
        user_id?: string;
    };
    puedeVerCosto: boolean;
}

const fmt = (n: number | null | undefined, sufijo = '') => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}${sufijo}`);

// El detalle de Venta siempre está en USD; Gasto/Ingreso/Transferencia pueden ser
// USD/CUP/MLC según la cuenta origen/destino — mostrar siempre la moneda explícita,
// no asumir que un número sin sigla es USD.
const formatMonto = (monto: number, moneda: string) => `${moneda} ${monto.toFixed(2)}`;

const colorTipo = (tipo: string) => {
    switch (tipo) {
        case 'Venta':
            return 'text-emerald-500';
        case 'Gasto':
            return 'text-rose-500';
        case 'Ingreso':
            return 'text-sky-500';
        case 'Transferencia':
            return 'text-amber-500';
        default:
            return 'text-foreground';
    }
};

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
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Destino</th>
                                <th className="px-4 py-1.5 text-left font-medium uppercase">Vía</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sidebar-border/40">
                            {detalle.pagos.map((p, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-1.5 capitalize">{p.metodo}</td>
                                    <td className="px-4 py-1.5">{p.moneda ?? '—'}</td>
                                    <td className="px-4 py-1.5 font-mono">{fmt(p.monto_original)}</td>
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
                        {detalle.productos.map((d, i) => (
                            <tr key={i}>
                                <td className="flex items-center gap-2 px-4 py-1.5">
                                    {d.imagen_url && <img src={d.imagen_url} alt="" className="h-6 w-6 rounded object-cover" />}
                                    {d.producto}
                                </td>
                                <td className="px-4 py-1.5">{d.cantidad}</td>
                                <td className="px-4 py-1.5 font-mono">{fmt(d.precio)}</td>
                                <td className="px-4 py-1.5 font-mono text-muted-foreground">{fmt(d.costo_unitario)}</td>
                                <td className="px-4 py-1.5 font-mono text-emerald-500">{fmt(d.ganancia_unitaria)}</td>
                                <td className="px-4 py-1.5 font-mono text-amber-500">{fmt(d.comision_unitaria)}</td>
                                <td className="px-4 py-1.5 font-mono">{fmt(d.subtotal)}</td>
                            </tr>
                        ))}
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

// ─── Página Principal ────────────────────────────────────────────────────────

export default function RastreoOperacionesPage({ operaciones, usuarios, filtros, puedeVerCosto }: RastreoOperacionesPageProps) {
    const [startDate, setStartDate] = useState(filtros.start_date || '');
    const [endDate, setEndDate] = useState(filtros.end_date || '');
    const [userId, setUserId] = useState(filtros.user_id || 'all');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (key: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const buildParams = (page: number = 1) => ({
        start_date: startDate,
        end_date: endDate,
        user_id: userId === 'all' ? '' : userId,
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
            if (startDate || endDate) {
                doc.text(`Periodo: ${startDate || 'Inicio'} al ${endDate || 'Fin'}`, 20, 35);
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
                        description="Ventas del sistema con detalle de productos, más Gastos e Ingresos. Transferencias, cierres de caja y compras se agregan en fases siguientes."
                    />
                    <History
                        size={70}
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse text-slate-500 opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Filtros de Búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Desde</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Hasta</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha / Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Referencia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border">
                                    {ops.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                                No se encontraron operaciones con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        ops.map((op, idx) => {
                                            const rowKey = `${op.tipo}-${op.id}-${idx}`;
                                            const esColapsable = Boolean(op.detalle_venta);
                                            const expandida = expandedRows.has(rowKey);
                                            return (
                                                <React.Fragment key={rowKey}>
                                                    <tr
                                                        className={`hover:bg-sidebar-accent/30 transition-colors ${esColapsable ? 'cursor-pointer' : ''}`}
                                                        onClick={() => esColapsable && toggleRow(rowKey)}
                                                    >
                                                        <td className={`px-6 py-4 text-sm font-bold whitespace-nowrap ${colorTipo(op.tipo)}`}>
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
                                                                {op.tipo}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            {new Date(op.fecha).toLocaleString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                            {op.referencia}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                            {op.usuario}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-mono whitespace-nowrap">
                                                            {formatMonto(parseFloat(op.monto.toString()), op.moneda)}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                                            {op.descripcion || '-'}
                                                        </td>
                                                    </tr>
                                                    {esColapsable && expandida && op.detalle_venta && (
                                                        <tr>
                                                            <td colSpan={6} className="bg-sidebar-accent/20 px-6 py-3">
                                                                <DetalleVentaExpandido detalle={op.detalle_venta} />
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
