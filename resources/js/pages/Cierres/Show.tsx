import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    ArrowDown,
    ArrowUp,
    Banknote,
    Calculator,
    ChevronDown,
    CreditCard,
    DollarSign,
    Eye,
    Receipt,
    ShoppingCart,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface TransferenciaItem {
    id: string;
    desc: string;
    monto_origen: number;
    moneda_origen: string;
    origen_tipo: string;
    origen_nombre: string;
    monto_destino: number;
    moneda_destino: string;
    destino_tipo: string;
    destino_nombre: string;
    tasa_cambio: number;
    hora: string;
    afecta_saldo_usuario?: boolean;
    es_entrada?: boolean;
}

interface ItemVenta {
    id: string;
    venta_id?: string;
    monto: number;
    monto_equivalente?: number;
    tipo_pago: string;
    confirmada?: boolean;
    referencia?: string;
    cliente: string;
    hora: string;
    detalles?: any;
    moneda_codigo?: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    cliente_nombre?: string | null;
    destino_nombre?: string | null;
}

interface DetalleMoneda {
    moneda: string;
    tasa_cambio: number;
    ventas_efectivo: number;
    ventas_transferencia: number;
    ingresos_extra: number;
    gastos: number;
    transferencias_salientes: number;
    transferencias_entrantes: number;
    saldo_calculado: number;
    items_ventas: ItemVenta[];
    items_gastos: Array<{ id?: string; desc: string; monto: number; hora: string }>;
    items_ingresos: Array<{ id?: string; desc: string; monto: number; hora: string }>;
    items_transferencias: Array<{ id: string; desc: string; monto: number; hora: string }>;
    items_transferencias_salientes: TransferenciaItem[];
    items_transferencias_entrantes: TransferenciaItem[];
    productos_resumen?: Record<string, any>;
    operaciones_detalle?: any[];
}

interface Cierre {
    id: number;
    user_id?: number;
    revisor_id?: number;
    fecha_apertura: string;
    fecha_cierre: string;
    saldo_inicial?: number;
    ventas_efectivo?: number;
    ventas_otros?: number;
    total_gastos?: number;
    total_devoluciones?: number;
    saldo_esperado?: number;
    saldo_contado?: number;
    diferencia?: number;
    observaciones?: string | null;
    estado?: string;
    usuario?: { name: string };
    revisor?: { name: string } | null;
    confirmacion_transferencias?: string[];
    detalles?: DetalleMoneda[] | null;
}

interface Props extends PageProps {
    cierre: Cierre;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Detalle de Cierre', href: '#' },
];

export default function Show({ cierre }: Props) {
    const [showTransaccionesDialog, setShowTransaccionesDialog] = useState(false);
    const [selectedVentaDetails, setSelectedVentaDetails] = useState<{
        show: boolean;
        ventaId: number | null;
    }>({ show: false, ventaId: null });

    // Obtener todas las operaciones de una venta específica
    const getOperacionesPorVenta = (ventaId: number) => {
        const todasOperaciones = (calculos.detalles ?? []).flatMap((d: any) => d.operaciones_detalle ?? []);
        return todasOperaciones.filter((op: any) => op.venta_id === ventaId);
    };

    const operacionSeleccionada = selectedVentaDetails.ventaId ? getOperacionesPorVenta(selectedVentaDetails.ventaId) : [];

    const moneda_referencia = 'USD';

    // Mapear cierre a estructura similar a calculos usada en Create.tsx
    const calculos = useMemo(() => {
        return {
            saldo_inicial: cierre.saldo_inicial || 0,
            ventas_efectivo: cierre.ventas_efectivo || 0,
            ventas_otros: cierre.ventas_otros || 0,
            total_gastos: cierre.total_gastos || 0,
            total_devoluciones: cierre.total_devoluciones || 0,
            saldo_esperado_global: cierre.saldo_esperado || 0,
            detalles: cierre.detalles || [],
            transferencias_resumen: undefined,
        } as any;
    }, [cierre]);

    // Todas las ventas de todas las monedas juntas
    const todosItemsVentas = (calculos.detalles ?? []).flatMap((d: any) => d.items_ventas ?? []);
    const ventaIdsUnicos = new Set(todosItemsVentas.map((v: ItemVenta) => v.venta_id || v.id));
    const totalVentasUnicas = ventaIdsUnicos.size;

    const lineasProductosRaw = (calculos.detalles ?? []).flatMap((d: any) => Object.values(d.productos_resumen ?? {}));
    const lineasProductos = lineasProductosRaw.map((p: any) => ({
        cantidad: Number(p.cantidad) || 0,
        descripcion: (p.nombre || '') + (p.detalles ? ` ${p.detalles}` : ''),
        precio_unitario: Number(p.precio) || 0,
        total: Number(p.total) || 0,
        precio_equivalente: Number(p.precio) || 0,
        total_equivalente: Number(p.total) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s, r) => s + (r.total_equivalente ?? r.total ?? 0), 0);

    const pagosPorMonedaYMetodo = todosItemsVentas.reduce(
        (acc: Record<string, Record<string, { total: number; cantidad: number; totalEquivalente: number }>>, p: any) => {
            const moneda = p.moneda_codigo ?? p.moneda ?? 'USD';
            const via = (p.via_pago || '').toString().trim().toUpperCase();
            const destino = (p.destino_nombre || '').toString().trim();
            let etiqueta: string;
            if (p.tipo_pago === 'efectivo') etiqueta = moneda;
            else etiqueta = via ? (destino ? `${via} ${destino}` : via) : destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`;
            if (!acc[moneda]) acc[moneda] = {};
            if (!acc[moneda][etiqueta]) acc[moneda][etiqueta] = { total: 0, cantidad: 0, totalEquivalente: 0 };
            const monto = Number(p.monto) || 0;
            const equivalente = Number(p.monto_equivalente) || monto;
            acc[moneda][etiqueta].total += monto;
            acc[moneda][etiqueta].totalEquivalente += equivalente;
            acc[moneda][etiqueta].cantidad += 1;
            return acc;
        },
        {},
    );

    const monedasConPagos = Object.keys(pagosPorMonedaYMetodo).sort();

    const totalGastos = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.gastos || 0), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.ingresos_extra || 0), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.transferencias_salientes || 0), 0);

    const todosGastos = (calculos.detalles ?? []).flatMap((d: any) => d.items_gastos ?? []);
    const todosIngresos = (calculos.detalles ?? []).flatMap((d: any) => d.items_ingresos ?? []);
    const todasTransferencias = (calculos.detalles ?? []).flatMap((d: any) => [
        ...(d.items_transferencias_salientes ?? []),
        ...(d.items_transferencias_entrantes ?? []),
    ]);

    // Comisiones a gestores
    const comisionesGestorDetalles = (calculos.detalles ?? []).flatMap((d: any) => d.comisiones_gestor_detalles ?? []);
    const totalComisionesGestor =
        calculos.comisiones_gestor_total ?? comisionesGestorDetalles.reduce((sum: number, item: any) => sum + (Number(item.monto_usd) || 0), 0);

    // Agrupar comisiones de gestores por moneda
    const comisionesPorMoneda = comisionesGestorDetalles.reduce(
        (acc: Record<string, { total: number; count: number }>, item: any) => {
            const moneda = item.moneda_codigo || 'USD';
            if (!acc[moneda]) {
                acc[moneda] = { total: 0, count: 0 };
            }
            acc[moneda].total += Number(item.monto) || 0;
            acc[moneda].count += 1;
            return acc;
        },
        {} as Record<string, { total: number; count: number }>,
    );

    // transferencias resumen por moneda
    const transferenciasResumen = (calculos.detalles ?? []).reduce(
        (acc: Record<string, any>, d: any) => {
            const moneda = d.moneda || 'USD';
            if (!acc[moneda])
                acc[moneda] = { tasa: d.tasa_cambio || 1, salientes: 0, entrantes: 0, neto: 0, items_salientes: [], items_entrantes: [] };
            acc[moneda].salientes += Number(d.transferencias_salientes || 0);
            acc[moneda].entrantes += Number(d.transferencias_entrantes || 0);
            acc[moneda].neto = acc[moneda].entrantes - acc[moneda].salientes;
            acc[moneda].items_salientes = (acc[moneda].items_salientes || []).concat(d.items_transferencias_salientes || []);
            acc[moneda].items_entrantes = (acc[moneda].items_entrantes || []).concat(d.items_transferencias_entrantes || []);
            return acc;
        },
        {} as Record<string, any>,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title={`Reporte de Cierre #${cierre.id}`}
                        description={`Auditoría detallada de movimientos realizados por ${cierre.usuario?.name || 'usuario'}.`}
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

                {/* Widgets estadísticos (como Create.tsx) */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Card className="border-emerald-200 bg-emerald-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                    <ShoppingCart className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Ventas Realizadas</p>
                                    <p className="text-2xl font-bold">{totalVentasUnicas}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-200 bg-blue-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Total Efectivo</p>
                                    <p className="text-2xl font-bold">${Number(calculos.ventas_efectivo || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-purple-200 bg-purple-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                    <CreditCard className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Transferencias</p>
                                    <p className="text-2xl font-bold">${Number(calculos.ventas_otros || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-500/5">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <Banknote className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Monedas Usadas</p>
                                    <p className="text-2xl font-bold">{monedasConPagos.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Resumen global + Auditoría Final */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Auditoría Final */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Wallet className="text-muted-foreground h-4 w-4" />
                                <span>Auditoría Final</span>
                            </CardTitle>
                            <div className="text-muted-foreground px-2 text-[9px] font-bold uppercase">{cierre.estado}</div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="bg-card rounded-lg border p-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Saldo Inicial</span>
                                    <span className="font-mono text-sm font-semibold">{Number(calculos.saldo_inicial || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-card rounded-lg border p-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Esperado</span>
                                    <span className="font-mono text-sm font-semibold">{Number(calculos.saldo_esperado_global || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="bg-card rounded-lg border p-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Contado</span>
                                    <span className="font-mono text-sm font-semibold">{Number(cierre.saldo_contado || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div
                                className={`rounded-lg border p-2.5 ${Number(cierre.diferencia || 0) === 0 ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black">Diferencia</span>
                                    <span
                                        className={`font-mono text-sm font-bold ${Number(cierre.diferencia || 0) >= 0 ? 'text-success' : 'text-destructive'}`}
                                    >
                                        {Number(cierre.diferencia || 0) >= 0 ? '+' : ''}
                                        {Number(cierre.diferencia || 0).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            {cierre.observaciones && (
                                <div className="border-border mt-2 border-t pt-2">
                                    <p className="text-muted-foreground mb-1 text-[10px] font-bold uppercase">Notas</p>
                                    <p className="text-muted-foreground text-xs italic">{cierre.observaciones}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Saldo Esperado */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                                        <Calculator className="text-muted-foreground h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Saldo Esperado en Caja</p>
                                        <p className="text-2xl font-bold">${Number(calculos.saldo_esperado_global || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                                <div className="border-border mt-2 border-t pt-2">
                                    <div className="mb-1 flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Total Productos:</span>
                                        <span className="font-semibold">{lineasProductos.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground">Métodos Pago:</span>
                                        <span className="font-semibold">{monedasConPagos.length}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detalles del Cierre */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-6">
                        {/* Tabla Ventas (productos) */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" /> Ventas del Día
                                </CardTitle>
                                <CardDescription>
                                    Productos vendidos el{' '}
                                    {new Date(cierre.fecha_apertura).toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                    . Importes en {moneda_referencia}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-20">Cantidad</TableHead>
                                            <TableHead>Producto (detalles)</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lineasProductos.length > 0 ? (
                                            lineasProductos.map((linea, idx) => (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{linea.cantidad}</TableCell>
                                                    <TableCell>{linea.descripcion}</TableCell>
                                                    <TableCell className="text-right">
                                                        {(linea.total_equivalente !== undefined
                                                            ? Number(linea.precio_equivalente)
                                                            : Number(linea.precio_unitario)
                                                        ).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {(linea.total_equivalente !== undefined
                                                            ? Number(linea.total_equivalente)
                                                            : Number(linea.total)
                                                        ).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-muted-foreground text-center italic">
                                                    No hay ventas en este turno
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-right font-bold">
                                                Total
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">
                                                {Number(totalVentasProductos).toFixed(2)} {moneda_referencia}
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Por dónde entraron */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Banknote className="h-5 w-5" /> Por dónde entraron
                                </CardTitle>
                                <CardDescription>Cantidad de ventas y total por método, separado por moneda.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {monedasConPagos.length > 0 ? (
                                    monedasConPagos.map((moneda) => {
                                        const metodos = pagosPorMonedaYMetodo[moneda];
                                        const totalMoneda = Object.values(metodos).reduce((s, x) => s + (Number(x.total) || 0), 0);
                                        const cantidadMoneda = Object.values(metodos).reduce((s, x) => s + (x.cantidad || 0), 0);
                                        const totalEquivalenteMoneda = Object.values(metodos).reduce((s, x) => s + (x.totalEquivalente || 0), 0);
                                        const detalleMoneda = (calculos.detalles || []).find((d: any) => d.moneda === moneda);

                                        return (
                                            <div key={moneda} className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold">{moneda}</h4>
                                                <Table>
                                                    <TableHeader className="bg-sidebar-accent hover:bg-sidebar-accent">
                                                        <TableRow>
                                                            <TableHead>Método / Destino</TableHead>
                                                            <TableHead className="w-20 text-center">Operaciones</TableHead>
                                                            <TableHead className="w-32 text-right">Total</TableHead>
                                                            <TableHead className="w-32 text-right">Equiv. USD</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(metodos).map(([etiqueta, data]) => {
                                                            const total = Number(data.total) || 0;
                                                            const totalEquivalente = Number(data.totalEquivalente) || 0;
                                                            const operacionesPorMetodo = (detalleMoneda?.operaciones_detalle || []).filter(
                                                                (op: any) => {
                                                                    const via = (op.via_pago || '').toString().trim().toUpperCase();
                                                                    const destino = (op.destino_nombre || '').toString().trim();
                                                                    let etiquetaMetodo: string;
                                                                    if (op.tipo_pago === 'efectivo') etiquetaMetodo = moneda;
                                                                    else
                                                                        etiquetaMetodo = via
                                                                            ? destino
                                                                                ? `${via} ${destino}`
                                                                                : via
                                                                            : destino
                                                                              ? `Transferencia ${destino}`
                                                                              : `Transferencia ${moneda}`;
                                                                    return etiquetaMetodo === etiqueta;
                                                                },
                                                            );

                                                            return (
                                                                <Collapsible.Root key={`${moneda}-${etiqueta}`} asChild>
                                                                    <>
                                                                        <Collapsible.Trigger asChild>
                                                                            <TableRow className="hover:bg-muted/50 cursor-pointer">
                                                                                <TableCell className="flex items-center gap-2 font-medium">
                                                                                    <ChevronDown className="collapsible-trigger-icon h-4 w-4 transition-transform" />
                                                                                    {etiqueta}
                                                                                </TableCell>
                                                                                <TableCell className="text-center font-mono">
                                                                                    {data.cantidad}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-mono">
                                                                                    {total.toFixed(2)}
                                                                                </TableCell>
                                                                                <TableCell className="text-right font-mono font-medium text-green-600">
                                                                                    ${totalEquivalente.toFixed(2)}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        </Collapsible.Trigger>
                                                                        <Collapsible.Content>
                                                                            <TableRow>
                                                                                <TableCell colSpan={4} className="p-0">
                                                                                    <div className="bg-muted/30 w-full p-4">
                                                                                        <div className="border-muted space-y-3 border-l-2 pl-4">
                                                                                            {operacionesPorMetodo.length > 0 ? (
                                                                                                operacionesPorMetodo.map(
                                                                                                    (operacion: any, idx: number) => (
                                                                                                        <div
                                                                                                            key={idx}
                                                                                                            className="bg-card w-full rounded-md border p-4 shadow-sm"
                                                                                                        >
                                                                                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                                                                                                                <div className="flex items-center gap-2">
                                                                                                                    <span className="font-semibold">
                                                                                                                        Venta #{operacion.venta_id}
                                                                                                                    </span>
                                                                                                                    <span className="text-muted-foreground">
                                                                                                                        -
                                                                                                                    </span>
                                                                                                                    <span>{operacion.cliente}</span>
                                                                                                                    <span className="text-muted-foreground">
                                                                                                                        -
                                                                                                                    </span>
                                                                                                                    <span className="text-muted-foreground">
                                                                                                                        {operacion.hora}
                                                                                                                    </span>
                                                                                                                </div>
                                                                                                                <div className="flex items-center gap-4">
                                                                                                                    <span className="text-muted-foreground text-sm">
                                                                                                                        {operacion.cuenta_nombre &&
                                                                                                                            `Cuenta: ${operacion.cuenta_nombre}`}
                                                                                                                        {operacion.destino_nombre &&
                                                                                                                            ` - ${operacion.destino_nombre}`}
                                                                                                                    </span>
                                                                                                                    <span className="font-mono font-bold text-green-600">
                                                                                                                        $
                                                                                                                        {Number(
                                                                                                                            operacion.monto,
                                                                                                                        ).toFixed(2)}
                                                                                                                    </span>
                                                                                                                    <Button
                                                                                                                        variant="ghost"
                                                                                                                        size="icon"
                                                                                                                        className="text-muted-foreground hover:text-primary h-6 w-6 cursor-pointer"
                                                                                                                        onClick={() =>
                                                                                                                            setSelectedVentaDetails({
                                                                                                                                show: true,
                                                                                                                                ventaId:
                                                                                                                                    operacion.venta_id,
                                                                                                                            })
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <Eye className="h-3 w-3" />
                                                                                                                    </Button>
                                                                                                                </div>
                                                                                                            </div>

                                                                                                            {(operacion.productos?.length ?? 0) >
                                                                                                                0 && (
                                                                                                                <div className="mt-3 w-full overflow-x-auto">
                                                                                                                    <table className="w-full text-xs">
                                                                                                                        <thead className="bg-muted/50">
                                                                                                                            <tr>
                                                                                                                                <th className="px-2 py-1 text-left font-semibold">
                                                                                                                                    Producto
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-left font-semibold">
                                                                                                                                    Marca
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-left font-semibold">
                                                                                                                                    Modelo
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-left font-semibold">
                                                                                                                                    Categoría
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-left font-semibold">
                                                                                                                                    Capacidad
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-center font-semibold">
                                                                                                                                    Cant
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-right font-semibold">
                                                                                                                                    Precio
                                                                                                                                </th>
                                                                                                                                <th className="px-2 py-1 text-right font-semibold">
                                                                                                                                    Total
                                                                                                                                </th>
                                                                                                                            </tr>
                                                                                                                        </thead>
                                                                                                                        <tbody>
                                                                                                                            {operacion.productos?.map(
                                                                                                                                (
                                                                                                                                    prod: any,
                                                                                                                                    pidx: number,
                                                                                                                                ) => (
                                                                                                                                    <tr
                                                                                                                                        key={pidx}
                                                                                                                                        className="border-t"
                                                                                                                                    >
                                                                                                                                        <td className="px-2 py-1">
                                                                                                                                            {
                                                                                                                                                prod.descripcion
                                                                                                                                            }
                                                                                                                                        </td>
                                                                                                                                        <td className="text-muted-foreground px-2 py-1">
                                                                                                                                            {prod.marca ||
                                                                                                                                                '-'}
                                                                                                                                        </td>
                                                                                                                                        <td className="text-muted-foreground px-2 py-1">
                                                                                                                                            {prod.modelo ||
                                                                                                                                                '-'}
                                                                                                                                        </td>
                                                                                                                                        <td className="text-muted-foreground px-2 py-1">
                                                                                                                                            {prod.categoria ||
                                                                                                                                                '-'}
                                                                                                                                        </td>
                                                                                                                                        <td className="text-muted-foreground px-2 py-1">
                                                                                                                                            {prod.capacidad ||
                                                                                                                                                '-'}
                                                                                                                                        </td>
                                                                                                                                        <td className="px-2 py-1 text-center">
                                                                                                                                            {
                                                                                                                                                prod.cantidad
                                                                                                                                            }
                                                                                                                                        </td>
                                                                                                                                        <td className="px-2 py-1 text-right font-mono">
                                                                                                                                            $
                                                                                                                                            {Number(
                                                                                                                                                prod.precio_unitario ||
                                                                                                                                                    prod.total /
                                                                                                                                                        prod.cantidad,
                                                                                                                                            ).toFixed(
                                                                                                                                                2,
                                                                                                                                            )}
                                                                                                                                        </td>
                                                                                                                                        <td className="px-2 py-1 text-right font-mono font-medium">
                                                                                                                                            $
                                                                                                                                            {Number(
                                                                                                                                                prod.total,
                                                                                                                                            ).toFixed(
                                                                                                                                                2,
                                                                                                                                            )}
                                                                                                                                        </td>
                                                                                                                                    </tr>
                                                                                                                                ),
                                                                                                                            )}
                                                                                                                        </tbody>
                                                                                                                    </table>
                                                                                                                </div>
                                                                                                            )}
                                                                                                        </div>
                                                                                                    ),
                                                                                                )
                                                                                            ) : (
                                                                                                <p className="text-muted-foreground text-xs italic">
                                                                                                    Sin detalle de operaciones
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        </Collapsible.Content>
                                                                    </>
                                                                </Collapsible.Root>
                                                            );
                                                        })}
                                                    </TableBody>
                                                    <TableFooter>
                                                        <TableRow>
                                                            <TableCell className="font-bold">Total {moneda}</TableCell>
                                                            <TableCell className="text-center font-mono font-bold">{cantidadMoneda}</TableCell>
                                                            <TableCell className="text-right font-mono font-bold">
                                                                {Number(totalMoneda).toFixed(2)} {moneda}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono font-bold text-green-600">
                                                                ${totalEquivalenteMoneda.toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableFooter>
                                                </Table>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-muted-foreground text-center italic">No hay pagos registrados</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Movimientos Financieros */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calculator className="h-5 w-5" /> Movimientos Financieros
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                {/* Gastos */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b pb-3">
                                        <ArrowUp className="h-5 w-5 text-red-600" />
                                        <h3 className="text-base font-semibold">Gastos</h3>
                                        <span className="ml-auto inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                                            {todosGastos.length} operación{todosGastos.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    {todosGastos.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-red-50/50">
                                                        <TableHead className="w-16 text-red-700">Hora</TableHead>
                                                        <TableHead className="text-red-700">Descripción</TableHead>
                                                        <TableHead className="w-24 text-right text-red-700">Monto</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {todosGastos.map((item: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                            <TableCell className="text-sm">{item.desc}</TableCell>
                                                            <TableCell className="text-right font-mono font-medium text-red-600">
                                                                -${Number(item.monto).toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow className="bg-red-50">
                                                        <TableCell colSpan={2} className="font-bold text-red-700">
                                                            Total Gastos
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-red-600">
                                                            ${Number(totalGastos).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground py-6 text-center text-sm italic">
                                            No hay gastos registrados en este turno.
                                        </p>
                                    )}
                                </div>

                                {/* Ingresos */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b pb-3">
                                        <ArrowDown className="h-5 w-5 text-green-600" />
                                        <h3 className="text-base font-semibold">Ingresos</h3>
                                        <span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                                            {todosIngresos.length} operación{todosIngresos.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    {todosIngresos.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-green-50/50">
                                                        <TableHead className="w-16 text-green-700">Hora</TableHead>
                                                        <TableHead className="text-green-700">Descripción</TableHead>
                                                        <TableHead className="w-24 text-right text-green-700">Monto</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {todosIngresos.map((item: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                            <TableCell className="text-sm">{item.desc}</TableCell>
                                                            <TableCell className="text-right font-mono font-medium text-green-600">
                                                                +${Number(item.monto).toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow className="bg-green-50">
                                                        <TableCell colSpan={2} className="font-bold text-green-700">
                                                            Total Ingresos
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-green-600">
                                                            ${Number(totalIngresos).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground py-6 text-center text-sm italic">
                                            No hay ingresos registrados en este turno.
                                        </p>
                                    )}
                                </div>

                                {/* Transferencias */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b pb-3">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        <h3 className="text-base font-semibold">Transferencias</h3>
                                        <span className="ml-auto inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                                            {todasTransferencias.length} operación{todasTransferencias.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    {todasTransferencias.length > 0 ? (
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-blue-50/50">
                                                        <TableHead className="w-16 text-blue-700">Hora</TableHead>
                                                        <TableHead className="text-blue-700">Descripción</TableHead>
                                                        <TableHead className="text-blue-700">De</TableHead>
                                                        <TableHead className="text-blue-700">Para</TableHead>
                                                        <TableHead className="w-28 text-right text-blue-700">Monto</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {todasTransferencias.map((item: TransferenciaItem, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                            <TableCell className="max-w-xs truncate text-sm">{item.desc}</TableCell>
                                                            <TableCell
                                                                className="text-muted-foreground max-w-[100px] truncate text-xs"
                                                                title={item.origen_nombre}
                                                            >
                                                                {item.origen_nombre}
                                                            </TableCell>
                                                            <TableCell
                                                                className="text-muted-foreground max-w-[100px] truncate text-xs"
                                                                title={item.destino_nombre}
                                                            >
                                                                {item.destino_nombre}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs text-blue-600">
                                                                ${Number(item.monto_origen).toFixed(2)} {item.moneda_origen}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                                <TableFooter>
                                                    <TableRow className="bg-blue-50">
                                                        <TableCell colSpan={4} className="font-bold text-blue-700">
                                                            Total Transferencias
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-blue-600">
                                                            ${Number(totalTransferencias).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableFooter>
                                            </Table>
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground py-6 text-center text-sm italic">
                                            No hay transferencias registradas en este turno.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dialog de Detalle de Transacciones (ahora solo para compatibilidad si es necesario) */}
                        <Dialog open={showTransaccionesDialog} onOpenChange={setShowTransaccionesDialog}>
                            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
                                <DialogHeader className="border-b px-6 pt-6 pb-4">
                                    <DialogTitle>Detalle de Transacciones del Turno</DialogTitle>
                                    <DialogDescription>
                                        Desglose completo de ingresos, gastos y transferencias realizadas durante tu turno.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                    <Tabs defaultValue="gastos" className="w-full">
                                        <TabsList className="mb-4 grid w-full grid-cols-3">
                                            <TabsTrigger value="ingresos">Ingresos ({todosIngresos.length})</TabsTrigger>
                                            <TabsTrigger value="gastos">Gastos ({todosGastos.length})</TabsTrigger>
                                            <TabsTrigger value="transferencias">Transferencias ({todasTransferencias.length})</TabsTrigger>
                                        </TabsList>

                                        {/* Tab Ingresos */}
                                        <TabsContent value="ingresos" className="mt-0">
                                            {todosIngresos.length > 0 ? (
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16">Hora</TableHead>
                                                                <TableHead>Descripción</TableHead>
                                                                <TableHead>Origen</TableHead>
                                                                <TableHead>Destino</TableHead>
                                                                <TableHead className="w-28 text-right">Monto</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {todosIngresos.map((item: any, idx: number) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                                    <TableCell className="text-sm">{item.desc}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">{item.origen}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">{item.destino}</TableCell>
                                                                    <TableCell className="text-right font-mono font-medium text-green-600">
                                                                        +${Number(item.monto).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="font-bold">
                                                                    Total Ingresos
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-green-600">
                                                                    ${Number(totalIngresos).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableFooter>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground py-12 text-center italic">
                                                    No hay ingresos registrados en este turno.
                                                </p>
                                            )}
                                        </TabsContent>

                                        {/* Tab Gastos */}
                                        <TabsContent value="gastos" className="mt-0">
                                            {todosGastos.length > 0 ? (
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16">Hora</TableHead>
                                                                <TableHead>Descripción</TableHead>
                                                                <TableHead>Origen</TableHead>
                                                                <TableHead>Destino</TableHead>
                                                                <TableHead className="w-28 text-right">Monto</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {todosGastos.map((item: any, idx: number) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                                    <TableCell className="text-sm">{item.desc}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">
                                                                        {item.origen || ''}
                                                                    </TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">
                                                                        {item.destino || ''}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono font-medium text-red-600">
                                                                        -${Number(item.monto).toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="font-bold">
                                                                    Total Gastos
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-red-600">
                                                                    ${Number(totalGastos).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableFooter>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground py-12 text-center italic">
                                                    No hay gastos registrados en este turno.
                                                </p>
                                            )}
                                        </TabsContent>

                                        {/* Tab Transferencias */}
                                        <TabsContent value="transferencias" className="mt-0">
                                            {todasTransferencias.length > 0 ? (
                                                <div className="rounded-md border">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-16">Hora</TableHead>
                                                                <TableHead>Descripción</TableHead>
                                                                <TableHead>Origen</TableHead>
                                                                <TableHead>Destino</TableHead>
                                                                <TableHead className="w-32 text-right">Monto</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {todasTransferencias.map((item: TransferenciaItem, idx: number) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                                    <TableCell className="max-w-xs truncate text-sm">{item.desc}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">
                                                                        <div className="max-w-[120px] truncate" title={item.origen_nombre}>
                                                                            {item.origen_nombre}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">
                                                                        <div className="max-w-[120px] truncate" title={item.destino_nombre}>
                                                                            {item.destino_nombre}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono text-xs">
                                                                        <span className="text-blue-600">
                                                                            ${Number(item.monto_origen).toFixed(2)} {item.moneda_origen}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                        <TableFooter>
                                                            <TableRow>
                                                                <TableCell colSpan={4} className="font-bold">
                                                                    Total Transferencias
                                                                </TableCell>
                                                                <TableCell className="text-right font-bold text-blue-600">
                                                                    ${Number(totalTransferencias).toFixed(2)}
                                                                </TableCell>
                                                            </TableRow>
                                                        </TableFooter>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground py-12 text-center italic">
                                                    No hay transferencias registradas en este turno.
                                                </p>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Modal de Detalles de la Venta Completa */}
                        <AlertDialog
                            open={selectedVentaDetails.show}
                            onOpenChange={(open) => setSelectedVentaDetails({ ...selectedVentaDetails, show: open })}
                        >
                            <AlertDialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Detalles de la Venta #{selectedVentaDetails.ventaId}</AlertDialogTitle>
                                </AlertDialogHeader>
                                <div className="space-y-4">
                                    {operacionSeleccionada.length > 0 && (
                                        <>
                                            <div className="bg-muted/50 rounded-md p-3">
                                                <p className="text-muted-foreground text-xs font-semibold uppercase">
                                                    Pagos Realizados ({operacionSeleccionada.length})
                                                </p>
                                            </div>
                                            {operacionSeleccionada.map((op: any, idx: number) => (
                                                <div key={idx} className="rounded-md border p-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">
                                                                {op.tipo_pago === 'efectivo' ? 'Efectivo' : op.via_pago || 'Transferencia'}
                                                            </span>
                                                            {op.cuenta_nombre && (
                                                                <span className="text-muted-foreground text-sm">- {op.cuenta_nombre}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-mono font-bold text-green-600">
                                                            ${Number(op.monto || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="text-muted-foreground mt-2 text-xs">
                                                        <span>Cliente: {op.cliente}</span>
                                                        <span className="mx-2">|</span>
                                                        <span>Hora: {op.hora}</span>
                                                        {op.destino_nombre && (
                                                            <>
                                                                <span className="mx-2">|</span>
                                                                <span>Destino: {op.destino_nombre}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {(op.productos?.length ?? 0) > 0 && (
                                                        <div className="mt-3">
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-muted/30">
                                                                    <tr>
                                                                        <th className="px-2 py-1 text-left font-semibold">Producto</th>
                                                                        <th className="px-2 py-1 text-center font-semibold">Cant</th>
                                                                        <th className="px-2 py-1 text-right font-semibold">Precio</th>
                                                                        <th className="px-2 py-1 text-right font-semibold">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {op.productos?.map((prod: any, pidx: number) => (
                                                                        <tr key={pidx} className="border-t">
                                                                            <td className="px-2 py-1">
                                                                                {prod.descripcion}
                                                                                <div className="text-muted-foreground text-[10px]">
                                                                                    {prod.marca && `${prod.marca} `}
                                                                                    {prod.modelo && `${prod.modelo} `}
                                                                                    {prod.categoria && `(${prod.categoria})`}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-2 py-1 text-center">{prod.cantidad}</td>
                                                                            <td className="px-2 py-1 text-right font-mono">
                                                                                ${Number(prod.precio_unitario || 0).toFixed(2)}
                                                                            </td>
                                                                            <td className="px-2 py-1 text-right font-mono font-medium">
                                                                                ${Number(prod.total || 0).toFixed(2)}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold">Total Venta:</span>
                                                    <span className="font-mono text-lg font-bold text-green-600">
                                                        $
                                                        {operacionSeleccionada
                                                            .reduce((sum: number, op: any) => sum + (Number(op.monto) || 0), 0)
                                                            .toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="cursor-pointer">Cerrar</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
