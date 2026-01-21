import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, CheckCircle2, Clock, Info, Receipt, User, Wallet, XCircle } from 'lucide-react';
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

interface Cierre {
    id: number;
    user_id: number;
    revisor_id: number;
    fecha_apertura: string;
    fecha_cierre: string;
    saldo_inicial: number;
    ventas_efectivo: number;
    ventas_otros: number;
    total_gastos: number;
    total_devoluciones: number;
    saldo_esperado: number;
    saldo_contado: number;
    diferencia: number;
    observaciones: string | null;
    estado: string;
    usuario: { name: string };
    revisor: { name: string } | null;
    confirmacion_transferencias: string[]; // IDs de transferencias que fueron confirmadas (m_id o p_id)
    detalles: Array<{
        moneda: string;
        tasa_cambio: number;
        ventas_efectivo: number;
        ventas_transferencia: number;
        ingresos_extra: number;
        gastos: number;
        transferencias_salientes: number;
        transferencias_entrantes: number;
        saldo_calculado: number;
        items_ventas: Array<{
            id: string;
            monto: number;
            tipo_pago: string;
            cliente: string;
            hora: string;
            referencia?: string;
            detalles: string;
        }>;
        items_gastos: Array<{ desc: string; monto: number; hora: string }>;
        items_ingresos: Array<{ desc: string; monto: number; hora: string }>;
        items_transferencias: Array<{ id: string; desc: string; monto: number; hora: string }>;
        items_transferencias_salientes: TransferenciaItem[];
        items_transferencias_entrantes: TransferenciaItem[];
    }> | null;
}

interface Props extends PageProps {
    cierre: Cierre;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Detalle de Cierre', href: '#' },
];

export default function Show({ cierre }: Props) {
    const [selectedMoneda, setSelectedMoneda] = useState(cierre.detalles?.[0]?.moneda || 'CUP');

    const activeDetalle = useMemo(
        () => cierre.detalles?.find((d) => d.moneda === selectedMoneda) || cierre.detalles?.[0],
        [selectedMoneda, cierre.detalles],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header Estándar (Estilo Productos/Clientes) */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title={`Reporte de Cierre #${cierre.id}`}
                        description={`Auditoría detallada de movimientos realizados por ${cierre.usuario.name}.`}
                    />
                    <div className="absolute top-1/2 right-6 flex -translate-y-1/2 flex-col items-end gap-2">
                        <Badge variant={cierre.estado === 'aprobado' ? 'default' : 'secondary'} className="px-4 uppercase">
                            {cierre.estado}
                        </Badge>
                        <span className="text-muted-foreground flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="h-3 w-3" /> {new Date(cierre.fecha_cierre).toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Detalles de Movimientos */}
                    <div className="space-y-6 lg:col-span-8">
                        {/* Selector de Moneda */}
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-lg font-bold tracking-tight">Desglose por Moneda</h3>
                            <div className="bg-muted flex rounded-lg p-1">
                                {cierre.detalles?.map((d) => (
                                    <Button
                                        key={d.moneda}
                                        variant={selectedMoneda === d.moneda ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSelectedMoneda(d.moneda)}
                                        className="px-6 font-bold"
                                    >
                                        {d.moneda}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Cards de Resumen */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-emerald-950/30 dark:to-emerald-900/20 dark:shadow-emerald-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-emerald-500/10 p-2">
                                                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <CardTitle className="text-xs font-semibold text-emerald-700 uppercase dark:text-emerald-300">
                                                Efectivo Sistema
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                                {activeDetalle?.items_ventas?.filter((v) => v.tipo_pago === 'efectivo').length || 0} ops
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-emerald-400 dark:to-emerald-500">
                                            ${Number(activeDetalle?.ventas_efectivo || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-100 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/50 to-blue-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-blue-950/30 dark:to-blue-900/20 dark:shadow-blue-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-blue-500/10 p-2">
                                                <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <CardTitle className="text-xs font-semibold text-blue-700 uppercase dark:text-blue-300">
                                                Transferencias Sistema
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-blue-600 dark:text-blue-400">
                                                {activeDetalle?.items_ventas?.filter((v) => v.tipo_pago !== 'efectivo').length || 0} ops
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-blue-400 dark:to-blue-500">
                                            ${Number(activeDetalle?.ventas_transferencia || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-blue-100 text-[9px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-50/50 to-violet-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-violet-950/30 dark:to-violet-900/20 dark:shadow-violet-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-violet-500/10 p-2">
                                                <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <CardTitle className="text-xs font-semibold text-violet-700 uppercase dark:text-violet-300">
                                                Saldo Esperado
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-violet-600 dark:text-violet-400">Neto</div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-violet-600 to-violet-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-violet-400 dark:to-violet-500">
                                            ${Number(activeDetalle?.saldo_calculado || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-violet-100 text-[9px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Listado de Ventas */}
                        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-amber-50/50 to-amber-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-amber-950/30 dark:to-amber-900/20 dark:shadow-amber-900/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="relative border-b border-amber-200/50 bg-amber-50/30 dark:border-amber-800/50 dark:bg-amber-900/30">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="rounded-lg bg-amber-500/10 p-2">
                                            <Receipt className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <span className="bg-gradient-to-r from-amber-700 to-amber-800 bg-clip-text font-semibold dark:from-amber-300 dark:to-amber-400">
                                            Ventas en {selectedMoneda}
                                        </span>
                                    </CardTitle>
                                    <div className="text-right">
                                        <div className="text-[9px] font-medium text-amber-600 dark:text-amber-400">
                                            {activeDetalle?.items_ventas?.length || 0} operaciones
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="relative px-0">
                                <TooltipProvider>
                                    <div className="scrollbar-thin scrollbar-thumb-amber-200 dark:scrollbar-thumb-amber-800 max-h-96 divide-y divide-amber-200/30 overflow-y-auto dark:divide-amber-800/30">
                                        {activeDetalle?.items_ventas.map((v, i) => (
                                            <div
                                                key={i}
                                                className="group/item flex items-center justify-between p-4 transition-all duration-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="rounded bg-amber-100 px-2 py-1 font-mono text-[10px] font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                                        {v.hora}
                                                    </span>
                                                    <span className="truncate font-medium text-amber-800 dark:text-amber-200">{v.cliente}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="border-amber-300 bg-amber-100 text-[9px] font-bold text-amber-700 uppercase dark:border-amber-700 dark:bg-amber-800 dark:text-amber-300"
                                                    >
                                                        {v.tipo_pago}
                                                    </Badge>
                                                    <Badge variant="secondary" className="h-4 px-1 text-[8px]">
                                                        {cierre.confirmacion_transferencias?.includes(v.id) ? (
                                                            <span className="flex items-center gap-0.5 text-emerald-600">
                                                                <CheckCircle2 size={8} /> Confirmada
                                                            </span>
                                                        ) : (
                                                            <span className="text-rose-600">Pendiente</span>
                                                        )}
                                                    </Badge>
                                                    {v.detalles && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button className="text-amber-400 transition-colors hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300">
                                                                    <Info size={14} />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="border-amber-700 bg-amber-900 text-amber-100 dark:border-amber-300 dark:bg-amber-100 dark:text-amber-900">
                                                                <p className="max-w-xs text-xs">{v.detalles}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                                                        ${Number(v.monto).toFixed(2)}
                                                    </span>
                                                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 opacity-0 transition-all duration-300 group-hover:opacity-100 dark:from-amber-600 dark:to-amber-700" />
                                                </div>
                                            </div>
                                        ))}
                                        {(!activeDetalle || activeDetalle.items_ventas.length === 0) && (
                                            <div className="p-8 text-center text-sm text-amber-600 italic dark:text-amber-400">
                                                No hay ventas registradas
                                            </div>
                                        )}
                                    </div>
                                </TooltipProvider>
                            </CardContent>
                        </Card>

                        {/* Detalle de Movimientos Financieros */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {/* Gastos */}
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-rose-50/50 to-rose-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-rose-950/30 dark:to-rose-900/20 dark:shadow-rose-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-rose-500/10 p-2">
                                                <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                            </div>
                                            <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300">Egresos/Gastos</CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-rose-600 dark:text-rose-400">
                                                {activeDetalle?.items_gastos?.length || 0} operaciones
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-rose-400 dark:to-rose-500">
                                            -${Number(activeDetalle?.gastos || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-rose-100 text-[9px] font-bold text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-rose-200 dark:scrollbar-thumb-rose-800 max-h-40 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_gastos.map((g: { desc: string; monto: number; hora: string }, i: number) => (
                                            <div
                                                key={i}
                                                className="group/item border-l-4 border-rose-400 bg-rose-50/30 p-2 transition-colors hover:bg-rose-100/50 dark:border-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                <span className="rounded bg-rose-100 px-2 py-1 font-mono text-[10px] font-medium text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                                                    {g.hora}
                                                                </span>
                                                                <span className="truncate font-medium text-rose-800 dark:text-rose-200">
                                                                    {g.desc}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                                                                    -${Number(g.monto).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {!activeDetalle?.items_gastos?.length && (
                                            <div className="p-4 text-center text-xs text-rose-600 italic dark:text-rose-400">
                                                No hay gastos registrados
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Ingresos */}
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-emerald-950/30 dark:to-emerald-900/20 dark:shadow-emerald-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-emerald-500/10 p-2">
                                                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                Ingresos Extra
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                                {activeDetalle?.items_ingresos?.length || 0} operaciones
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-emerald-400 dark:to-emerald-500">
                                            +${Number(activeDetalle?.ingresos_extra || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-100 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 max-h-40 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_ingresos.map((ing: { desc: string; monto: number; hora: string }, i: number) => (
                                            <div
                                                key={i}
                                                className="group/item border-l-4 border-emerald-400 bg-emerald-50/30 p-2 transition-colors hover:bg-emerald-100/50 dark:border-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                <span className="rounded bg-emerald-100 px-2 py-1 font-mono text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                                    {ing.hora}
                                                                </span>
                                                                <span className="truncate font-medium text-emerald-800 dark:text-emerald-200">
                                                                    {ing.desc}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                    +${Number(ing.monto).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {!activeDetalle?.items_ingresos?.length && (
                                            <div className="p-4 text-center text-xs text-emerald-600 italic dark:text-emerald-400">
                                                No hay ingresos extra registrados
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transferencias/Giros - BIDIRECCIONAL */}
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-indigo-950/30 dark:to-indigo-900/20 dark:shadow-indigo-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="rounded-lg bg-indigo-500/10 p-2">
                                                <Banknote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                Transferencias
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-indigo-600 dark:text-indigo-400">
                                                {(activeDetalle?.items_transferencias_salientes?.length || 0) +
                                                    (activeDetalle?.items_transferencias_entrantes?.length || 0)}{' '}
                                                ops
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text font-mono text-lg font-bold text-transparent dark:from-rose-400 dark:to-rose-500">
                                            Salientes: -${Number(activeDetalle?.transferencias_salientes || 0).toFixed(2)}
                                        </div>
                                        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text font-mono text-lg font-bold text-transparent dark:from-emerald-400 dark:to-emerald-500">
                                            Entrantes: +${Number(activeDetalle?.transferencias_entrantes || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800 max-h-48 space-y-2 overflow-y-auto">
                                        {/* Transferencias Salientes */}
                                        {(activeDetalle?.items_transferencias_salientes || []).map((t: TransferenciaItem, i: number) => {
                                            const confirmada = cierre.confirmacion_transferencias?.includes(t.id);
                                            return (
                                                <div
                                                    key={`saliente_${i}`}
                                                    className="group/item border-l-4 border-rose-400 bg-rose-50/30 p-2 transition-colors hover:bg-rose-100/50 dark:border-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex max-w-40 items-center gap-2 truncate">
                                                            {confirmada ? (
                                                                <div className="flex items-center gap-1 text-emerald-500">
                                                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                                    <span className="text-[9px] font-bold">Confirmada</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-rose-500">
                                                                    <XCircle className="h-3 w-3 shrink-0" />
                                                                    <span className="text-[9px] font-bold">Pendiente</span>
                                                                </div>
                                                            )}
                                                            <span className="font-medium text-rose-700 dark:text-rose-300">↓</span>
                                                            <span className="truncate font-medium" title={t.desc}>
                                                                {t.desc}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono text-sm font-bold text-rose-600 dark:text-rose-400">
                                                                -{Number(t.monto_origen).toFixed(2)} {t.moneda_origen}
                                                            </div>
                                                            {t.moneda_destino !== t.moneda_origen && (
                                                                <div className="text-muted-foreground text-[9px]">
                                                                    → {Number(t.monto_destino).toFixed(2)} {t.moneda_destino}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-muted-foreground mt-1 text-[9px]">
                                                        <span className="font-medium">{t.origen_tipo}:</span> {t.origen_nombre} →{' '}
                                                        <span className="font-medium">{t.destino_tipo}:</span> {t.destino_nombre}
                                                    </div>
                                                    {t.moneda_destino !== t.moneda_origen && (
                                                        <div className="text-[9px] text-indigo-600 dark:text-indigo-400">
                                                            Tasa: 1 {t.moneda_destino} = {t.tasa_cambio} {t.moneda_origen}
                                                        </div>
                                                    )}
                                                    <div className="text-muted-foreground mt-1 text-[8px]">
                                                        {t.hora} {t.afecta_saldo_usuario ? '• Afecta saldo' : ''}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Transferencias Entrantes */}
                                        {(activeDetalle?.items_transferencias_entrantes || []).map((t: TransferenciaItem, i: number) => {
                                            const confirmada = cierre.confirmacion_transferencias?.includes(t.id);
                                            return (
                                                <div
                                                    key={`entrante_${i}`}
                                                    className="group/item border-l-4 border-emerald-400 bg-emerald-50/30 p-2 transition-colors hover:bg-emerald-100/50 dark:border-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex max-w-40 items-center gap-2 truncate">
                                                            {confirmada ? (
                                                                <div className="flex items-center gap-1 text-emerald-500">
                                                                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                                                                    <span className="text-[9px] font-bold">Confirmada</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 text-rose-500">
                                                                    <XCircle className="h-3 w-3 shrink-0" />
                                                                    <span className="text-[9px] font-bold">Pendiente</span>
                                                                </div>
                                                            )}
                                                            <span className="font-medium text-emerald-700 dark:text-emerald-300">↑</span>
                                                            <span className="truncate font-medium" title={t.desc}>
                                                                {t.desc}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                +{Number(t.monto_destino).toFixed(2)} {t.moneda_destino}
                                                            </div>
                                                            {t.moneda_destino !== t.moneda_origen && (
                                                                <div className="text-muted-foreground text-[9px]">
                                                                    ← {Number(t.monto_origen).toFixed(2)} {t.moneda_origen}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-muted-foreground mt-1 text-[9px]">
                                                        <span className="font-medium">{t.origen_tipo}:</span> {t.origen_nombre} →{' '}
                                                        <span className="font-medium">{t.destino_tipo}:</span> {t.destino_nombre}
                                                    </div>
                                                    {t.moneda_destino !== t.moneda_origen && (
                                                        <div className="text-[9px] text-indigo-600 dark:text-indigo-400">
                                                            Tasa: 1 {t.moneda_destino} = {t.tasa_cambio} {t.moneda_origen}
                                                        </div>
                                                    )}
                                                    <div className="text-muted-foreground mt-1 text-[8px]">{t.hora}</div>
                                                </div>
                                            );
                                        })}

                                        {!activeDetalle?.items_transferencias_salientes?.length &&
                                            !activeDetalle?.items_transferencias_entrantes?.length && (
                                                <div className="text-muted-foreground p-4 text-center text-xs italic">
                                                    No hay transferencias registradas
                                                </div>
                                            )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Resumen de Auditoría */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* Card de Auditoría con Gradiente */}
                        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50/50 to-slate-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-slate-950/30 dark:to-slate-900/20 dark:shadow-slate-900/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="relative border-b border-slate-200/50 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/30">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-slate-500/10 p-2">
                                            <Wallet className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text font-semibold dark:from-slate-300 dark:to-slate-400">
                                            Auditoría Final
                                        </span>
                                    </div>
                                    <Badge
                                        variant={cierre.estado === 'aprobado' ? 'default' : 'secondary'}
                                        className="px-3 text-[9px] font-bold uppercase"
                                    >
                                        {cierre.estado}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative space-y-4 pt-6">
                                {/* Saldo Contado */}
                                <div className="rounded-lg border border-slate-200/50 bg-gradient-to-r from-slate-50 to-slate-100 p-4 dark:border-slate-800/50 dark:from-slate-900 dark:to-slate-950">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-600 uppercase dark:text-slate-400">Saldo Contado</span>
                                        <span className="bg-gradient-to-r from-slate-600 to-slate-700 bg-clip-text font-mono text-2xl font-black text-transparent dark:from-slate-400 dark:to-slate-500">
                                            ${Number(cierre.saldo_contado ?? 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Diferencia con Colores Dinámicos */}
                                <div
                                    className={`rounded-lg border p-4 transition-all duration-300 ${
                                        cierre.diferencia === 0
                                            ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20'
                                            : 'border-rose-500/30 bg-gradient-to-br from-rose-50/50 to-rose-100/30 dark:from-rose-950/30 dark:to-rose-900/20'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div
                                            className={`text-[10px] font-black tracking-wider uppercase ${
                                                cierre.diferencia === 0
                                                    ? 'text-emerald-700 dark:text-emerald-300'
                                                    : 'text-rose-700 dark:text-rose-300'
                                            }`}
                                        >
                                            Diferencia Final
                                        </div>
                                        <div
                                            className={`font-mono text-xl font-bold ${
                                                cierre.diferencia === 0
                                                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent dark:from-emerald-400 dark:to-emerald-500'
                                                    : 'bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text text-transparent dark:from-rose-400 dark:to-rose-500'
                                            }`}
                                        >
                                            {Number(cierre.diferencia ?? 0) >= 0 ? '+' : ''}
                                            {Number(cierre.diferencia ?? 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <Separator className="bg-slate-200/50 dark:bg-slate-800/50" />

                                {/* Observaciones */}
                                <div className="space-y-2">
                                    <h4 className="text-[10px] font-black text-slate-600 uppercase dark:text-slate-400">Observaciones</h4>
                                    <p className="rounded-lg border border-slate-200/30 bg-slate-50/50 p-3 text-xs leading-relaxed text-slate-600 italic dark:border-slate-800/30 dark:bg-slate-900/50 dark:text-slate-400">
                                        {cierre.observaciones || 'Sin notas adicionales.'}
                                    </p>
                                </div>

                                {/* Auditor */}
                                <div className="flex items-center gap-3 rounded-lg border border-slate-200/30 bg-slate-50/30 p-4 dark:border-slate-800/30 dark:bg-slate-900/30">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                                        <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {cierre.revisor?.name || 'Sistema (Auto)'}
                                        </div>
                                        <div className="text-[9px] text-slate-600 uppercase dark:text-slate-400">Auditor Responsable</div>
                                    </div>
                                </div>

                                {/* Fecha del Cierre */}
                                <div className="flex items-center justify-between rounded-lg border border-slate-200/30 bg-slate-50/30 p-3 dark:border-slate-800/30 dark:bg-slate-900/30">
                                    <span className="text-[9px] text-slate-600 uppercase dark:text-slate-400">Fecha de Cierre</span>
                                    <span className="font-mono text-[10px] font-medium text-slate-700 dark:text-slate-300">
                                        {new Date(cierre.fecha_cierre).toLocaleString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
