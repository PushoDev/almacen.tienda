import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowDownCircle, ArrowUpCircle, Banknote, Calculator, CheckCircle2, Info, Receipt, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

interface Props extends PageProps {
    calculos: Calculos;
    fecha_apertura: string;
}

interface ItemVenta {
    id: string;
    monto: number;
    tipo_pago: string;
    confirmada: boolean;
    referencia?: string;
    cliente: string;
    hora: string;
    detalles: string;
}

interface ItemMovimiento {
    id: string;
    desc: string;
    monto: number;
    hora: string;
    origen: string;
    destino: string;
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
    items_gastos: ItemMovimiento[];
    items_ingresos: ItemMovimiento[];
    items_transferencias: ItemMovimiento[];
    items_transferencias_salientes: TransferenciaItem[];
    items_transferencias_entrantes: TransferenciaItem[];
}

interface Calculos {
    saldo_inicial: number;
    ventas_efectivo: number;
    ventas_otros: number;
    total_gastos: number;
    total_devoluciones: number;
    saldo_esperado_global: number;
    detalles: DetalleMoneda[];
    transferencias_resumen?: TransferenciasResumen;
}

interface TransferenciasResumen {
    total_salientes: number;
    total_entrantes: number;
    por_moneda: Record<
        string,
        {
            moneda: string;
            tasa_cambio: number;
            salientes: number;
            entrantes: number;
            neto: number;
            items_salientes: TransferenciaItem[];
            items_entrantes: TransferenciaItem[];
        }
    >;
    detalles_completos: TransferenciaCompleta[];
}

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

interface TransferenciaCompleta extends TransferenciaItem {
    tipo: 'saliente' | 'entrante';
}

const DENOMINACIONES = [
    { label: '100 USD', val: 100, m: 'USD' },
    { label: '50 USD', val: 50, m: 'USD' },
    { label: '20 USD', val: 20, m: 'USD' },
    { label: '10 USD', val: 10, m: 'USD' },
    { label: '5 USD', val: 5, m: 'USD' },
    { label: '1 USD', val: 1, m: 'USD' },
    { label: '1000 CUP', val: 1000, m: 'CUP' },
    { label: '500 CUP', val: 500, m: 'CUP' },
    { label: '200 CUP', val: 200, m: 'CUP' },
    { label: '100 CUP', val: 100, m: 'CUP' },
    { label: '50 CUP', val: 50, m: 'CUP' },
    { label: '20 CUP', val: 20, m: 'CUP' },
    { label: '10 CUP', val: 10, m: 'CUP' },
    { label: '5 CUP', val: 5, m: 'CUP' },
    { label: '1 CUP', val: 1, m: 'CUP' },
];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Nuevo Cierre', href: '#' },
];

export default function Create({ calculos, fecha_apertura }: Props) {
    const { data, setData, post, processing } = useForm({
        saldo_inicial: calculos.saldo_inicial || 0,
        ventas_efectivo: calculos.ventas_efectivo || 0,
        ventas_otros: calculos.ventas_otros || 0,
        total_gastos: calculos.total_gastos || 0,
        total_devoluciones: calculos.total_devoluciones || 0,
        saldo_contado: 0,
        observaciones: '',
        fecha_apertura: fecha_apertura,
        arqueo_detalles: {
            is_manual: false,
            bills: {} as Record<string, number>,
            manual_differences: {} as Record<string, number>,
        },
        confirmacion_transferencias: [] as string[], // IDs de transferencias confirmadas (m_id o p_id)
    });

    const [bills, setBills] = useState<Record<string, number>>({});
    const [manualDifference, setManualDifference] = useState<Record<string, number>>({}); // Por moneda
    const [isManualArqueo, setIsManualArqueo] = useState(false);
    const [selectedMoneda, setSelectedMoneda] = useState(calculos.detalles?.[0]?.moneda || 'CUP');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const totalContadoMoneda = Object.entries(bills).reduce((acc, [key, count]) => {
        const denom = DENOMINACIONES.find((d) => d.label === key);
        if (denom && denom.m === selectedMoneda) {
            return acc + denom.val * (count || 0);
        }
        return acc;
    }, 0);

    const totalGlobalAuditado = isManualArqueo
        ? calculos.detalles.reduce((acc, det) => {
              const diff = manualDifference[det.moneda] || 0;
              return acc + (det.saldo_calculado + diff) / det.tasa_cambio;
          }, 0)
        : Object.entries(bills).reduce((acc, [key, count]) => {
              const denom = DENOMINACIONES.find((d) => d.label === key);
              if (denom) {
                  const detalleMoneda = calculos.detalles.find((det) => det.moneda === denom.m);
                  const tasa = detalleMoneda?.tasa_cambio || 1;
                  return acc + (denom.val * (count || 0)) / tasa;
              }
              return acc;
          }, 0);

    useEffect(() => {
        setData('saldo_contado', totalGlobalAuditado);
        setData('arqueo_detalles', {
            is_manual: isManualArqueo,
            bills: bills,
            manual_differences: manualDifference,
        });
    }, [bills, manualDifference, isManualArqueo, totalGlobalAuditado, setData]);

    const activeDetalle = calculos.detalles.find((d) => d.moneda === selectedMoneda);

    // Si es manual, usamos el valor ingresado. Si no, el calculado por los billetes.
    const currentContado = isManualArqueo ? (activeDetalle?.saldo_calculado || 0) + (manualDifference[selectedMoneda] || 0) : totalContadoMoneda;

    const diferenciaMoneda = currentContado - (activeDetalle?.saldo_calculado || 0);

    const handleBillChange = (label: string, value: string) => {
        const num = parseInt(value) || 0;
        setBills((prev) => ({ ...prev, [label]: num }));
    };

    const toggleConfirmacionTransferencia = (id: string) => {
        const actual = [...data.confirmacion_transferencias];
        const index = actual.indexOf(id);
        if (index > -1) {
            actual.splice(index, 1);
        } else {
            actual.push(id);
        }
        setData('confirmacion_transferencias', actual);
    };

    const submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        console.log('--- INICIANDO ENVÍO DE CIERRE ---');

        post(route('ventas.cierres.store'), {
            preserveScroll: true,
            onSuccess: () => {
                console.log('Cierre exitoso');
                toast.success('Cierre realizado con éxito');
            },
            onError: (err) => {
                console.error('Errores en el cierre:', err);
                toast.error('Error al realizar el cierre. Revise los datos.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Realizar Cierre de Caja" />
            <Toaster position="top-center" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header Estándar (Estilo Productos/Clientes) */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title="Proceso de Cierre de Caja"
                        description="Finaliza tu turno laboral. Revisa los movimientos del sistema y realiza el arqueo físico de efectivo."
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Columna Izquierda: Información del Sistema */}
                    <div className="space-y-6 lg:col-span-8">
                        {/* Selector de Moneda */}
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-lg font-bold tracking-tight">Movimientos por Moneda</h3>
                            <div className="bg-muted flex rounded-lg p-1">
                                {calculos.detalles.map((mon: DetalleMoneda) => (
                                    <Button
                                        key={mon.moneda}
                                        variant={selectedMoneda === mon.moneda ? 'default' : 'ghost'}
                                        size="sm"
                                        onClick={() => setSelectedMoneda(mon.moneda)}
                                        className="px-6 font-bold"
                                    >
                                        {mon.moneda}
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
                                                Efectivo Ventas
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                                {activeDetalle?.items_ventas?.filter((v) => v.tipo_pago === 'efectivo').length || 0} operaciones
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
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
                                    <div className="scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 max-h-40 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_ventas
                                            .filter((v) => v.tipo_pago === 'efectivo')
                                            .map((v, i) => (
                                                <div
                                                    key={i}
                                                    className="group/item flex items-center justify-between border-b border-emerald-200/30 p-2 transition-colors hover:bg-emerald-50/50 dark:border-emerald-800/30 dark:hover:bg-emerald-950/30"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={data.confirmacion_transferencias.includes(v.id)}
                                                            onCheckedChange={() => toggleConfirmacionTransferencia(v.id)}
                                                            className="scale-75"
                                                        />
                                                        <div className="h-2 w-2 rounded-full bg-emerald-400 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                <span className="rounded bg-emerald-100 px-2 py-1 font-mono text-[10px] font-medium text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                                    {v.hora}
                                                                </span>
                                                                <span className="truncate font-medium text-emerald-800 dark:text-emerald-200">
                                                                    {v.cliente}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                                    ${Number(v.monto).toFixed(2)}
                                                                </span>
                                                                {v.referencia && (
                                                                    <div className="text-[8px] text-emerald-600 dark:text-emerald-400">
                                                                        Ref: {v.referencia}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {v.detalles && (
                                                            <div className="mt-1 rounded bg-emerald-50 px-2 py-1 text-[9px] text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                                <span className="font-medium">Productos:</span> {v.detalles}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        {!activeDetalle?.items_ventas?.filter((v) => v.tipo_pago === 'efectivo').length && (
                                            <div className="p-4 text-center text-xs text-emerald-600 italic dark:text-emerald-400">
                                                No hay ventas en efectivo registradas
                                            </div>
                                        )}
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
                                                Transferencias Ventas
                                            </CardTitle>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-medium text-blue-600 dark:text-blue-400">
                                                {activeDetalle?.items_ventas?.filter((v) => v.tipo_pago !== 'efectivo').length || 0} operaciones
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="relative space-y-3">
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
                                    <div className="scrollbar-thin scrollbar-thumb-blue-200 dark:scrollbar-thumb-blue-800 max-h-40 space-y-1 overflow-y-auto">
                                        {activeDetalle?.items_ventas
                                            .filter((v) => v.tipo_pago !== 'efectivo')
                                            .map((v, i) => (
                                                <div
                                                    key={i}
                                                    className="group/item border-l-4 border-blue-400 bg-blue-50/30 p-2 transition-colors hover:bg-blue-100/50 dark:border-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Switch
                                                                checked={data.confirmacion_transferencias.includes(v.id)}
                                                                onCheckedChange={() => toggleConfirmacionTransferencia(v.id)}
                                                                className="scale-75"
                                                            />
                                                            <div className="h-2 w-2 rounded-full bg-blue-400 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                    <span className="rounded bg-blue-100 px-2 py-1 font-mono text-[10px] font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                                                        {v.hora}
                                                                    </span>
                                                                    <span className="truncate font-medium text-blue-800 dark:text-blue-200">
                                                                        {v.cliente}
                                                                    </span>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="ml-2 border-blue-300 bg-blue-100 text-[8px] font-bold text-blue-700 dark:border-blue-700 dark:bg-blue-800 dark:text-blue-300"
                                                                    >
                                                                        {v.tipo_pago}
                                                                    </Badge>
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                        ${Number(v.monto).toFixed(2)}
                                                                    </span>
                                                                    {v.referencia && (
                                                                        <div className="text-[8px] text-blue-600 dark:text-blue-400">
                                                                            Ref: {v.referencia}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {v.detalles && (
                                                                <div className="mt-1 rounded bg-blue-50 px-2 py-1 text-[9px] text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                                                                    <span className="font-medium">Productos:</span> {v.detalles}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {!activeDetalle?.items_ventas?.filter((v) => v.tipo_pago !== 'efectivo').length && (
                                            <div className="p-4 text-center text-xs text-blue-600 italic dark:text-blue-400">
                                                No hay transferencias registradas
                                            </div>
                                        )}
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
                                        {activeDetalle?.items_gastos.map((g: ItemMovimiento, i: number) => (
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
                                                        {g.origen && g.destino && (
                                                            <div className="mt-1 rounded bg-rose-50 px-2 py-1 text-[9px] text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
                                                                <span className="font-medium">Flujo:</span> {g.origen} → {g.destino}
                                                            </div>
                                                        )}
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
                                        {activeDetalle?.items_ingresos.map((ing: ItemMovimiento, i: number) => (
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
                                                        {ing.origen && ing.destino && (
                                                            <div className="mt-1 rounded bg-emerald-50 px-2 py-1 text-[9px] text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                                <span className="font-medium">Flujo:</span> {ing.origen} → {ing.destino}
                                                            </div>
                                                        )}
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
                                    <div className="flex items-center gap-2">
                                        <div className="rounded-lg bg-indigo-500/10 p-2">
                                            <Banknote className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Transferencias</CardTitle>
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
                                        {(activeDetalle?.items_transferencias_salientes || []).map((t: any, i: number) => (
                                            <div
                                                key={`saliente_${i}`}
                                                className="group/item border-l-4 border-rose-400 bg-rose-50/30 p-2 transition-colors hover:bg-rose-100/50 dark:border-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/40"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex max-w-40 items-center gap-2 truncate">
                                                        <Switch
                                                            checked={data.confirmacion_transferencias.includes(t.id)}
                                                            onCheckedChange={() => toggleConfirmacionTransferencia(t.id)}
                                                            className="scale-75"
                                                        />
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
                                            </div>
                                        ))}

                                        {/* Transferencias Entrantes */}
                                        {(activeDetalle?.items_transferencias_entrantes || []).map((t: any, i: number) => (
                                            <div
                                                key={`entrante_${i}`}
                                                className="group/item border-l-4 border-emerald-400 bg-emerald-50/30 p-2 transition-colors hover:bg-emerald-100/50 dark:border-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex max-w-40 items-center gap-2 truncate">
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
                                            </div>
                                        ))}

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

                        {/* Listado de Ventas Recientes */}
                        <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-slate-50/50 to-slate-100/30 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:from-slate-950/30 dark:to-slate-900/20 dark:shadow-slate-900/20">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <CardHeader className="relative border-b border-slate-200/50 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-900/30">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <div className="rounded-lg bg-slate-500/10 p-2">
                                            <Receipt className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <span className="bg-gradient-to-r from-slate-700 to-slate-800 bg-clip-text font-semibold dark:from-slate-300 dark:to-slate-400">
                                            Ventas en {selectedMoneda}
                                        </span>
                                    </CardTitle>
                                    <div className="text-right">
                                        <div className="text-[9px] font-medium text-slate-600 dark:text-slate-400">
                                            {activeDetalle?.items_ventas?.length || 0} operaciones
                                        </div>
                                        <div className="text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                            Total: $
                                            {Number((activeDetalle?.ventas_efectivo || 0) + (activeDetalle?.ventas_transferencia || 0)).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="relative px-0">
                                <TooltipProvider>
                                    <div className="scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 max-h-96 divide-y divide-slate-200/30 overflow-y-auto dark:divide-slate-800/30">
                                        {activeDetalle?.items_ventas.map((v: ItemVenta, i: number) => (
                                            <div
                                                key={i}
                                                className="group/item flex items-start gap-4 p-4 transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-950/30"
                                            >
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Switch
                                                        checked={data.confirmacion_transferencias.includes(v.id)}
                                                        onCheckedChange={() => toggleConfirmacionTransferencia(v.id)}
                                                        className="scale-75"
                                                    />
                                                    <div
                                                        className={`h-2 w-2 rounded-full transition-all duration-300 group-hover:opacity-100 ${
                                                            v.tipo_pago === 'efectivo' ? 'bg-emerald-400' : 'bg-blue-400'
                                                        }`}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-2 flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 flex-1 items-center gap-3">
                                                            <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-900/30 dark:text-slate-400">
                                                                {v.hora}
                                                            </span>
                                                            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                                                                {v.cliente}
                                                            </span>
                                                            <Badge
                                                                variant={v.tipo_pago === 'efectivo' ? 'default' : 'outline'}
                                                                className={`text-[9px] font-bold uppercase ${
                                                                    v.tipo_pago === 'efectivo'
                                                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                                                        : 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                {v.tipo_pago}
                                                            </Badge>
                                                            {v.referencia && (
                                                                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[8px]">
                                                                    Ref: {v.referencia}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono text-lg font-bold text-slate-800 dark:text-slate-200">
                                                                ${Number(v.monto).toFixed(2)}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400">{selectedMoneda}</div>
                                                        </div>
                                                    </div>
                                                    {v.detalles && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <button className="text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
                                                                    <Info size={14} />
                                                                </button>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="border-slate-700 bg-slate-900 text-slate-100 dark:border-slate-300 dark:bg-slate-100 dark:text-slate-900">
                                                                <div className="max-w-xs">
                                                                    <p className="mb-1 text-xs font-medium">Detalles de productos:</p>
                                                                    <p className="text-xs">{v.detalles}</p>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
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
                    </div>

                    {/* Columna Derecha: Arqueo y Finalizar */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* Arqueo Manual */}
                        <Card className="border-indigo-500/20 shadow-sm">
                            <CardHeader className="bg-indigo-500/5">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2 text-indigo-600">
                                        <Calculator className="h-5 w-5" /> Arqueo Físico
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Label className="text-[10px] font-bold uppercase">Manual</Label>
                                        <Switch checked={isManualArqueo} onCheckedChange={setIsManualArqueo} />
                                    </div>
                                </div>
                                <CardDescription>
                                    {isManualArqueo ? 'Ingresa la diferencia detectada directamente' : 'Desglose manual de billetes'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                {!isManualArqueo ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {DENOMINACIONES.filter((d) => d.m === selectedMoneda).map((d) => (
                                            <div key={d.label} className="space-y-1">
                                                <Label className="text-muted-foreground text-[10px] font-bold uppercase">{d.label}</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 font-mono text-xs"
                                                    placeholder="0"
                                                    value={bills[d.label] || ''}
                                                    onChange={(e) => handleBillChange(d.label, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-muted-foreground text-[10px] font-bold uppercase">
                                            Diferencia en {selectedMoneda}
                                        </Label>
                                        <Input
                                            type="number"
                                            className="font-mono"
                                            placeholder="Ej: -50 o +10"
                                            value={manualDifference[selectedMoneda] || ''}
                                            onChange={(e) =>
                                                setManualDifference((prev) => ({
                                                    ...prev,
                                                    [selectedMoneda]: parseFloat(e.target.value) || 0,
                                                }))
                                            }
                                        />
                                        <p className="text-muted-foreground text-[10px] italic">Indica con signo negativo si falta dinero.</p>
                                    </div>
                                )}

                                <Separator />

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Total Contado:</span>
                                        <span className="font-mono font-bold">${currentContado.toFixed(2)}</span>
                                    </div>
                                    <div
                                        className={`flex items-center justify-between rounded p-2 ${diferenciaMoneda >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}
                                    >
                                        <span className="text-[11px] font-black uppercase">Diferencia:</span>
                                        <span className="font-mono font-bold">
                                            {diferenciaMoneda > 0 ? '+' : ''}
                                            {diferenciaMoneda.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acción Final */}
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-sm font-bold tracking-wider uppercase">Finalizar Cierre</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs font-bold uppercase">Observaciones del Turno</Label>
                                    <Input
                                        placeholder="Ej: Faltó dinero por cambio mal dado..."
                                        value={data.observaciones}
                                        onChange={(e) => setData('observaciones', e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-col gap-2 pt-2">
                                    <Button type="button" className="h-12 w-full text-base font-bold" disabled={processing} onClick={() => submit()}>
                                        <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR CIERRE
                                    </Button>
                                    <p className="text-muted-foreground px-4 text-center text-[10px] leading-tight italic">
                                        Al finalizar se notificará a los administradores y se cerrará tu sesión de venta.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Modal de Confirmación si no hay arqueo */}
                <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Finalizar sin arqueo?</AlertDialogTitle>
                            <AlertDialogDescription>
                                No has ingresado el desglose manual de billetes, pero el sistema registró ventas en efectivo.
                                <br />
                                <br />
                                <span className="font-bold text-rose-600 underline">
                                    ¿Estás seguro de que deseas cerrar la caja sin verificar el efectivo físico?
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Volver al arqueo</AlertDialogCancel>
                            <AlertDialogAction type="button" onClick={() => submit()} className="bg-primary cursor-pointer">
                                Sí, Finalizar Cierre
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
