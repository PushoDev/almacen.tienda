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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Banknote, CheckCircle2, Receipt, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

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

    // Todas las ventas de todas las monedas juntas
    const todosItemsVentas = (calculos.detalles ?? []).flatMap((d) => d.items_ventas ?? []);

    // Lista plana de productos vendidos; usar total_equivalente para que coincida con total cobrado (moneda de referencia)
    const lineasProductos = todosItemsVentas.flatMap((iv) =>
        (iv.detalles ?? []).map((d) => {
            const totalEquiv = Number((d as ProductItem).total_equivalente) || Number(d.total) || 0;
            const precioEquiv = Number((d as ProductItem).precio_equivalente) || Number(d.precio_unitario) || 0;
            return {
                cantidad: Number(d.cantidad) || 0,
                descripcion: d.descripcion ?? '',
                precio_unitario: Number(d.precio_unitario) || 0,
                total: Number(d.total) || 0,
                precio_equivalente: precioEquiv,
                total_equivalente: totalEquiv,
            };
        }),
    );
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
                etiqueta = via ? (destino ? `${via} ${destino}` : via) : (destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`);
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

                        {/* Por dónde entraron: una tabla por moneda (no se suman monedas distintas) */}
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
                                        return (
                                            <div key={moneda} className="space-y-2">
                                                <h4 className="text-sm font-semibold text-muted-foreground">
                                                    {moneda}
                                                </h4>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Método / Destino</TableHead>
                                                            <TableHead className="text-center w-24">Ventas</TableHead>
                                                            <TableHead className="text-right w-28">Total</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(metodos).map(([etiqueta, data]) => {
                                                            const total = Number(data.total) || 0;
                                                            return (
                                                                <TableRow key={`${moneda}-${etiqueta}`}>
                                                                    <TableCell className="font-medium">{etiqueta}</TableCell>
                                                                    <TableCell className="text-center font-mono">
                                                                        {data.cantidad}
                                                                    </TableCell>
                                                                    <TableCell className="text-right font-mono">
                                                                        {total.toFixed(2)}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                    <TableFooter>
                                                        <TableRow>
                                                            <TableCell className="font-bold">Total {moneda}</TableCell>
                                                            <TableCell className="text-center font-mono font-bold">
                                                                {cantidadMoneda}
                                                            </TableCell>
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
