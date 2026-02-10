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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    ArrowDown,
    ArrowUp,
    Banknote,
    Calculator,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    CreditCard,
    DollarSign,
    Eye,
    Receipt,
    ShoppingCart,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const CollapsibleRoot = Collapsible.Root;
const CollapsibleTrigger = Collapsible.CollapsibleTrigger;
const CollapsibleContent = Collapsible.CollapsibleContent;

interface Props extends PageProps {
    calculos: Calculos;
    fecha_apertura: string;
    moneda_referencia?: string;
}

interface ProductItem {
    cantidad: number;
    descripcion: string;
    precio_unitario: number;
    total: number;
    precio_equivalente?: number;
    total_equivalente?: number;
}

interface OperacionDetaile {
    venta_id: string;
    pago_id: number;
    cliente: string;
    monto: number;
    hora: string;
    tipo_pago: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    destino_nombre?: string | null;
    productos: ProductItem[];
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
    productos_resumen: Record<string, { id: number; nombre: string; detalles: string; cantidad: number; precio: number; total: number }>;
    operaciones_detalle: OperacionDetaile[];
}

interface ItemVenta {
    id: string;
    venta_id: string;
    monto: number;
    monto_equivalente?: number;
    tipo_pago: string;
    confirmada: boolean;
    referencia?: string;
    cliente: string;
    hora: string;
    detalles: ProductItem[];
    moneda_codigo?: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    cliente_nombre?: string | null;
    destino_nombre?: string | null;
}

interface ItemMovimiento {
    id: string;
    desc: string;
    monto: number;
    hora: string;
    origen: string;
    destino: string;
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

interface TransferenciaPorMoneda {
    moneda: string;
    tasa_cambio: number;
    salientes: number;
    entrantes: number;
    neto: number;
    items_salientes: TransferenciaItem[];
    items_entrantes: TransferenciaItem[];
}

interface TransferenciasResumen {
    total_salientes: number;
    total_entrantes: number;
    por_moneda: Record<string, TransferenciaPorMoneda>;
    detalles_completos: TransferenciaCompleta[];
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

export default function Create({ calculos, fecha_apertura, moneda_referencia = 'USD' }: Props) {
    const { data, setData, post, processing } = useForm({
        saldo_inicial: calculos.saldo_inicial || 0,
        ventas_efectivo: calculos.ventas_efectivo || 0,
        ventas_otros: calculos.ventas_otros || 0,
        total_gastos: calculos.total_gastos || 0,
        total_devoluciones: calculos.total_devoluciones || 0,
        saldo_contado: calculos.saldo_esperado_global || 0,
        observaciones: '',
        fecha_apertura: fecha_apertura,
        confirmacion_transferencias: [] as string[],
    });

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showTransaccionesDialog, setShowTransaccionesDialog] = useState(false);

    // Todas las ventas de todas las monedas juntas
    const todosItemsVentas = (calculos.detalles ?? []).flatMap((d) => d.items_ventas ?? []);
    // Contar ventas únicas (por venta_id) - no por número de pagos
    const ventaIdsUnicos = new Set(todosItemsVentas.map((v: ItemVenta) => v.venta_id));
    const totalVentasUnicas = ventaIdsUnicos.size;

    // Lista plana de productos vendidos desde productos_resumen (ya deduplicado por venta)
    const lineasProductosRaw = (calculos.detalles ?? []).flatMap((d) => Object.values(d.productos_resumen ?? {}));
    const lineasProductos = lineasProductosRaw.map((p) => ({
        cantidad: Number(p.cantidad) || 0,
        descripcion: p.nombre + (p.detalles ? ` ${p.detalles}` : ''),
        precio_unitario: Number(p.precio) || 0,
        total: Number(p.total) || 0,
        precio_equivalente: Number(p.precio) || 0,
        total_equivalente: Number(p.total) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s, r) => s + (r.total_equivalente ?? r.total ?? 0), 0);

    // Por dónde entraron: agrupado primero por MONEDA, luego por método/destino. Totales en la moneda correspondiente (no sumar monedas).
    const pagosPorMonedaYMetodo = todosItemsVentas.reduce(
        (acc, p) => {
            const moneda = p.moneda_codigo ?? 'USD';
            const via = (p.via_pago || '').toString().trim().toUpperCase();
            const destino = (p.destino_nombre || '').toString().trim();
            let etiqueta: string;
            if (p.tipo_pago === 'efectivo') {
                etiqueta = moneda;
            } else {
                etiqueta = via ? (destino ? `${via} ${destino}` : via) : destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`;
            }
            if (!acc[moneda]) acc[moneda] = {};
            if (!acc[moneda][etiqueta]) acc[moneda][etiqueta] = { total: 0, cantidad: 0 };
            const monto = Number(p.monto) || 0;
            acc[moneda][etiqueta].total += monto;
            acc[moneda][etiqueta].cantidad += 1;
            return acc;
        },
        {} as Record<string, Record<string, { total: number; cantidad: number }>>,
    );

    const monedasConPagos = Object.keys(pagosPorMonedaYMetodo).sort();

    // Calcular totales de transacciones del turno
    const totalGastos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.gastos ?? 0), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.ingresos_extra ?? 0), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.transferencias_salientes ?? 0), 0);

    // Obtener todos los items de transacciones
    const todosGastos = (calculos.detalles ?? []).flatMap((d) => d.items_gastos ?? []);
    const todosIngresos = (calculos.detalles ?? []).flatMap((d) => d.items_ingresos ?? []);
    const todasTransferencias = calculos.transferencias_resumen?.detalles_completos ?? [];

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
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title="Proceso de Cierre de Caja"
                        description="Finaliza tu turno laboral. Revisa los movimientos del sistema y confirma los datos del cierre."
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

                {/* Widgets de Estadísticas */}
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

                {/* Widget de Resumen Global */}
                <Card className="border-slate-200 bg-gradient-to-r from-slate-500/5 to-slate-100/50">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                                    <Calculator className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-muted-foreground text-sm">Saldo Esperado en Caja</p>
                                        <div className="group relative">
                                            <svg
                                                className="text-muted-foreground/60 h-4 w-4 shrink-0 cursor-help"
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                                                <path d="M12 17h.01" />
                                            </svg>
                                            <div className="invisible absolute bottom-full left-1/2 z-50 mb-2 w-64 translate-x-[-50%] rounded-md bg-slate-800 p-3 text-xs text-white opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                                                Es el total de dinero que debería haber en caja según las ventas y movimientos registrados. Incluye
                                                ventas en efectivo + ingresos extras - gastos - transferencias.
                                                <div className="absolute top-full left-1/2 h-2 w-2 translate-x-[-50%] bg-slate-800"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-bold text-slate-700">${Number(calculos.saldo_esperado_global || 0).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                    <span className="text-muted-foreground">Total Productos:</span>
                                    <span className="font-semibold">{lineasProductos.length}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-blue-600" />
                                    <span className="text-muted-foreground">Métodos Pago:</span>
                                    <span className="font-semibold">{monedasConPagos.length}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* Columna Izquierda: Información del Sistema */}
                    <div className="space-y-6 lg:col-span-8">
                        {/* Tabla Ventas: todos los productos del turno */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Receipt className="h-5 w-5" />
                                    Ventas
                                </CardTitle>
                                <CardDescription>
                                    Productos vendidos en el turno. Importes en {moneda_referencia} (moneda de referencia).
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

                        {/* Por dónde entraron: una tabla por moneda con desglose de operaciones */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Banknote className="h-5 w-5" />
                                    Por dónde entraron
                                </CardTitle>
                                <CardDescription>
                                    Cantidad de ventas y total por método, separado por moneda. Cada total es en su propia moneda.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {monedasConPagos.length > 0 ? (
                                    monedasConPagos.map((moneda) => {
                                        const metodos = pagosPorMonedaYMetodo[moneda];
                                        const totalMoneda = Object.values(metodos).reduce((s, x) => s + (Number(x.total) || 0), 0);
                                        const cantidadMoneda = Object.values(metodos).reduce((s, x) => s + (x.cantidad || 0), 0);
                                        const detalleMoneda = calculos.detalles?.find((d) => d.moneda === moneda);

                                        return (
                                            <div key={moneda} className="space-y-2">
                                                <h4 className="text-muted-foreground text-sm font-semibold">{moneda}</h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Método / Destino</TableHead>
                                                            <TableHead className="w-24 text-center">Ventas</TableHead>
                                                            <TableHead className="w-28 text-right">Total</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(metodos).map(([etiqueta, data]) => {
                                                            const total = Number(data.total) || 0;
                                                            const operacionesPorMetodo = (detalleMoneda?.operaciones_detalle || []).filter((op) => {
                                                                const via = (op.via_pago || '').toString().trim().toUpperCase();
                                                                const destino = (op.destino_nombre || '').toString().trim();
                                                                let etiquetaMetodo: string;
                                                                if (op.tipo_pago === 'efectivo') {
                                                                    etiquetaMetodo = moneda;
                                                                } else {
                                                                    etiquetaMetodo = via
                                                                        ? destino
                                                                            ? `${via} ${destino}`
                                                                            : via
                                                                        : destino
                                                                          ? `Transferencia ${destino}`
                                                                          : `Transferencia ${moneda}`;
                                                                }
                                                                return etiquetaMetodo === etiqueta;
                                                            });

                                                            return (
                                                                <CollapsibleRoot key={`${moneda}-${etiqueta}`}>
                                                                    <CollapsibleTrigger asChild>
                                                                        <TableRow className="hover:bg-muted/50 cursor-pointer">
                                                                            <TableCell className="flex items-center gap-2 font-medium">
                                                                                <ChevronDown className="collapsible-trigger-icon h-4 w-4 transition-transform" />
                                                                                <ChevronRight className="collapsible-trigger-icon[!hidden] h-4 w-4 transition-transform" />
                                                                                {etiqueta}
                                                                            </TableCell>
                                                                            <TableCell className="text-center font-mono">{data.cantidad}</TableCell>
                                                                            <TableCell className="text-right font-mono">{total.toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    </CollapsibleTrigger>
                                                                    <CollapsibleContent>
                                                                        <TableRow>
                                                                            <TableCell colSpan={3} className="bg-muted/30 p-0">
                                                                                <div className="border-muted-foreground/20 ml-4 space-y-2 border-l-2 p-2">
                                                                                    {operacionesPorMetodo.length > 0 ? (
                                                                                        operacionesPorMetodo.map((operacion, idx) => (
                                                                                            <div
                                                                                                key={idx}
                                                                                                className="bg-card space-y-1 rounded-md border p-2 text-sm shadow-sm"
                                                                                            >
                                                                                                <div className="flex items-center justify-between font-medium">
                                                                                                    <span>
                                                                                                        Venta #{operacion.venta_id} -{' '}
                                                                                                        {operacion.cliente}
                                                                                                    </span>
                                                                                                    <span className="font-mono">
                                                                                                        ${Number(operacion.monto).toFixed(2)} -{' '}
                                                                                                        {operacion.hora}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {(operacion.productos?.length ?? 0) > 0 && (
                                                                                                    <div className="text-muted-foreground ml-4 space-y-1">
                                                                                                        {operacion.productos?.map((prod, pidx) => (
                                                                                                            <div
                                                                                                                key={pidx}
                                                                                                                className="flex justify-between text-xs"
                                                                                                            >
                                                                                                                <span>
                                                                                                                    {prod.cantidad}x{' '}
                                                                                                                    {prod.descripcion}
                                                                                                                </span>
                                                                                                                <span className="font-mono">
                                                                                                                    ${Number(prod.total).toFixed(2)}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))
                                                                                    ) : (
                                                                                        <p className="text-muted-foreground px-2 text-xs italic">
                                                                                            Sin detalle de operaciones
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </CollapsibleContent>
                                                                </CollapsibleRoot>
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
                    </div>

                    {/* Columna Derecha: Finalizar Cierre */}
                    <div className="space-y-6 lg:col-span-4">
                        {/* Cards de Resumen de Transacciones */}
                        <div className="grid grid-cols-3 gap-2">
                            {/* Ingresos */}
                            <Card
                                className="cursor-pointer border-green-200 bg-green-500/5 transition-colors hover:bg-green-500/10"
                                onClick={() => setShowTransaccionesDialog(true)}
                            >
                                <CardContent className="p-3 text-center">
                                    <ArrowDown className="mx-auto mb-1 h-5 w-5 text-green-600" />
                                    <p className="text-muted-foreground text-[10px] uppercase">Ingresos</p>
                                    <p className="text-lg font-bold text-green-700">${Number(totalIngresos).toFixed(2)}</p>
                                    <p className="text-muted-foreground text-[9px]">{todosIngresos.length} oper.</p>
                                </CardContent>
                            </Card>

                            {/* Gastos */}
                            <Card
                                className="cursor-pointer border-red-200 bg-red-500/5 transition-colors hover:bg-red-500/10"
                                onClick={() => setShowTransaccionesDialog(true)}
                            >
                                <CardContent className="p-3 text-center">
                                    <ArrowUp className="mx-auto mb-1 h-5 w-5 text-red-600" />
                                    <p className="text-muted-foreground text-[10px] uppercase">Gastos</p>
                                    <p className="text-lg font-bold text-red-700">${Number(totalGastos).toFixed(2)}</p>
                                    <p className="text-muted-foreground text-[9px]">{todosGastos.length} oper.</p>
                                </CardContent>
                            </Card>

                            {/* Transferencias */}
                            <Card
                                className="cursor-pointer border-blue-200 bg-blue-500/5 transition-colors hover:bg-blue-500/10"
                                onClick={() => setShowTransaccionesDialog(true)}
                            >
                                <CardContent className="p-3 text-center">
                                    <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                                    <p className="text-muted-foreground text-[10px] uppercase">Transfer.</p>
                                    <p className="text-lg font-bold text-blue-700">${Number(totalTransferencias).toFixed(2)}</p>
                                    <p className="text-muted-foreground text-[9px]">{todasTransferencias.length} oper.</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Dialog de Detalle de Transacciones */}
                        <Dialog open={showTransaccionesDialog} onOpenChange={setShowTransaccionesDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="w-full gap-2">
                                    <Eye className="h-4 w-4" /> Ver Detalle de Transacciones
                                </Button>
                            </DialogTrigger>
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
                                                            {todosIngresos.map((item: ItemMovimiento) => (
                                                                <TableRow key={item.id}>
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
                                                            {todosGastos.map((item: ItemMovimiento) => (
                                                                <TableRow key={item.id}>
                                                                    <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                                    <TableCell className="text-sm">{item.desc}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">{item.origen}</TableCell>
                                                                    <TableCell className="text-muted-foreground text-xs">{item.destino}</TableCell>
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
                                                            {todasTransferencias.map((item: TransferenciaCompleta) => (
                                                                <TableRow key={item.id}>
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
                                                                        <span
                                                                            className={item.tipo === 'entrante' ? 'text-green-600' : 'text-blue-600'}
                                                                        >
                                                                            {item.tipo === 'entrante' ? '+' : '-'}$
                                                                            {Number(item.monto_origen).toFixed(2)} {item.moneda_origen}
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

                {/* Modal de Confirmación */}
                <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Finalizar Cierre?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Al finalizar se registrará el cierre con los datos calculados del sistema.
                                <br />
                                <br />
                                <span className="font-bold text-emerald-600">¿Estás seguro de que deseas finalizar el cierre?</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
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
