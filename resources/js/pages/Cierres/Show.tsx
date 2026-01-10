import { CountingNumber } from '@/Components/animated/counter-number';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import AppLayout from '@/Layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock, HelpCircle, Receipt, User, Wallet } from 'lucide-react';
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
            confirmada: boolean;
            cliente: string;
            hora: string;
            referencia?: string;
        }>;
        items_gastos: Array<{ desc: string; monto: number; hora: string; origen: string }>;
        items_ingresos: Array<{ desc: string; monto: number; hora: string; destino: string }>;
        items_transferencias: Array<{ desc: string; monto: number; hora: string; origen: string; destino: string }>;
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

    const activeDetalle = useMemo(() =>
        cierre.detalles?.find(d => d.moneda === selectedMoneda) || cierre.detalles?.[0]
        , [selectedMoneda, cierre.detalles]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />

            <div className="p-4 md:p-6 space-y-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant={cierre.estado === 'aprobado' ? 'default' : 'secondary'} className="uppercase">
                                {cierre.estado}
                            </Badge>
                            <span className="text-xs text-slate-400 font-mono">#{cierre.id}</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Reporte de Cierre</h1>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><User className="h-4 w-4" /> {cierre.usuario.name}</span>
                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {new Date(cierre.fecha_cierre).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        {cierre.detalles?.map(d => (
                            <Button
                                key={d.moneda}
                                variant={selectedMoneda === d.moneda ? 'default' : 'secondary'}
                                size="sm"
                                onClick={() => setSelectedMoneda(d.moneda)}
                                className="font-bold"
                            >
                            <div className="space-y-6 lg:col-span-4">
                                <Card className="rounded-2xl border-none bg-slate-900 p-6 text-white shadow-xl">
                                    <h3 className="mb-4 text-xs font-black tracking-[0.2em] text-slate-500 uppercase">Notas y Auditoría</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <span className="mb-2 block text-[10px] font-bold text-slate-400 uppercase">
                                                Observaciones del Cajero
                                            </span>
                                            <p className="text-sm leading-relaxed text-slate-200 italic">
                                                {cierre.observaciones || 'El usuario no dejó notas específicas para este cierre.'}
                                            </p>
                                        </div>
                                        <Separator className="bg-white/10" />
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <span className="mb-1 block text-[10px] font-bold text-indigo-400 text-slate-400 uppercase">
                                                    Giro de Cuenta
                                                </span>
                                                <div className="text-lg font-black">
                                                    {Number(activeDetalle?.transferencias_salientes || 0).toFixed(2)} {selectedMoneda}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="mb-1 block text-[10px] font-bold text-amber-400 uppercase">Revisor</span>
                                                <div className="text-sm font-bold text-slate-400">
                                                    {cierre.revisor?.name || 'Pendiente de revisión'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                            <Wallet className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm leading-none font-black text-slate-900">Resumen Moneda</h4>
                                            <span className="text-[10px] font-bold tracking-tighter text-slate-400 uppercase">
                                                Esperado en {selectedMoneda}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-3xl font-black text-indigo-600">{activeDetalle?.saldo_calculado?.toLocaleString()}</div>
                                    <p className="mt-2 text-[10px] font-medium text-slate-400">
                                        Este valor representa el total calculado por el sistema considerando ventas, gastos e ingresos en esta moneda
                                        específica.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
