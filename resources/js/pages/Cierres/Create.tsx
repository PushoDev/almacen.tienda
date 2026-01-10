import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Calculator, Clock, Receipt } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface Calculos {
    inicio_turno: string;
    saldo_inicial: number;
    ventas_efectivo: number;
    ventas_otros: number;
    saldo_esperado_global: number;
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
            referencia: string;
            cliente: string;
            hora: string;
        }>;
        items_gastos: Array<{ desc: string; monto: number; hora: string; origen: string }>;
        items_ingresos: Array<{ desc: string; monto: number; hora: string; destino: string }>;
        items_transferencias: Array<{ desc: string; monto: number; hora: string; origen: string; destino: string }>;
    }>;
}

interface Props extends PageProps {
    calculos: Calculos;
}

const DENOMINATIONS: { [key: string]: number[] } = {
    CUP: [1000, 500, 200, 100, 50, 20, 10, 5, 1],
    USD: [100, 50, 20, 10, 5, 2, 1],
    MLC: [100, 50, 20, 10, 5, 2, 1],
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Nuevo Cierre', href: '#' },
];

export default function Create({ auth, calculos }: Props) {
    const [selectedMoneda, setSelectedMoneda] = useState(calculos.detalles[0]?.moneda || 'CUP');
    const [counts, setCounts] = useState<{ [key: string]: { [denom: number]: number } }>({});

    const activeDetalle = useMemo(
        () => calculos.detalles.find((d) => d.moneda === selectedMoneda) || calculos.detalles[0],
        [selectedMoneda, calculos.detalles],
    );

    const { data, setData, post, processing, errors } = useForm({
        saldo_inicial: calculos.saldo_inicial,
        ventas_efectivo: calculos.ventas_efectivo,
        ventas_otros: calculos.ventas_otros,
        total_gastos: activeDetalle?.gastos || 0,
        total_devoluciones: 0,
        saldo_contado: '',
        observaciones: '',
        fecha_apertura: calculos.inicio_turno,
        saldo_esperado_global: calculos.saldo_esperado_global,
        arqueo_detalles: {} as any, // Para persistir el desglose
    });

    const totalContadoMoneda = useMemo(() => {
        const monCounts = counts[selectedMoneda] || {};
        return Object.entries(monCounts).reduce((acc, [denom, qty]) => acc + Number(denom) * qty, 0);
    }, [counts, selectedMoneda]);

    const totalContadoGlobalUSD = useMemo(() => {
        return calculos.detalles.reduce((total, d) => {
            const monCounts = counts[d.moneda] || {};
            const monTotal = Object.entries(monCounts).reduce((acc, [denom, qty]) => acc + Number(denom) * qty, 0);
            return total + monTotal / (d.tasa_cambio || 1);
        }, 0);
    }, [counts, calculos.detalles]);

    useEffect(() => {
        setData((prev) => ({
            ...prev,
            saldo_contado: totalContadoGlobalUSD.toFixed(2),
            arqueo_detalles: counts,
        }));
    }, [totalContadoGlobalUSD, counts]);

    const handleCountChange = (moneda: string, denom: number, val: string) => {
        const qty = parseInt(val) || 0;
        setCounts((prev) => ({
            ...prev,
            [moneda]: {
                ...(prev[moneda] || {}),
                [denom]: qty,
            },
        }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('ventas.cierres.store'));
    };

    const diferencia = totalContadoMoneda - (activeDetalle?.saldo_calculado || 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Arqueo de Caja" />

            <div className="space-y-6 p-4 md:p-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Arqueo de Turno</h1>
                        <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>Iniciado: {new Date(calculos.inicio_turno).toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {calculos.detalles.map((d) => (
                            <Button
                                key={d.moneda}
                                variant={selectedMoneda === d.moneda ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedMoneda(d.moneda)}
                                className="min-w-20 font-bold"
                            >
                                {d.moneda}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Detalle de Movimientos */}
                    <div className="space-y-6 lg:col-span-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-muted-foreground text-xs font-semibold uppercase">Efectivo Sistema</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="font-mono text-2xl font-bold">${Number(activeDetalle?.ventas_efectivo || 0).toFixed(2)}</div>
                                    <p className="text-muted-foreground mt-1 text-[10px]">Ventas registradas en efectivo</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-muted-foreground text-xs font-semibold uppercase">Transferencias</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="font-mono text-2xl font-bold">${Number(activeDetalle?.ventas_transferencia || 0).toFixed(2)}</div>
                                    <p className="text-muted-foreground mt-1 text-[10px]">
                                        {activeDetalle?.items_ventas.filter((v) => v.tipo_pago !== 'efectivo').length} transacciones
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-primary text-xs font-semibold uppercase">Saldo Esperado</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-primary font-mono text-2xl font-bold">
                                        ${Number(activeDetalle?.saldo_calculado || 0).toFixed(2)}
                                    </div>
                                    <p className="text-primary/60 mt-1 text-[10px]">Incluye ventas, gastos e ingresos</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Listado de Ventas Recientes */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Receipt className="h-5 w-5" />
                                    Detalle de Ventas ({selectedMoneda})
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-0">
                                <div className="divide-y">
                                    {activeDetalle?.items_ventas.map((v) => (
                                        <div key={v.id} className="hover:bg-muted/50 flex items-center justify-between p-4 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="text-muted-foreground font-mono text-xs">{v.hora}</div>
                                                <div>
                                                    <div className="text-sm font-medium">{v.cliente}</div>
                                                    <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
                                                        <Badge variant="outline" className="px-1 py-0 text-[9px] uppercase">
                                                            {v.tipo_pago}
                                                        </Badge>
                                                        {v.referencia && <span>Ref: {v.referencia}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="font-mono text-sm font-bold">${Number(v.monto).toFixed(2)}</div>
                                        </div>
                                    ))}
                                    {activeDetalle?.items_ventas.length === 0 && (
                                        <div className="text-muted-foreground p-8 text-center text-sm italic">
                                            No se registraron ventas en esta moneda durante el turno.
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Egresos e Ingresos */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm text-rose-600">
                                        <ArrowDownCircle className="h-4 w-4" /> Egresos / Gastos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold">-${Number(activeDetalle?.gastos || 0).toFixed(2)}</div>
                                    <div className="mt-4 space-y-2">
                                        {activeDetalle?.items_gastos.map((g, i) => (
                                            <div key={i} className="flex justify-between border-b pb-1 text-xs last:border-0">
                                                <span className="text-muted-foreground max-w-[150px] truncate">{g.desc}</span>
                                                <span className="font-mono">-${Number(g.monto).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {activeDetalle?.items_gastos.length === 0 && (
                                            <p className="text-muted-foreground text-xs italic">Sin gastos registrados</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm text-emerald-600">
                                        <ArrowUpCircle className="h-4 w-4" /> Ingresos Extra
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xl font-bold">+${Number(activeDetalle?.ingresos_extra || 0).toFixed(2)}</div>
                                    <div className="mt-4 space-y-2">
                                        {activeDetalle?.items_ingresos.map((ing, i) => (
                                            <div key={i} className="flex justify-between border-b pb-1 text-xs last:border-0">
                                                <span className="text-muted-foreground max-w-[150px] truncate">{ing.desc}</span>
                                                <span className="font-mono">+${Number(ing.monto).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {activeDetalle?.items_ingresos.length === 0 && (
                                            <p className="text-muted-foreground text-xs italic">Sin ingresos extra</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Arqueo Físico (Side Column) */}
                    <div className="lg:col-span-4">
                        <form onSubmit={submit} className="space-y-6">
                            <Card className="border-primary/20 shadow-lg">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Calculator className="text-primary h-5 w-5" />
                                        Arqueo Físico
                                    </CardTitle>
                                    <CardDescription>Conteo real de billetes en {selectedMoneda}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        {DENOMINATIONS[selectedMoneda]?.map((den) => (
                                            <div key={den} className="bg-muted/30 flex items-center gap-4 rounded-md border p-2">
                                                <div className="min-w-16 font-mono text-sm font-bold">${den}</div>
                                                <div className="flex-1">
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        className="h-9 font-mono"
                                                        value={counts[selectedMoneda]?.[den] || ''}
                                                        onChange={(e) => handleCountChange(selectedMoneda, den, e.target.value)}
                                                    />
                                                </div>
                                                <div className="text-muted-foreground min-w-20 text-right font-mono text-xs">
                                                    = ${((counts[selectedMoneda]?.[den] || 0) * den).toFixed(2)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="space-y-3">
                                        <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
                                            <span className="text-sm font-semibold">Total Contado:</span>
                                            <span className="font-mono text-2xl font-black">${totalContadoMoneda.toFixed(2)}</span>
                                        </div>

                                        <div
                                            className={`flex items-center justify-between rounded-lg border p-4 ${diferencia === 0 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}
                                        >
                                            <div className="text-xs font-bold tracking-wider uppercase">Diferencia {selectedMoneda}</div>
                                            <div className="font-mono text-xl font-black">
                                                {diferencia >= 0 ? '+' : ''}
                                                {diferencia.toFixed(2)}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-muted-foreground text-xs font-black uppercase">Observaciones</Label>
                                            <Input
                                                placeholder="Ej: Faltó billetes de 50..."
                                                value={data.observaciones}
                                                onChange={(e) => setData('observaciones', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2">
                                    <Button className="h-12 w-full text-lg font-bold" disabled={processing}>
                                        {processing ? 'Guardando...' : 'FINALIZAR CIERRE'}
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Resumen Global base USD */}
                            <Card className="bg-muted/30">
                                <CardContent className="flex items-center justify-between p-4">
                                    <div className="text-muted-foreground text-xs font-bold uppercase">Base Cierre (USD)</div>
                                    <div className="text-right">
                                        <div className="font-mono font-bold">${totalContadoGlobalUSD.toFixed(2)}</div>
                                        <div className="text-muted-foreground text-[9px]">Conversión oficial del arqueo</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
