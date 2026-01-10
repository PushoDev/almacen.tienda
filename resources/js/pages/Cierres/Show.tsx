import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, CheckCircle2, Clock, Receipt, User, Wallet, XCircle } from 'lucide-react';
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
    confirmacion_transferencias: number[]; // IDs de transferencias que fueron confirmadas
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
            id: number;
            monto: number;
            tipo_pago: string;
            cliente: string;
            hora: string;
            referencia?: string;
        }>;
        items_gastos: Array<{ desc: string; monto: number; hora: string }>;
        items_ingresos: Array<{ desc: string; monto: number; hora: string }>;
        items_transferencias: Array<{ id: number; desc: string; monto: number; hora: string }>;
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
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-muted-foreground text-xs font-semibold uppercase">Efectivo Sistema</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="font-mono text-2xl font-bold">${Number(activeDetalle?.ventas_efectivo || 0).toFixed(2)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-muted-foreground text-xs font-semibold uppercase">Transferencias Sistema</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="font-mono text-2xl font-bold">${Number(activeDetalle?.ventas_transferencia || 0).toFixed(2)}</div>
                                </CardContent>
                            </Card>
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-primary text-xs font-semibold uppercase">Saldo Esperado ({selectedMoneda})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-primary font-mono text-2xl font-bold">
                                        ${Number(activeDetalle?.saldo_calculado || 0).toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Listado de Ventas */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Receipt className="h-5 w-5" /> Detalle de Ventas ({selectedMoneda})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0">
                                <div className="divide-y text-sm">
                                    {activeDetalle?.items_ventas.map((v, i) => (
                                        <div key={i} className="hover:bg-muted/30 flex items-center justify-between p-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-muted-foreground font-mono text-[10px]">{v.hora}</span>
                                                <span className="font-medium">{v.cliente}</span>
                                                <Badge variant="outline" className="text-[9px] uppercase">
                                                    {v.tipo_pago}
                                                </Badge>
                                            </div>
                                            <span className="font-mono font-bold">${Number(v.monto).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Movimientos Financieros */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm text-rose-600">
                                        <ArrowDownCircle className="h-4 w-4" /> Egresos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-xl font-bold">-${Number(activeDetalle?.gastos || 0).toFixed(2)}</div>
                                    <div className="space-y-1">
                                        {activeDetalle?.items_gastos.map((g, i) => (
                                            <div key={i} className="flex justify-between border-b border-dashed pb-1 text-[11px]">
                                                <span className="text-muted-foreground max-w-25 truncate">{g.desc}</span>
                                                <span className="font-mono">-${Number(g.monto).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm text-emerald-600">
                                        <ArrowUpCircle className="h-4 w-4" /> Ingresos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-xl font-bold">+${Number(activeDetalle?.ingresos_extra || 0).toFixed(2)}</div>
                                    <div className="space-y-1">
                                        {activeDetalle?.items_ingresos.map((ing, i) => (
                                            <div key={i} className="flex justify-between border-b border-dashed pb-1 text-[11px]">
                                                <span className="text-muted-foreground max-w-25 truncate">{ing.desc}</span>
                                                <span className="font-mono">+${Number(ing.monto).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm text-indigo-600">
                                        <Banknote className="h-4 w-4" /> Giros Confirmados
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="text-xl font-bold">-${Number(activeDetalle?.transferencias_salientes || 0).toFixed(2)}</div>
                                    <div className="space-y-1">
                                        {activeDetalle?.items_transferencias.map((t, i) => {
                                            const confirmada = cierre.confirmacion_transferencias?.includes(t.id);
                                            return (
                                                <div key={i} className="flex items-center justify-between border-b border-dashed pb-1 text-[11px]">
                                                    <div className="flex max-w-25 items-center gap-2 truncate">
                                                        {confirmada ? (
                                                            <CheckCircle2
                                                                className="h-3 w-3 shrink-0 text-emerald-500"
                                                                title="Confirmada en destino"
                                                            />
                                                        ) : (
                                                            <XCircle className="text-muted-foreground h-3 w-3 shrink-0" title="No confirmada" />
                                                        )}
                                                        <span className="truncate">{t.desc}</span>
                                                    </div>
                                                    <span className="font-mono">-${Number(t.monto).toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
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
                                        <span className="font-mono text-2xl font-black">${cierre.saldo_contado.toFixed(2)}</span>
                                    </div>

                                    <div
                                        className={`flex items-center justify-between rounded-lg border p-4 ${cierre.diferencia === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700' : 'border-rose-500/20 bg-rose-500/10 text-rose-700'}`}
                                    >
                                        <div className="text-[10px] font-black tracking-wider uppercase">Diferencia Final</div>
                                        <div className="font-mono text-xl font-bold">
                                            {cierre.diferencia >= 0 ? '+' : ''}
                                            {cierre.diferencia.toFixed(2)}
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
