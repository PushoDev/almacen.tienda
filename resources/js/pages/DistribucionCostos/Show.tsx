import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Clock, History, Package, TrendingUp, User, Wallet } from 'lucide-react';

interface CuentaResumen {
    nombre: string | null;
    moneda: string | null;
    monto: number | string;
}

interface HistorialEntry {
    fecha: string;
    costo_anterior: number | string;
    costo_nuevo: number | string;
    comentario: string | null;
    es_esta_distribucion: boolean;
}

interface ProductoDistribuido {
    producto_id: number;
    nombre: string;
    cantidad: number;
    costo_anterior: number | string;
    monto_asignado: number | string;
    costo_nuevo: number | string;
    porcentaje_aumento: number;
    historial: HistorialEntry[];
}

interface Distribucion {
    id: number;
    fecha: string;
    usuario: string | null;
    comentario: string | null;
    tasa_cambio: number | string;
    monto_total_usd: number | string;
    // Mutuamente excluyentes — un lote es de compras o de movimientos, nunca ambos.
    compras: number[];
    movimientos: number[];
    cuentas: CuentaResumen[];
}

interface Props {
    distribucion: Distribucion;
    productos: ProductoDistribuido[];
}

const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
};

const formatCupCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'CUP',
        minimumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
};

const formatFechaHora = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function DistribucionCostosShow({ distribucion, productos }: Props) {
    const titulo = `Distribución #${distribucion.id}`;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Resumen General', href: '/dashboard' },
        { title: 'Distribución de Costos', href: '/distribucion-costos' },
        { title: 'Historial', href: route('distribucion-costos.historial') },
        { title: titulo, href: '#' },
    ];

    const totalAsignado = productos.reduce((acc, p) => acc + Number(p.monto_asignado), 0);
    const esLoteMovimientos = distribucion.movimientos.length > 0;
    const loteIds = esLoteMovimientos ? distribucion.movimientos : distribucion.compras;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={titulo} />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <div className="flex items-center justify-between">
                        <HeadingSmall
                            title={titulo}
                            description={`Detalle de la distribución de costos aplicada a ${esLoteMovimientos ? 'movimiento' : 'compra'}${loteIds.length > 1 ? 's' : ''} #${loteIds.join(', #')}.`}
                        />
                        <Link href={route('distribucion-costos.historial')}>
                            <Button variant="outline" size="sm" className="cursor-pointer">
                                <ArrowLeft className="h-4 w-4" />
                                Volver al Historial
                            </Button>
                        </Link>
                    </div>
                </div>
                <Separator className="col-span-4" />

                {/* --- Resumen de la operación --- */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Resumen de la Operación</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    Cuentas usadas, tasa de cambio aplicada y quién realizó la distribución.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="bg-card rounded-lg border-l-4 border-indigo-400 p-4 shadow-sm dark:border-indigo-600">
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    <h3 className="text-sm font-semibold">Fecha</h3>
                                </div>
                                <p className="mt-1 text-sm font-bold text-indigo-700 dark:text-indigo-300">{formatFechaHora(distribucion.fecha)}</p>
                            </div>
                            <div className="bg-card rounded-lg border-l-4 border-violet-400 p-4 shadow-sm dark:border-violet-600">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    <h3 className="text-sm font-semibold">{esLoteMovimientos ? 'Movimientos (Lote)' : 'Compras (Lote)'}</h3>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {loteIds.map((id) => (
                                        <Badge key={id} variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-300">
                                            #{id}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-card rounded-lg border-l-4 border-emerald-400 p-4 shadow-sm dark:border-emerald-600">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    <h3 className="text-sm font-semibold">Monto Total</h3>
                                </div>
                                <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                                    {formatCurrency(distribucion.monto_total_usd)}
                                </p>
                            </div>
                            <div className="bg-card rounded-lg border-l-4 border-amber-400 p-4 shadow-sm dark:border-amber-600">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    <h3 className="text-sm font-semibold">Realizada por</h3>
                                </div>
                                <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">{distribucion.usuario ?? '—'}</p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                                <Wallet className="h-4 w-4" />
                                Cuentas de Origen (tasa aplicada: {Number(distribucion.tasa_cambio).toFixed(2)} CUP/USD)
                            </h4>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {distribucion.cuentas.map((cuenta, idx) => {
                                    const esCup = cuenta.moneda === 'CUP';
                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-card flex items-center justify-between rounded-lg border border-l-4 p-3 shadow-sm ${
                                                esCup ? 'border-l-amber-400 dark:border-l-amber-600' : 'border-l-blue-400 dark:border-l-blue-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium">{cuenta.nombre}</p>
                                                <Badge
                                                    className={
                                                        esCup
                                                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                            : 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                    }
                                                >
                                                    {cuenta.moneda}
                                                </Badge>
                                            </div>
                                            <p className="text-sm font-semibold">
                                                {esCup ? formatCupCurrency(cuenta.monto) : formatCurrency(cuenta.monto)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {distribucion.comentario && (
                            <div className="rounded-lg border border-dashed p-3">
                                <p className="text-muted-foreground text-xs font-semibold uppercase">Comentario</p>
                                <p className="text-sm">{distribucion.comentario}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* --- Desglose por producto --- */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Desglose por Producto</CardTitle>
                                <CardDescription className="text-violet-100">Lo que se aplicó a cada producto en esta distribución.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Unidades</TableHead>
                                    <TableHead className="text-right">Costo Anterior</TableHead>
                                    <TableHead className="text-right">Monto Asignado</TableHead>
                                    <TableHead className="text-right">Costo Nuevo</TableHead>
                                    <TableHead className="text-right">% Aumento</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productos.map((producto) => (
                                    <TableRow key={producto.producto_id}>
                                        <TableCell className="font-medium">{producto.nombre}</TableCell>
                                        <TableCell className="text-right">{producto.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(producto.costo_anterior)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(producto.monto_asignado)}</TableCell>
                                        <TableCell className="text-right font-bold text-green-600">{formatCurrency(producto.costo_nuevo)}</TableCell>
                                        <TableCell className="text-right">
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                +{producto.porcentaje_aumento.toFixed(4)}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="bg-muted/50">
                                    <TableCell className="font-bold">Total</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalAsignado)}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>

                {/* --- Historial de costo por producto (todas las distribuciones, no solo esta) --- */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Historial de Costo por Producto</CardTitle>
                                <CardDescription className="text-slate-200">
                                    Evolución completa del costo — incluye distribuciones anteriores a esta, si las hubo.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {productos.map((producto) => (
                            <div key={producto.producto_id}>
                                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                    <Package className="text-muted-foreground h-4 w-4" />
                                    {producto.nombre}
                                    {producto.historial.length > 1 && (
                                        <Badge variant="outline" className="text-xs">
                                            {producto.historial.length} cambios registrados
                                        </Badge>
                                    )}
                                </h4>
                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                                <TableHead>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Fecha
                                                    </div>
                                                </TableHead>
                                                <TableHead className="text-right">Costo Anterior</TableHead>
                                                <TableHead className="text-right">Costo Nuevo</TableHead>
                                                <TableHead>Comentario</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {producto.historial.map((entrada, idx) => (
                                                <TableRow
                                                    key={idx}
                                                    className={entrada.es_esta_distribucion ? 'bg-emerald-50 dark:bg-emerald-950/20' : undefined}
                                                >
                                                    <TableCell className="text-sm">
                                                        {formatFechaHora(entrada.fecha)}
                                                        {entrada.es_esta_distribucion && (
                                                            <Badge className="ml-2 border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                                Esta distribución
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatCurrency(entrada.costo_anterior)}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(entrada.costo_nuevo)}</TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{entrada.comentario ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
