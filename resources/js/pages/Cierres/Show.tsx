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
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-emerald-500/10 p-2">
                                            <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <CardTitle className="text-xs font-semibold text-emerald-700 uppercase dark:text-emerald-300">
                                            Efectivo Sistema
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-emerald-400 dark:to-emerald-500">
                                        ${Number(activeDetalle?.ventas_efectivo || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50/50 to-blue-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-blue-950/30 dark:to-blue-900/20 dark:shadow-blue-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-blue-500/10 p-2">
                                            <Banknote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <CardTitle className="text-xs font-semibold text-blue-700 uppercase dark:text-blue-300">
                                            Transferencias Sistema
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-blue-400 dark:to-blue-500">
                                        ${Number(activeDetalle?.ventas_transferencia || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-50/50 to-violet-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-violet-950/30 dark:to-violet-900/20 dark:shadow-violet-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-violet-500/10 p-2">
                                            <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <CardTitle className="text-xs font-semibold text-violet-700 uppercase dark:text-violet-300">
                                            Saldo Esperado
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative">
                                    <div className="flex items-center justify-between">
                                        <div className="bg-gradient-to-r from-violet-600 to-violet-700 bg-clip-text font-mono text-2xl font-bold text-transparent dark:from-violet-400 dark:to-violet-500">
                                            ${Number(activeDetalle?.saldo_calculado || 0).toFixed(2)}
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className="bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                                        >
                                            {selectedMoneda}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Listado de Ventas */}
                        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50/50 to-slate-100/30 shadow-lg transition-all duration-300 dark:from-slate-950/30 dark:to-slate-900/20 dark:shadow-slate-900/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="relative border-b border-slate-200/50 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/30">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <div className="rounded-lg bg-slate-500/10 p-2">
                                        <Receipt className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text font-semibold dark:from-slate-300 dark:to-slate-400">
                                        Ventas en {selectedMoneda}
                                    </span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="relative px-0">
                                <TooltipProvider>
                                    <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 max-h-96 divide-y divide-slate-200/30 overflow-y-auto dark:divide-slate-800/30">
                                        {activeDetalle?.items_ventas.map((v, i) => (
                                            <div
                                                key={i}
                                                className="group/item flex items-center justify-between p-4 transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                        {v.hora}
                                                    </span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{v.cliente}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className="border-slate-300 bg-slate-100 text-[9px] font-bold text-slate-700 uppercase dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
                                                                <button className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                                                                    <Info size={14} />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="border-slate-700 bg-slate-900 text-slate-100 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-900">
                                                                <p className="max-w-xs text-xs">{v.detalles}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        ${Number(v.monto).toFixed(2)}
                                                    </span>
                                                    <div className="h-2 w-2 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 opacity-0 transition-all duration-300 group-hover:opacity-100 dark:from-slate-600 dark:to-slate-700" />
                                                </div>
                                            </div>
                                        ))}
                                        {(!activeDetalle || activeDetalle.items_ventas.length === 0) && (
                                            <div className="p-8 text-center text-sm text-slate-500 italic dark:text-slate-400">
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
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-rose-500/10 p-2">
                                            <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                        </div>
                                        <CardTitle className="text-sm font-semibold text-rose-700 dark:text-rose-300">Egresos/Gastos</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="bg-gradient-to-r from-rose-600 to-rose-700 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-rose-400 dark:to-rose-500">
                                        -${Number(activeDetalle?.gastos || 0).toFixed(2)}
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-rose-200 dark:scrollbar-thumb-rose-800 max-h-32 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_gastos.map((g: { desc: string; monto: number; hora: string }, i: number) => (
                                            <div
                                                key={i}
                                                className="group/item flex justify-between border-b border-rose-200/30 pb-1 text-[11px] transition-colors hover:bg-rose-50/50 dark:border-rose-800/30 dark:hover:bg-rose-950/30"
                                            >
                                                <span className="text-muted-foreground mr-2 max-w-25 truncate">{g.desc}</span>
                                                <span className="font-mono text-rose-600 dark:text-rose-400">-${Number(g.monto).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Ingresos */}
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-emerald-950/30 dark:to-emerald-900/20 dark:shadow-emerald-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-emerald-500/10 p-2">
                                            <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Ingresos Extra</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-emerald-400 dark:to-emerald-500">
                                        +${Number(activeDetalle?.ingresos_extra || 0).toFixed(2)}
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 max-h-32 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_ingresos.map((ing: { desc: string; monto: number; hora: string }, i: number) => (
                                            <div
                                                key={i}
                                                className="group/item flex justify-between border-b border-emerald-200/30 pb-1 text-[11px] transition-colors hover:bg-emerald-50/50 dark:border-emerald-800/30 dark:hover:bg-emerald-950/30"
                                            >
                                                <span className="text-muted-foreground mr-2 max-w-25 truncate">{ing.desc}</span>
                                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                                    +${Number(ing.monto).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Transferencias/Giros */}
                            <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-indigo-950/30 dark:to-indigo-900/20 dark:shadow-indigo-900/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                <CardHeader className="relative pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-indigo-500/10 p-2">
                                            <Banknote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Giros/Transf.</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
                                    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text font-mono text-xl font-bold text-transparent dark:from-indigo-400 dark:to-indigo-500">
                                        -${Number(activeDetalle?.transferencias_salientes || 0).toFixed(2)}
                                    </div>
                                    <div className="scrollbar-thin scrollbar-thumb-indigo-200 dark:scrollbar-thumb-indigo-800 max-h-32 space-y-2 overflow-y-auto">
                                        {activeDetalle?.items_transferencias.map(
                                            (t: { id: string; desc: string; monto: number; hora: string }, i: number) => {
                                                const confirmada = cierre.confirmacion_transferencias?.includes(t.id);
                                                return (
                                                    <div
                                                        key={i}
                                                        className="group/item flex items-center justify-between border-b border-indigo-200/30 pb-1 text-[11px] transition-colors hover:bg-indigo-50/50 dark:border-indigo-800/30 dark:hover:bg-indigo-950/30"
                                                    >
                                                        <div className="flex max-w-25 items-center gap-2 truncate">
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
                                                            <span className="truncate font-medium" title={t.desc}>
                                                                {t.desc}
                                                            </span>
                                                        </div>
                                                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                                            -${Number(t.monto).toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Resumen de Auditoría */}
                    <div className="space-y-6 lg:col-span-4">
                        <Card className="border-primary/20 relative overflow-hidden shadow-lg">
                            <CardHeader className="bg-primary/5">
                                <CardTitle className="text-primary flex items-center gap-2 font-bold">
                                    <Wallet className="h-5 w-5" /> Auditoría Final
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <div className="space-y-3">
                                    <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
                                        <span className="text-muted-foreground text-xs font-bold uppercase">Saldo Contado:</span>
                                        <span className="font-mono text-2xl font-black">${Number(cierre.saldo_contado ?? 0).toFixed(2)}</span>
                                    </div>

                                    <div
                                        className={`flex items-center justify-between rounded-lg border p-4 ${cierre.diferencia === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700' : 'border-rose-500/20 bg-rose-500/10 text-rose-700'}`}
                                    >
                                        <div className="text-[10px] font-black tracking-wider uppercase">Diferencia Final</div>
                                        <div className="font-mono text-xl font-bold">
                                            {Number(cierre.diferencia ?? 0) >= 0 ? '+' : ''}
                                            {Number(cierre.diferencia ?? 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-muted-foreground mb-2 text-[10px] font-black uppercase">Observaciones</h4>
                                        <p className="bg-muted/30 text-muted-foreground rounded-lg border p-3 text-xs leading-relaxed italic">
                                            {cierre.observaciones || 'Sin notas adicionales.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 border-t pt-4">
                                        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                                            <User className="text-muted-foreground h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold">{cierre.revisor?.name || 'Sistema (Auto)'}</div>
                                            <div className="text-muted-foreground text-[9px] uppercase">Auditor Responsable</div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
